'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { Truck, Lock, Mail, User, Phone, CreditCard, Calendar, UploadCloud, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function AutistaAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regTaxCode, setRegTaxCode] = useState('');
  const [regLicenseNumber, setRegLicenseNumber] = useState('');
  const [regLicenseExpiry, setRegLicenseExpiry] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });

      if (error) {
        setErrorMsg('Email o password errati.');
      } else if (data?.session) {
        router.push('/autista');
      }
    } catch {
      setErrorMsg('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!licenseFile) {
      setErrorMsg('Carica la scansione o foto fronte/retro della patente.');
      setLoading(false);
      return;
    }

    try {
      // 1. Creazione account Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword.trim(),
        options: {
          data: {
            full_name: regFullName.trim(),
          },
        },
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Impossibile creare account utente.');

      // 2. Upload file documento su Storage
      const fileExt = licenseFile.name.split('.').pop();
      const filePath = `licenses/${userId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, licenseFile);

      let publicUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      // 3. Salvataggio record anagrafico completo
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          id: userId,
          email: regEmail.trim(),
          full_name: regFullName.trim(),
          phone: regPhone.trim(),
          tax_code: regTaxCode.trim().toUpperCase(),
          license_number: regLicenseNumber.trim().toUpperCase(),
          license_expiry: regLicenseExpiry,
          license_file_url: publicUrl,
          status: 'attivo',
        });

      if (profileError) throw profileError;

      setSuccessMsg('Registrazione completata con successo! Stai per essere reindirizzato...');
      setTimeout(() => {
        router.push('/autista');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center mb-3 text-red-500 shadow-inner">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">City Cargo Autisti</h1>
          <p className="text-xs text-slate-400 mt-0.5">Terminale Personale di Bordo</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0F172A] p-1 rounded-xl border border-slate-700 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
              mode === 'login' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
              mode === 'register' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Primo Accesso / Registrati
          </button>
        </div>

        {/* Notifiche Errore / Successo */}
        {errorMsg && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 text-red-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3 text-emerald-400 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          /* FORM LOGIN */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="autista@citycargo.it"
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entra in Servizio'}
            </button>
          </form>
        ) : (
          /* FORM REGISTRAZIONE COMPLETA */
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome e Cognome</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="mario@citycargo.it"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Telefono</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+39 333 1234567"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Codice Fiscale</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regTaxCode}
                    onChange={(e) => setRegTaxCode(e.target.value)}
                    placeholder="RSSMRA80A01F205X"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs uppercase placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Numero Patente</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regLicenseNumber}
                    onChange={(e) => setRegLicenseNumber(e.target.value)}
                    placeholder="U12345678X"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs uppercase placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Scadenza Patente</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={regLicenseExpiry}
                    onChange={(e) => setRegLicenseExpiry(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl py-2 pl-10 pr-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Upload Patente */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Foto/Documento Patente (Fronte/Retro o PDF)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-3 text-center cursor-pointer transition relative bg-[#0F172A]">
                <input
                  type="file"
                  required
                  accept="image/*,.pdf"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-red-400 mb-1" />
                  <span className="text-xs text-slate-300">
                    {licenseFile ? licenseFile.name : 'Tocca per allegare la patente'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrazione in corso...</span>
                </>
              ) : (
                'Completa Registrazione'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}