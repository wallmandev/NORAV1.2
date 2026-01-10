"use client";

import React, { useState } from 'react';
import { BookOpen, CheckCircle, ThumbsDown, ArrowRight, Check } from 'lucide-react';

export default function TrainingPage() {
  // Mock data för demo
  const [unanswered, setUnanswered] = useState([
    { id: 1, question: "Har ni studentrabatt?", date: "2024-01-09", count: 3 },
    { id: 2, question: "Kan man betala med swish?", date: "2024-01-08", count: 1 },
  ]);
  const [justTrained, setJustTrained] = useState<number | null>(null);

  const handleTrain = (id: number) => {
    // Visa "Sparat!"-state snabbt innan vi tar bort frågan
    setJustTrained(id);
    
    // Vänta en kort stund för animation (600ms), sen ta bort från listan
    setTimeout(() => {
        setUnanswered(prev => prev.filter(q => q.id !== id));
        setJustTrained(null);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Träna NORA</h2>
        <p className="text-slate-500">Här samlas frågor NORA var osäker på. Lär henne rätt svar!</p>
      </header>

      <div className="grid gap-4">
        {unanswered.length === 0 ? (
          <div className="bg-green-50 rounded-xl p-8 text-center text-green-800 border border-green-100">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold text-lg">Bra jobbat!</h3>
            <p>Inga obesvarade frågor just nu. NORA har koll på läget.</p>
          </div>
        ) : (
          unanswered.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" /> Osäker
                    </span>
                    <span className="text-xs text-slate-400">Ställd {item.count} gånger</span>
                    <span className="text-xs text-slate-400 ml-auto">{item.date}</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">"{item.question}"</h3>
                </div>
                
                <div className="flex-1 flex gap-2 items-start">
                  <textarea 
                    className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                    rows={2}
                    placeholder="Skriv det korrekta svaret här..."
                  />
                  <button 
                    onClick={() => handleTrain(item.id)}
                    className={`shrink-0 p-3 rounded-lg transition-all duration-300 ${
                        justTrained === item.id 
                            ? "bg-green-500 text-white scale-105" 
                            : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                    title="Spara svar"
                    disabled={justTrained === item.id}
                  >
                    {justTrained === item.id ? (
                        <Check className="w-5 h-5 animate-in zoom-in spin-in-90 duration-300" />
                    ) : (
                        <ArrowRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 text-center mt-8">
        <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <h4 className="text-slate-900 font-medium">Lägg till egen fråga & svar</h4>
        <p className="text-sm text-slate-500 mb-4">Vet du något som kunderna ofta undrar?</p>
        <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 font-medium">
          Skapa ny träningsfråga
        </button>
      </div>
    </div>
  );
}
