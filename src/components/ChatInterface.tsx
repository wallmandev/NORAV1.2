import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  companyId: string; // Viktigt för att NORA ska veta vilken data hon ska söka i
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ companyId }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hej! Jag är NORA. Jag har läst på om er verksamhet. Vad vill du veta?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isDemo = companyId.startsWith('demo-');

  // Auto-scroll till botten
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    
    // 1. Lägg till användarens meddelande i listan direkt
    // Vi lägger INTE till någon tom assistent-bubbla här än.
    setMessages(prev => [
      ...prev, 
      { role: 'user', content: userMsg }
    ]);
    
    // 2. Visa laddningsindikatorn
    setIsLoading(true);

    try {
      // Skapa payload med historik för API:et
      const payloadMessages = [
        ...messages,
        { role: 'user', content: userMsg }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: payloadMessages, 
          companyId: companyId 
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(response.statusText);
      }

      // Läs ut källor från headers (om de finns)
      const sourcesHeader = response.headers.get('X-Sources');
      let sources: string[] = [];
      try {
        if (sourcesHeader) {
          sources = JSON.parse(sourcesHeader);
        }
      } catch (e) {
        console.error("Failed to parse sources", e);
      }

      // Förbered streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      // 3. Nu när svaret börjar komma, dölj laddningsindikatorn
      setIsLoading(false);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        accumulatedText += chunkValue;

        // 4. Uppdatera meddelandelistan i realtid
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          
          // Om sista meddelandet är från assistenten, fyll på texten
          if (lastMsg.role === 'assistant') {
            lastMsg.content = accumulatedText;
            return newMessages;
          } else {
            // Om sista meddelandet fortfarande är användaren (första databitarna),
            // skapa en NY assistent-bubbla nu.
            return [
              ...newMessages,
              { role: 'assistant', content: accumulatedText }
            ];
          }
        });
      }

      // 5. Efter streamen är klar, lägg till källor i meddelandet om det finns några
      if (sources && sources.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.sources = Array.from(new Set(sources));
          }
          return newMessages;
        });
      }

    } catch (error) {
      console.error(error);
      
      // Vid fel: Se till att vi visar ett felmeddelande i chatten
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        
        // Om vi har en påbörjad assistent-bubbla, skriv felet där
        if (lastMsg.role === 'assistant') {
           if (!lastMsg.content) lastMsg.content = "Hoppsan, jag tappade tråden lite. Kan du försöka igen?";
           return newMessages;
        } else {
           // Annars skapa en ny bubbla med felmeddelandet
           return [
             ...newMessages,
             { role: 'assistant', content: "Hoppsan, jag tappade tråden lite. Kan du försöka igen?" }
           ];
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
      
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
             <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">NORA Demo</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online & Utbildad på din data
            </p>
          </div>
        </div>
        
        {isDemo && (
          <a 
            href={`/signup?companyId=${companyId}`}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Spara min bot
          </a>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-slate-200' : 'bg-violet-100'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-5 h-5 text-slate-500" />
              ) : (
                <Sparkles className="w-5 h-5 text-violet-600" />
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-violet-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              {/* Only render Markdown for assistant messages to avoid hydration errors on simple user text */}
              {msg.role === 'assistant' ? (
                <div className="markdown-content space-y-2">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                      a: ({node, ...props}) => <a className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}

              {/* Visa källor om det är assistenten och källor finns */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-2">Källor:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, i) => {
                      let hostname = source;
                      try {
                        hostname = new URL(source).hostname;
                      } catch (e) {} // Fallback om URL är ogiltig
                      
                      return (
                        <a 
                          key={i} 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-violet-600 hover:bg-violet-50 transition-colors truncate max-w-[200px] block"
                          title={source}
                        >
                          {hostname}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1 items-center h-12">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-100 p-4">
        {isDemo && (
           <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-between gap-4 sm:hidden">
              <span className="text-sm text-violet-900 font-medium">Gillar du resultatet?</span>
              <a 
                href={`/signup?companyId=${companyId}`}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg whitespace-nowrap"
              >
                Installera nu
              </a>
           </div>
        )}
        
        <form 
          onSubmit={handleSendMessage}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Fråga NORA om din hemsida..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
