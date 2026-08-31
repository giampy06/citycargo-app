'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { 
  ShieldCheck, 
  FileText, 
  Calendar, 
  RefreshCw,
  Smartphone,
  ArrowUpRight,
  Edit3,
  Check,
  X,
  Trash2,
  ChevronRight,
  Download
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [turni, setTurni] = useState<any[]>([]);
  const [loadingTurni, setLoadingTurni] = useState(true);

  // Modifica Admin
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarga, setEditTarga] = useState('');
  const [editKmFine, setEditKmFine] = useState('');

  const fetchTurni = async () => {
    setLoadingTurni(true);
    try {
      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTurni(data || []);
    } catch (err: any) {
      console.error('Errore recupero turni:', err);
    } finally {
      setLoadingTurni(false);
    }
  };

  useEffect(() => {
    fetchTurni();
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
      fetchTurni();
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
      fetchTurni();
    } catch (err: any) {
      alert(`Errore cancellazione: ${err.message}`);
    }
  };

  // Funzione di Export CSV per Excel
  const exportToExcelCSV = () => {
    if (turni.length === 0) {
      alert('Nessun turno registrato da esportare.');
      return;
    }

    const headers = ['Data', 'Codice Verbale', 'Targa Mezzo', 'Appalto', 'Km Inizio', 'Km Fine', 'Km Percorsi', 'Stato'];
    const rows = turni.map(t => [
      new Date(t.created_at).toLocaleDateString('it-IT'),
      t.codice_verbale || '',
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
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel/CSV
            </button>
            <a 
              href="/autista" 
              className="h-9 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E05353] font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-100"
            >
              <Smartphone className="w-3.5 h-3.5" /> App Autista
            </a>
            <button 
              onClick={fetchTurni} 
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
            <div className="text-[11px] font-medium text-gray-500 mt-1">Da turni chiusi</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tagliandi Imminenti</div>
            <div className="text-2xl font-black mt-1 text-amber-600">2</div>
            <div className="text-[11px] font-medium text-amber-600 mt-1">⚠️ Da pianificare</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Presenze Registrate</div>
            <div className="text-2xl font-black mt-1 text-[#1E242B]">{turniOggi}</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1">Turni a Sistema</div>
          </div>
        </div>

        {/* Moduli Flotta & Cedolini */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Flotta Mezzi</span>
                <h3 className="text-lg font-black text-[#1E242B] mt-0.5">Veicoli, Scadenze & Tagliandi</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Monitoraggio scadenze assicurative, revisioni ministeriali e registrazione nuovi veicoli.
                </p>
              </div>
            </div>
            <a 
              href="/flotta" 
              className="mt-6 w-full py-3.5 px-4 bg-[#1E242B] hover:bg-black text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-2 transition-all text-center"
            >
              Apri Gestione Flotta
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Personale & Amministrazione</span>
                <h3 className="text-lg font-black text-[#1E242B] mt-0.5">Archivio Buste Paga & Ricevute</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Caricamento PDF cedolini per autista e controllo attestazioni telematiche di avvenuta ricezione.
                </p>
              </div>
            </div>
            <a 
              href="/cedolini" 
              className="mt-6 w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-2 transition-all text-center"
            >
              Gestisci Buste Paga
              <ChevronRight className="w-4 h-4" />
            </a>
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
                onClick={fetchTurni}
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
                    <td colSpan={8} className="py-6 text-center text-gray-400">
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