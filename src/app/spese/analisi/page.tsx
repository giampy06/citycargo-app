'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  PieChart, 
  AlertTriangle, 
  Lightbulb, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  Euro, 
  Truck, 
  Receipt,
  RefreshCw
} from 'lucide-react';

export default function AnalisiSpeseIAPage() {
  const [spese, setSpese] = useState<any[]>([]);
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loadingDati, setLoadingDati] = useState(true);

  // Stato IA
  const [reportIA, setReportIA] = useState<any | null>(null);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  useEffect(() => {
    fetchDati();
  }, []);

  const fetchDati = async () => {
    setLoadingDati(true);
    try {
      const { data: vData } = await supabase.from('veicoli').select('*');
      const { data: sData } = await supabase.from('vehicle_expenses').select('*').order('data_spesa', { ascending: false });

      if (vData) setVeicoli(vData);
      if (sData) setSpese(sData);
    } catch (err: any) {
      console.error('Errore recupero dati per analisi:', err);
    } finally {
      setLoadingDati(false);
    }
  };

  // Statistiche Categorie
  const statsCategorie = useMemo(() => {
    const map: { [key: string]: number } = {};
    spese.forEach((s) => {
      const cat = s.tipo_spesa || 'Altro';
      map[cat] = (map[cat] || 0) + Number(s.importo || 0);
    });

    const totale = Object.values(map).reduce((a, b) => a + b, 0);

    return Object.keys(map).map((cat) => ({
      categoria: cat,
      totale: map[cat],
      percentuale: totale > 0 ? (map[cat] / totale) * 100 : 0,
    })).sort((a, b) => b.totale - a.totale);
  }, [spese]);

  const totaleCosti = spese.reduce((a, b) => a + Number(b.importo || 0), 0);
  const mediaPerMezzo = veicoli.length > 0 ? totaleCosti / veicoli.length : 0;
  const categoriaTop = statsCategorie[0]?.categoria || 'Nessuna';

  const handleGeneraReportIA = async () => {
    if (spese.length === 0) {
      alert('Registra almeno una spesa o fattura prima di avviare l\'analisi con l\'IA.');
      return;
    }

    setGeneratingIA(true);
    setErrorIA(null);

    try {
      const res = await fetch('/api/analyze-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: spese, vehicles: veicoli }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nella generazione del report');

      setReportIA(data.analysis);
    } catch (err: any) {
      setErrorIA(err.message);
    } finally {
      setGeneratingIA(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 antialiased pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white">Analisi Spese & Consulente IA</h1>
                <span className="text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full uppercase">
                  AI Fleet Audit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Ripartizione per categorie, anomalie di costo e consigli strategici di risparmio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/spese"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              Registro Fatture
            </Link>
            <button
              onClick={handleGeneraReportIA}
              disabled={generatingIA || loadingDati}
              className="bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              {generatingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-200" />}
              {reportIA ? 'Aggiorna Analisi IA' : 'Avvia Analisi IA'}
            </button>
          </div>
        </div>

        {/* 3 KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-5 shadow-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Spesa Totale Cumulata</span>
            <div className="text-2xl font-black text-white mt-1">€ {totaleCosti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Da {spese.length} fatture/voci inserite</span>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-5 shadow-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Costo Medio per Mezzo</span>
            <div className="text-2xl font-black text-white mt-1">€ {mediaPerMezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Calcolato su {veicoli.length} furgoni in flotta</span>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-5 shadow-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Voce di Costo Principale</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{categoriaTop}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Maggior incidenza a bilancio</span>
          </div>
        </div>

        {/* Ripartizione Spese per Categorie */}
        <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2 text-white">
            <PieChart className="w-5 h-5 text-red-500" />
            Ripartizione Spese per Categoria
          </h2>

          {statsCategorie.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">Nessuna categoria di spesa registrata.</div>
          ) : (
            <div className="space-y-3">
              {statsCategorie.map((cat) => (
                <div key={cat.categoria} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-200">{cat.categoria}</span>
                    <span className="text-white">
                      € {cat.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })} 
                      <span className="text-slate-400 font-normal ml-2">({cat.percentuale.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#0F172A] rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentuale}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ERRORE IA */}
        {errorIA && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Errore durante l'analisi: {errorIA}</span>
          </div>
        )}

        {/* BOX REPORT IA GENERATO */}
        {generatingIA ? (
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <h3 className="font-bold text-base text-white">Analisi Strategica Flotta in Corso...</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              L'intelligenza artificiale sta incrociando i costi dei veicoli, le frequenze di manutenzione e i rifornimenti per individuare margini di risparmio.
            </p>
          </div>
        ) : reportIA ? (
          <div className="space-y-6">
            
            {/* 1. Sintesi Esecutiva */}
            <div className="bg-[#1E293B] border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Sparkles className="w-5 h-5" />
                Valutazione Finanziaria Esecutiva
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {reportIA.sintesi}
              </p>
            </div>

            {/* 2. Anomalie & Criticità Rilevate */}
            <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                <ShieldAlert className="w-5 h-5" />
                Anomalie & Costi Sospetti Rilevati
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportIA.anomalie_rilevate?.map((anomalia: string, idx: number) => (
                  <div key={idx} className="bg-[#0F172A] border border-red-500/20 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{anomalia}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Consigli Pratici & Strategie di Risparmio */}
            <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <Lightbulb className="w-5 h-5" />
                Piano di Azione & Consigli di Risparmio Operativo
              </div>

              <div className="space-y-3">
                {reportIA.consigli_strategici?.map((consiglio: string, idx: number) => (
                  <div key={idx} className="bg-[#0F172A] border border-emerald-500/20 rounded-2xl p-4 text-xs text-slate-200 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="pt-0.5 leading-relaxed">{consiglio}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#1E293B] border border-dashed border-slate-700 rounded-3xl p-8 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="font-bold text-sm text-white">Nessun report generato per questa sessione</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tocca il pulsante in alto a destra "Avvia Analisi IA" per richiedere una revisione automatica e individuare dove ridurre i costi.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}