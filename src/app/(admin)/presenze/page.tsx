'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getPrivateFileUrl } from '@/supabase';
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
  Loader2,
  Eye,
  Edit3,
  Trash2,
  Check,
  X,
  Camera,
  ExternalLink,
  MapPin,
} from 'lucide-react';

export default function ArchivioPresenzePage() {
  const router = useRouter();
  const [turni, setTurni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ricerca, setRicerca] = useState('');

  // Modifica turno (targa/km finali)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarga, setEditTarga] = useState('');
  const [editKmFine, setEditKmFine] = useState('');
  const [editGiro, setEditGiro] = useState('');
  const [editImporto, setEditImporto] = useState('');
  const [editDaControllare, setEditDaControllare] = useState(false);
  const [tariffe, setTariffe] = useState<{ nome: string; importo: number | null; appalto: string }[]>([]);

  // Ispezione verbale fotografico
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<any | null>(null);
  const [verbaliFoto, setVerbaliFoto] = useState<any[]>([]);
  const [loadingFoto, setLoadingFoto] = useState(false);

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

      // Tariffe per correggere giro/importo (se la tabella non c'è ancora, la pagina funziona lo stesso).
      const tRes = await supabase.from('tariffe_giri').select('nome, importo, appalto').eq('attivo', true).order('ordine');
      setTariffe(tRes.error ? [] : (tRes.data as any[]) || []);
    } catch (err: any) {
      console.error('Errore recupero presenze:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresenze();
  }, []);

  const handleOpenPhotoInspection = async (turno: any) => {
    setSelectedTurno(turno);
    setIsPhotoModalOpen(true);
    setLoadingFoto(true);

    try {
      const { data, error } = await supabase
        .from('verbali_foto')
        .select('*')
        .eq('turno_id', turno.id)
        .order('data_ora', { ascending: true });

      if (error) throw error;

      // Il bucket è privato: generiamo un link firmato temporaneo per ogni foto.
      const fotoConLinkFirmati = await Promise.all(
        (data || []).map(async (foto) => {
          const urlFirmato = await getPrivateFileUrl('vehicle-inspections', foto.foto_url);
          return { ...foto, foto_url: urlFirmato || foto.foto_url };
        })
      );

      setVerbaliFoto(fotoConLinkFirmati);
    } catch (err: any) {
      console.error('Errore recupero foto:', err);
      setVerbaliFoto([]);
    } finally {
      setLoadingFoto(false);
    }
  };

  const handleAdminUpdate = async (turno: any) => {
    const kmNum = editKmFine ? Number(editKmFine) : null;

    if (kmNum !== null && kmNum < Number(turno.km_inizio)) {
      alert(`I km finali non possono essere inferiori a quelli iniziali (${turno.km_inizio})`);
      return;
    }

    const importoNum = Number(editImporto.replace(',', '.'));
    if (editImporto.trim() === '' || isNaN(importoNum) || importoNum < 0) {
      alert('Inserisci un importo valido (0 o superiore).');
      return;
    }

    try {
      const payload: any = {
        targa_mezzo: editTarga.trim().toUpperCase(),
        compenso_giornaliero: importoNum,
        da_controllare: editDaControllare,
      };
      if (editGiro.trim()) payload.giro = editGiro.trim();

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
      fetchPresenze();
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
      fetchPresenze();
    } catch (err: any) {
      alert(`Errore cancellazione: ${err.message}`);
    }
  };

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
  const daControllareMese = turniDelMese.filter((t) => t.da_controllare).length;

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
      'Importo (€)',
      'Da Controllare',
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
      t.da_controllare ? 'SI' : '',
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
              <p className="text-[11px] text-gray-400 font-medium">Riepilogo Autisti, Giri, Chilometri e Importi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchPresenze}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <Link
              href="/presenze/tariffe"
              className="h-10 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Euro className="w-4 h-4" /> Tariffe
            </Link>
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
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Importi Maturati</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">€ {totaleRetribuzioniMese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <span className={`text-[11px] font-medium mt-0.5 block ${daControllareMese > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
              {daControllareMese > 0 ? `${daControllareMese} da controllare` : 'Totale maturato per i giri'}
            </span>
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
                      <span>Importi: <b className="text-emerald-600">€ {gruppo.totaleCompensi.toFixed(2)}</b></span>
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
                        <th className="pb-2.5">Importo</th>
                        <th className="pb-2.5">Stato</th>
                        <th className="pb-2.5 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                      {gruppo.turni.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 font-bold text-gray-800 capitalize">
                            {t.nome_autista || 'Autista'}
                          </td>
                          <td className="py-3 font-mono font-bold text-[#1E242B]">
                            {editingId === t.id ? (
                              <input
                                type="text"
                                value={editTarga}
                                onChange={(e) => setEditTarga(e.target.value.toUpperCase())}
                                className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold uppercase"
                              />
                            ) : (
                              t.targa_mezzo
                            )}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-gray-700 mr-2">{t.appalto}</span>
                            {editingId === t.id && t.appalto === 'CITI' && tariffe.some((x) => x.appalto === 'CITI') ? (
                              <select
                                value={editGiro}
                                onChange={(e) => {
                                  setEditGiro(e.target.value);
                                  const tar = tariffe.find((x) => x.appalto === 'CITI' && x.nome === e.target.value);
                                  if (tar) {
                                    if (tar.importo !== null) setEditImporto(String(tar.importo));
                                    setEditDaControllare(tar.importo === null);
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded text-[11px] font-bold"
                              >
                                {!tariffe.some((x) => x.appalto === 'CITI' && x.nome === editGiro) && <option value={editGiro}>{editGiro || 'Giro Standard'}</option>}
                                {tariffe.filter((x) => x.appalto === 'CITI').map((x) => (
                                  <option key={x.nome} value={x.nome}>{x.nome}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                {t.giro || 'Giro Standard'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-gray-500">
                            {editingId === t.id ? (
                              <div className="flex items-center gap-1">
                                <span>{t.km_inizio} → </span>
                                <input
                                  type="number"
                                  value={editKmFine}
                                  onChange={(e) => setEditKmFine(e.target.value)}
                                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                                />
                              </div>
                            ) : (
                              <>
                                {Number(t.km_inizio).toLocaleString('it-IT')} km
                                {t.km_fine ? ` → ${Number(t.km_fine).toLocaleString('it-IT')} km` : ''}
                              </>
                            )}
                          </td>
                          <td className="py-3 font-bold text-emerald-600">
                            {t.km_percorsi ? `+${t.km_percorsi} km` : '—'}
                          </td>
                          <td className="py-3 font-bold text-gray-800">
                            {editingId === t.id ? (
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editImporto}
                                  onChange={(e) => setEditImporto(e.target.value)}
                                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                                />
                                <label className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 cursor-pointer">
                                  <input type="checkbox" checked={editDaControllare} onChange={(e) => setEditDaControllare(e.target.checked)} />
                                  Da controllare
                                </label>
                              </div>
                            ) : (
                              <>
                                {t.compenso_giornaliero ? `€ ${Number(t.compenso_giornaliero).toFixed(2)}` : '—'}
                                {t.da_controllare && (
                                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold whitespace-nowrap">
                                    Da controllare
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-3">
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
                          <td className="py-3 text-right">
                            {editingId === t.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleAdminUpdate(t)}
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
                                  onClick={() => handleOpenPhotoInspection(t)}
                                  className="text-gray-400 hover:text-[#E05353] p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Ispeziona Foto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(t.id);
                                    setEditTarga(t.targa_mezzo || '');
                                    setEditKmFine(t.km_fine?.toString() || '');
                                    setEditGiro(t.giro || '');
                                    setEditImporto(String(t.compenso_giornaliero ?? 0));
                                    setEditDaControllare(!!t.da_controllare);
                                  }}
                                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Modifica targa, km, giro o importo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTurno(t.id, t.codice_verbale)}
                                  className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Elimina Turno Errato"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {/* MODALE ISPEZIONE VERBALE FOTOGRAFICO */}
      {isPhotoModalOpen && selectedTurno && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-[#1E242B]">
                    Verbale Fotografico {selectedTurno.codice_verbale}
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-[#E05353]">
                    {selectedTurno.targa_mezzo}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Conducente: <b className="text-gray-700 capitalize">{selectedTurno.nome_autista}</b> | Appalto: <b>{selectedTurno.appalto}</b>
                </p>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingFoto ? (
              <div className="py-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#E05353]" />
                Recupero scatti ad alta risoluzione con filigrana...
              </div>
            ) : verbaliFoto.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 bg-[#F8F9FB] rounded-2xl border border-dashed border-gray-200">
                Nessuna foto perimetrale archiviata per questo turno.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {verbaliFoto.map((foto) => (
                    <div key={foto.id} className="bg-[#F8F9FB] border border-gray-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="relative group">
                        <img
                          src={foto.foto_url}
                          alt={foto.tipo_foto}
                          className="w-full h-56 object-cover bg-black"
                        />
                        <a
                          href={foto.foto_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Ingrandisci
                        </a>
                      </div>

                      <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-[#1E242B] capitalize block">
                            {foto.tipo_foto.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(foto.data_ora).toLocaleString('it-IT')}
                          </span>
                        </div>
                        {foto.coordinate_gps && (
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {foto.coordinate_gps}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}