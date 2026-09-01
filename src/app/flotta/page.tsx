'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Truck, 
  ChevronLeft, 
  Calendar, 
  Wrench, 
  ShieldCheck, 
  Plus, 
  Search, 
  RefreshCw, 
  X, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function FlottaPage() {
  const router = useRouter();
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAppalto, setFiltroAppalto] = useState<string>('TUTTI');
  const [ricerca, setRicerca] = useState('');

  // Modale Nuovo Veicolo State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [targa, setTarga] = useState('');
  const [modello, setModello] = useState('');
  const [appaltoDefault, setAppaltoDefault] = useState<'CITI' | 'EDF' | 'RHENUS'>('CITI');
  const [kmAttuali, setKmAttuali] = useState('');
  const [dataAssicurazione, setDataAssicurazione] = useState('');
  const [dataRevisione, setDataRevisione] = useState('');
  const [kmTagliando, setKmTagliando] = useState('');

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
      console.error('Errore recupero veicoli:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVeicoli();
  }, []);

  const getScadenzaStatus = (dataStr: string) => {
    if (!dataStr) return { label: 'Non impostata', color: 'bg-gray-50 text-gray-500 border-gray-200' };
    const oggi = new Date('2026-09-01');
    const scadenza = new Date(dataStr);
    const diffGiorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

    if (diffGiorni < 0) return { label: `Scaduta (${Math.abs(diffGiorni)} gg fa)`, color: 'bg-rose-50 text-[#E05353] border-rose-200' };
    if (diffGiorni <= 30) return { label: `Scade tra ${diffGiorni} gg`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: `Regolare (${diffGiorni} gg)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getTagliandoStatus = (kmAtt: number, kmTagl: number) => {
    if (!kmTagl) return { label: 'Non impostato', color: 'bg-gray-50 text-gray-500 border-gray-200' };
    const deltaKm = kmTagl - kmAtt;
    if (deltaKm <= 0) return { label: `Tagliando Scaduto (+${Math.abs(deltaKm)} km)`, color: 'bg-rose-50 text-[#E05353] border-rose-200' };
    if (deltaKm <= 1500) return { label: `Tagliando tra ${deltaKm} km`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: `OK (${deltaKm} km)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('veicoli')
        .insert([
          {
            targa: targa.trim().toUpperCase(),
            modello: modello.trim(),
            appalto_default: appaltoDefault,
            km_attuali: Number(kmAttuali) || 0,
            data_scadenza_assicurazione: dataAssicurazione || null,
            data_scadenza_revisione: dataRevisione || null,
            km_prossimo_tagliando: Number(kmTagliando) || 0,
            stato: 'disponibile',
          },
        ]);

      if (error) throw error;

      setTarga('');
      setModello('');
      setKmAttuali('');
      setDataAssicurazione('');
      setDataRevisione('');
      setKmTagliando('');
      setIsModalOpen(false);

      fetchVeicoli();
      alert('Veicolo aggiunto alla flotta con successo!');
    } catch (err: any) {
      setModalError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  };

  const veicoliFiltrati = veicoli.filter(v => {
    const matchAppalto = filtroAppalto === 'TUTTI' || v.appalto_default === filtroAppalto;
    const matchRicerca = v.targa?.toLowerCase().includes(ricerca.toLowerCase()) || 
                         (v.modello && v.modello.toLowerCase().includes(ricerca.toLowerCase()));
    return matchAppalto && matchRicerca;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased">
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
              <h1 className="font-extrabold text-base tracking-tight">Gestione Flotta & Scadenze</h1>
              <p className="text-[11px] text-gray-400 font-medium">Schede Tecniche, Manutenzioni e Costi</p>
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
              <Plus className="w-4 h-4" /> Nuovo Veicolo
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Ricerca e Filtri */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca per targa o modello..."
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

        {/* Griglia Veicoli */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento flotta in corso...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {veicoliFiltrati.map((veicolo) => {
              const assStatus = getScadenzaStatus(veicolo.data_scadenza_assicurazione);
              const revStatus = getScadenzaStatus(veicolo.data_scadenza_revisione);
              const tagStatus = getTagliandoStatus(veicolo.km_attuali, veicolo.km_prossimo_tagliando);

              return (
                <div 
                  key={veicolo.id || veicolo.targa} 
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-50 text-[#E05353]">
                        {veicolo.appalto_default}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        veicolo.stato === 'disponibile' ? 'bg-emerald-50 text-emerald-700' :
                        veicolo.stato === 'in_servizio' ? 'bg-blue-50 text-blue-700' :
                        veicolo.stato === 'manutenzione' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-[#E05353]'
                      }`}>
                        ● {veicolo.stato ? veicolo.stato.replace('_', ' ').toUpperCase() : 'ATTIVO'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h2 className="text-xl font-black text-[#1E242B]">{veicolo.targa}</h2>
                      <p className="text-xs text-gray-500 font-medium">{veicolo.modello || 'Furgone Aziendale'}</p>
                    </div>

                    <div className="mt-3 p-3 bg-[#F8F9FB] rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">Chilometraggio:</span>
                      <span className="font-extrabold text-[#1E242B]">{Number(veicolo.km_attuali || 0).toLocaleString('it-IT')} km</span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Assicurazione:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${assStatus.color}`}>
                          {assStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" /> Revisione:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${revStatus.color}`}>
                          {revStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                          <Wrench className="w-3.5 h-3.5 text-gray-400" /> Tagliando:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tagStatus.color}`}>
                          {tagStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsante Apri Scheda Singola */}
                  <div className="pt-3 border-t border-gray-100">
                    <Link
                      href={`/flotta/${veicolo.targa}`}
                      className="w-full py-3 px-4 bg-[#1E242B] hover:bg-black text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <span>Apri Scheda Furgone & Fatture</span>
                      <ChevronRight className="w-4 h-4 text-[#E05353]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODALE NUOVO VEICOLO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#1E242B]">Nuovo Veicolo Flotta</h3>
                <p className="text-[11px] text-gray-400">Registra un nuovo mezzo operativo</p>
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

            <form onSubmit={handleCreateVehicle} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Targa</label>
                  <input
                    type="text"
                    required
                    placeholder="es. GA987ZY"
                    value={targa}
                    onChange={(e) => setTarga(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Appalto</label>
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

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Modello e Allestimento</label>
                <input
                  type="text"
                  required
                  placeholder="es. Fiat Ducato 35 L3H2"
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
                    required
                    placeholder="es. 95000"
                    value={kmAttuali}
                    onChange={(e) => setKmAttuali(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Km Pross. Tagliando</label>
                  <input
                    type="number"
                    placeholder="es. 110000"
                    value={kmTagliando}
                    onChange={(e) => setKmTagliando(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Assicurazione</label>
                  <input
                    type="date"
                    value={dataAssicurazione}
                    onChange={(e) => setDataAssicurazione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Revisione</label>
                  <input
                    type="date"
                    value={dataRevisione}
                    onChange={(e) => setDataRevisione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#E05353] hover:bg-[#c94545] disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva Veicolo in Flotta'
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