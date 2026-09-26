'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { ChevronLeft, Plus, Loader2, X, Edit3, Trash2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

type Tariffa = {
  id: string;
  appalto: 'CITI' | 'EDF' | 'RHENUS';
  codice: string | null;
  nome: string;
  importo: number | null;
  attivo: boolean;
  ordine: number;
};

const APPALTI: Tariffa['appalto'][] = ['CITI', 'EDF', 'RHENUS'];

function euro(n: number | null): string {
  return n === null ? 'Variabile' : `€ ${Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
}

export default function TariffePage() {
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);

  const [modaleAperta, setModaleAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Tariffa | null>(null);
  const [appalto, setAppalto] = useState<Tariffa['appalto']>('CITI');
  const [nome, setNome] = useState('');
  const [codice, setCodice] = useState('');
  const [importo, setImporto] = useState('');
  const [variabile, setVariabile] = useState(false);
  const [attivo, setAttivo] = useState(true);
  const [erroreModale, setErroreModale] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const [daEliminare, setDaEliminare] = useState<Tariffa | null>(null);
  const [eliminazione, setEliminazione] = useState(false);

  const mostraMessaggio = (tipo: 'ok' | 'errore', testo: string) => {
    setMessaggio({ tipo, testo });
    setTimeout(() => setMessaggio(null), 6000);
  };

  const carica = async () => {
    setLoading(true);
    setErrore(null);
    const { data, error } = await supabase
      .from('tariffe_giri')
      .select('id, appalto, codice, nome, importo, attivo, ordine')
      .order('appalto', { ascending: true })
      .order('ordine', { ascending: true });
    if (error) setErrore(error.message);
    else setTariffe((data as Tariffa[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    carica();
  }, []);

  const apriNuova = () => {
    setInModifica(null);
    setAppalto('CITI');
    setNome('');
    setCodice('');
    setImporto('');
    setVariabile(false);
    setAttivo(true);
    setErroreModale(null);
    setModaleAperta(true);
  };

  const apriModifica = (t: Tariffa) => {
    setInModifica(t);
    setAppalto(t.appalto);
    setNome(t.nome);
    setCodice(t.codice || '');
    setImporto(t.importo === null ? '' : String(t.importo));
    setVariabile(t.importo === null);
    setAttivo(t.attivo);
    setErroreModale(null);
    setModaleAperta(true);
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreModale(null);

    if (!nome.trim()) return setErroreModale('Inserisci il nome del giro.');
    let importoNum: number | null = null;
    if (!variabile) {
      importoNum = Number(importo.replace(',', '.'));
      if (importo.trim() === '' || isNaN(importoNum) || importoNum < 0) {
        return setErroreModale('Inserisci un importo valido (0 o superiore), oppure spunta "Importo variabile".');
      }
    }

    setSalvataggio(true);
    const dati = {
      appalto,
      nome: nome.trim(),
      codice: codice.trim().toUpperCase() || null,
      importo: importoNum,
      attivo,
      ...(inModifica ? {} : { ordine: (tariffe.filter((t) => t.appalto === appalto).reduce((m, t) => Math.max(m, t.ordine), 0)) + 1 }),
    };

    const { error } = inModifica
      ? await supabase.from('tariffe_giri').update(dati).eq('id', inModifica.id)
      : await supabase.from('tariffe_giri').insert([dati]);

    setSalvataggio(false);
    if (error) {
      setErroreModale(error.code === '23505' ? `Esiste già un giro "${nome.trim()}" per ${appalto}.` : error.message);
      return;
    }
    setModaleAperta(false);
    mostraMessaggio('ok', inModifica ? 'Tariffa aggiornata. I turni già registrati non cambiano.' : 'Giro aggiunto.');
    carica();
  };

  const elimina = async () => {
    if (!daEliminare) return;
    setEliminazione(true);
    const { error } = await supabase.from('tariffe_giri').delete().eq('id', daEliminare.id);
    setEliminazione(false);
    setDaEliminare(null);
    if (error) mostraMessaggio('errore', `Eliminazione non riuscita: ${error.message}`);
    else {
      mostraMessaggio('ok', 'Giro eliminato. I turni già registrati mantengono il loro importo.');
      carica();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento tariffe...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      <header className="bg-white border-b border-gray-100 md:sticky md:top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/presenze"
              aria-label="Torna alle presenze"
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base tracking-tight truncate">Tariffe dei giri</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 font-medium">Importo maturato per ogni giro scelto al check-in</p>
            </div>
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
              onClick={apriNuova}
              className="h-10 px-4 rounded-2xl bg-[#E05353] hover:bg-[#c94545] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Nuovo<span className="hidden sm:inline"> giro</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 space-y-5">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-[11px] text-blue-800 leading-relaxed">
          Cambiare una tariffa vale <b>dal prossimo check-in</b>: i turni già registrati mantengono l'importo che avevano (si correggono uno per uno dalla pagina Presenze).
          Un giro con <b>importo variabile</b> (es. Extra) parte a zero e finisce "da controllare" finché un amministratore inserisce la cifra.
        </div>

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
            <span>Impossibile caricare le tariffe: {errore}</span>
          </div>
        )}

        {APPALTI.map((ap) => {
          const righe = tariffe.filter((t) => t.appalto === ap);
          if (righe.length === 0 && ap === 'RHENUS') return null;
          return (
            <section key={ap} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{ap}</h2>
              {righe.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">Nessun giro configurato.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {righe.map((t) => (
                    <li key={t.id} className={`py-3 flex items-center gap-3 ${t.attivo ? '' : 'opacity-50'}`}>
                      <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {t.codice || '·'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {t.nome}
                          {!t.attivo && <span className="ml-2 text-[10px] font-bold text-gray-400">(disattivato)</span>}
                        </p>
                      </div>
                      <span className={`text-sm font-black whitespace-nowrap ${t.importo === null ? 'text-amber-600' : 'text-[#1E242B]'}`}>{euro(t.importo)}</span>
                      <button onClick={() => apriModifica(t)} aria-label="Modifica" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDaEliminare(t)} aria-label="Elimina" className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>

      {modaleAperta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={salva} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base">{inModifica ? 'Modifica giro' : 'Nuovo giro'}</h2>
              <button type="button" onClick={() => setModaleAperta(false)} aria-label="Chiudi" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Appalto</label>
                <select
                  value={appalto}
                  onChange={(e) => setAppalto(e.target.value as Tariffa['appalto'])}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                >
                  {APPALTI.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Lettera nel file (facoltativa)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={codice}
                  onChange={(e) => setCodice(e.target.value)}
                  placeholder="es. P"
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Nome del giro (come lo vede l'autista)</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="es. Novara"
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Importo giornaliero (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={importo}
                disabled={variabile}
                onChange={(e) => setImporto(e.target.value)}
                placeholder="es. 185"
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353] disabled:opacity-40"
              />
              <label className="flex items-center gap-2 mt-2 text-xs font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={variabile} onChange={(e) => setVariabile(e.target.checked)} />
                Importo variabile (lo inserisce un admin dopo il check-in)
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={attivo} onChange={(e) => setAttivo(e.target.checked)} />
              Attivo (visibile agli autisti al check-in)
            </label>

            {erroreModale && (
              <p role="alert" className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                {erroreModale}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModaleAperta(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                Annulla
              </button>
              <button
                type="submit"
                disabled={salvataggio}
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
                <p className="font-extrabold text-sm mb-1">Eliminare il giro?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {daEliminare.appalto} — {daEliminare.nome}. Gli autisti non potranno più sceglierlo. Se vuoi solo nasconderlo, disattivalo dalla modifica.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDaEliminare(null)} disabled={eliminazione} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                Annulla
              </button>
              <button onClick={elimina} disabled={eliminazione} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 transition-colors">
                {eliminazione ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
