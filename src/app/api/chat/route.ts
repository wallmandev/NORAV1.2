import { NextResponse } from 'next/server';
import { RagService } from '@/services/ragService';
import { LeadService } from '@/services/leadService';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { NORA_SYSTEM_PROMPT } from '@/prompts/systemPrompts';

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  streaming: true,
});

// En lättviktig modell för att formulera om sökfrågor
const rephraseModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

export async function POST(req: Request) {
  try {
    // Instansiera services här istället för globalt
    const ragService = new RagService();
    const leadService = new LeadService();

    const body = await req.json();
    const { messages, companyId, message: legacyMessage } = body;

    // Hämta sista meddelandet (stödjer både ny array-struktur och gammal string-struktur)
    const lastMessage = Array.isArray(messages) 
      ? messages[messages.length - 1].content 
      : legacyMessage;

    if (!lastMessage || !companyId) {
      return NextResponse.json(
        { error: "Message and companyId are required" },
        { status: 400 }
      );
    }

    // 0. Lead Capture Check (Email & Phone)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:(?:\+46)|0)\s?\d{1,3}[\s-]?\d{2,4}[\s-]?\d{2,4}/g;
    
    const foundEmails = lastMessage.match(emailRegex);
    const foundPhones = lastMessage.match(phoneRegex);
    
    let contactInfo = "";
    let email = "";
    let phone = "";

    if (foundEmails && foundEmails.length > 0) {
      email = foundEmails[0];
      contactInfo = email;
    } else if (foundPhones && foundPhones.length > 0) {
      phone = foundPhones[0];
      contactInfo = phone;
    }

    if (contactInfo) {
      console.log(`Detected potential lead: ${contactInfo}`);
      
      // Vi kör detta "fire and forget" men fångar fel för att inte krascha chatten
      // Nu anropar vi med (companyId, message, email, phone)
      leadService.saveLead(companyId, lastMessage, email, phone).catch(err => {
        console.error("Failed to save lead automatically:", err);
      });
    }

    // 1. Förbered sökfråga (Contextual Retrieval)
    // Om vi har historik, be AI formulera om frågan så den blir 'self-contained' för bättre sökresultat
    let queryToSearch = lastMessage;
    const historyMessages = Array.isArray(messages) ? messages.slice(0, -1) : [];

    if (historyMessages.length > 0) {
      try {
        const rephrasePrompt = `
Givet följande konversation och en uppföljande fråga, formulera om uppföljningsfrågan så att den blir en fristående fråga som fångar hela kontexten. Behåll originalspråket (svenska).

Konversation:
${historyMessages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

Uppföljande fråga: ${lastMessage}

Fristående fråga:`;

        const rephrasedResponse = await rephraseModel.invoke([new HumanMessage(rephrasePrompt)]);
        
        if (rephrasedResponse.content) {
          queryToSearch = rephrasedResponse.content as string;
          console.log(`Rephrasing query: "${lastMessage}" -> "${queryToSearch}"`);
        }
      } catch (e) {
        console.error("Failed to rephrase query, using original:", e);
      }
    }

    // 2. Sök relevant kontext (RAG) med den (eventuellt) förbättrade frågan
    const searchResults = await ragService.performSearch(queryToSearch, companyId);
    
    const contextText = searchResults.map(r => r.content).join("\n\n---\n\n");
    const sources = searchResults.map(r => r.metadata?.sourceURL).filter(Boolean);

    console.log(`Found ${searchResults.length} context chunks for query: "${queryToSearch}"`);

    // 3. Bygg prompten
    const systemPromptEncoded = NORA_SYSTEM_PROMPT.replace("{context}", contextText || "Ingen specifik information hittades.");

    // Bygg upp meddelar-historiken för LangChain
    // Vi använder BaseMessage[] för att tillåta olika typer av meddelanden
    const langchainMessages: BaseMessage[] = [new SystemMessage(systemPromptEncoded)];

    if (Array.isArray(messages)) {
      // Lägg till historiken. Vi exkluderar sista meddelandet här för att lägga det sist explicit
      // eller loopar igenom alla.
      messages.forEach((msg: { role: string, content: string }) => {
        if (msg.role === 'user') {
          langchainMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          langchainMessages.push(new AIMessage(msg.content));
        }
      });
    } else {
      // Fallback om bara ett meddelande skickades
      langchainMessages.push(new HumanMessage(lastMessage));
    }

    // 3. Skapa en stream för svaret
    const stream = new ReadableStream({
      async start(controller) {
        const streamResponse = await chatModel.stream(langchainMessages);
        
        for await (const chunk of streamResponse) {
          if (chunk.content) {
            controller.enqueue(new TextEncoder().encode(chunk.content as string));
          }
        }
        controller.close();
      },
    });

    // 4. Returnera streamen
    // Vi skickar sources i en custom header så klienten kan läsa dem
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Sources': JSON.stringify(sources),
      },
    });

  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
