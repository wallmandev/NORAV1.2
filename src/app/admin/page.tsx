"use client";

import React, { useEffect, useState } from 'react'; // React import
import { motion } from 'framer-motion';
import { Users, Mail, Phone, Calendar, MessageSquare, RefreshCw, ChevronRight, Trash2, AlertCircle } from 'lucide-react';

interface Lead {
  id: number;
  email: string;
  phone: string;
  message: string;
  created_at: string;
  company_id: string;
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funktion för att radera lead (GDPR: Rätten att bli glömd)
  const handleDelete = async (id: number) => {
    if (!window.confirm('Är du säker? Detta raderar personuppgifterna permanent för att följa GDPR.')) {
      return;
    }
    
    setError(null);

    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Kunde inte radera');
      
      // Uppdatera listan lokalt
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      console.error(e);
      setError('Ett fel uppstod när leadet skulle raderas.');
      setTimeout(() => setError(null), 5000); // Clear after 5s
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/leads'); // Hämta alla leads
      const data = await res.json();
      if (data.leads) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Leads Dashboard</h1>
            <p className="text-slate-500">Här samlas alla kontaktuppgifter som NORA fångat upp.</p>
          </div>
          <button 
            onClick={fetchLeads}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Uppdatera
          </button>
        </header>

        {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                {error}
            </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Totalt antal leads</p>
              <h3 className="text-2xl font-bold text-slate-800">{leads.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Har e-post</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {leads.filter(l => l.email).length}
              </h3>
            </div>
          </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Har telefonnr</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {leads.filter(l => l.phone).length}
              </h3>
            </div>
          </div>
        </div>

        {/* Leads List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-lg text-slate-800">Senaste aktivitet</h2>
            <span className="text-xs font-medium px-2 py-1 bg-violet-100 text-violet-700 rounded-full">
              Live
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {leads.length === 0 && !isLoading && (
              <div className="p-12 text-center text-slate-400">
                <p>Inga leads hittade än. Prata med NORA och lämna dina uppgifter!</p>
              </div>
            )}

            {leads.map((lead, idx) => (
              <motion.div 
                key={lead.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 hover:bg-slate-50 transition-colors group flex flex-col md:flex-row gap-6 md:items-center"
              >
                {/* Icon / Avatar */}
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                    {(lead.email || lead.phone || '?')[0].toUpperCase()}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Contact Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-900 font-medium truncate">
                      {lead.email ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{lead.email}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Ingen e-post</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                      {lead.phone ? (
                        <>
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.phone}</span>
                        </>
                      ) : (
                         <span className="text-slate-400 italic text-xs">Inget telefonnr</span>
                      )}
                    </div>
                  </div>

                  {/* Message Context */}
                  <div className="md:col-span-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                       <MessageSquare className="w-4 h-4 text-violet-300 absolute -top-2 -left-2 bg-white rounded-full" />
                       <p className="text-sm text-slate-600 line-clamp-2 italic">
                         "{lead.message}"
                       </p>
                    </div>
                  </div>
                
                </div>

                {/* Meta / Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-4 md:mt-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap" title={new Date(lead.created_at).toLocaleString()}>
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(lead.created_at).toLocaleDateString('sv-SE')} 
                    <span className="text-slate-300">|</span>
                    {new Date(lead.created_at).toLocaleTimeString('sv-SE', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(lead.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"
                      title="Radera personuppgifter (GDPR)"
                    >
                      <Trash2 className="w-3 h-3" /> Radera
                    </button>
                    <button className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                      Visa detaljer <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
