"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, AlertCircle, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  const fromSignup = searchParams.get('from_signup');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check specifically for "Email not confirmed" error
      if (error.message.includes("Email not confirmed")) {
        setNeedsVerification(true);
      } else {
        setErrorMsg(error.message === "Invalid login credentials" 
          ? "Fel e-post eller lösenord." 
          : error.message);
      }
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Link href="/" className="mb-8 text-3xl font-bold tracking-tight text-slate-900">
          NORA<span className="text-violet-600">.ai</span>
        </Link>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Verifiera din e-post</h2>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
              Vi har skickat en verifieringslänk till <strong>{email}</strong>. 
              Du måste klicka på den för att aktivera ditt konto och logga in.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 mb-8 border border-slate-100">
              <p className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Hittar du inte mailet?
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Kontrollera din skräppost/spam-mapp</li>
                <li>Vänta några minuter, det kan ta en stund</li>
                <li>Kontrollera att du stavade rätt på e-postadressen</li>
              </ul>
            </div>

            <button
              onClick={() => setNeedsVerification(false)}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Tillbaka till inloggning
            </button>
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
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Välkommen tillbaka</h2>
          
          {verified && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">E-mail bekräftad!</p>
                <p>Du kan nu logga in med dina uppgifter.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
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
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-sm text-slate-500 border-t border-slate-100">
          Inget konto än? <Link href="/signup" className="text-violet-600 font-medium hover:underline">Registrera dig</Link>
        </div>
      </div>
    </div>
  );
}
