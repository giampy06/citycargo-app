'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  Truck, 
  ChevronLeft, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Calendar, 
  Gauge, 
  AlertTriangle, 
  X, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function FlottaPage() {
  const router = useRouter();
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ricerca, setRicerca] = useState('');
  const [filtroStato, setFiltroStato] = useState('TUTTI');

  // Modale Nuovo Veicolo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targa, setTarga] = useState('');
  const [modello, setModello] = useState('');
  const [kmAttuali, setKmAttuali] = useState('');
  const [scadenzaAssicurazione, setScadenzaAssicurazione] = useState('');
  const [scadenzaRevisione, setScadenzaRevisione] = useState('');
  const [appaltoAssegnato, setAppaltoAssegnato] = useState('CITI');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchVeicoli = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('veicoli')
        .select('*')
        .order('targa', { ascending: true });

      if (error) throw error;
      setVeicoli(data || []);
    } catch (err: any) {
      console.error('Errore caricamento veicoli:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVeicoli();
  }, []);

  // Aggiornamento Stato Veicolo (Disponibile / In Uso / Manutenzione / Fermo)
  const handleUpdateStato = async (id: string, nuovoStato: string) => {
    try {
      const { error } = await supabase
        .from('veicoli')
        .update({ stato: nuovoStato })
        .eq('id', id);

      if (error) throw error;

      setVeicoli(veicoli.map(v => v.id === id ? { ...v, stato: nuovoStato } : v));
    } catch (err: any) {
      alert(`Errore aggiornamento stato: ${err.message}`);
    }
  };

  // Eliminazione Veicolo
  const handleDeleteVeicolo = async (id: string, targaMezzo: string) => {
    const conferma = window.confirm(`Sei sicuro di voler eliminare definitivamente il furgone targa ${targaMezzo}? L'operazione è irreversibile.`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('veicoli')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVeicoli(veicoli.filter(v => v.id !== id));
      alert(`Veicolo ${targaMezzo} eliminato dalla flotta.`);
    } catch (err: any) {
      alert(`Errore eliminazione veicolo: ${err.message}`);
    }
  };

  // Creazione Nuovo Veicolo
  const handleCreateVeicolo = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (!targa) throw new Error('Inserisci la targa del veicolo.');

      const { error } = await supabase.from('veicoli').insert([
        {
          targa: targa.trim().toUpperCase(),
          modello: modello.trim() || 'Furgone Aziendale',
          km_attuali: kmAttuali ? Number(kmAttuali) : 0,
          scadenza_assicurazione: scadenzaAssicurazione || null,
          scadenza_revisione: scadenzaRevisione || null,
          appalto_assegnato: appaltoAssegnato,
          stato: 'disponibile',
        },
      ]);

      if (error) throw error;

      setTarga('');
      setModello('');
      setKmAttuali('');
      setScadenzaAssicurazione('');
      setScadenzaRevisione('');
      setIsModalOpen(false);
      fetchVeicoli();
      alert('Veicolo aggiunto alla flotta con successo!');
    } catch (err: any) {
      setModalError(err.message || 'Errore salvataggio veicolo.');
    } finally {
      setSubmitting(false);
    }
  };

  const veicoliFiltrati = veicoli.filter(v => {
    const matchStato = filtroStato === 'TUTTI' || v.stato === filtroStato;
    const matchRicerca = !ricerca || 
      v.targa?.toLowerCase().includes(ricerca.toLowerCase()) || 
      v.modello?.toLowerCase().includes(ricerca.toLowerCase());
    return matchStato && matchRicerca;
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
              <h1 className="font-extrabold text-base tracking-tight">Gestione Flotta Mezzi</h1>
              <p className="text-[11px] text-gray-400 font-medium">Veicoli, Revisioni, Stato di Servizio ed Eliminazione</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchVeicoli}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-10 px-4 rounded-2xl bg-[#E05353] hover:bg-[#c94545] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Aggiungi Furgone
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Barra di Ricerca & Filtri Stato */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca mezzo per targa o modello..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['TUTTI', 'disponibile', 'in_uso', 'in_manutenzione', 'fermo'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStato(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  filtroStato === s
                    ? 'bg-[#1E242B] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Griglia Veicoli */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento flotta aziendale...
          </div>
        ) : veicoliFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100">
            Nessun furgone trovato. Clicca su "+ Aggiungi Furgone" per inserire un mezzo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {veicoliFiltrati.map((veicolo) => (
              <div 
                key={veicolo.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-black tracking-wider text-[#1E242B] bg-[#F8F9FB] px-2.5 py-1 rounded-xl border border-gray-200">
                      {veicolo.targa}
                    </span>

                    {/* Menu Stato Corretto (accetta anche 'fermo') */}
                    <select
                      value={veicolo.stato || 'disponibile'}
                      onChange={(e) => handleUpdateStato(veicolo.id, e.target.value)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border-0 focus:ring-0 cursor-pointer uppercase tracking-wider ${
                        veicolo.stato === 'disponibile' ? 'bg-emerald-50 text-emerald-700' :
                        veicolo.stato === 'in_uso' ? 'bg-amber-50 text-amber-700' :
                        veicolo.stato === 'in_manutenzione' ? 'bg-blue-50 text-blue-700' :
                        'bg-rose-50 text-[#E05353]'
                      }`}
                    >
                      <option value="disponibile">● DISPONIBILE</option>
                      <option value="in_uso">● IN USO</option>
                      <option value="in_manutenzione">● IN MANUTENZIONE</option>
                      <option value="fermo">● FERMO</option>
                    </select>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-extrabold text-sm text-[#1E242B]">{veicolo.modello}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Appalto: <b className="text-gray-700">{veicolo.appalto_assegnato || 'CITI'}</b></p>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-[#F8F9FB] p-3 rounded-2xl text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Gauge className="w-3.5 h-3.5 text-gray-400" /> Chilometraggio:
                      </span>
                      <b className="text-[#1E242B]">{Number(veicolo.km_attuali || 0).toLocaleString('it-IT')} km</b>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Assicurazione:
                      </span>
                      <span className="text-[11px] font-bold">{veicolo.scadenza_assicurazione || 'Non registrata'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Revisione:
                      </span>
                      <span className="text-[11px] font-bold">{veicolo.scadenza_revisione || 'Non registrata'}</span>
                    </div>
                  </div>
                </div>

                {/* Tasto Eliminazione Mezzo */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                  <button
                    onClick={() => handleDeleteVeicolo(veicolo.id, veicolo.targa)}
                    className="text-xs font-bold text-gray-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 flex items-center gap-1.5 transition"
                    title="Elimina veicolo dalla flotta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Elimina Mezzo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODALE INSERIMENTO NUOVO MEZZO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1E242B]">Aggiungi Furgone alla Flotta</h3>
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

            <form onSubmit={handleCreateVeicolo} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Targa</label>
                <input
                  type="text"
                  required
                  placeholder="FX123AB"
                  value={targa}
                  onChange={(e) => setTarga(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Modello / Allestimento</label>
                <input
                  type="text"
                  required
                  placeholder="Fiat Ducato L2H2"
                  value={modello}
                  onChange={(e) => setModello(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Km Attuali</label>
                  <input
                    type="number"
                    placeholder="125000"
                    value={kmAttuali}
                    onChange={(e) => setKmAttuali(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Appalto</label>
                  <select
                    value={appaltoAssegnato}
                    onChange={(e) => setAppaltoAssegnato(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  >
                    <option value="CITI">CITI</option>
                    <option value="EDF">EDF</option>
                    <option value="RHENUS">RHENUS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Assicurazione</label>
                  <input
                    type="date"
                    value={scadenzaAssicurazione}
                    onChange={(e) => setScadenzaAssicurazione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Revisione</label>
                  <input
                    type="date"
                    value={scadenzaRevisione}
                    onChange={(e) => setScadenzaRevisione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#E05353] hover:bg-[#c94545] disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva Veicolo'
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