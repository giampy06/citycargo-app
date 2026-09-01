'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Forza prima la pulizia di eventuali sessioni residue
      await supabase.auth.signOut();

      // 2. Autenticazione stretta con password su Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error || !data?.user) {
        throw new Error('Email o password errati.');
      }

      // 3. Verifica del ruolo 'admin' nella tabella profili
      const { data: profilo, error: profError } = await supabase
        .from('profili')
        .select('ruolo')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profError || profilo?.ruolo !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Accesso negato: account non autorizzato per l\'area amministrativa.');
      }

      // Accesso confermato
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-[#1E293B] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-600/10 border border-red-500/20 text-[#E05353] rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">CITY CARGO ADMIN</h1>
          <p className="text-xs text-slate-400">Accesso Riservato al Personale Amministrativo</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Amministratore
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="admin@citycargo.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifica Credenziali...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Accedi alla Control Room
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <a href="/autista/login" className="text-[11px] text-slate-400 hover:text-slate-200">
            Sei un autista? <span className="text-[#E05353] font-bold">Vai al login autisti</span>
          </a>
        </div>
      </div>
    </div>
  );
}