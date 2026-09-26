'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { scaricaFoglioExcel } from '@/lib/scaricaFoglio';
import { costruisciFoglio, type TurnoFoglio, type AutistaFoglio, type TariffaFoglio } from '@/lib/foglioPresenze';
import { ChevronLeft, ChevronRight, Download, Loader2, Plus, X, Edit3, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

type ExtraRiga = { id: string; data: string; descrizione: string; importo: number };

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const euro = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatoData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function FoglioPresenzePage() {
  const oggi = new Date();
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth() + 1);

  const [turni, setTurni] = useState<TurnoFoglio[]>([]);
  const [autisti, setAutisti] = useState<AutistaFoglio[]>([]);
  const [tariffe, setTariffe] = useState<TariffaFoglio[]>([]);
  const [extraManuali, setExtraManuali] = useState<ExtraRiga[]>([]);
  const [extraDisponibili, setExtraDisponibili] = useState(true);

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);
  const [esportazione, setEsportazione] = useState(false);

  const [modaleAperta, setModaleAperta] = useState(false);
  const [inModifica, setInModifica] = useState<ExtraRiga | null>(null);
  const [dataExtra, setDataExtra] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [importo, setImporto] = useState('');
  const [erroreModale, setErroreModale] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [daEliminare, setDaEliminare] = useState<ExtraRiga | null>(null);

  const mostraMessaggio = (tipo: 'ok' | 'errore', testo: string) => {
    setMessaggio({ tipo, testo });
    setTimeout(() => setMessaggio(null), 6000);
  };

  const carica = async () => {
    setLoading(true);
    setErrore(null);
    const inizio = new Date(Date.UTC(anno, mese - 1, 1) - 24 * 3600 * 1000).toISOString();
    const fine = new Date(Date.UTC(anno, mese, 1) + 24 * 3600 * 1000).toISOString();
    const primo = `${anno}-${String(mese).padStart(2, '0')}-01`;
    const ultimo = `${anno}-${String(mese).padStart(2, '0')}-${String(new Date(anno, mese, 0).getDate()).padStart(2, '0')}`;

    const [t, a, tar, ex] = await Promise.all([
      supabase
        .from('turni_presenze')
        .select('id, created_at, autista_id, nome_autista, appalto, giro, compenso_giornaliero, da_controllare')
        .gte('created_at', inizio)
        .lt('created_at', fine),
      supabase.from('autisti').select('id, nome, cognome'),
      supabase.from('tariffe_giri').select('nome, codice, importo, appalto, ordine').eq('appalto', 'CITI'),
      supabase.from('extra_servizi').select('id, data, descrizione, importo').eq('appalto', 'CITI').gte('data', primo).lte('data', ultimo).order('data'),
    ]);

    const errBase = t.error || a.error || tar.error;
    if (errBase) {
      setErrore(errBase.message);
    } else {
      setTurni((t.data as TurnoFoglio[]) || []);
      setAutisti((a.data as AutistaFoglio[]) || []);
      setTariffe((tar.data as TariffaFoglio[]) || []);
    }
    // Se la tabella degli extra non esiste ancora (SQL non eseguito) la pagina funziona lo stesso.
    setExtraDisponibili(!ex.error);
    setExtraManuali(ex.error ? [] : ((ex.data as any[]) || []).map((r) => ({ ...r, importo: Number(r.importo) })));
    setLoading(false);
  };

  useEffect(() => {
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno, mese]);

  const foglio = useMemo(
    () => costruisciFoglio({ anno, mese, turni, autisti, tariffe, extraManuali }),
    [anno, mese, turni, autisti, tariffe, extraManuali]
  );

  const cambiaMese = (delta: number) => {
    const d = new Date(anno, mese - 1 + delta, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth() + 1);
  };

  const esporta = async () => {
    setEsportazione(true);
    try {
      await scaricaFoglioExcel(anno, mese);
      mostraMessaggio('ok', 'Excel generato.');
    } catch (err: any) {
      mostraMessaggio('errore', `Esportazione non riuscita: ${err.message}`);
    } finally {
      setEsportazione(false);
    }
  };

  const apriNuovo = () => {
    setInModifica(null);
    setDataExtra(`${anno}-${String(mese).padStart(2, '0')}-${String(Math.min(oggi.getDate(), new Date(anno, mese, 0).getDate())).padStart(2, '0')}`);
    setDescrizione('');
    setImporto('');
    setErroreModale(null);
    setModaleAperta(true);
  };

  const apriModifica = (e: ExtraRiga) => {
    setInModifica(e);
    setDataExtra(e.data);
    setDescrizione(e.descrizione);
    setImporto(String(e.importo));
    setErroreModale(null);
    setModaleAperta(true);
  };

  const salvaExtra = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErroreModale(null);
    const importoNum = Number(importo.replace(',', '.'));
    if (!dataExtra) return setErroreModale('Inserisci la data.');
    if (!descrizione.trim()) return setErroreModale('Inserisci la descrizione.');
    if (importo.trim() === '' || isNaN(importoNum) || importoNum < 0) return setErroreModale('Inserisci un importo valido (0 o superiore).');

    setSalvataggio(true);
    const dati = { data: dataExtra, descrizione: descrizione.trim(), importo: importoNum, appalto: 'CITI' };
    const { error } = inModifica
      ? await supabase.from('extra_servizi').update(dati).eq('id', inModifica.id)
      : await supabase.from('extra_servizi').insert([dati]);
    setSalvataggio(false);
    if (error) return setErroreModale(error.message);
    setModaleAperta(false);
    mostraMessaggio('ok', inModifica ? 'Extra aggiornato.' : 'Extra aggiunto.');
    carica();
  };

  const eliminaExtra = async () => {
    if (!daEliminare) return;
    const { error } = await supabase.from('extra_servizi').delete().eq('id', daEliminare.id);
    setDaEliminare(null);
    if (error) mostraMessaggio('errore', `Eliminazione non riuscita: ${error.message}`);
    else {
      mostraMessaggio('ok', 'Extra eliminato.');
      carica();
    }
  };

  const daControllare = foglio.righe.reduce((s, r) => s + r.celle.filter((c) => c?.daControllare).length, 0) + foglio.extra.filter((e) => e.origine === 'turno' && e.daControllare).length;
  const extraDaTurno = foglio.extra.filter((e) => e.origine === 'turno');

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      <header className="bg-white border-b border-gray-100 md:sticky md:top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/presenze" aria-label="Torna alle presenze" className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base tracking-tight truncate">Foglio presenze CITI</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 font-medium">Griglia mensile, importi ed Excel</p>
            </div>
          </div>
          <button
            onClick={esporta}
            disabled={esportazione || loading}
            className="h-10 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            {esportazione ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Esporta<span className="hidden sm:inline"> Excel</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-5">
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <button onClick={() => cambiaMese(-1)} aria-label="Mese precedente" className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="font-black text-lg">{MESI[mese - 1]} {anno}</h2>
            <span className="text-xs text-gray-400 font-medium">{foglio.righe.length} autisti · {foglio.giorniLavorativi} giorni lavorativi</span>
          </div>
          <button onClick={() => cambiaMese(1)} aria-label="Mese successivo" className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {messaggio && (
          <div role="status" className={`rounded-2xl border p-3.5 text-xs font-bold flex items-center gap-2 ${messaggio.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {messaggio.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{messaggio.testo}</span>
            <button onClick={() => setMessaggio(null)} aria-label="Chiudi" className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {errore && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Impossibile caricare i dati: {errore}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" /> Caricamento foglio...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l: 'Giri', v: foglio.totali.giri },
                { l: 'Extra', v: foglio.totali.extra },
                { l: 'Imponibile', v: foglio.totali.imponibile },
                { l: 'IVA 22%', v: foglio.totali.iva },
                { l: 'Totale', v: foglio.totali.totale, forte: true },
              ].map((c) => (
                <div key={c.l} className={`rounded-2xl border shadow-sm p-4 ${c.forte ? 'bg-[#1E242B] text-white border-[#1E242B]' : 'bg-white border-gray-100'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${c.forte ? 'text-gray-400' : 'text-gray-400'}`}>{c.l}</p>
                  <p className="text-lg font-black mt-1">{euro(c.v)}</p>
                </div>
              ))}
            </div>

            {daControllare > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {daControllare} {daControllare === 1 ? 'voce da controllare' : 'voci da controllare'} (in rosso): correggile dalla pagina Presenze.
              </div>
            )}

            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5">
              {foglio.righe.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">Nessuna presenza CITI in questo mese.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-[10px] border-collapse">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="border border-gray-200 bg-blue-100 px-1.5 py-1 text-blue-900">N.</th>
                        <th rowSpan={2} className="border border-gray-200 bg-blue-100 px-2 py-1 text-blue-900 text-left">Giro</th>
                        <th rowSpan={2} className="border border-gray-200 bg-blue-100 px-2 py-1 text-blue-900 text-left">Autista</th>
                        {foglio.giorni.map((g) => (
                          <th key={g.numero} className={`border border-gray-200 bg-blue-50 px-0.5 py-0.5 font-bold ${g.weekend ? 'text-red-600' : 'text-blue-900'}`}>
                            <div className="text-[7px]">{g.sigla}</div>
                            <div>{String(g.numero).padStart(2, '0')}</div>
                          </th>
                        ))}
                        <th rowSpan={2} className="border border-gray-200 bg-blue-100 px-2 py-1 text-blue-900">Importo</th>
                        <th rowSpan={2} className="border border-gray-200 bg-blue-100 px-1.5 py-1 text-blue-900">G</th>
                      </tr>
                      <tr>
                        {foglio.presentiPerGiorno.map((n, i) => (
                          <th key={i} className="border border-gray-200 bg-blue-100 px-0.5 py-0.5 text-blue-900">{n || '-'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {foglio.righe.map((r, i) => (
                        <tr key={r.n} className={i % 2 === 1 ? 'bg-gray-100' : ''}>
                          <td className="border border-gray-200 px-1.5 py-1 text-center">{r.n}</td>
                          <td className="border border-gray-200 px-2 py-1 whitespace-nowrap">{r.giro}</td>
                          <td className="border border-gray-200 px-2 py-1 whitespace-nowrap font-semibold">{r.autista}</td>
                          {r.celle.map((c, d) => (
                            <td key={d} className={`border border-gray-200 text-center min-w-[20px] ${c?.daControllare ? 'bg-red-500 text-white font-bold' : ''}`}>{c?.testo || ''}</td>
                          ))}
                          <td className="border border-gray-200 px-2 py-1 text-right font-bold whitespace-nowrap">{r.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                          <td className="border border-gray-200 px-1.5 py-1 text-center font-bold">{r.giorniLavorati}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {foglio.legenda.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {foglio.legenda.map((v) => (
                    <span key={v.codice + v.nome} className="text-[10px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <b className="mr-1">{v.codice}</b>{v.nome} · {v.importo.toLocaleString('it-IT')} €
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Extra del mese</h2>
                <button
                  onClick={apriNuovo}
                  disabled={!extraDisponibili}
                  className="h-9 px-3.5 rounded-xl bg-[#E05353] hover:bg-[#c94545] disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi extra
                </button>
              </div>

              {!extraDisponibili && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 font-semibold">
                  La tabella degli extra manuali non esiste ancora sul database (serve eseguire lo SQL dedicato). Gli extra da check-in si vedono comunque.
                </p>
              )}

              {extraManuali.length === 0 && extraDaTurno.length === 0 && <p className="text-xs text-gray-400 py-2">Nessun extra questo mese.</p>}

              <ul className="divide-y divide-gray-50">
                {extraDaTurno.map((e, i) => (
                  <li key={`t${i}`} className="py-2.5 flex items-center gap-3 text-xs">
                    <span className="w-12 font-bold text-gray-500">{e.data}</span>
                    <span className="flex-1 font-semibold">{e.descrizione}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">da check-in</span>
                    <span className={`font-black ${e.daControllare ? 'text-rose-600' : ''}`}>{euro(e.importo)}</span>
                  </li>
                ))}
                {extraManuali.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-center gap-3 text-xs">
                    <span className="w-12 font-bold text-gray-500">{formatoData(e.data).slice(0, 5)}</span>
                    <span className="flex-1 font-semibold">{e.descrizione}</span>
                    <span className="font-black">{euro(e.importo)}</span>
                    <button onClick={() => apriModifica(e)} aria-label="Modifica" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDaEliminare(e)} aria-label="Elimina" className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
              {extraDaTurno.length > 0 && (
                <p className="text-[11px] text-gray-400">Gli extra "da check-in" nascono dal secondo check-in dell'autista: l'importo si inserisce dalla pagina Presenze.</p>
              )}
            </section>
          </>
        )}
      </main>

      {modaleAperta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={salvaExtra} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base">{inModifica ? 'Modifica extra' : 'Nuovo extra'}</h2>
              <button type="button" onClick={() => setModaleAperta(false)} aria-label="Chiudi" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Data</label>
              <input type="date" value={dataExtra} onChange={(e) => setDataExtra(e.target.value)} className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Descrizione</label>
              <input type="text" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="es. Servizio Ali" className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Importo (€)</label>
              <input type="number" min="0" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} placeholder="es. 185" className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]" />
            </div>
            {erroreModale && <p role="alert" className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">{erroreModale}</p>}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setModaleAperta(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">Annulla</button>
              <button type="submit" disabled={salvataggio} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 flex items-center gap-1.5">
                {salvataggio && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salva
              </button>
            </div>
          </form>
        </div>
      )}

      {daEliminare && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-[#E05353] flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <p className="font-extrabold text-sm mb-1">Eliminare l'extra?</p>
                <p className="text-xs text-gray-600 leading-relaxed">{formatoData(daEliminare.data)} — {daEliminare.descrizione} ({euro(daEliminare.importo)}). L'operazione è irreversibile.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDaEliminare(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">Annulla</button>
              <button onClick={eliminaExtra} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E05353] hover:bg-[#c94545]">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
