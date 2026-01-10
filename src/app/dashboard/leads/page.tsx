"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Phone, Calendar, MessageSquare, ChevronDown, Archive } from 'lucide-react';
import { motion } from 'framer-motion';

interface Lead {
  id: number;
  company_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  message: string | null;
  created_at: string;
}

export default function LeadsPage() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUserAndLeads = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchLeads(user.id);
      } else {
        setIsLoading(false);
      }
    };
    getUserAndLeads();
  }, []);

  const fetchLeads = async (userId: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data);
    }
    setIsLoading(false);
  };

  if (isLoading) return <div className="p-8 text-slate-400">Laddar leads...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Inkomna Leads</h2>
        <p className="text-slate-500">Personer som har chattat med NORA och lämnat uppgifter.</p>
      </header>

      <div className="grid gap-4">
        {leads.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Inga leads än</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">
              När besökare pratar med NORA och lämnar sina kontaktuppgifter kommer de att dyka upp här.
            </p>
          </div>
        ) : (
          leads.map((lead, idx) => (
            <motion.div 
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Contact Info */}
                <div className="md:w-1/3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">
                      {(lead.name || lead.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{lead.name || 'Okänd besökare'}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleString('sv-SE')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${lead.email}`} className="hover:text-violet-600">{lead.email}</a>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${lead.phone}`} className="hover:text-violet-600">{lead.phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message / Context */}
                <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Meddelande / Kontext</span>
                    {lead.message ? `"${lead.message}"` : <i className="text-slate-400">Inget meddelande sparat...</i>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-center border-l border-slate-100 pl-6 gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    Markera som hanterad
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Archive className="w-4 h-4" /> Arkivera
                  </button>
                </div>

              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
