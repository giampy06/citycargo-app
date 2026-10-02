'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, FileDown, Loader2, RotateCcw, ScanLine, Trash2, X } from 'lucide-react';
import { caricaOpenCv } from '@/lib/scanner/opencv';
import { caricaFoto, canvasInJpeg, rilevaAngoli, scansiona, type Angoli, type EsitoRilevamento } from '@/lib/scanner/elabora';
import { creaPdfBolle, scaricaBlob, type PaginaBolla } from '@/lib/scanner/pdf';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EditorAngoli from './EditorAngoli';

type Props = {
  pagine: PaginaBolla[];
  onPagineChange: (pagine: PaginaBolla[]) => void;
  /** Nome del PDF scaricabile (NOMEAUTISTA-TARGA-DATA.pdf) e titolo interno del PDF. */
  nomeFilePdf: string;
  titoloPdf: string;
  disabilitato?: boolean;
};

type InModifica = {
  foto: HTMLCanvasElement;
  url: string;
  angoli: Angoli;
  esito: EsitoRilevamento;
  /** Indice della pagina da sostituire ("Rifai"), oppure null per una pagina nuova. */
  sostituisci: number | null;
};

/** ~300 KB a bolla: 50 bolle ≈ 15 MB, sotto il limite di 20 MB del bucket bolle-consegna. */
export const MAX_PAGINE_BOLLE = 50;

const MESSAGGI_ESITO: Record<EsitoRilevamento, { testo: string; classe: string }> = {
  trovato: {
    testo: 'Bordi rilevati in automatico. Controlla che gli angoli rossi siano sugli angoli del foglio, poi conferma.',
    classe: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  incerto: {
    testo: 'Il foglio sembra uscire dalla foto: controlla bene gli angoli, oppure rifai la foto inquadrando tutta la bolla.',
    classe: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  non_trovato: {
    testo: 'Non sono riuscito a trovare i bordi del foglio. Trascina i 4 angoli rossi sugli angoli della bolla.',
    classe: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

/**
 * Scansione delle bolle di consegna: una foto per bolla, rilevamento automatico dei
 * bordi con correzione manuale SEMPRE possibile, raddrizzamento + bianco e nero, elenco
 * delle pagine con anteprima, elimina e rifai. Il PDF finale lo genera chi usa il
 * componente (check-out) al momento di chiudere il turno; qui si può anche scaricare.
 */
export default function BolleScanner({ pagine, onPagineChange, nomeFilePdf, titoloPdf, disabilitato }: Props) {
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const sostituisciRef = useRef<number | null>(null);
  const [inModifica, setInModifica] = useState<InModifica | null>(null);
  const [lavoro, setLavoro] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [anteprima, setAnteprima] = useState<PaginaBolla | null>(null);

  // OpenCV pesa qualche MB: inizia a scaricarlo appena si apre il check-out RHENUS,
  // così quando l'autista scatta la prima foto è (quasi sempre) già pronto.
  useEffect(() => {
    caricaOpenCv().catch(() => {});
  }, []);

  const apriFotocamera = (sostituisci: number | null) => {
    setErrore(null);
    sostituisciRef.current = sostituisci;
    inputRef.current?.click();
  };

  const fotoScattata = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // così si può riscegliere anche lo stesso file
    if (!file) return;
    try {
      setLavoro('Preparo il modulo di scansione...');
      const { cv } = await caricaOpenCv();
      setLavoro('Cerco i bordi del foglio...');
      const foto = await caricaFoto(file);
      await new Promise((r) => setTimeout(r, 20)); // lascia disegnare il messaggio
      const { angoli, esito } = rilevaAngoli(cv, foto);
      const url = URL.createObjectURL(await canvasInJpeg(foto, 0.85));
      setInModifica({ foto, url, angoli, esito, sostituisci: sostituisciRef.current });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore durante la lettura della foto.');
    } finally {
      setLavoro(null);
    }
  };

  const chiudiEditor = () => {
    if (inModifica) URL.revokeObjectURL(inModifica.url);
    setInModifica(null);
  };

  const confermaPagina = async () => {
    if (!inModifica) return;
    try {
      setLavoro('Raddrizzo la pagina...');
      await new Promise((r) => setTimeout(r, 20));
      const { cv } = await caricaOpenCv();
      const scansione = scansiona(cv, inModifica.foto, inModifica.angoli);
      const jpeg = await canvasInJpeg(scansione, 0.8);
      const nuova: PaginaBolla = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        jpeg,
        url: URL.createObjectURL(jpeg),
        larghezza: scansione.width,
        altezza: scansione.height,
      };
      const indice = inModifica.sostituisci;
      if (indice !== null && pagine[indice]) {
        URL.revokeObjectURL(pagine[indice].url);
        onPagineChange(pagine.map((p, i) => (i === indice ? nuova : p)));
      } else {
        onPagineChange([...pagine, nuova]);
      }
      chiudiEditor();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore durante la scansione della pagina.');
    } finally {
      setLavoro(null);
    }
  };

  const eliminaPagina = async (indice: number) => {
    const ok = await confirm(`Eliminare la pagina ${indice + 1}?`, { confermaLabel: 'Elimina', pericoloso: true });
    if (!ok) return;
    URL.revokeObjectURL(pagine[indice].url);
    onPagineChange(pagine.filter((_, i) => i !== indice));
  };

  const scaricaPdf = async () => {
    try {
      setLavoro('Creo il PDF...');
      const pdf = await creaPdfBolle(pagine, titoloPdf);
      scaricaBlob(pdf, nomeFilePdf);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore durante la creazione del PDF.');
    } finally {
      setLavoro(null);
    }
  };

  const occupato = !!lavoro || !!disabilitato;
  const pieno = pagine.length >= MAX_PAGINE_BOLLE;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-gray-600 uppercase">Bolle di consegna RHENUS</label>
        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            pagine.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {pagine.length} {pagine.length === 1 ? 'pagina' : 'pagine'}
        </span>
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={fotoScattata} />

      {pagine.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pagine.map((p, i) => (
            <div key={p.id} className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button type="button" onClick={() => setAnteprima(p)} className="block w-full" aria-label={`Anteprima pagina ${i + 1}`}>
                <img src={p.url} alt={`Pagina ${i + 1}`} className="w-full aspect-[3/4] object-contain bg-gray-50" />
              </button>
              <span className="absolute top-1 left-1 text-[10px] font-black bg-[#1E242B] text-white rounded-md px-1.5 py-0.5">{i + 1}</span>
              <div className="flex border-t border-gray-100">
                <button
                  type="button"
                  disabled={occupato}
                  onClick={() => apriFotocamera(i)}
                  className="flex-1 py-1.5 text-gray-600 hover:bg-gray-50 flex items-center justify-center disabled:opacity-40"
                  aria-label={`Rifai pagina ${i + 1}`}
                  title="Rifai"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={occupato}
                  onClick={() => eliminaPagina(i)}
                  className="flex-1 py-1.5 text-[#E05353] hover:bg-rose-50 flex items-center justify-center border-l border-gray-100 disabled:opacity-40"
                  aria-label={`Elimina pagina ${i + 1}`}
                  title="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {errore && (
        <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{errore}</p>
      )}

      {pieno && (
        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Hai raggiunto il massimo di {MAX_PAGINE_BOLLE} bolle per turno. Puoi ancora rifare o eliminare le pagine.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={occupato || pieno}
          onClick={() => apriFotocamera(null)}
          className="flex-1 py-3 bg-[#1E242B] hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
        >
          {lavoro && !inModifica ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {lavoro && !inModifica ? lavoro : pagine.length === 0 ? 'Scansiona bolle di consegna' : 'Aggiungi bolla'}
        </button>
        {pagine.length > 0 && (
          <button
            type="button"
            disabled={occupato}
            onClick={scaricaPdf}
            className="px-3 py-3 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            title="Scarica il PDF delle bolle"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
        )}
      </div>

      {/* EDITOR ANGOLI — sempre mostrato dopo ogni foto: l'automatismo propone, l'autista conferma o corregge */}
      {inModifica && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 text-white">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#E05353]" />
              <span className="font-black text-sm">
                {inModifica.sostituisci !== null ? `Rifai pagina ${inModifica.sostituisci + 1}` : `Pagina ${pagine.length + 1}`}
              </span>
            </div>
            <button type="button" onClick={chiudiEditor} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Annulla">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`mx-4 mb-2 text-[11px] font-semibold border rounded-xl px-3 py-2 ${MESSAGGI_ESITO[inModifica.esito].classe}`}>
            {MESSAGGI_ESITO[inModifica.esito].testo}
          </p>

          <div className="flex-1 min-h-0 px-3">
            <EditorAngoli
              url={inModifica.url}
              larghezza={inModifica.foto.width}
              altezza={inModifica.foto.height}
              angoli={inModifica.angoli}
              onChange={(angoli) => setInModifica({ ...inModifica, angoli })}
            />
          </div>

          <div className="flex gap-2 p-4">
            <button
              type="button"
              disabled={!!lavoro}
              onClick={() => {
                const sostituisci = inModifica.sostituisci;
                chiudiEditor();
                apriFotocamera(sostituisci);
              }}
              className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Rifai foto
            </button>
            <button
              type="button"
              disabled={!!lavoro}
              onClick={confermaPagina}
              className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
            >
              {lavoro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {lavoro || 'Conferma pagina'}
            </button>
          </div>
        </div>
      )}

      {/* ANTEPRIMA GRANDE DI UNA PAGINA */}
      {anteprima && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setAnteprima(null)}>
          <div className="flex justify-end p-4">
            <button type="button" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Chiudi anteprima">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3">
            <img src={anteprima.url} alt="Anteprima pagina" className="max-w-full max-h-full object-contain bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
