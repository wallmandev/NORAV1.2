import React, { useState } from 'react';
import { OnboardingLoader } from './OnboardingLoader';
import { ChatInterface } from './ChatInterface';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const DemoPage = () => {
  const [step, setStep] = useState<'input' | 'loading' | 'chat'>('input');
  const [url, setUrl] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [scrapedPageCount, setScrapedPageCount] = useState<number | null>(null);

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    // Generera ett ID och byt state
    const newCompanyId = `demo-${Date.now()}`;
    setCompanyId(newCompanyId);
    setStep('loading');
    setScrapedPageCount(null); // Reset

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, companyId: newCompanyId }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Hantera att flera JSON-objekt kan komma i samma chunk eller vara uppdelade
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Spara det som inte är en komplett rad än

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'scraped') {
              console.log("Found pages:", data.count);
              setScrapedPageCount(data.count);
            } else if (data.type === 'complete') {
              console.log("Analysis complete");
              // Vi låter OnboardingLoader sköta övergången via onReady när animationen är klar
            }
          } catch (e) {
            console.error("Error parsing stream JSON", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to start analysis", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      
      {step === 'input' && (
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Möt NORA.
          </h1>
          <p className="text-slate-500">
            Skriv in din URL så bygger hon en kunskapsbas och startar en chatt med dig på 30 sekunder.
          </p>
          
          <form onSubmit={handleStartAnalysis} className="flex flex-col gap-3">
            <input 
              type="url" 
              required
              placeholder="https://dittföretag.se" 
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
            <button 
              type="submit"
              className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              Starta analys <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 
        Vi renderar alltid ChatInterface när vi har lämnat 'input'-stadiet, 
        men vi döljer den med CSS (display: none) tills step === 'chat'.
        Detta gör att komponenten "laddas i bakgrunden" och är redo direkt.
      */}
      {step !== 'input' && (
        <>
           <div className={step === 'chat' ? 'w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start animate-fade-in-up' : 'hidden'}>
              
              {/* Vänster kolumn: Säljsnack & CTA */}
              <div className="flex-1 space-y-6 pt-4 hidden md:block">
                <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                  Imponerad?<br/>
                  Gör NORA till din egen.
                </h2>
                <p className="text-slate-600 text-lg">
                  Du har precis sett hur enkelt det är. Installera NORA på din hemsida idag och börja samla leads automatiskt dygnet runt.
                </p>
                
                <ul className="space-y-3">
                   {[
                     "Tar 60 sekunder att installera",
                     "Anpassa färger och logotyp",
                     "Samla in namn och nummer automatiskt",
                     "Träna henne med mer information"
                   ].map((item, i) => (
                     <li key={i} className="flex items-center gap-3 text-slate-700">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        {item}
                     </li>
                   ))}
                </ul>

                <Link 
                  href={`/signup?companyId=${companyId}&url=${encodeURIComponent(url)}`}
                  className="inline-flex items-center justify-center w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 transition-all transform hover:-translate-y-1"
                >
                  Skapa gratis konto <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <p className="text-center text-xs text-slate-400">Inga kreditkort krävs för start.</p>
              </div>

              {/* Höger kolumn: Chatten */}
              <div className="flex-1 w-full">
                  <ChatInterface 
                    companyId={companyId} 
                    onSignupClick={() => window.location.href = `/signup?companyId=${companyId}&url=${encodeURIComponent(url)}`}
                  />
                  
                  {/* Mobil CTA (visas under chatten på små skärmar) */}
                  <div className="md:hidden mt-6 text-center space-y-4">
                    <h3 className="text-xl font-bold text-slate-900">Redo att köra live?</h3>
                    <Link 
                      href={`/signup?companyId=${companyId}&url=${encodeURIComponent(url)}`}
                      className="block w-full py-3 bg-violet-600 text-white rounded-lg font-bold"
                    >
                      Skapa konto nu
                    </Link>
                  </div>
              </div>

           </div>
           
           {step === 'loading' && (
             <OnboardingLoader 
               url={url} 
               scrapedPageCount={scrapedPageCount}
               onReady={() => setStep('chat')} 
             />
           )}
        </>
      )}
    </div>
  );
};
