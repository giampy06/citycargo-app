'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ShieldCheck, 
  FileText, 
  RefreshCw,
  Smartphone,
  ArrowUpRight,
  Edit3,
  Check,
  X,
  Trash2,
  ChevronRight,
  Download,
  Receipt,
  Users,
  Truck,
  BarChart3,
  TrendingUp,
  Euro
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [turni, setTurni] = useState<any[]>([]);
  const [spese, setSpese] = useState<any[]>([]);
  const [loadingTurni, setLoadingTurni] = useState(true);

  // Modifica Admin
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarga, setEditTarga] = useState('');
  const [editKmFine, setEditKmFine] = useState('');

  const fetchDati = async () => {
    setLoadingTurni(true);
    try {
      // 1. Turni
      const { data: tData, error: tErr } = await supabase
        .from('turni_presenze')
        .select('*')
        .order('created_at', { ascending: false });

      if (tErr) throw tErr;
      setTurni(tData || []);

      // 2. Spese per grafico andamento
      const { data: sData, error: sErr } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .order('data_spesa', { ascending: true });

      if (!sErr && sData) {
        setSpese(sData);
      }
    } catch (err: any) {
      console.error('Errore recupero dati:', err);
    } finally {
      setLoadingTurni(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, []);

  const handleAdminUpdate = async (turno: any) => {
    const kmNum = editKmFine ? Number(editKmFine) : null;

    if (kmNum !== null && kmNum < Number(turno.km_inizio)) {
      alert(`I km finali non possono essere inferiori a quelli iniziali (${turno.km_inizio})`);
      return;
    }

    try {
      const payload: any = {
        targa_mezzo: editTarga.trim().toUpperCase(),
      };

      if (kmNum !== null) {
        payload.km_fine = kmNum;
        payload.km_percorsi = kmNum - Number(turno.km_inizio);
      }

      const { error } = await supabase
        .from('turni_presenze')
        .update(payload)
        .eq('id', turno.id);

      if (error) throw error;

      setEditingId(null);
      fetchDati();
      alert('Turno aggiornato con successo!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  };

  const handleDeleteTurno = async (id: string, codice: string) => {
    const conferma = window.confirm(`Sei sicuro di voler eliminare il turno ${codice}? L'operazione è irreversibile.`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('turni_presenze')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Turno eliminato dal registro!');
      fetchDati();
    } catch (err: any) {
      alert(`Errore cancellazione: ${err.message}`);
    }
  };

  const exportToExcelCSV = () => {
    if (turni.length === 0) {
      alert('Nessun turno registrato da esportare.');
      return;
    }

    const headers = ['Data', 'Codice Verbale', 'Autista', 'Targa Mezzo', 'Appalto', 'Km Inizio', 'Km Fine', 'Km Percorsi', 'Stato'];
    const rows = turni.map(t => [
      new Date(t.created_at).toLocaleDateString('it-IT'),
      t.codice_verbale || '',
      t.nome_autista || 'Autista',
      t.targa_mezzo || '',
      t.appalto || '',
      t.km_inizio || '',
      t.km_fine || '',
      t.km_percorsi || 0,
      t.stato || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Riepilogo_Turni_CityCargo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const turniAperti = turni.filter(t => t.stato === 'aperto').length;
  const turniOggi = turni.length;
  const kmTotaliRegistrati = turni.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);
  const totaleSpeseRegistrate = spese.reduce((acc, s) => acc + Number(s.importo || 0), 0);

  // Calcolo dati mensili per il Grafico Andamento
  const andamentoSpeseMensili = useMemo(() => {
    const map: { [key: string]: number } = {};
    spese.forEach((s) => {
      const mese = s.data_spesa ? s.data_spesa.slice(0, 7) : '2026-09';
      map[mese] = (map[mese] || 0) + Number(s.importo || 0);
    });

    const mesi = Object.keys(map).sort();
    if (mesi.length === 0) {
      return [{ mese: '2026-09', totale: 0, pct: 10 }];
    }

    const maxVal = Math.max(...Object.values(map), 1);
    return mesi.map((m) => ({
      mese: m,
      totale: map[m],
      pct: (map[m] / maxVal) * 100,
    }));
  }, [spese]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased pb-24">
      {/* Navbar Admin */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E05353] flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-sm">
              CC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">CITY CARGO</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-[#E05353] uppercase tracking-wider">
                  Admin Hub
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Controllo Flotta & Amministrazione</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcelCSV}
              className="h-9 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-emerald-200"
              title="Esporta foglio turni per contabilità"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
            </button>
            <Link 
              href="/autista" 
              className="h-9 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E05353] font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-100"
            >
              <Smartphone className="w-3.5 h-3.5" /> App Autista
            </Link>
            <button 
              onClick={fetchDati} 
              title="Aggiorna Dati"
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTurni ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1E242B] text-white flex items-center justify-center font-bold text-xs">
              AD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mezzi in Servizio</div>
            <div className="text-2xl font-black mt-1 text-[#1E242B]">{turniAperti} <span className="text-xs font-normal text-gray-400">attivi</span></div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">🟢 Monitoraggio Live</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Km Rendicontati Totali</div>
            <div className="text-2xl font-black mt-1 text-[#1E242B]">+{kmTotaliRegistrati.toLocaleString('it-IT')} km</div>
            <div className="text-[11px] font-medium text-gray-500 mt-1">Da turni completati</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Costi Totali Flotta</div>
            <div className="text-2xl font-black mt-1 text-emerald-600">€ {totaleSpeseRegistrate.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">📊 Manutenzioni & DKV</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Presenze Totali</div>
            <div className="text-2xl font-black mt-1 text-[#1E242B]">{turniOggi}</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">Turni Registrati</div>
          </div>
        </div>

        {/* GRAFICO ANDAMENTO COSTI FLOTTA IN HOME */}
        <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-[#E05353] rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#1E242B]">Andamento Spese & Manutenzioni Flotta</h2>
                <p className="text-xs text-gray-400">Distribuzione temporale delle spese, tagliandi e rifornimenti DKV</p>
              </div>
            </div>

            <Link
              href="/spese"
              className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1"
            >
              Apri Dettaglio Spese <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {spese.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 bg-[#F8F9FB] rounded-2xl border border-dashed border-gray-200">
              Nessuna spesa registrata finora. Clicca su "Aggiungi Fattura" o importa una fattura DKV per popolare il grafico.
            </div>
          ) : (
            <div className="pt-4 flex items-end gap-4 h-48 border-b border-gray-100 pb-2">
              {andamentoSpeseMensili.map((d) => (
                <div key={d.mese} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-black text-gray-700 opacity-0 group-hover:opacity-100 transition">
                    € {d.totale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <div 
                    style={{ height: `${Math.max(d.pct, 12)}%` }}
                    className="w-full max-w-[56px] bg-gradient-to-t from-[#1E242B] to-[#E05353] rounded-t-xl transition-all group-hover:brightness-110 shadow-sm"
                  />
                  <span className="text-[11px] font-bold text-gray-500">{d.mese}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4 MODULI GESTIONALI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Modulo 1: Flotta */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#E05353]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Flotta Mezzi</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Veicoli & Manutenzioni</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Stato mezzi, libretti, scadenze revisione e storico autisti.
                </p>
              </div>
            </div>
            <Link 
              href="/flotta" 
              className="mt-4 w-full py-2.5 px-3 bg-[#1E242B] hover:bg-black text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Gestione Flotta
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Modulo 2: Spese & Fatture */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Contabilità</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Spese & Fatture</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Registra tagliandi, gomme, riparazioni e importa fatture DKV.
                </p>
              </div>
            </div>
            <Link 
              href="/spese" 
              className="mt-4 w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Aggiungi Fattura
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Modulo 3: Personale & Autisti */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#E05353] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#E05353]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#E05353] uppercase tracking-wider">Risorse Umane</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Personale & Autisti</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Anagrafica completa autisti, controllo patenti e scadenze.
                </p>
              </div>
            </div>
            <Link 
              href="/autisti" 
              className="mt-4 w-full py-2.5 px-3 bg-[#E05353] hover:bg-[#c94545] text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Elenco Autisti
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Modulo 4: Buste Paga */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amministrazione</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Buste Paga</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Caricamento cedolini e attestazioni digitali di firma.
                </p>
              </div>
            </div>
            <Link 
              href="/cedolini" 
              className="mt-4 w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Gestisci Cedolini
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

        {/* Registro Turni */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Control Room</h2>
              <p className="text-lg font-extrabold text-[#1E242B]">Registro Turni & Presenze</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportToExcelCSV}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Scarica CSV
              </button>
              <button 
                onClick={fetchDati}
                className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1 ml-2"
              >
                Aggiorna <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Codice</th>
                  <th className="pb-3">Autista</th>
                  <th className="pb-3">Targa</th>
                  <th className="pb-3">Appalto</th>
                  <th className="pb-3">Km Inizio / Fine</th>
                  <th className="pb-3">Km Percorsi</th>
                  <th className="pb-3">Stato</th>
                  <th className="pb-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {turni.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-gray-400">
                      Nessun turno registrato al momento.
                    </td>
                  </tr>
                ) : (
                  turni.map((turno) => (
                    <tr key={turno.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {new Date(turno.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 font-mono text-[11px] font-bold text-gray-500">{turno.codice_verbale}</td>
                      <td className="py-3 font-bold text-gray-800 capitalize">{turno.nome_autista || 'Autista'}</td>
                      <td className="py-3 font-bold text-[#1E242B]">
                        {editingId === turno.id ? (
                          <input 
                            type="text"
                            value={editTarga}
                            onChange={(e) => setEditTarga(e.target.value.toUpperCase())}
                            className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold uppercase"
                          />
                        ) : (
                          turno.targa_mezzo
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          turno.appalto === 'CITI' ? 'bg-rose-50 text-[#E05353]' :
                          turno.appalto === 'EDF' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
                        }`}>
                          {turno.appalto}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {editingId === turno.id ? (
                          <div className="flex items-center gap-1">
                            <span>{turno.km_inizio} → </span>
                            <input 
                              type="number"
                              value={editKmFine}
                              onChange={(e) => setEditKmFine(e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                            />
                          </div>
                        ) : (
                          <>
                            {Number(turno.km_inizio).toLocaleString('it-IT')} km
                            {turno.km_fine ? ` → ${Number(turno.km_fine).toLocaleString('it-IT')} km` : ''}
                          </>
                        )}
                      </td>
                      <td className="py-3 font-bold text-emerald-600">
                        {turno.km_percorsi ? `+${turno.km_percorsi} km` : '—'}
                      </td>
                      <td className="py-3">
                        {turno.stato === 'aperto' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                            🟡 In Servizio
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            🟢 Completato
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {editingId === turno.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleAdminUpdate(turno)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingId(turno.id);
                                setEditTarga(turno.targa_mezzo || '');
                                setEditKmFine(turno.km_fine?.toString() || '');
                              }}
                              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Modifica Targa o Km"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTurno(turno.id, turno.codice_verbale)}
                              className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Elimina Turno Errato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}