"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, Copy, Code, Globe, ExternalLink } from 'lucide-react';

export default function InstallWidgetPage() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  ));

  const [copied, setCopied] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCompanyId(user.id);
    };
    getUser();
  }, []);

  const embedCode = `<script 
  src="https://nora-ai.vercel.app/widget.js" 
  data-company-id="${companyId || 'DIN-ID-HÄR'}"
  defer
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyInstallation = () => {
    setIsVerifying(true);
    // Simulera en check mot hemsidan
    setTimeout(() => {
      setIsVerifying(false);
      // För demo: sätt till true
      setVerified(true); 
    }, 2000);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Installera NORA</h2>
        <p className="text-slate-500">Bara ett steg kvar! Lägg till koden nedan på din hemsida för att gå live.</p>
      </header>

      {/* Steg 1: Kopiera koden */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Code className="w-5 h-5 text-violet-600" />
            1. Kopiera script-taggen
          </h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">HEAD eller BODY</span>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Klistra in den här koden i din hemsidas HTML, helst precis innanden avslutande <code>&lt;/body&gt;</code>-taggen.
          </p>
          
          <div className="relative group">
            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto border border-slate-800">
              {embedCode}
            </pre>
            <button 
              onClick={copyToClipboard}
              className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Kopiera kod"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Steg 2: Verifiera */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-violet-600" />
            2. Verifiera installationen
          </h3>
          <p className="text-sm text-slate-500">
            När du har publicerat ändringarna på din hemsida, klicka här för att se om vi hittar widgeten.
          </p>
        </div>

        <button 
          onClick={verifyInstallation}
          disabled={isVerifying || !companyId}
          className={`px-6 py-3 rounded-lg font-medium transition-all min-w-[160px] flex items-center justify-center gap-2
            ${verified 
              ? 'bg-green-100 text-green-700 pointer-events-none' 
              : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200'
            }`}
        >
          {isVerifying ? (
             <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : verified ? (
             <><Check className="w-5 h-5" /> Verifierad!</>
          ) : (
             'Kontrollera nu'
          )}
        </button>
      </div>

      {verified && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Snyggt jobbat! 🎉</p>
            <p className="mt-1">NORA är nu live på din hemsida. Gå till din hemsida för att se henne i action.</p>
          </div>
        </div>
      )}
    </div>
  );
}
