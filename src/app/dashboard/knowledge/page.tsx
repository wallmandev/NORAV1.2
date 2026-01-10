"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, FileText, Trash2, Globe, ExternalLink, Info } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchDocuments(user.id);
      } else {
        setIsLoading(false);
      }
    };
    getUserAndData();
  }, []);

  const fetchDocuments = async (userId: string) => {
    // Vi antar att company_id är samma som user.id i detta fall
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, metadata, created_at')
      .eq('company_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setIsLoading(false);
  };

  const handleResync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncMessage(null);
    
    // Här skulle du anropa din crawler-endpoint.
    // Exempel:
    // await fetch('/api/ingest', { 
    //   method: 'POST', 
    //   body: JSON.stringify({ url: user.user_metadata.website_url, companyId: user.id }) 
    // });
    
    // För demo-syfte simulerar vi en delay
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('Synkronisering startad! NORA läser in din hemsida i bakgrunden.');
      fetchDocuments(user.id);
      
      // Dölj meddelandet efter 5 sekunder
      setTimeout(() => setSyncMessage(null), 5000);
    }, 2000);
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Vill du ta bort denna sida från kunskapsbasen?")) return;
    
    const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
    if (!error) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Laddar kunskapsbas...</div>;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kunskapsbas</h2>
          <p className="text-slate-500">Hantera datan som NORA använder för att svara.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={handleResync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synkar...' : 'Synka om hemsida'}
          </button>
          {syncMessage && (
            <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <Info className="w-3.5 h-3.5" />
              {syncMessage}
            </div>
          )}
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-12 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-6">Källa / URL</div>
          <div className="col-span-4">Datum</div>
          <div className="col-span-2 text-right">Åtgärd</div>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Inga dokument hittades. Har du kört indexeringen?
            </div>
          ) : documents.map((doc) => (
            <div key={doc.id} className="p-4 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
              <div className="col-span-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <a href={doc.metadata?.source} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-900 hover:text-violet-600 flex items-center gap-1 group">
                    {doc.metadata?.source || "Okänd källa"}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <p className="text-xs text-slate-500">{doc.metadata?.title || "Ingen titel"}</p>
                </div>
              </div>
              <div className="col-span-4 text-sm text-slate-600">
                {new Date(doc.created_at).toLocaleDateString('sv-SE')}
              </div>
              <div className="col-span-2 text-right">
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Ta bort"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
