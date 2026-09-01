'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Users, 
  ChevronLeft, 
  Plus, 
  Search, 
  RefreshCw, 
  X, 
  Loader2, 
  AlertCircle, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle,
  FileBadge,
  MessageSquare,
  KeyRound,
  Lock
} from 'lucide-react';

export default function AutistiPage() {
  const router = useRouter();
  const [autisti, setAutisti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAppalto, setFiltroAppalto] = useState<string>('TUTTI');
  const [ricerca, setRicerca] = useState('');

  // Modale Nuovo Autista
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appaltoDefault, setAppaltoDefault] = useState<'CITI' | 'EDF' | 'RHENUS'>('CITI');
  const [numeroPatente, setNumeroPatente] = useState('');
  const [scadenzaPatente, setScadenzaPatente] = useState('');
  const [possiedeCqc, setPossiedeCqc] = useState(false);
  const [scadenzaCqc, setScadenzaCqc] = useState('');

  const fetchAutisti = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('autisti')
        .select('*')
        .order('cognome', { ascending: true });

      if (error) throw error;
      setAutisti(data || []);
    } catch (err: any) {
      console.error('Errore recupero autisti:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutisti();
  }, []);

  const getScadenzaBadge = (dataStr: string | null) => {
    if (!dataStr) return { label: 'Non impostata', color: 'bg-gray-50 text-gray-500 border-gray-200' };
    const oggi = new Date();
    const scadenza = new Date(dataStr);
    const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

    if (diffGiorni < 0) return { label: `Scaduta (${Math.abs(diffGiorni)} gg fa)`, color: 'bg-rose-50 text-[#E05353] border-rose-200' };
    if (diffGiorni <= 30) return { label: `Scade tra ${diffGiorni} gg`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: `Regolare (${diffGiorni} gg)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const handleCreateAutista = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (!email || !password || !nome || !cognome) {
        throw new Error('Nome, cognome, email e password sono obbligatori.');
      }

      // 1. Registrazione account in Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
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

      // 2. Inserimento scheda anagrafica autisti
      const { error: dbError } = await supabase.from('autisti').insert([
        {
          nome: nome.trim(),
          cognome: cognome.trim(),
          codice_fiscale: codiceFiscale?.trim().toUpperCase() || null,
          telefono: telefono?.trim() || null,
          email: email.trim().toLowerCase(),
          appalto_default: appaltoDefault || 'CITI',
          numero_patente: numeroPatente?.trim().toUpperCase() || null,
          scadenza_patente: scadenzaPatente || null,
          possiede_cqc: possiedeCqc || false,
          scadenza_cqc: possiedeCqc && scadenzaCqc ? scadenzaCqc : null,
          stato: 'attivo',
        },
      ]);

      if (dbError) throw dbError;

      // Reset form
      setNome('');
      setCognome('');
      setCodiceFiscale('');
      setTelefono('');
      setEmail('');
      setPassword('');
      setNumeroPatente('');
      setScadenzaPatente('');
      setPossiedeCqc(false);
      setScadenzaCqc('');
      setIsModalOpen(false);

      fetchAutisti();
      alert(`Autista registrato con successo!\nÈ stata inviata un'email di verifica all'indirizzo: ${email}`);
    } catch (err: any) {
      setModalError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStato = async (id: string, nuovoStato: string) => {
    try {
      const { error } = await supabase
        .from('autisti')
        .update({ stato: nuovoStato })
        .eq('id', id);

      if (error) throw error;
      setAutisti(autisti.map(a => a.id === id ? { ...a, stato: nuovoStato } : a));
    } catch (err: any) {
      alert(`Errore aggiornamento stato: ${err.message}`);
    }
  };

  const autistiFiltrati = autisti.filter(a => {
    const matchAppalto = filtroAppalto === 'TUTTI' || a.appalto_default === filtroAppalto;
    const nomeCompleto = `${a.nome} ${a.cognome}`.toLowerCase();
    const matchRicerca = nomeCompleto.includes(ricerca.toLowerCase()) || 
                         (a.codice_fiscale && a.codice_fiscale.toLowerCase().includes(ricerca.toLowerCase())) ||
                         (a.telefono && a.telefono.includes(ricerca));
    return matchAppalto && matchRicerca;
  });

  const patentiInScadenza = useMemo(() => {
    const oggi = new Date();
    return autisti.filter(a => {
      if (!a.scadenza_patente) return false;
      const scad = new Date(a.scadenza_patente);
      const diff = Math.ceil((scad.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 30;
    }).length;
  }, [autisti]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">Anagrafica Personale & Autisti</h1>
              <p className="text-[11px] text-gray-400 font-medium">Controllo Patenti, CQC e Account Operativi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchAutisti}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-10 px-4 rounded-2xl bg-[#E05353] hover:bg-[#c94545] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Nuovo Autista
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* KPI Cards Risorse Umane */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Conducenti Totali</div>
            <div className="text-2xl font-black mt-1 text-[#1E242B]">{autisti.length}</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">👥 In Organico</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Patenti in Scadenza</div>
            <div className={`text-2xl font-black mt-1 ${patentiInScadenza > 0 ? 'text-[#E05353]' : 'text-emerald-600'}`}>
              {patentiInScadenza}
            </div>
            <div className="text-[11px] font-medium text-gray-500 mt-1">Entro 30 giorni</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Autisti Attivi</div>
            <div className="text-2xl font-black mt-1 text-emerald-600">
              {autisti.filter(a => a.stato === 'attivo').length}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">🟢 Con Credenziali Attive</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ferie / Assenti</div>
            <div className="text-2xl font-black mt-1 text-amber-600">
              {autisti.filter(a => a.stato === 'ferie' || a.stato === 'malattia').length}
            </div>
            <div className="text-[11px] font-medium text-amber-600 mt-1">🟡 Non disponibili</div>
          </div>
        </div>

        {/* Ricerca e Filtri */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca autista per nome, CF o telefono..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['TUTTI', 'CITI', 'EDF', 'RHENUS'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltroAppalto(f)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filtroAppalto === f
                    ? 'bg-[#1E242B] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Griglia Autisti */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento anagrafica autisti...
          </div>
        ) : autistiFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100">
            Nessun autista trovato. Clicca su "+ Nuovo Autista" per inserire il primo conducente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {autistiFiltrati.map((autista) => {
              const patenteStatus = getScadenzaBadge(autista.scadenza_patente);
              const cqcStatus = autista.possiede_cqc ? getScadenzaBadge(autista.scadenza_cqc) : null;

              return (
                <div 
                  key={autista.id} 
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-50 text-[#E05353]">
                        {autista.appalto_default}
                      </span>
                      
                      <select
                        value={autista.stato || 'attivo'}
                        onChange={(e) => handleUpdateStato(autista.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 focus:ring-0 cursor-pointer ${
                          autista.stato === 'attivo' ? 'bg-emerald-50 text-emerald-700' :
                          autista.stato === 'ferie' ? 'bg-blue-50 text-blue-700' :
                          autista.stato === 'malattia' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-[#E05353]'
                        }`}
                      >
                        <option value="attivo">● ATTIVO</option>
                        <option value="ferie">● IN FERIE</option>
                        <option value="malattia">● MALATTIA</option>
                        <option value="sospeso">● SOSPESO</option>
                      </select>
                    </div>

                    <div className="mt-3">
                      <h2 className="text-lg font-black text-[#1E242B] tracking-tight capitalize">
                        {autista.nome} {autista.cognome}
                      </h2>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        {autista.email}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono font-bold uppercase mt-0.5">
                        {autista.codice_fiscale || 'CF non inserito'}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 text-xs bg-[#F8F9FB] p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Scad. Patente:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${patenteStatus.color}`}>
                          {patenteStatus.label}
                        </span>
                      </div>

                      {autista.possiede_cqc && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                            <FileBadge className="w-3.5 h-3.5 text-gray-400" /> Scadenza CQC:
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cqcStatus?.color}`}>
                            {cqcStatus?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                    {autista.telefono ? (
                      <>
                        <a
                          href={`tel:${autista.telefono}`}
                          className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          Chiama
                        </a>
                        <a
                          href={`https://wa.me/${autista.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </a>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400 py-1 text-center w-full">Nessun recapito telefonico</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODALE INSERIMENTO NUOVO AUTISTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1E242B]">Crea Account Autista</h3>
                <p className="text-[11px] text-gray-400">Genera credenziali e invia link di verifica</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAutista} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Nome</label>
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
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Cognome</label>
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

              {/* CREDENZIALI DI ACCESSO */}
              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-extrabold text-[#E05353] uppercase tracking-wider block">
                  Credenziali di Accesso App Autista
                </span>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1">Email di Login</label>
                  <input
                    type="email"
                    required
                    placeholder="mario.rossi@citycargo.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1">Password Iniziale</label>
                  <input
                    type="text"
                    required
                    placeholder="Password123!"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Telefono / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="+39 340 1234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Appalto Assegnato</label>
                  <select
                    value={appaltoDefault}
                    onChange={(e: any) => setAppaltoDefault(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  >
                    <option value="CITI">CITI</option>
                    <option value="EDF">EDF</option>
                    <option value="RHENUS">RHENUS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Codice Fiscale</label>
                  <input
                    type="text"
                    placeholder="RSSMRA80A01H501U"
                    value={codiceFiscale}
                    onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scadenza Patente</label>
                  <input
                    type="date"
                    required
                    value={scadenzaPatente}
                    onChange={(e) => setScadenzaPatente(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={possiedeCqc}
                    onChange={(e) => setPossiedeCqc(e.target.checked)}
                    className="rounded text-[#E05353] focus:ring-[#E05353]"
                  />
                  <span className="text-xs font-bold text-gray-700">Possiede CQC Merci</span>
                </label>

                {possiedeCqc && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Scadenza CQC</label>
                    <input
                      type="date"
                      value={scadenzaCqc}
                      onChange={(e) => setScadenzaCqc(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#E05353] hover:bg-[#c94545] disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrazione in corso...
                    </>
                  ) : (
                    'Crea Account & Invia Verifica'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}