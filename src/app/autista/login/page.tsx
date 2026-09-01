'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { Truck, Mail, Lock, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react';

export default function AutistaAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Email non ancora confermata: clicca sul link inviato alla tua casella di posta.');
          }
          throw error;
        }

        router.push('/autista');
      } else {
        // REGISTRAZIONE AUTISTA
        if (!nome || !cognome) {
          throw new Error('Inserisci nome e cognome.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            emailRedirectTo: 'https://citycargo-app.vercel.app/autista/login',
            data: {
              nome: nome.trim(),
              cognome: cognome.trim(),
              full_name: `${nome.trim()} ${cognome.trim()}`,
              ruolo: 'autista',
            },
          },
        });

        if (authError) throw authError;

        // Crea il record in anagrafica autisti
        await supabase.from('autisti').insert([
          {
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            stato: 'attivo',
          },
        ]);

        setSuccessMsg('Registrazione completata! Controlla la tua email per confermare l\'account prima di accedere.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Si è verificato un errore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-rose-50 text-[#E05353] rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">CITY CARGO</h1>
          <p className="text-xs text-gray-400 font-medium">Accesso Personale di Guida & Autisti</p>
        </div>

        {/* Switch Tab Accedi / Registrati */}
        <div className="flex bg-[#F8F9FB] p-1 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'login' ? 'bg-white text-[#1E242B] shadow-sm' : 'text-gray-500'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'register' ? 'bg-white text-[#1E242B] shadow-sm' : 'text-gray-500'
            }`}
          >
            Registrati
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Mario"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-3 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Cognome
                </label>
                <input
                  type="text"
                  required
                  placeholder="Rossi"
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl px-3 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="nome.cognome@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Elaborazione...
              </>
            ) : mode === 'login' ? (
              'Entra nell\'App Autista'
            ) : (
              'Crea Account Autista'
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/login" className="text-[11px] text-gray-400 hover:text-gray-600">
            Sei un amministratore? <span className="text-[#1E242B] font-bold">Accedi qui</span>
          </Link>
        </div>
      </div>
    </div>
  );
}