'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Lock, Mail, Loader2, AlertCircle, User, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AutistaLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // true = Accedi, false = Registrati
  
  // Campi form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  
  // Spunta GDPR (obbligatoria solo per la registrazione)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // ---- LOGICA DI ACCESSO ----
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });
        if (error) throw new Error('Email o password errati.');
        router.push('/autista');

      } else {
        // ---- LOGICA DI REGISTRAZIONE ----
        if (!accettaPrivacy) {
          throw new Error('Devi accettare l\'Informativa sulla Privacy per poterti registrare.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (signUpError) throw new Error(signUpError.message);
        
        if (data.user) {
          // Inserisce l'autista nel database con stato 'in_attesa'
          const { error: dbError } = await supabase.from('autisti').insert([{
            id: data.user.id,
            email: email.trim().toLowerCase(),
            nome: nome,
            cognome: cognome,
            stato: 'in_attesa'
          }]);

          if (dbError) throw new Error('Errore durante la creazione del profilo.');
          
          alert('Registrazione completata! Attendi che l\'amministratore approvi il tuo account.');
          setIsLogin(true); // Torna alla schermata di login
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-3xl p-8 shadow-xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-50 border border-red-100 text-[#E05353] rounded-2xl mx-auto flex items-center justify-center shadow-sm">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">
            {isLogin ? 'Bentornato' : 'Crea Account'}
          </h1>
          <p className="text-xs text-gray-400">
            {isLogin ? 'Accedi al tuo portale conducente' : 'Registrati per iniziare i tuoi turni'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campi visibili solo durante la registrazione */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cognome</label>
                <input
                  type="text"
                  required
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"
              />
            </div>
          </div>

          {/* 🟢 SPUNTA PRIVACY OBBLIGATORIA (Solo Registrazione) */}
          {!isLogin && (
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="privacy"
                required
                checked={accettaPrivacy}
                onChange={(e) => setAccettaPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#E05353] bg-gray-100 border-gray-300 rounded focus:ring-[#E05353]"
              />
              <label htmlFor="privacy" className="text-[11px] text-gray-500 leading-tight font-medium">
                Ho letto e accetto l'
                <Link href="/privacy" target="_blank" className="text-[#E05353] font-bold hover:underline mx-1">
                  Informativa sulla Privacy (GDPR)
                </Link>
                e acconsento al trattamento dei miei dati personali, dei documenti e della geolocalizzazione per finalità lavorative.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              'Accedi al Portale'
            ) : (
              'Registrati Ora'
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
            className="text-[11px] text-gray-500 hover:text-gray-800 font-bold"
          >
            {isLogin ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </div>
      </div>
    </div>
  );
}