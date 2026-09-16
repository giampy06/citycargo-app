'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  RefreshCw, 
  Truck, 
  Users, 
  Euro, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  FolderCheck,
  Loader2
} from 'lucide-react';

export default function ArchivioPresenzePage() {
  const router = useRouter();
  const [turni, setTurni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ricerca, setRicerca] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const mesiNomi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const fetchPresenze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTurni(data || []);
    } catch (err: any) {
      console.error('Errore recupero presenze:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresenze();
  }, []);

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

  // 1. Filtra turni per il mese selezionato
  const turniDelMese = useMemo(() => {
    return turni.filter((t) => {
      const d = new Date(t.created_at);
      const matchMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      const query = ricerca.toLowerCase();
      const matchRicerca = !ricerca || 
        t.nome_autista?.toLowerCase().includes(query) ||
        t.targa_mezzo?.toLowerCase().includes(query) ||
        t.appalto?.toLowerCase().includes(query) ||
        t.giro?.toLowerCase().includes(query);

      return matchMonth && matchRicerca;
    });
  }, [turni, currentMonth, currentYear, ricerca]);

  // 2. Raggruppa i turni giorno per giorno (Sottogruppi giornalieri)
  const presenzeRaggruppatePerGiorno = useMemo(() => {
    const gruppi: { [dataStr: string]: any[] } = {};

    turniDelMese.forEach((t) => {
      const dataChiave = new Date(t.created_at).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      if (!gruppi[dataChiave]) gruppi[dataChiave] = [];
      gruppi[dataChiave].push(t);
    });

    return Object.keys(gruppi).sort((a, b) => b.localeCompare(a)).map((dataKey) => ({
      data: dataKey,
      turni: gruppi[dataKey],
      totaleKm: gruppi[dataKey].reduce((acc, curr) => acc + (Number(curr.km_percorsi) || 0), 0),
      totaleCompensi: gruppi[dataKey].reduce((acc, curr) => acc + (Number(curr.compenso_giornaliero) || 0), 0),
    }));
  }, [turniDelMese]);

  // 3. Statistiche Mensili
  const totalePresenzeMese = turniDelMese.length;
  const totaleKmMese = turniDelMese.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);
  const totaleRetribuzioniMese = turniDelMese.reduce((acc, t) => acc + (Number(t.compenso_giornaliero) || 0), 0);

  // 4. Esportazione Avanzata Excel (CSV Contabile)
  const handleExportExcelMensile = () => {
    if (turniDelMese.length === 0) {
      alert('Nessun dato di presenza da esportare per questo mese.');
      return;
    }

    const headers = [
      'Data Servizio',
      'Codice Verbale',
      'Nome Autista',
      'Targa Furgone',
      'Appalto',
      'Giro / Linea',
      'Km Partenza',
      'Km Rientro',
      'Km Effettivi',
      'Compenso Lordo (€)',
      'Stato Turno'
    ];

    const rows = turniDelMese.map((t) => [
      new Date(t.created_at).toLocaleDateString('it-IT'),
      t.codice_verbale || '',
      t.nome_autista || 'Autista',
      t.targa_mezzo || '',
      t.appalto || '',
      t.giro || 'Giro Standard',
      t.km_inizio || '',
      t.km_fine || '',
      t.km_percorsi || 0,
      t.compenso_giornaliero || 0,
      t.stato || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Presenze_CityCargo_${mesiNomi[currentMonth]}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">Archivio Presenze & Quaderno Giornaliero</h1>
              <p className="text-[11px] text-gray-400 font-medium">Riepilogo Autisti, Giri, Chilometri e Retribuzioni</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchPresenze}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <button 
              onClick={handleExportExcelMensile}
              className="h-10 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Export Excel Mese
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Selettore Mese */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <button 
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="font-black text-lg text-[#1E242B]">{mesiNomi[currentMonth]} {currentYear}</h2>
            <span className="text-xs text-gray-400 font-medium">{presenzeRaggruppatePerGiorno.length} giornate di servizio registrate</span>
          </div>

          <button 
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 3 KPI Riepilogo Mese */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Turni Totali Svolti</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">{totalePresenzeMese}</div>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Presenze validate nel mese</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Km Percorsi Flotta</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">+{totaleKmMese.toLocaleString('it-IT')} km</div>
            <span className="text-[11px] text-gray-400 font-medium mt-0.5 block">Da verbali di check-out</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Monte Retribuzioni / Compensi</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">€ {totaleRetribuzioniMese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Totale maturato per i giri</span>
          </div>
        </div>

        {/* Barra Ricerca */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Filtra per autista, furgone, appalto o giro..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>
        </div>

        {/* LISTA GIORNO PER GIORNO (SOTTOGRUPPI) */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento archivio presenze...
          </div>
        ) : presenzeRaggruppatePerGiorno.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 space-y-2">
            <FolderCheck className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700">Nessuna presenza registrata in questo mese</p>
            <p className="text-[11px]">I turni degli autisti compariranno qui suddivisi automaticamente per ciascun giorno di lavoro.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {presenzeRaggruppatePerGiorno.map((gruppo) => (
              <div key={gruppo.data} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
                {/* Header Giorno */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-50 text-[#E05353] rounded-xl font-black text-xs">
                      📅 {gruppo.data}
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      {gruppo.turni.length} {gruppo.turni.length === 1 ? 'conducente in servizio' : 'conducenti in servizio'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
                    <span>Km Giorno: <b className="text-[#1E242B]">+{gruppo.totaleKm} km</b></span>
                    {gruppo.totaleCompensi > 0 && (
                      <span>Compensi: <b className="text-emerald-600">€ {gruppo.totaleCompensi.toFixed(2)}</b></span>
                    )}
                  </div>
                </div>

                {/* Tabella Turni del Giorno */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-2.5">Autista</th>
                        <th className="pb-2.5">Targa Mezzo</th>
                        <th className="pb-2.5">Appalto & Giro</th>
                        <th className="pb-2.5">Km Inizio / Fine</th>
                        <th className="pb-2.5">Percorsi</th>
                        <th className="pb-2.5">Compenso</th>
                        <th className="pb-2.5 text-right">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                      {gruppo.turni.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 font-bold text-gray-800 capitalize">
                            {t.nome_autista || 'Autista'}
                          </td>
                          <td className="py-3 font-mono font-bold text-[#1E242B]">
                            {t.targa_mezzo}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-gray-700 mr-2">{t.appalto}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                              {t.giro || 'Giro Standard'}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500">
                            {Number(t.km_inizio).toLocaleString('it-IT')} km
                            {t.km_fine ? ` → ${Number(t.km_fine).toLocaleString('it-IT')} km` : ''}
                          </td>
                          <td className="py-3 font-bold text-emerald-600">
                            {t.km_percorsi ? `+${t.km_percorsi} km` : '—'}
                          </td>
                          <td className="py-3 font-bold text-gray-800">
                            {t.compenso_giornaliero ? `€ ${Number(t.compenso_giornaliero).toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3 text-right">
                            {t.stato === 'aperto' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                                In corso
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                Completato
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}