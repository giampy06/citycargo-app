'use client';

import React, { useEffect, useState } from 'react';
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
  Filter 
} from 'lucide-react';

export default function GestioneSpesePage() {
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [spese, setSpese] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targaSelezionata, setTargaSelezionata] = useState('');
  const [tipoSpesa, setTipoSpesa] = useState('Tagliando');
  const [importo, setImporto] = useState('');
  const [dataSpesa, setDataSpesa] = useState(new Date().toISOString().split('T')[0]);
  const [descrizione, setDescrizione] = useState('');
  const [fileFattura, setFileFattura] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Filtro
  const [filtroTarga, setFiltroTarga] = useState('TUTTI');

  useEffect(() => {
    fetchDati();
  }, []);

  const fetchDati = async () => {
    setLoading(true);
    try {
      // 1. Veicoli disponibili
      const { data: vData } = await supabase.from('veicoli').select('targa, modello').order('targa');
      if (vData && vData.length > 0) {
        setVeicoli(vData);
        setTargaSelezionata(vData[0].targa);
      }

      // 2. Storico spese
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
      alert('Seleziona un veicolo registrato.');
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

      // Reset
      setImporto('');
      setDescrizione('');
      setFileFattura(null);
      fetchDati();
      alert('Fattura e spesa registrate con successo!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const speseFiltrate = spese.filter(s => filtroTarga === 'TUTTI' || s.targa === filtroTarga);
  const totaleSpese = speseFiltrate.reduce((acc, curr) => acc + Number(curr.importo || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Receipt className="w-7 h-7 text-red-500" />
                Registro Spese & Fatture Flotta
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Gestione contabile interventi, tagliandi e riparazioni mezzi</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Inserimento Fattura */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-red-500" />
              Nuova Fattura / Ricevuta
            </h2>

            <form onSubmit={handleSalvaSpesa} className="space-y-3">
              {/* Selezione Veicolo della Flotta */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Veicolo Interessato</label>
                <div className="relative">
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
              </div>

              {/* Tipo Intervento */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo Spesa</label>
                <select
                  value={tipoSpesa}
                  onChange={(e) => setTipoSpesa(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Tagliando">Tagliando & Filtri</option>
                  <option value="Gomme">Pneumatici / Cambio Gomme</option>
                  <option value="Meccanica">Riparazione Meccanica / Motore</option>
                  <option value="Carrozzeria">Carrozzeria & Cristalli</option>
                  <option value="Carburante">Rifornimento Fuori Sede</option>
                  <option value="Revisione">Revisione Ministeriale</option>
                  <option value="Altro">Altro Intervento</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Importo Totale (€)</label>
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
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fattura</label>
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
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Descrizione Lavori</label>
                <textarea
                  rows={2}
                  placeholder="Dettaglio ricambi sostituiti..."
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Allega Fattura (PDF / Foto)</label>
                <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center cursor-pointer relative bg-[#0F172A] hover:border-slate-500 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFileFattura(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-300">
                    {fileFattura ? fileFattura.name : 'Tocca per allegare file'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Registra nel Bilancio Flotta
              </button>
            </form>
          </div>

          {/* Elenco & Filtro Spese */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2 text-white">
                  <Euro className="w-5 h-5 text-emerald-400" />
                  Riepilogo Spese
                </h2>
                <span className="text-xs text-slate-400">Totale: € {totaleSpese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Filtro per Veicolo */}
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
                Nessuna fattura presente per la selezione.
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {speseFiltrate.map((s) => (
                  <div key={s.id} className="bg-[#0F172A] border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">€ {Number(s.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {s.targa}
                        </span>
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
                        Apri Fattura
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}