'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, getPrivateFileUrl } from '@/supabase';
import {
  MapPin,
  Plus,
  RefreshCw,
  Loader2,
  X,
  Search,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const BUCKET = 'fleet-documents';
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const GIORNI_ROSSO = 15;
const GIORNI_GIALLO = 30;

type Permesso = {
  id: string;
  veicolo_id: string;
  zona: string;
  ente: string;
  data_scadenza: string;
  allegato_url: string | null;
  veicoli: { targa: string; modello: string | null } | null;
};

type Veicolo = { id: string; targa: string; modello: string | null };
type Filtro = 'TUTTI' | 'SCADUTI' | 'IN_SCADENZA' | 'VALIDI';

// Giorni da oggi (data italiana) alla scadenza. Negativo = già scaduto.
function giorniAllaScadenza(scadenza: string): number {
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  return Math.round((Date.parse(`${scadenza}T00:00:00Z`) - Date.parse(`${oggi}T00:00:00Z`)) / 86400000);
}

function formatoData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function statoPermesso(giorni: number): { etichetta: string; classi: string } {
  if (giorni < 0) {
    return { etichetta: `Scaduto da ${Math.abs(giorni)} ${Math.abs(giorni) === 1 ? 'giorno' : 'giorni'}`, classi: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (giorni < GIORNI_ROSSO) {
    return { etichetta: giorni === 0 ? 'Scade oggi' : `Scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`, classi: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (giorni <= GIORNI_GIALLO) {
    return { etichetta: `Scade tra ${giorni} giorni`, classi: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { etichetta: 'Valido', classi: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export default function PermessiZtlPage() {
  const [permessi, setPermessi] = useState<Permesso[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);

  const [ricerca, setRicerca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TUTTI');

  // Modale aggiungi / modifica
  const [modaleAperta, setModaleAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Permesso | null>(null);
  const [veicoloId, setVeicoloId] = useState('');
  const [zona, setZona] = useState('');
  const [ente, setEnte] = useState('');
  const [dataScadenza, setDataScadenza] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [erroreModale, setErroreModale] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  // Conferma eliminazione
  const [daEliminare, setDaEliminare] = useState<Permesso | null>(null);
  const [eliminazione, setEliminazione] = useState(false);

  const mostraMessaggio = (tipo: 'ok' | 'errore', testo: string) => {
    setMessaggio({ tipo, testo });
    setTimeout(() => setMessaggio(null), 6000);
  };

  const carica = async () => {
    setLoading(true);
    setErrore(null);
    try {
      const [pRes, vRes] = await Promise.all([
        supabase
          .from('permessi_ztl')
          .select('id, veicolo_id, zona, ente, data_scadenza, allegato_url, veicoli(targa, modello)')
          .order('data_scadenza', { ascending: true }),
        supabase.from('veicoli').select('id, targa, modello').order('targa', { ascending: true }),
      ]);
      if (pRes.error) throw pRes.error;
      if (vRes.error) throw vRes.error;
      setPermessi((pRes.data as unknown as Permesso[]) || []);
      setVeicoli((vRes.data as Veicolo[]) || []);
    } catch (err: any) {
      setErrore(err.message || 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carica();
  }, []);

  const conStato = useMemo(
    () => permessi.map((p) => ({ ...p, giorni: giorniAllaScadenza(p.data_scadenza) })),
    [permessi]
  );

  const conteggi = useMemo(
    () => ({
      totale: conStato.length,
      scaduti: conStato.filter((p) => p.giorni < 0).length,
      inScadenza: conStato.filter((p) => p.giorni >= 0 && p.giorni <= GIORNI_GIALLO).length,
    }),
    [conStato]
  );

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    return conStato.filter((p) => {
      if (filtro === 'SCADUTI' && p.giorni >= 0) return false;
      if (filtro === 'IN_SCADENZA' && !(p.giorni >= 0 && p.giorni <= GIORNI_GIALLO)) return false;
      if (filtro === 'VALIDI' && p.giorni <= GIORNI_GIALLO) return false;
      if (!q) return true;
      return [p.veicoli?.targa, p.zona, p.ente].some((v) => v?.toLowerCase().includes(q));
    });
  }, [conStato, ricerca, filtro]);

  const apriNuovo = () => {
    setInModifica(null);
    setVeicoloId(veicoli[0]?.id || '');
    setZona('');
    setEnte('');
    setDataScadenza('');
    setFile(null);
    setErroreModale(null);
    setModaleAperta(true);
  };

  const apriModifica = (p: Permesso) => {
    setInModifica(p);
    setVeicoloId(p.veicolo_id);
    setZona(p.zona);
    setEnte(p.ente);
    setDataScadenza(p.data_scadenza);
    setFile(null);
    setErroreModale(null);
    setModaleAperta(true);
  };

  const scegliFile = (f: File | null) => {
    setErroreModale(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      setErroreModale('Il file deve essere un PDF.');
      setFile(null);
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setErroreModale('Il PDF supera i 10 MB.');
      setFile(null);
      return;
    }
    setFile(f);
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreModale(null);

    const veicolo = veicoli.find((v) => v.id === veicoloId);
    if (!veicolo) return setErroreModale('Seleziona un furgone.');
    if (!zona.trim()) return setErroreModale('Inserisci la zona.');
    if (!ente.trim()) return setErroreModale("Inserisci l'ente che ha rilasciato il permesso.");
    if (!dataScadenza) return setErroreModale('Inserisci la data di scadenza.');

    setSalvataggio(true);
    let nuovoPercorso: string | null = null;
    try {
      if (file) {
        const targaPulita = veicolo.targa.replace(/[^A-Za-z0-9]/g, '');
        nuovoPercorso = `permessi-ztl/${targaPulita}_${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(nuovoPercorso, file, { contentType: 'application/pdf' });
        if (upErr) {
          nuovoPercorso = null;
          throw new Error(`Caricamento PDF non riuscito: ${upErr.message}`);
        }
      }

      const dati = {
        veicolo_id: veicoloId,
        zona: zona.trim(),
        ente: ente.trim(),
        data_scadenza: dataScadenza,
        ...(nuovoPercorso ? { allegato_url: nuovoPercorso } : {}),
      };

      const { error } = inModifica
        ? await supabase.from('permessi_ztl').update(dati).eq('id', inModifica.id)
        : await supabase.from('permessi_ztl').insert([dati]);

      if (error) {
        // Il permesso non è stato salvato: togliamo il PDF appena caricato per non lasciare file orfani.
        if (nuovoPercorso) await supabase.storage.from(BUCKET).remove([nuovoPercorso]);
        throw error;
      }

      // Se abbiamo sostituito il PDF, eliminiamo quello vecchio (il permesso ora punta al nuovo).
      if (inModifica?.allegato_url && nuovoPercorso) {
        await supabase.storage.from(BUCKET).remove([inModifica.allegato_url]);
      }

      setModaleAperta(false);
      mostraMessaggio('ok', inModifica ? 'Permesso aggiornato.' : 'Permesso aggiunto.');
      carica();
    } catch (err: any) {
      setErroreModale(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSalvataggio(false);
    }
  };

  const elimina = async () => {
    if (!daEliminare) return;
    setEliminazione(true);
    try {
      const { error } = await supabase.from('permessi_ztl').delete().eq('id', daEliminare.id);
      if (error) throw error;

      let avvisoFile = '';
      if (daEliminare.allegato_url) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([daEliminare.allegato_url]);
        if (rmErr) avvisoFile = ' (il PDF non è stato rimosso dall\'archivio)';
      }

      setDaEliminare(null);
      mostraMessaggio('ok', `Permesso eliminato${avvisoFile}.`);
      carica();
    } catch (err: any) {
      setDaEliminare(null);
      mostraMessaggio('errore', `Eliminazione non riuscita: ${err.message}`);
    } finally {
      setEliminazione(false);
    }
  };

  const apriPdf = async (percorso: string) => {
    const url = await getPrivateFileUrl(BUCKET, percorso);
    if (url) window.open(url, '_blank', 'noreferrer');
    else mostraMessaggio('errore', 'Impossibile aprire il PDF in questo momento. Riprova.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento permessi ZTL...
      </div>
    );
  }

  const filtri: { id: Filtro; etichetta: string }[] = [
    { id: 'TUTTI', etichetta: 'Tutti' },
    { id: 'SCADUTI', etichetta: 'Scaduti' },
    { id: 'IN_SCADENZA', etichetta: 'In scadenza' },
    { id: 'VALIDI', etichetta: 'Validi' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      <header className="bg-white border-b border-gray-100 md:sticky md:top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-extrabold text-base tracking-tight truncate">Permessi ZTL</h1>
            <p className="hidden sm:block text-[11px] text-gray-400 font-medium">Zone dove i furgoni possono entrare e relative scadenze</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={carica}
              aria-label="Aggiorna"
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={apriNuovo}
              className="h-10 px-4 rounded-2xl bg-[#E05353] hover:bg-[#c94545] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Nuovo<span className="hidden sm:inline"> permesso</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-5">
        {messaggio && (
          <div
            role="status"
            className={`rounded-2xl border p-3.5 text-xs font-bold flex items-center gap-2 ${
              messaggio.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {messaggio.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{messaggio.testo}</span>
            <button onClick={() => setMessaggio(null)} aria-label="Chiudi" className="opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errore && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Impossibile caricare i permessi: {errore}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { etichetta: 'Permessi totali', valore: conteggi.totale, colore: 'text-[#1E242B]' },
            { etichetta: 'In scadenza (30 gg)', valore: conteggi.inScadenza, colore: 'text-amber-600' },
            { etichetta: 'Scaduti', valore: conteggi.scaduti, colore: 'text-rose-600' },
          ].map((c) => (
            <div key={c.etichetta} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{c.etichetta}</p>
              <p className={`text-2xl font-black mt-1 ${c.colore}`}>{c.valore}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca per targa, zona o ente..."
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filtri.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  filtro === f.id ? 'bg-[#1E242B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.etichetta}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
          {visibili.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400 space-y-2">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-bold text-gray-600">
                {conStato.length === 0 ? 'Nessun permesso registrato' : 'Nessun permesso corrisponde ai filtri'}
              </p>
              {conStato.length === 0 && <p>Premi "Nuovo permesso" per aggiungere il primo.</p>}
            </div>
          ) : (
            <>
            <div className="md:hidden space-y-3">
              {visibili.map((p) => {
                const stato = statoPermesso(p.giorni);
                return (
                  <div key={p.id} className="rounded-2xl border border-gray-100 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-[#1E242B]">{p.veicoli?.targa || '—'}</span>
                        {p.veicoli?.modello && <span className="ml-2 text-[10px] text-gray-400">{p.veicoli.modello}</span>}
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <button onClick={() => apriModifica(p)} aria-label="Modifica" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDaEliminare(p)} aria-label="Elimina" className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs">
                      <span className="font-bold text-gray-800">{p.zona}</span>
                      <span className="text-gray-500"> — {p.ente}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold">{formatoData(p.data_scadenza)}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${stato.classi}`}>{stato.etichetta}</span>
                    </div>
                    {p.allegato_url && (
                      <button onClick={() => apriPdf(p.allegato_url!)} className="inline-flex items-center gap-1 text-xs text-[#E05353] hover:underline font-bold">
                        <FileText className="w-3.5 h-3.5" /> Apri PDF
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pr-4">Furgone</th>
                    <th className="pb-3 pr-4">Zona</th>
                    <th className="pb-3 pr-4">Ente</th>
                    <th className="pb-3 pr-4">Scadenza</th>
                    <th className="pb-3 pr-4">PDF</th>
                    <th className="pb-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                  {visibili.map((p) => {
                    const stato = statoPermesso(p.giorni);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#1E242B]">{p.veicoli?.targa || '—'}</span>
                          {p.veicoli?.modello && <span className="block text-[10px] text-gray-400">{p.veicoli.modello}</span>}
                        </td>
                        <td className="py-3 pr-4 font-bold text-gray-800">{p.zona}</td>
                        <td className="py-3 pr-4">{p.ente}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className="font-bold">{formatoData(p.data_scadenza)}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full border text-[10px] font-bold ${stato.classi}`}>{stato.etichetta}</span>
                        </td>
                        <td className="py-3 pr-4">
                          {p.allegato_url ? (
                            <button
                              onClick={() => apriPdf(p.allegato_url!)}
                              className="inline-flex items-center gap-1 text-[#E05353] hover:underline font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" /> Apri
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => apriModifica(p)}
                            aria-label="Modifica"
                            title="Modifica"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDaEliminare(p)}
                            aria-label="Elimina"
                            title="Elimina"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </main>

      {modaleAperta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={salva} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base">{inModifica ? 'Modifica permesso' : 'Nuovo permesso ZTL'}</h2>
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                aria-label="Chiudi"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {veicoli.length === 0 ? (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                Non ci sono furgoni in flotta. Aggiungine uno dalla sezione Flotta prima di registrare un permesso.
              </p>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Furgone</label>
                  <select
                    value={veicoloId}
                    onChange={(e) => setVeicoloId(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  >
                    {veicoli.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.targa}
                        {v.modello ? ` — ${v.modello}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Zona</label>
                  <input
                    type="text"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    placeholder="es. Area C Milano"
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Ente che ha rilasciato il permesso</label>
                  <input
                    type="text"
                    value={ente}
                    onChange={(e) => setEnte(e.target.value)}
                    placeholder="es. Comune di Milano"
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Data di scadenza</label>
                  <input
                    type="date"
                    value={dataScadenza}
                    onChange={(e) => setDataScadenza(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    Allegato PDF {inModifica?.allegato_url ? '(già presente: caricane uno nuovo per sostituirlo)' : '(facoltativo)'}
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => scegliFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-bold hover:file:bg-gray-200"
                  />
                </div>
              </>
            )}

            {erroreModale && (
              <p role="alert" className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                {erroreModale}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={salvataggio || veicoli.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {salvataggio && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {salvataggio ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </div>
      )}

      {daEliminare && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-[#E05353] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-sm mb-1">Eliminare il permesso?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {daEliminare.veicoli?.targa} — {daEliminare.zona} ({daEliminare.ente}). Verrà eliminato anche il PDF allegato. L'operazione è irreversibile.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDaEliminare(null)}
                disabled={eliminazione}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={elimina}
                disabled={eliminazione}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 transition-colors"
              >
                {eliminazione ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
