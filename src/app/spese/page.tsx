'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Receipt, 
  ArrowLeft, 
  UploadCloud, 
  Plus, 
  Euro, 
  ExternalLink, 
  Loader2, 
  Truck, 
  Filter,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function GestioneSpesePage() {
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [spese, setSpese] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Spesa Singola
  const [targaSelezionata, setTargaSelezionata] = useState('');
  const [tipoSpesa, setTipoSpesa] = useState('Tagliando');
  const [importo, setImporto] = useState('');
  const [dataSpesa, setDataSpesa] = useState(new Date().toISOString().split('T')[0]);
  const [descrizione, setDescrizione] = useState('');
  const [fileFattura, setFileFattura] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Modale Lettura IA Fattura DKV Mensile
  const [isDkvModalOpen, setIsDkvModalOpen] = useState(false);
  const [dkvFile, setDkvFile] = useState<File | null>(null);
  const [analyzingDkv, setAnalyzingDkv] = useState(false);
  const [dkvExtractedItems, setDkvExtractedItems] = useState<any[]>([]);
  const [savingDkv, setSavingDkv] = useState(false);

  // Filtro
  const [filtroTarga, setFiltroTarga] = useState('TUTTI');

  useEffect(() => {
    fetchDati();
  }, []);

  const fetchDati = async () => {
    setLoading(true);
    try {
      const { data: vData } = await supabase.from('veicoli').select('targa, modello').order('targa');
      if (vData && vData.length > 0) {
        setVeicoli(vData);
        setTargaSelezionata(vData[0].targa);
      }

      const { data: sData } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .order('data_spesa', { ascending: false });

      if (sData) {
        setSpese(sData);
      }
    } catch (err: any) {
      console.error('Errore recupero dati spese:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvaSpesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targaSelezionata) {
      alert('Seleziona un veicolo.');
      return;
    }
    if (!importo || Number(importo) <= 0) {
      alert('Inserisci un importo valido.');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = '';
      if (fileFattura) {
        const fileExt = fileFattura.name.split('.').pop();
        const filePath = `invoices/${targaSelezionata}_${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from('fleet-documents')
          .upload(filePath, fileFattura);

        if (!upErr) {
          const { data } = supabase.storage.from('fleet-documents').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from('vehicle_expenses')
        .insert([
          {
            targa: targaSelezionata,
            tipo_spesa: tipoSpesa,
            importo: parseFloat(importo),
            data_spesa: dataSpesa,
            descrizione: descrizione || null,
            fattura_url: fileUrl || null,
          },
        ]);

      if (error) throw error;

      setImporto('');
      setDescrizione('');
      setFileFattura(null);
      fetchDati();
      alert('Spesa registrata con successo!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Funzione Lettura IA DKV
  const handleAnalyzeDkv = async () => {
    if (!dkvFile) {
      alert('Seleziona il file PDF o immagine della fattura DKV.');
      return;
    }

    setAnalyzingDkv(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(dkvFile);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/parse-dkv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: dkvFile.type || 'application/pdf',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore durante la scansione IA');

        setDkvExtractedItems(data.items || []);
        setAnalyzingDkv(false);
      };
    } catch (err: any) {
      alert(`Errore IA: ${err.message}`);
      setAnalyzingDkv(false);
    }
  };

  // Conferma e Inserimento automatico su Supabase per ogni mezzo
  const handleSaveAllDkvExpenses = async () => {
    if (dkvExtractedItems.length === 0) return;
    setSavingDkv(true);

    try {
      let fileUrl = '';
      if (dkvFile) {
        const fileExt = dkvFile.name.split('.').pop();
        const filePath = `invoices/DKV_MENSILE_${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('fleet-documents').upload(filePath, dkvFile);
        if (!upErr) {
          const { data } = supabase.storage.from('fleet-documents').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
        }
      }

      const rowsToInsert = dkvExtractedItems.map((item) => ({
        targa: item.targa.toUpperCase().replace(/\s/g, ''),
        tipo_spesa: item.tipo_spesa || 'Carburante',
        importo: Number(item.importo),
        data_spesa: item.data_spesa || new Date().toISOString().split('T')[0],
        descrizione: `[DKV IA] ${item.descrizione || 'Rifornimento DKV'}`,
        fattura_url: fileUrl || null,
      }));

      const { error } = await supabase.from('vehicle_expenses').insert(rowsToInsert);
      if (error) throw error;

      alert(`Successo! Ripartite ${rowsToInsert.length} spese tra i vari furgoni della flotta.`);
      setIsDkvModalOpen(false);
      setDkvExtractedItems([]);
      setDkvFile(null);
      fetchDati();
    } catch (err: any) {
      alert(`Errore inserimento: ${err.message}`);
    } finally {
      setSavingDkv(false);
    }
  };

  const speseFiltrate = spese.filter(s => filtroTarga === 'TUTTI' || s.targa === filtroTarga);
  const totaleSpese = speseFiltrate.reduce((acc, curr) => acc + Number(curr.importo || 0), 0);

  // Calcolo Andamento Costi Mensili per il Grafico
  const chartData = useMemo(() => {
    const monthsMap: { [key: string]: number } = {};
    speseFiltrate.forEach((s) => {
      const monthKey = s.data_spesa ? s.data_spesa.slice(0, 7) : '2026-09';
      monthsMap[monthKey] = (monthsMap[monthKey] || 0) + Number(s.importo || 0);
    });

    const sortedKeys = Object.keys(monthsMap).sort();
    const maxVal = Math.max(...Object.values(monthsMap), 1);

    return sortedKeys.map((k) => ({
      mese: k,
      totale: monthsMap[k],
      percentuale: (monthsMap[k] / maxVal) * 100,
    }));
  }, [speseFiltrate]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Receipt className="w-7 h-7 text-red-500" />
                Registro Spese & Fatture Flotta
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Analisi costi, andamento contabile e ripartizione automatica DKV</p>
            </div>
          </div>

          <button
            onClick={() => setIsDkvModalOpen(true)}
            className="bg-gradient-to-r from-amber-600 to-red-600 hover:opacity-95 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            Importa Fattura Mensile DKV (IA)
          </button>
        </div>

        {/* GRAFICO ANDAMENTO COSTI */}
        <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-white">Andamento Mensile delle Spese Flotta</h2>
            </div>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl">
              Totale Selezionato: € {totaleSpese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Nessun dato temporale per generare il grafico.</div>
          ) : (
            <div className="pt-4 flex items-end gap-3 h-48 border-b border-slate-800 pb-2">
              {chartData.map((d) => (
                <div key={d.mese} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition">
                    € {d.totale.toFixed(0)}
                  </span>
                  <div 
                    style={{ height: `${Math.max(d.percentuale, 8)}%` }}
                    className="w-full max-w-[48px] bg-gradient-to-t from-red-600 to-rose-400 rounded-t-xl transition-all group-hover:brightness-125"
                  />
                  <span className="text-[11px] font-medium text-slate-400">{d.mese}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Inserimento Fattura Singola */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-red-500" />
              Nuova Spesa Singola
            </h2>

            <form onSubmit={handleSalvaSpesa} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Veicolo</label>
                <select
                  value={targaSelezionata}
                  onChange={(e) => setTargaSelezionata(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  required
                >
                  {veicoli.map((v) => (
                    <option key={v.targa} value={v.targa}>
                      {v.targa} - {v.modello || 'Furgone'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipologia</label>
                <select
                  value={tipoSpesa}
                  onChange={(e) => setTipoSpesa(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Tagliando">Tagliando & Filtri</option>
                  <option value="Gomme">Gomme / Pneumatici</option>
                  <option value="Meccanica">Riparazione Meccanica</option>
                  <option value="Carrozzeria">Carrozzeria & Cristalli</option>
                  <option value="Carburante">Carburante Straordinario</option>
                  <option value="Revisione">Revisione Ministeriale</option>
                  <option value="Altro">Altra Spesa</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Importo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={importo}
                    onChange={(e) => setImporto(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={dataSpesa}
                    onChange={(e) => setDataSpesa(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Descrizione Intervento</label>
                <textarea
                  rows={2}
                  placeholder="Dettaglio pezzi o note..."
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Allegato (PDF / Foto)</label>
                <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center cursor-pointer relative bg-[#0F172A] hover:border-slate-500 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFileFattura(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-300">
                    {fileFattura ? fileFattura.name : 'Seleziona fattura / ricevuta'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Registra Spesa
              </button>
            </form>
          </div>

          {/* Elenco & Filtro Spese */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h2 className="font-bold text-base flex items-center gap-2 text-white">
                <Euro className="w-5 h-5 text-emerald-400" />
                Elenco Documenti & Fatture
              </h2>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filtroTarga}
                  onChange={(e) => setFiltroTarga(e.target.value)}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="TUTTI">Tutti i Veicoli</option>
                  {veicoli.map((v) => (
                    <option key={v.targa} value={v.targa}>
                      {v.targa}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Caricamento registro spese...</div>
            ) : speseFiltrate.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl bg-[#0F172A]">
                Nessuna fattura presente.
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {speseFiltrate.map((s) => (
                  <div key={s.id} className="bg-[#0F172A] border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">€ {Number(s.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        <Link href={`/flotta/${s.targa}`} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-bold text-[10px] transition">
                          {s.targa}
                        </Link>
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium text-[10px]">
                          {s.tipo_spesa}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">{s.descrizione || 'Nessuna descrizione'}</p>
                      <span className="text-[10px] text-slate-500 block">{s.data_spesa}</span>
                    </div>

                    {s.fattura_url && (
                      <a
                        href={s.fattura_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                        Vedi Fattura
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALE IMPORT FATTURA MENSILE DKV CON IA */}
      {isDkvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">Importazione Fattura DKV con IA</h3>
                  <p className="text-[11px] text-slate-400">Ripartizione automatica carburante e pedaggi per ogni singolo mezzo</p>
                </div>
              </div>
              <button onClick={() => setIsDkvModalOpen(false)} className="text-slate-400 hover:text-white text-xs font-bold">
                Chiudi
              </button>
            </div>

            {/* Step 1: Caricamento File */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Carica PDF Fattura / Estratto Conto DKV</label>
              <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center cursor-pointer bg-[#0F172A] hover:border-amber-500 transition relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDkvFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-white block">
                  {dkvFile ? dkvFile.name : 'Trascina o tocca per allegare la fattura DKV'}
                </span>
                <span className="text-[10px] text-slate-500">Formati supportati: PDF, PNG, JPG</span>
              </div>

              <button
                type="button"
                onClick={handleAnalyzeDkv}
                disabled={!dkvFile || analyzingDkv}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                {analyzingDkv ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scansione e ripartizione targhe con IA in corso...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Avvia Riconoscimento Targhe & Spese</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Tabella di Controllo Risultati Estratti */}
            {dkvExtractedItems.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white">Voci Riconosciute ({dkvExtractedItems.length})</h4>
                  <span className="text-xs text-emerald-400 font-bold">
                    Totale Ripartito: € {dkvExtractedItems.reduce((a, b) => a + Number(b.importo || 0), 0).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {dkvExtractedItems.map((item, idx) => (
                    <div key={idx} className="bg-[#0F172A] p-2.5 rounded-xl flex items-center justify-between text-xs border border-slate-800">
                      <div>
                        <span className="font-black text-amber-400 mr-2">{item.targa}</span>
                        <span className="text-slate-300">{item.descrizione}</span>
                        <span className="text-[10px] text-slate-500 block">{item.data_spesa}</span>
                      </div>
                      <span className="font-bold text-white">€ {Number(item.importo).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveAllDkvExpenses}
                  disabled={savingDkv}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {savingDkv ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Conferma e Salva Tutte le Spese sui Rispettivi Mezzi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}