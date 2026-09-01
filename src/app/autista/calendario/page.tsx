'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  Clock, 
  Gauge, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';

export default function CalendarioAutistaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [turni, setTurni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTurni(data);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const mesiNomi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Filtra i turni del mese selezionato
  const turniDelMese = useMemo(() => {
    return turni.filter((t) => {
      const d = new Date(t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [turni, currentMonth, currentYear]);

  const totaleKm = turniDelMese.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);
  const giornateLavorate = new Set(turniDelMese.map(t => new Date(t.created_at).toDateString())).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento storico presenze...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
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
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Storico & Presenze</h1>
            <p className="text-[11px] text-gray-400 font-medium">Riepilogo Giornate e Chilometri</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {/* Selettore Mese */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <button 
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="font-black text-base text-[#1E242B]">{mesiNomi[currentMonth]} {currentYear}</h2>
            <span className="text-[11px] text-gray-400 font-medium">{turniDelMese.length} turni registrati</span>
          </div>

          <button 
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 2 KPI Mensili */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Giornate Svolte</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">{giornateLavorate} gg</div>
            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Nel mese selezionato</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Km Totali Percorsi</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">+{totaleKm.toLocaleString('it-IT')}</div>
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">Chilometri certificati</span>
          </div>
        </div>

        {/* Lista Dettagliata Giornate / Turni */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Dettaglio Servizi del Mese
          </h3>

          {turniDelMese.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-[#F8F9FB] rounded-2xl border border-dashed border-gray-200">
              Nessun turno registrato in questo mese.
            </div>
          ) : (
            <div className="space-y-2.5">
              {turniDelMese.map((t) => (
                <div key={t.id} className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1E242B]">
                        {new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded-lg border border-gray-200 text-[11px]">
                        {t.targa_mezzo}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-[#E05353]">
                        {t.appalto}
                      </span>
                    </div>

                    <span className="font-black text-emerald-600 text-xs">
                      {t.km_percorsi ? `+${t.km_percorsi} km` : 'In corso'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/50">
                    <span>Partenza: <b>{Number(t.km_inizio).toLocaleString('it-IT')} km</b> {t.km_fine ? `→ Rientro: ${Number(t.km_fine).toLocaleString('it-IT')} km` : ''}</span>
                    <span className="font-mono text-[10px] text-gray-400">{t.codice_verbale}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}