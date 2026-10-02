'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { CheckSquare, Loader2, AlertCircle, Gauge, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { creaPdfBolle, type PaginaBolla } from '@/lib/scanner/pdf';
import { nomeFileBolle } from '@/lib/bolle';

// Lo scanner (e il suo OpenCV) serve solo ai turni RHENUS: non appesantisce gli altri check-out.
const BolleScanner = dynamic(() => import('@/components/scanner/BolleScanner'), { ssr: false });

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [kmFine, setKmFine] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bolle di consegna (solo RHENUS)
  const [pagineBolle, setPagineBolle] = useState<PaginaBolla[]>([]);
  const [fase, setFase] = useState<string | null>(null);
  const [nomeAutista, setNomeAutista] = useState('');
  // Se il PDF è già stato caricato e collegato al turno ma la chiusura fallisce,
  // al nuovo tentativo non lo ricarichiamo (a meno che le pagine siano cambiate).
  const bolleGiaAllegate = useRef<string | null>(null);
  // Libera le anteprime delle pagine quando si lascia la pagina.
  const pagineRef = useRef<PaginaBolla[]>([]);
  useEffect(() => {
    pagineRef.current = pagineBolle;
  }, [pagineBolle]);
  useEffect(() => () => pagineRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const isRhenus = turnoAperto?.appalto === 'RHENUS';
  const nomeFilePdf = isRhenus ? nomeFileBolle(nomeAutista, turnoAperto.targa_mezzo, turnoAperto.created_at) : '';
  const titoloPdf = isRhenus ? `Bolle RHENUS ${nomeAutista} ${turnoAperto.targa_mezzo} ${turnoAperto.codice_verbale}` : '';

  useEffect(() => {
    async function fetchTurnoAperto() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }

      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .eq('stato', 'aperto')
        .maybeSingle();

      if (error || !data) {
        setErrorMsg('Nessun turno attivo trovato per oggi.');
      } else {
        setTurnoAperto(data);
        // Nome e cognome dall'anagrafica, per il nome del PDF delle bolle (RHENUS).
        if (data.appalto === 'RHENUS') {
          const { data: autista } = await supabase.from('autisti').select('nome, cognome').eq('id', session.user.id).maybeSingle();
          setNomeAutista(autista ? `${autista.nome} ${autista.cognome}` : data.nome_autista || '');
        }
      }
      setLoading(false);
    }
    fetchTurnoAperto();
  }, [router]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoAperto) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const kmFineNum = Number(kmFine);
      const kmInizioNum = Number(turnoAperto.km_inizio) || 0;

      if (!kmFine || kmFineNum <= kmInizioNum) {
        throw new Error(`I km finali devono essere superiori a quelli di partenza (${kmInizioNum} km).`);
      }

      const kmPercorsi = kmFineNum - kmInizioNum;

      if (isRhenus) {
        if (pagineBolle.length === 0) {
          const ok = await confirm(
            'Non hai scansionato nessuna bolla di consegna. Vuoi chiudere il turno RHENUS senza bolle?',
            { titolo: 'Nessuna bolla', confermaLabel: 'Chiudi senza bolle', annullaLabel: 'Torna a scansionare' }
          );
          if (!ok) return;
        } else {
          const firma = pagineBolle.map((p) => p.id).join(',');
          if (bolleGiaAllegate.current !== firma) {
            setFase('Creo il PDF delle bolle...');
            const pdf = await creaPdfBolle(pagineBolle, titoloPdf);
            // Il bucket accetta PDF fino a 20 MB: meglio un messaggio chiaro che un rifiuto tecnico.
            if (pdf.size > 19.5 * 1024 * 1024) {
              throw new Error('Il PDF delle bolle supera i 20 MB: elimina qualche pagina e riprova.');
            }

            // Bucket privato: nel database va solo il PERCORSO, il link si genera
            // (firmato e temporaneo) quando l'admin lo scarica.
            setFase('Carico le bolle...');
            const percorso = `turni/${turnoAperto.id}/bolle-${Date.now()}.pdf`;
            const { error: upErr } = await supabase.storage
              .from('bolle-consegna')
              .upload(percorso, pdf, { contentType: 'application/pdf', upsert: false });
            if (upErr) throw new Error(`Bolle non caricate: ${upErr.message}. Il turno è ancora aperto, riprova.`);

            const { error: allegaErr } = await supabase.rpc('allega_bolle_turno', {
              p_turno_id: turnoAperto.id,
              p_path: percorso,
            });
            if (allegaErr) throw new Error(`Bolle caricate ma non collegate al turno: ${allegaErr.message}. Riprova.`);
            bolleGiaAllegate.current = firma;
          }
        }
      }

      setFase('Chiudo il turno...');

      // chiudi_turno (SECURITY DEFINER) chiude il turno e riporta il veicolo
      // "disponibile" con i km aggiornati in un'unica operazione lato server,
      // verificando che il turno appartenga davvero a chi chiama.
      const { error } = await supabase.rpc('chiudi_turno', {
        p_turno_id: turnoAperto.id,
        p_km_finali: kmFineNum,
      });

      if (error) throw new Error(`Impossibile chiudere il turno: ${error.message}`);

      const notaBolle = isRhenus && pagineBolle.length > 0
        ? ` Bolle archiviate: ${pagineBolle.length} ${pagineBolle.length === 1 ? 'pagina' : 'pagine'}.`
        : '';
      toast(`Turno chiuso con successo! Percorsi ${kmPercorsi} km.${notaBolle}`, 'success');
      router.push('/autista');
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la chiusura del turno.');
    } finally {
      setSubmitting(false);
      setFase(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento turno in corso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] p-4 flex items-center justify-center font-sans antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push('/autista')}
            className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-50 text-[#E05353]">
            Fine Servizio
          </span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-black tracking-tight">Check-out Turno</h1>
          <p className="text-xs text-gray-400 font-mono">{turnoAperto?.codice_verbale}</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {turnoAperto ? (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="p-4 bg-[#F8F9FB] rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Mezzo:</span>
                <b className="font-mono text-[#1E242B]">{turnoAperto.targa_mezzo}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Km di Partenza:</span>
                <b>{Number(turnoAperto.km_inizio).toLocaleString('it-IT')} km</b>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Km Finali alla Fine del Turno
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  placeholder="es. 126500"
                  value={kmFine}
                  onChange={(e) => setKmFine(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>

            {isRhenus && (
              <div className="p-4 bg-[#F8F9FB] rounded-2xl">
                <BolleScanner
                  pagine={pagineBolle}
                  onPagineChange={setPagineBolle}
                  nomeFilePdf={nomeFilePdf}
                  titoloPdf={titoloPdf}
                  disabilitato={submitting}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-black text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {fase || 'Registrazione in corso...'}
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Conferma e Termina Turno
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-6 text-xs text-gray-500">
            Nessun turno aperto da chiudere.
          </div>
        )}
      </div>
    </div>
  );
}