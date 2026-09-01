'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Gauge, 
  Check 
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [kmFine, setKmFine] = useState('');
  const [noteFine, setNoteFine] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      // Cerca il turno attualmente aperto dell'autista
      const { data: turnoData, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .eq('stato', 'aperto')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (turnoData) {
        setTurnoAperto(turnoData);
        setKmFine(turnoData.km_inizio?.toString() || '');
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleChiudiTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const kmFineNum = Number(kmFine);
    const kmInizioNum = Number(turnoAperto?.km_inizio || 0);

    if (isNaN(kmFineNum) || kmFineNum < kmInizioNum) {
      setErrorMsg(`I km finali (${kmFineNum}) non possono essere inferiori a quelli iniziali (${kmInizioNum} km).`);
      return;
    }

    setSubmitting(true);
    const kmPercorsi = kmFineNum - kmInizioNum;

    try {
      // 1. Aggiorna e Chiude il Turno
      const { error: turnoErr } = await supabase
        .from('turni_presenze')
        .update({
          km_fine: kmFineNum,
          km_percorsi: kmPercorsi,
          stato: 'chiuso',
          note_fine: noteFine || null,
        })
        .eq('id', turnoAperto.id);

      if (turnoErr) throw turnoErr;

      // 2. Aggiorna il chilometraggio del furgone nella tabella veicoli
      if (turnoAperto.targa_mezzo) {
        await supabase
          .from('veicoli')
          .update({ km_attuali: kmFineNum, stato: 'disponibile' })
          .eq('targa', turnoAperto.targa_mezzo);
      }

      alert(`Turno chiuso con successo!\nHai percorso ${kmPercorsi} km in questo servizio.`);
      window.location.href = '/autista';
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la chiusura del turno.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Verifica turni in corso...
      </div>
    );
  }

  if (!turnoAperto) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#1E242B]">Nessun Turno Aperto</h2>
        <p className="text-xs text-gray-500 max-w-xs">
          Non risulta nessun servizio attivo da chiudere. Tutti i tuoi turni sono completati.
        </p>
        <Link
          href="/autista"
          className="py-3 px-6 bg-[#1E242B] text-white text-xs font-bold rounded-2xl"
        >
          Torna all'App Autista
        </Link>
      </div>
    );
  }

  const kmInizioNum = Number(turnoAperto.km_inizio || 0);
  const kmFineNum = Number(kmFine) || kmInizioNum;
  const deltaKm = kmFineNum >= kmInizioNum ? kmFineNum - kmInizioNum : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista" 
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Fine Turno (Check-out)</h1>
            <p className="text-[11px] text-gray-400 font-medium">Chiusura Servizio & Rendiconto Km</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Riepilogo Turno in Chiusura */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-50 text-[#E05353]">
              {turnoAperto.appalto}
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-400">
              {turnoAperto.codice_verbale}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-[#1E242B] tracking-tight">{turnoAperto.targa_mezzo}</h2>
            <p className="text-xs text-gray-400">Inizio turno: {new Date(turnoAperto.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div className="p-3 bg-[#F8F9FB] rounded-2xl flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Km Registrati alla Partenza:</span>
            <span className="font-extrabold text-[#1E242B]">{kmInizioNum.toLocaleString('it-IT')} km</span>
          </div>
        </div>

        <form onSubmit={handleChiudiTurno} className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Chilometri Finali al Rientro
              </label>
              <input
                type="number"
                required
                value={kmFine}
                onChange={(e) => setKmFine(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>

            {/* Calcolo Automatico Distanza */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Distanza Percorsa Oggi:</span>
              <span className="text-lg font-black text-emerald-700">+{deltaKm.toLocaleString('it-IT')} km</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Note o Segnalazioni di Fine Servizio (Opzionale)
              </label>
              <textarea
                rows={2}
                placeholder="es. Livello AdBlue basso, rifornimento eseguito, nessun danno..."
                value={noteFine}
                onChange={(e) => setNoteFine(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#1E242B] hover:bg-black disabled:bg-gray-300 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Chiusura Turno in Corso...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-emerald-400" />
                Conferma & Chiudi Turno di Lavoro
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}