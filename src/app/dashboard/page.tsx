"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, FileText, Zap, ArrowRight, Code, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { OnboardingLoader } from '@/components/OnboardingLoader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardOverview() {
  const [stats, setStats] = useState({ leads: 0, pages: 0 });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Onboarding states
  const [setupUrl, setSetupUrl] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [scrapedCount, setScrapedCount] = useState<number | null>(null);

  const fetchStats = async (userId: string) => {
    // Hämta antal leads
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userId);

    // Hämta antal sidor i kunskapsbasen
    const { count: pagesCount } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userId);

    setStats({ 
      leads: leadsCount || 0, 
      pages: pagesCount || 0 
    });
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchStats(user.id);
      }
    };
    init();
  }, []);

  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUrl || !user) return;

    setIsTraining(true);
    setScrapedCount(null);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: setupUrl, companyId: user.id }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'scraped') {
              setScrapedCount(data.count);
            }
          } catch (e) {
            console.error("Error parsing stream", e);
          }
        }
      }
    } catch (error) {
      console.error("Training failed", error);
      setIsTraining(false); // Reset on error
    }
  };

  const onTrainingComplete = async () => {
    setIsTraining(false);
    if (user) await fetchStats(user.id);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Laddar dashboard...</div>;
  }

  // ONBOARDING VIEW: Om inga sidor finns, visa setup.
  if (stats.pages === 0 && !loading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Välkommen till NORA! 👋</h1>
            <p className="text-slate-300">Låt oss börja med att lära din assistent allt om ditt företag.</p>
          </div>

          <div className="p-8 md:p-12">
            {!isTraining ? (
              <div className="max-w-md mx-auto space-y-8">
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex gap-4 items-start">
                   <div className="p-2 bg-white rounded-lg shadow-sm text-violet-600">
                     <Globe className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-violet-900">Ange din hemsida</h3>
                     <p className="text-sm text-violet-700 mt-1">
                       Vi skannar din sajt och tränar AI:n automatiskt. Det tar cirka 30 sekunder.
                     </p>
                   </div>
                </div>

                <form onSubmit={handleStartTraining} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Webbadress (URL)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://dittföretag.se"
                      value={setupUrl}
                      onChange={(e) => setSetupUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 group"
                  >
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Starta Träning
                  </button>
                </form>
              </div>
            ) : (
              // Reuse existing loader component
              <div className="py-8">
                <OnboardingLoader 
                  url={setupUrl}
                  scrapedPageCount={scrapedCount}
                  onReady={onTrainingComplete}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STANDARD DASHBOARD CONTENT
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Välkommen tillbaka, {user?.email?.split('@')[0] || 'Användare'}! 👋</h2>
        <p className="text-slate-500 mt-2">Här är vad som händer med din AI-assistent just nu.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Antal Leads</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.leads}</h3>
            </div>
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <Link href="/dashboard/leads" className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
            Visa alla <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Inlärda sidor</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.pages}</h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <Link href="/dashboard/knowledge" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Hantera kunskapsbas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between h-40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-sm font-medium text-violet-100">Status</p>
            <h3 className="text-2xl font-bold mt-1 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
              NORA är online
            </h3>
          </div>
          <Zap className="w-24 h-24 text-white/10 absolute -right-4 -bottom-4 rotate-12" />
        </div>
      </div>

       {/* Quick Start / Next Steps */}
       <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
         <h3 className="font-semibold text-slate-900 mb-4">Kom igång snabbt</h3>
         <div className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard/install" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                 <Code className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 group-hover:text-violet-700">Installera Widgeten</h4>
                <p className="text-xs text-slate-500">Lägg till NORA på din hemsida.</p>
              </div>
            </Link>
            
            <Link href="/dashboard/knowledge" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                 <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 group-hover:text-violet-700">Träna NORA</h4>
                <p className="text-xs text-slate-500">Uppdatera kunskapsbasen med ny info.</p>
              </div>
            </Link>
         </div>
       </div>

    </div>
  );
}
