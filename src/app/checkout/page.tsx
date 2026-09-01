'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { CheckSquare, Loader2, AlertCircle, Gauge, ArrowLeft } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [kmFine, setKmFine] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      // Calcolo compenso base (es. 85€ a turno o tariffa fissa)
      const compenso = 85.00;

      const { error } = await supabase
        .from('turni_presenze')
        .update({
          km_fine: kmFineNum,
          km_percorsi: kmPercorsi,
          compenso_giornaliero: compenso,
          stato: 'chiuso',
        })
        .eq('id', turnoAperto.id);

      if (error) throw error;

      // Aggiorna anche i km attuali del veicolo nella flotta
      await supabase
        .from('veicoli')
        .update({ km_attuali: kmFineNum, stato: 'disponibile' })
        .eq('targa', turnoAperto.targa_mezzo);

      alert(`Turno chiuso con successo! Percorsi ${kmPercorsi} km.`);
      router.push('/autista');
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#E05353] hover:bg-[#c94545] disabled:opacity-50 text-white font-black text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrazione in corso...
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