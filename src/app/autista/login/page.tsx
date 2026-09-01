'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Truck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Phone, 
  ShieldCheck, 
  Clock,
  Camera,
  Check
} from 'lucide-react';

export default function AutistaAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Dati Anagrafici
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [numeroPatente, setNumeroPatente] = useState('');
  const [scadenzaPatente, setScadenzaPatente] = useState('');
  const [possiedeCqc, setPossiedeCqc] = useState(false);
  const [scadenzaCqc, setScadenzaCqc] = useState('');

  // File Foto Documenti
  const [fotoPatenteFronte, setFotoPatenteFronte] = useState<File | null>(null);
  const [fotoPatenteRetro, setFotoPatenteRetro] = useState<File | null>(null);
  const [fotoCodiceFiscale, setFotoCodiceFiscale] = useState<File | null>(null);
  const [fotoCqc, setFotoCqc] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [accountInAttesa, setAccountInAttesa] = useState(false);

  // Helper per caricamento foto su Supabase Storage
  const uploadDocFile = async (file: File, folder: string, prefix: string) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documenti-autisti').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documenti-autisti').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setAccountInAttesa(false);
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
            throw new Error('Email non ancora confermata: clicca sul link inviato alla tua casella email.');
          }
          throw error;
        }

        const { data: autistaData } = await supabase
          .from('autisti')
          .select('stato')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (autistaData && autistaData.stato === 'in_attesa') {
          await supabase.auth.signOut();
          setAccountInAttesa(true);
          return;
        }

        if (autistaData && autistaData.stato === 'sospeso') {
          await supabase.auth.signOut();
          throw new Error('Il tuo profilo è attualmente sospeso dalla direzione.');
        }

        router.push('/autista');
      } else {
        // REGISTRAZIONE CON FOTO DOCUMENTI
        if (!nome || !cognome || !telefono || !numeroPatente || !scadenzaPatente) {
          throw new Error('Compila tutti i campi anagrafici e della patente.');
        }

        if (!fotoPatenteFronte || !fotoPatenteRetro) {
          throw new Error('Allega obbligatoriamente le foto della Patente (Fronte e Retro).');
        }

        setUploadStatus('Creazione account...');
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

        const safeFolder = email.replace(/[^a-zA-Z0-9]/g, '_');

        setUploadStatus('Caricamento foto Patente Fronte...');
        const urlFronte = await uploadDocFile(fotoPatenteFronte, safeFolder, 'patente_fronte');

        setUploadStatus('Caricamento foto Patente Retro...');
        const urlRetro = await uploadDocFile(fotoPatenteRetro, safeFolder, 'patente_retro');

        let urlCf = null;
        if (fotoCodiceFiscale) {
          setUploadStatus('Caricamento Codice Fiscale...');
          urlCf = await uploadDocFile(fotoCodiceFiscale, safeFolder, 'codice_fiscale');
        }

        let urlCqcDoc = null;
        if (possiedeCqc && fotoCqc) {
          setUploadStatus('Caricamento foto CQC...');
          urlCqcDoc = await uploadDocFile(fotoCqc, safeFolder, 'cqc');
        }

        setUploadStatus('Salvataggio profilo...');
        const { error: dbErr } = await supabase.from('autisti').insert([
          {
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono.trim(),
            codice_fiscale: codiceFiscale.trim().toUpperCase() || null,
            numero_patente: numeroPatente.trim().toUpperCase(),
            scadenza_patente: scadenzaPatente,
            possiede_cqc: possiedeCqc,
            scadenza_cqc: possiedeCqc && scadenzaCqc ? scadenzaCqc : null,
            foto_patente_fronte: urlFronte,
            foto_patente_retro: urlRetro,
            foto_codice_fiscale: urlCf,
            foto_cqc: urlCqcDoc,
            stato: 'in_attesa',
          },
        ]);

        if (dbErr) throw dbErr;

        setSuccessMsg('Registrazione completata e documenti caricati! Conferma la tua email dal link che ti abbiamo inviato. Non appena l\'amministratore verificherà i tuoi documenti potrai accedere all\'app.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Si è verificato un errore.');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-rose-50 text-[#E05353] rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-2">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-[#1E242B] tracking-tight">CITY CARGO</h1>
          <p className="text-xs text-gray-400 font-medium">Portale Personale di Guida</p>
        </div>

        {/* Tab Accedi / Registrati */}
        <div className="flex bg-[#F8F9FB] p-1 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); setAccountInAttesa(false); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'login' ? 'bg-white text-[#1E242B] shadow-sm' : 'text-gray-500'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); setAccountInAttesa(false); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
              mode === 'register' ? 'bg-white text-[#1E242B] shadow-sm' : 'text-gray-500'
            }`}
          >
            Registrati
          </button>
        </div>

        {accountInAttesa && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Clock className="w-4 h-4 text-amber-600" />
              Documenti in Revisione
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Le foto dei tuoi documenti sono state trasmesse all'amministrazione. L'account sarà abilitato dopo la convalida.
            </p>
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              {/* Dati Anagrafici */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Mario"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cognome</label>
                  <input
                    type="text"
                    required
                    placeholder="Rossi"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cellulare / WA</label>
                  <input
                    type="tel"
                    required
                    placeholder="340 1234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Codice Fiscale</label>
                  <input
                    type="text"
                    placeholder="RSSMRA..."
                    value={codiceFiscale}
                    onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              {/* Dati e Foto Documenti */}
              <div className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-extrabold text-[#1E242B] uppercase tracking-wider block">
                  Dati & Foto Patente di Guida
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">N° Patente</label>
                    <input
                      type="text"
                      required
                      placeholder="U1234567X"
                      value={numeroPatente}
                      onChange={(e) => setNumeroPatente(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Scadenza</label>
                    <input
                      type="date"
                      required
                      value={scadenzaPatente}
                      onChange={(e) => setScadenzaPatente(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                    />
                  </div>
                </div>

                {/* Scatto Foto Patente Fronte e Retro */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-center transition ${
                    fotoPatenteFronte ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-white hover:border-[#E05353]'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setFotoPatenteFronte(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {fotoPatenteFronte ? <Check className="w-5 h-5 text-emerald-600 mb-1" /> : <Camera className="w-5 h-5 text-[#E05353] mb-1" />}
                    <span className="text-[10px] font-bold text-gray-700">Patente Fronte</span>
                    <span className="text-[9px] text-gray-400">{fotoPatenteFronte ? '✓ Allegata' : 'Scatta/Carica'}</span>
                  </label>

                  <label className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-center transition ${
                    fotoPatenteRetro ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-white hover:border-[#E05353]'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setFotoPatenteRetro(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {fotoPatenteRetro ? <Check className="w-5 h-5 text-emerald-600 mb-1" /> : <Camera className="w-5 h-5 text-[#E05353] mb-1" />}
                    <span className="text-[10px] font-bold text-gray-700">Patente Retro</span>
                    <span className="text-[9px] text-gray-400">{fotoPatenteRetro ? '✓ Allegata' : 'Scatta/Carica'}</span>
                  </label>
                </div>

                {/* Foto Codice Fiscale (Opzionale) */}
                <label className={`border border-dashed rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition ${
                  fotoCodiceFiscale ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-white'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoCodiceFiscale(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-700">Foto Codice Fiscale / Tessera Sanitaria</span>
                  </div>
                  <span className="text-[9px] text-gray-400">{fotoCodiceFiscale ? '✓ OK' : 'Opzionale'}</span>
                </label>

                {/* CQC */}
                <div className="pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={possiedeCqc}
                      onChange={(e) => setPossiedeCqc(e.target.checked)}
                      className="rounded text-[#E05353] focus:ring-[#E05353]"
                    />
                    <span className="text-[11px] font-bold text-gray-700">Possiedo CQC Merci</span>
                  </label>
                  {possiedeCqc && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="date"
                        value={scadenzaCqc}
                        onChange={(e) => setScadenzaCqc(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                      />
                      <label className="border border-dashed border-gray-300 bg-white rounded-xl p-2 flex items-center justify-between cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFotoCqc(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <span className="text-[10px] font-bold text-gray-700">Foto Documento CQC</span>
                        <span className="text-[9px] text-gray-400">{fotoCqc ? '✓ Allegata' : 'Carica'}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
              Email di Login
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="mario.rossi@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
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
                className="w-full bg-[#F8F9FB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-rose-600/20 flex flex-col items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadStatus || 'Elaborazione...'}
              </span>
            ) : mode === 'login' ? (
              'Entra nell\'App Autista'
            ) : (
              'Invia Registrazione e Foto Documenti'
            )}
          </button>
        </form>

        <div className="text-center pt-1">
          <Link href="/login" className="text-[11px] text-gray-400 hover:text-gray-600">
            Sei un amministratore? <span className="text-[#1E242B] font-bold">Accedi qui</span>
          </Link>
        </div>
      </div>
    </div>
  );
}