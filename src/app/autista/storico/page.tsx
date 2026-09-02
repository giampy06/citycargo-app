'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { Calendar as CalendarIcon, ChevronLeft, Loader2, Filter, TrendingUp } from 'lucide-react';

export default function StoricoAutistaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [turni, setTurni] = useState<any[]>([]);
  const [meseSelezionato, setMeseSelezionato] = useState<string>('TUTTI');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }

      const { data: turniData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .order('created_at', { ascending: false });

      setTurni(turniData || []);
      setLoading(false);
    }
    init();
  }, [router]);

  // Estrai i mesi disponibili dai turni effettuati (es. "09/2026")
  const mesiDisponibili = Array.from(new Set(turni.map(t => {
    const data = new Date(t.created_at);
    return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  })));

  // Filtra i turni in base al mese selezionato
  const turniFiltrati = turni.filter(t => {
    if (meseSelezionato === 'TUTTI') return true;
    const data = new Date(t.created_at);
    const formatoMese = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
    return formatoMese === meseSelezionato;
  });

  const kmMeseTotali = turniFiltrati.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento storico...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 font-sans antialiased">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista" 
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Storico Turni</h1>
            <p className="text-[11px] text-gray-400 font-medium">Controllo presenze mese per mese</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        
        {/* FILTRI MESE PER MESE */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-1">
            <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Filter className="w-3.5 h-3.5 text-[#E05353]" /> Seleziona Periodo
            </span>
            <span>{turniFiltrati.length} turni trovati</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setMeseSelezionato('TUTTI')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                meseSelezionato === 'TUTTI'
                  ? 'bg-[#1E242B] text-white shadow-sm'
                  : 'bg-[#F8F9FB] text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Tutti i turni
            </button>
            {mesiDisponibili.map((m) => {
              const [meseNum, annoNum] = m.split('/');
              const nomeMese = new Date(Number(annoNum), Number(meseNum) - 1, 1).toLocaleString('it-IT', { month: 'long' });
              const etichetta = `${nomeMese.charAt(0).toUpperCase() + nomeMese.slice(1)} ${annoNum}`;

              return (
                <button
                  key={m}
                  onClick={() => setMeseSelezionato(m)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap capitalize ${
                    meseSelezionato === m
                      ? 'bg-[#1E242B] text-white shadow-sm'
                      : 'bg-[#F8F9FB] text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {etichetta}
                </button>
              );
            })}
          </div>

          {/* Box Riepilogo Km del Mese Selezionato */}
          <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 flex items-center justify-between text-xs">
            <span className="text-rose-900 font-bold">Km totali nel periodo:</span>
            <span className="font-black text-[#E05353] text-sm">+{kmMeseTotali.toLocaleString('it-IT')} km</span>
          </div>
        </div>

        {/* ELENCO TURNI */}
        {turniFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-6 space-y-2 shadow-sm">
            <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-600">Nessun turno registrato in questo mese</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {turniFiltrati.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-4 flex items-center justify-between text-xs border border-gray-100 shadow-sm hover:border-gray-200 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-[#1E242B]">{t.targa_mezzo}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      t.stato === 'chiuso' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.stato}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {new Date(t.created_at).toLocaleDateString('it-IT')} • Appalto: {t.appalto || 'CITI'} • Verbale: {t.codice_verbale}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-black text-[#E05353]">{t.km_percorsi ? `+${t.km_percorsi} km` : 'In corso'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}