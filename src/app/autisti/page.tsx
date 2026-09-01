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
  Check,
  UserX,
  Clock
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
        .order('created_at', { ascending: false });

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

  // APPROVAZIONE AUTISTA
  const handleApprovaAutista = async (autista: any, appaltoScelto: string) => {
    try {
      const { error } = await supabase
        .from('autisti')
        .update({
          stato: 'attivo',
          appalto_default: appaltoScelto,
          data_approvazione: new Date().toISOString(),
        })
        .eq('id', autista.id);

      if (error) throw error;

      alert(`Autista ${autista.nome} ${autista.cognome} approvato ed abilitato al servizio!`);
      fetchAutisti();
    } catch (err: any) {
      alert(`Errore approvazione: ${err.message}`);
    }
  };

  // RIFIUTO / CANCELLAZIONE RICHIESTA
  const handleRifiutaAutista = async (id: string, nomeCompleto: string) => {
    const conferma = window.confirm(`Sei sicuro di voler rifiutare ed eliminare la richiesta di ${nomeCompleto}?`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('autisti')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Richiesta rifiutata ed eliminata.');
      fetchAutisti();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
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

  // Suddivisione tra autisti in attesa e autisti già approvati
  const autistiInAttesa = autisti.filter(a => a.stato === 'in_attesa');
  const autistiApprovati = autisti.filter(a => a.stato !== 'in_attesa');

  const autistiFiltrati = autistiApprovati.filter(a => {
    const matchAppalto = filtroAppalto === 'TUTTI' || a.appalto_default === filtroAppalto;
    const nomeCompleto = `${a.nome} ${a.cognome}`.toLowerCase();
    const matchRicerca = nomeCompleto.includes(ricerca.toLowerCase()) || 
                         (a.codice_fiscale && a.codice_fiscale.toLowerCase().includes(ricerca.toLowerCase())) ||
                         (a.telefono && a.telefono.includes(ricerca));
    return matchAppalto && matchRicerca;
  });

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
              <p className="text-[11px] text-gray-400 font-medium">Controllo Documenti, Approvazioni e Assegnazioni</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchAutisti}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* 🟡 BOX RICHIESTE DI REGISTRAZIONE IN ATTESA DI APPROVAZIONE */}
        {autistiInAttesa.length > 0 && (
          <section className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                    Richieste di Registrazione in Attesa ({autistiInAttesa.length})
                  </h2>
                  <p className="text-[11px] text-amber-800">
                    Verifica i documenti prima di autorizzare l'accesso ai turni
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autistiInAttesa.map((richiesta) => (
                <div key={richiesta.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1E242B] capitalize">
                        {richiesta.nome} {richiesta.cognome}
                      </h3>
                      <span className="text-[11px] text-gray-500 font-mono">{richiesta.email}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      🟡 In Attesa
                    </span>
                  </div>

                  <div className="text-[11px] bg-[#F8F9FB] p-2.5 rounded-xl space-y-1 text-gray-600">
                    <p>Telefono: <b>{richiesta.telefono || '—'}</b> | CF: <b>{richiesta.codice_fiscale || '—'}</b></p>
                    <p>Patente: <b>{richiesta.numero_patente || '—'}</b> (Scadenza: {richiesta.scadenza_patente || '—'})</p>
                    {richiesta.possiede_cqc && (
                      <p className="text-emerald-700 font-bold">✓ CQC Merci (Scad: {richiesta.scadenza_cqc})</p>
                    )}
                  </div>

                  {/* Tasti Approva / Rifiuta */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprovaAutista(richiesta, 'CITI')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Approva (CITI)
                    </button>
                    <button
                      onClick={() => handleApprovaAutista(richiesta, 'EDF')}
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition"
                      title="Approva per EDF"
                    >
                      EDF
                    </button>
                    <button
                      onClick={() => handleApprovaAutista(richiesta, 'RHENUS')}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition"
                      title="Approva per RHENUS"
                    >
                      RHENUS
                    </button>
                    <button
                      onClick={() => handleRifiutaAutista(richiesta.id, `${richiesta.nome} ${richiesta.cognome}`)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                      title="Rifiuta ed elimina richiesta"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ricerca e Filtri */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca tra gli autisti attivi..."
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

        {/* Griglia Autisti Approvati */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento anagrafica autisti...
          </div>
        ) : autistiFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100">
            Nessun autista attivo in archivio.
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
                        {autista.appalto_default || 'CITI'}
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
                          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Patente:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${patenteStatus.color}`}>
                          {autista.numero_patente ? `${autista.numero_patente} (${patenteStatus.label})` : patenteStatus.label}
                        </span>
                      </div>

                      {autista.possiede_cqc && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                            <FileBadge className="w-3.5 h-3.5 text-gray-400" /> CQC:
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
    </div>
  );
}