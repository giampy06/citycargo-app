'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/supabase';
import { downloadCsv } from '@/lib/exportCsv';
import {
  BarChart3,
  Download,
  RefreshCw,
  Loader2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORI_LINEE = ['#E05353', '#1E242B', '#059669', '#2563EB', '#D97706', '#7C3AED', '#DB2777'];

function meseCorrente() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ultimiSeiMesi() {
  const mesi: string[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    mesi.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return mesi;
}

export default function ReportAutistiPage() {
  const [loading, setLoading] = useState(true);
  const [autisti, setAutisti] = useState<any[]>([]);
  const [turni, setTurni] = useState<any[]>([]);
  const [metrica, setMetrica] = useState<'km' | 'compenso'>('km');

  const fetchDati = async () => {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        supabase.from('autisti').select('id, nome, cognome, stato').order('cognome', { ascending: true }),
        supabase.from('turni_presenze').select('autista_id, nome_autista, km_percorsi, compenso_giornaliero, stato, created_at').eq('stato', 'chiuso'),
      ]);
      setAutisti(aRes.data || []);
      setTurni(tRes.data || []);
    } catch (err) {
      console.error('Errore recupero report autisti:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, []);

  // Tabella: km totali e compenso stimato del mese corrente, per autista
  const riepilogoMese = useMemo(() => {
    const mese = meseCorrente();
    return autisti.map((a) => {
      const turniAutista = turni.filter((t) => t.autista_id === a.id && t.created_at?.slice(0, 7) === mese);
      const kmTotali = turniAutista.reduce((acc, t) => acc + Number(t.km_percorsi || 0), 0);
      const compensoStimato = turniAutista.reduce((acc, t) => acc + Number(t.compenso_giornaliero || 0), 0);
      return {
        id: a.id,
        nomeCompleto: `${a.nome} ${a.cognome}`,
        giorniLavorati: turniAutista.length,
        kmTotali,
        compensoStimato,
      };
    });
  }, [autisti, turni]);

  // Grafico: ultimi 6 mesi, una serie per autista, formato "wide" per Recharts
  const datiGrafico = useMemo(() => {
    const mesi = ultimiSeiMesi();
    return mesi.map((mese) => {
      const punto: any = { mese };
      autisti.forEach((a) => {
        const turniMese = turni.filter((t) => t.autista_id === a.id && t.created_at?.slice(0, 7) === mese);
        const valore = turniMese.reduce(
          (acc, t) => acc + Number(metrica === 'km' ? t.km_percorsi || 0 : t.compenso_giornaliero || 0),
          0
        );
        punto[`${a.nome} ${a.cognome}`] = valore;
      });
      return punto;
    });
  }, [autisti, turni, metrica]);

  const handleExport = () => {
    if (riepilogoMese.length === 0) {
      alert('Nessun dato da esportare.');
      return;
    }
    downloadCsv(
      `Report_Autisti_CityCargo_${meseCorrente()}.csv`,
      ['Autista', 'Giorni Lavorati (mese)', 'Km Totali (mese)', 'Compenso Stimato (mese) €'],
      riepilogoMese.map((r) => [r.nomeCompleto, r.giorniLavorati, r.kmTotali, r.compensoStimato.toFixed(2)])
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento report autisti...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-base tracking-tight">Report Autisti</h1>
            <p className="text-[11px] text-gray-400 font-medium">Km percorsi e compenso stimato per autista</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDati}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="h-10 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Nota su cosa rappresenta il compenso */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Il <b>"Compenso stimato"</b> è un totale calcolato automaticamente dai turni chiusi (dato operativo
            interno) — <b>non</b> è un cedolino/busta paga ufficiale: non include contributi, IRPEF né altre
            componenti di una vera busta paga.
          </p>
        </div>

        {/* Tabella riepilogo mese corrente */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Riepilogo Mese Corrente
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Autista</th>
                  <th className="pb-3">Giorni Lavorati</th>
                  <th className="pb-3">Km Totali</th>
                  <th className="pb-3">Compenso Stimato (dato operativo interno)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {riepilogoMese.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      Nessun autista registrato.
                    </td>
                  </tr>
                ) : (
                  riepilogoMese.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-bold text-gray-800 capitalize">{r.nomeCompleto}</td>
                      <td className="py-3">{r.giorniLavorati}</td>
                      <td className="py-3 font-bold text-emerald-600">{r.kmTotali.toLocaleString('it-IT')} km</td>
                      <td className="py-3 font-bold text-[#1E242B]">€ {r.compensoStimato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grafico comparativo ultimi 6 mesi */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-[#E05353] rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#1E242B]">Andamento Ultimi 6 Mesi</h2>
                <p className="text-xs text-gray-400">Confronto tra tutti gli autisti</p>
              </div>
            </div>
            <div className="flex bg-[#F8F9FB] rounded-xl p-1 border border-gray-100">
              <button
                onClick={() => setMetrica('km')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${metrica === 'km' ? 'bg-[#E05353] text-white' : 'text-gray-500'}`}
              >
                Km
              </button>
              <button
                onClick={() => setMetrica('compenso')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${metrica === 'compenso' ? 'bg-[#E05353] text-white' : 'text-gray-500'}`}
              >
                Compenso €
              </button>
            </div>
          </div>

          {autisti.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 bg-[#F8F9FB] rounded-2xl border border-dashed border-gray-200">
              Nessun autista registrato.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datiGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => {
                      const num = Number(value) || 0;
                      return metrica === 'km' ? `${num.toLocaleString('it-IT')} km` : `€ ${num.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {autisti.map((a, i) => (
                    <Line
                      key={a.id}
                      type="monotone"
                      dataKey={`${a.nome} ${a.cognome}`}
                      stroke={COLORI_LINEE[i % COLORI_LINEE.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
