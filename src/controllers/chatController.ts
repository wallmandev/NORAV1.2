import { Request, Response } from 'express';
import { RagService } from '../services/ragService';
import { LeadService } from '../services/leadService';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { NORA_SYSTEM_PROMPT } from '../prompts/systemPrompts';

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  streaming: true,
});

const rephraseModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

export const chatController = async (req: Request, res: Response): Promise<void> => {
  try {
    const ragService = new RagService();
    const leadService = new LeadService();

    const { messages, companyId, message: legacyMessage } = req.body;

    // Hämta sista meddelandet
    const lastMessage = Array.isArray(messages) 
      ? messages[messages.length - 1].content 
      : legacyMessage;

    if (!lastMessage || !companyId) {
      res.status(400).json({ error: "Message and companyId are required" });
      return;
    }

    // 0. Lead Capture Check
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:(?:\+46)|0)\s?\d{1,3}[\s-]?\d{2,4}[\s-]?\d{2,4}/g;
    
    const foundEmails = lastMessage.match(emailRegex);
    const foundPhones = lastMessage.match(phoneRegex);
    
    let email = "";
    let phone = "";

    if (foundEmails && foundEmails.length > 0) {
      email = foundEmails[0];
    } else if (foundPhones && foundPhones.length > 0) {
      phone = foundPhones[0];
    }

    if (email || phone) {
      console.log(`Detected potential lead: ${email || phone}`);
      leadService.saveLead(companyId, lastMessage, email, phone).catch(err => {
        console.error("Failed to save lead automatically:", err);
      });
    }

    // 1. Förbered sökfråga
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
        }
      } catch (e) {
        console.error("Failed to rephrase query:", e);
      }
    }

    // 2. Sök relevant kontext
    const searchResults = await ragService.performSearch(queryToSearch, companyId);
    const contextText = searchResults.map(r => r.content).join("\n\n---\n\n");
    const sources = searchResults.map(r => r.metadata?.sourceURL).filter(Boolean);

    // 3. Bygg prompten
    const systemPromptEncoded = NORA_SYSTEM_PROMPT.replace("{context}", contextText || "Ingen specifik information hittades.");
    
    const langchainMessages: BaseMessage[] = [new SystemMessage(systemPromptEncoded)];

    if (Array.isArray(messages)) {
      messages.forEach((msg: { role: string, content: string }) => {
        if (msg.role === 'user') {
          langchainMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          langchainMessages.push(new AIMessage(msg.content));
        }
      });
    } else {
      langchainMessages.push(new HumanMessage(lastMessage));
    }

    // 4. Skicka strömmat svar (Express)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Sources', JSON.stringify(sources));

    const streamResponse = await chatModel.stream(langchainMessages);

    for await (const chunk of streamResponse) {
      if (chunk.content) {
        res.write(chunk.content);
      }
    }
    
    res.end();

  } catch (error: any) {
    console.error("Chat controller error:", error);
    // Om headers inte skickats än
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal Server Error" });
    } else {
      res.end();
    }
  }
};
