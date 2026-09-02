'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Lock, Mail, Loader2, AlertCircle, User, ShieldCheck, Phone, CreditCard, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function AutistaLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); 
  
  // Campi base
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  
  // Campi Anagrafica Avanzata (Patente & Telefono)
  const [telefono, setTelefono] = useState('');
  const [numeroPatente, setNumeroPatente] = useState('');
  const [fotoFronte, setFotoFronte] = useState<File | null>(null);
  const [fotoRetro, setFotoRetro] = useState<File | null>(null);

  // Spunta GDPR (obbligatoria)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
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
        // ---- LOGICA DI REGISTRAZIONE AVANZATA ----
        if (!accettaPrivacy) {
          throw new Error('Devi accettare l\'Informativa sulla Privacy per registrarti.');
        }
        if (!fotoFronte || !fotoRetro) {
          throw new Error('Devi caricare entrambe le foto della patente (Fronte e Retro).');
        }

        // 1. Registrazione in Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (signUpError) throw new Error(signUpError.message);
        
        if (authData.user) {
          // 2. Upload Foto Patente Fronte nel bucket (usiamo documenti-veicoli che ha le policy aperte)
          const extFronte = fotoFronte.name.split('.').pop();
          const pathFronte = `patenti/${authData.user.id}_fronte.${extFronte}`;
          const { error: errFronte } = await supabase.storage.from('documenti-veicoli').upload(pathFronte, fotoFronte);
          if (errFronte) throw new Error('Errore nel caricamento della foto Patente Fronte.');
          const urlFronte = supabase.storage.from('documenti-veicoli').getPublicUrl(pathFronte).data.publicUrl;

          // 3. Upload Foto Patente Retro
          const extRetro = fotoRetro.name.split('.').pop();
          const pathRetro = `patenti/${authData.user.id}_retro.${extRetro}`;
          const { error: errRetro } = await supabase.storage.from('documenti-veicoli').upload(pathRetro, fotoRetro);
          if (errRetro) throw new Error('Errore nel caricamento della foto Patente Retro.');
          const urlRetro = supabase.storage.from('documenti-veicoli').getPublicUrl(pathRetro).data.publicUrl;

          // 4. Salvataggio Profilo Autista Completo (con stato 'in_attesa')
          const { error: dbError } = await supabase.from('autisti').insert([{
            id: authData.user.id,
            email: email.trim().toLowerCase(),
            nome: nome,
            cognome: cognome,
            telefono: telefono,
            numero_patente: numeroPatente,
            foto_patente_fronte: urlFronte,
            foto_patente_retro: urlRetro,
            stato: 'in_attesa' // <-- Bloccato in attesa di approvazione dal gestionale admin
          }]);

          if (dbError) throw new Error('Errore durante il salvataggio dei dati nel database.');
          
          setSuccessMsg('Registrazione completata! I tuoi documenti sono in fase di revisione. Attendi l\'approvazione dell\'amministratore prima di poter accedere.');
          setIsLogin(true); // Torna automaticamente alla schermata di login
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 antialiased font-sans py-10">
      <div className={`w-full bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 ${isLogin ? 'max-w-md' : 'max-w-2xl'}`}>
        
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-50 border border-red-100 text-[#E05353] rounded-2xl mx-auto flex items-center justify-center shadow-sm">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">
            {isLogin ? 'Bentornato' : 'Candidatura Autista'}
          </h1>
          <p className="text-xs text-gray-400">
            {isLogin ? 'Accedi al tuo portale conducente' : 'Compila tutti i campi per registrarti e inviare i tuoi documenti'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* GRIGLIA CAMPI REGISTRAZIONE */}
          {!isLogin && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cognome</label>
                  <input type="text" required value={cognome} onChange={(e) => setCognome(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"/>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Telefono</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"/>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">N° Patente</label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="text" required placeholder="es. U12345678" value={numeroPatente} onChange={(e) => setNumeroPatente(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold uppercase focus:outline-none focus:border-[#E05353]"/>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Scansione Patente Fronte</label>
                  <div className="relative">
                    <input type="file" accept="image/*" required onChange={(e) => setFotoFronte(e.target.files?.[0] || null)} className="w-full bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-[11px] font-medium file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#E05353] file:text-white hover:file:bg-[#c94545] cursor-pointer"/>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Scansione Patente Retro</label>
                  <div className="relative">
                    <input type="file" accept="image/*" required onChange={(e) => setFotoRetro(e.target.files?.[0] || null)} className="w-full bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-[11px] font-medium file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#E05353] file:text-white hover:file:bg-[#c94545] cursor-pointer"/>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CAMPI SEMPRE VISIBILI (EMAIL E PASSWORD) */}
          <div className={`grid grid-cols-1 ${!isLogin ? 'sm:grid-cols-2 gap-4' : 'gap-4'}`}>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 text-[#1E242B] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#E05353]"/>
              </div>
            </div>
          </div>

          {/* 🟢 SPUNTA PRIVACY OBBLIGATORIA (Solo Registrazione) */}
          {!isLogin && (
            <div className="flex items-start gap-2 pt-2 border-t border-gray-100 mt-4">
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
                e acconsento al trattamento dei miei dati personali, al caricamento dei miei documenti d'identità e alla geolocalizzazione per finalità lavorative.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              'Accedi al Portale'
            ) : (
              'Invia Candidatura e Documenti'
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-[11px] text-gray-500 hover:text-gray-800 font-bold"
          >
            {isLogin ? "Nuovo autista? Clicca qui per registrarti" : "Hai già un account? Torna al Login"}
          </button>
        </div>
      </div>
    </div>
  );
}