"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Sparkles, Check, AlertCircle, Mail } from 'lucide-react';
import Link from 'next/link';

function SignUpForm() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  ));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Vi ignorerar demo-parametrar nu enligt önskemål
  // const demoCompanyId = searchParams.get('companyId');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=true`,
        data: {
          // Inget demo-data att migrera
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Om mailbekräftelse krävs är session null
      if (data.user && !data.session) {
        setShowSuccess(true);
      } else {
        // Om auto-confirm är påskruvat
        router.push('/dashboard');
      }
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Link href="/" className="mb-8 text-3xl font-bold tracking-tight text-slate-900">
          NORA<span className="text-violet-600">.ai</span>
        </Link>
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Bekräfta din e-post</h2>
            <p className="text-slate-500 mb-6">
                Vi har skickat en verifieringslänk till <span className="font-semibold text-slate-700">{email}</span>.
                Klicka på länken i mailet för att aktivera ditt konto och logga in.
            </p>
            <div className="text-sm text-slate-400">
                <p>Hittar du inte mailet? Kolla i skräpposten.</p>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100">
                <Link href="/login" className="text-violet-600 font-medium hover:underline flex items-center justify-center gap-2">
                    Gå till inloggning <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-bold tracking-tight text-slate-900">
        NORA<span className="text-violet-600">.ai</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Borttagen demo-banner */}

        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Skapa konto</h2>
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-post</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="namn@företag.se"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lösenord</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Skapar konto...' : <>Spara & Fortsätt <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 space-y-3">
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <Check className="w-4 h-4 text-green-500" /> Ingen kreditkort krävs
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <Check className="w-4 h-4 text-green-500" /> 14 dagars gratis testperiod
             </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-sm text-slate-500 border-t border-slate-100">
          Har du redan ett konto? <Link href="/login" className="text-violet-600 font-medium hover:underline">Logga in</Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full"></div>
       </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
