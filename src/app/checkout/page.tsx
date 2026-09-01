'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ChevronLeft, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Gauge, 
  Check
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();

  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);

  // Stati del form
  const [kmFine, setKmFine] = useState<string>('');
  const [tipoTurno, setTipoTurno] = useState<'giornata_intera' | 'mezza_giornata'>('giornata_intera');
  const [haStraordinario, setHaStraordinario] = useState(false);
  const [noteStraordinario, setNoteStraordinario] = useState('');
  const [noteFinali, setNoteFinali] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLastOpenShift() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/autista/login');
          return;
        }

        const { data, error } = await supabase
          .from('turni_presenze')
          .select('*')
          .eq('stato', 'aperto')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setTurnoAperto(data);
      } catch (err: any) {
        console.error('Errore recupero turno:', err);
      } finally {
        setLoadingTurno(false);
      }
    }

    fetchLastOpenShift();
  }, [router]);

  const kmIniziali = turnoAperto ? Number(turnoAperto.km_inizio) : 0;
  const kmPercorsi = kmFine && !isNaN(Number(kmFine)) && Number(kmFine) >= kmIniziali ? Number(kmFine) - kmIniziali : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const kmFinaleNum = Number(kmFine);

    if (!kmFine || isNaN(kmFinaleNum)) {
      setErrorMsg('Inserisci un chilometraggio di fine turno valido.');
      return;
    }

    if (kmFinaleNum < kmIniziali) {
      setErrorMsg(`I km finali (${kmFinaleNum}) non possono essere inferiori a quelli iniziali (${kmIniziali}).`);
      return;
    }

    setLoadingSubmit(true);

    try {
      if (turnoAperto) {
        const { error } = await supabase
          .from('turni_presenze')
          .update({
            km_fine: kmFinaleNum,
            tipo_turno: tipoTurno,
            ha_straordinario: haStraordinario,
            note_straordinario: haStraordinario ? noteStraordinario : null,
            note_fine: noteFinali || null,
            stato: 'completato',
          })
          .eq('id', turnoAperto.id);

        if (error) throw error;
      }

      alert(`Turno chiuso con successo!\nKm totali percorsi oggi: +${kmPercorsi} km`);
      window.location.href = '/autista';
    } catch (err: any) {
      console.error('Errore chiusura turno:', err);
      setErrorMsg(err.message || 'Errore durante la chiusura del turno.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-16 antialiased">
      {/* Header Sticky con Link diretto ad /autista */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista"
            replace
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Fine Turno & Check-out</h1>
            <p className="text-[11px] text-gray-400 font-medium">Chiusura Giornaliera e Riconsegna</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4">
        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Stato Turno in Corso */}
        {loadingTurno ? (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Recupero turno in corso...
          </div>
        ) : turnoAperto ? (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Turno Aperto Attivo</span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-[#E05353] font-black text-xs">
                {turnoAperto.appalto}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <div>
                <div className="text-base font-extrabold">{turnoAperto.targa_mezzo}</div>
                <div className="text-xs text-gray-400">{turnoAperto.codice_verbale}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Km Partenza</div>
                <div className="text-sm font-bold text-gray-700">{Number(turnoAperto.km_inizio).toLocaleString('it-IT')} km</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 shadow-sm mb-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4" />
              Nessun turno aperto trovato
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Effettua prima un Check-in iniziale per poter registrare la riconsegna.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Km Finali */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              1. Chilometri a Fine Servizio
            </label>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Km Quadro Strumenti Attuali</label>
              <input
                type="number"
                placeholder={turnoAperto ? `es. ${kmIniziali + 120}` : 'es. 124620'}
                value={kmFine}
                onChange={(e) => setKmFine(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                required
              />
            </div>

            {kmFine && Number(kmFine) >= kmIniziali && (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" /> Percorrenza Calcolata:
                </span>
                <span className="text-sm font-black text-emerald-700">+{kmPercorsi} km</span>
              </div>
            )}
          </div>

          {/* 2. Tipologia Giornata */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              2. Tipologia di Turno
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoTurno('giornata_intera')}
                className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border flex items-center justify-center gap-2 ${
                  tipoTurno === 'giornata_intera'
                    ? 'bg-[#1E242B] text-white border-[#1E242B] shadow-sm'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Giornata Intera
                {tipoTurno === 'giornata_intera' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setTipoTurno('mezza_giornata')}
                className={`py-3 px-4 rounded-2xl font-bold text-xs transition-all border flex items-center justify-center gap-2 ${
                  tipoTurno === 'mezza_giornata'
                    ? 'bg-[#1E242B] text-white border-[#1E242B] shadow-sm'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Mezza Giornata
                {tipoTurno === 'mezza_giornata' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Straordinari & Note */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                3. Straordinari & Note Riconsegna
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={haStraordinario}
                  onChange={(e) => setHaStraordinario(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E05353] focus:ring-[#E05353] accent-[#E05353]"
                />
                <span className="text-xs font-bold text-gray-700">Richiedi Extra</span>
              </label>
            </div>

            {haStraordinario && (
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Motivazione Straordinario</label>
                <textarea
                  rows={2}
                  placeholder="es. Consegne supplementari concordate..."
                  value={noteStraordinario}
                  onChange={(e) => setNoteStraordinario(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  required={haStraordinario}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Note Riconsegna (Opzionale)</label>
              <textarea
                rows={2}
                placeholder="es. Carburante al 50%, veicolo pulito..."
                value={noteFinali}
                onChange={(e) => setNoteFinali(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingSubmit || !turnoAperto}
            className="w-full py-4 bg-[#1E242B] hover:bg-black disabled:bg-gray-300 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {loadingSubmit ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Chiusura turno in corso...
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                Completa Check-out & Termina Servizio
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}