'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Truck, 
  ArrowLeft, 
  Wrench, 
  Receipt, 
  Plus, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  Euro,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function SchedaFurgonePage() {
  const params = useParams();
  const router = useRouter();
  const targa = (params?.targa as string)?.toUpperCase();

  const [statoMezzo, setStatoMezzo] = useState<'attivo' | 'manutenzione' | 'fermo'>('attivo');
  const [spese, setSpese] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form nuova spesa
  const [tipoSpesa, setTipoSpesa] = useState('Tagliando');
  const [importo, setImporto] = useState('');
  const [dataSpesa, setDataSpesa] = useState(new Date().toISOString().split('T')[0]);
  const [descrizione, setDescrizione] = useState('');
  const [fileFattura, setFileFattura] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (targa) {
      fetchSpese();
    }
  }, [targa]);

  const fetchSpese = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .select('*')
      .eq('targa', targa)
      .order('data_spesa', { ascending: false });

    if (!error && data) {
      setSpese(data);
    }
    setLoading(false);
  };

  const handleAggiungiSpesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importo || Number(importo) <= 0) {
      alert('Inserisci un importo valido.');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = '';
      if (fileFattura) {
        const fileExt = fileFattura.name.split('.').pop();
        const filePath = `invoices/${targa}_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('fleet-documents')
          .upload(filePath, fileFattura);

        if (!uploadErr) {
          const { data } = supabase.storage.from('fleet-documents').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from('vehicle_expenses')
        .insert([
          {
            targa,
            tipo_spesa: tipoSpesa,
            importo: parseFloat(importo),
            data_spesa: dataSpesa,
            descrizione: descrizione || null,
            fattura_url: fileUrl || null,
          },
        ]);

      if (error) throw error;

      // Reset form
      setImporto('');
      setDescrizione('');
      setFileFattura(null);
      fetchSpese();
      alert('Spesa registrata con successo!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const totaleSpese = spese.reduce((acc, curr) => acc + Number(curr.importo || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <Link href="/flotta" className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">{targa}</h1>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  statoMezzo === 'attivo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  statoMezzo === 'manutenzione' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {statoMezzo === 'attivo' ? 'In Servizio' : statoMezzo === 'manutenzione' ? 'In Officina' : 'Fermo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Scheda Tecnica, Manutenzione & Registro Costi</p>
            </div>
          </div>

          {/* Selettore rapido stato furgone */}
          <div className="flex bg-[#1E293B] p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setStatoMezzo('attivo')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${statoMezzo === 'attivo' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Attivo
            </button>
            <button
              onClick={() => setStatoMezzo('manutenzione')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${statoMezzo === 'manutenzione' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              In Manutenzione
            </button>
            <button
              onClick={() => setStatoMezzo('fermo')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${statoMezzo === 'fermo' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
            >
              Fermo
            </button>
          </div>
        </div>

        {/* Griglia Dati & Registro Spese */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonna Sinistra: Form Inserimento Costi */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Receipt className="w-5 h-5 text-red-500" />
              Aggiungi Spesa / Fattura
            </h2>

            <form onSubmit={handleAggiungiSpesa} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo Intervento</label>
                <select
                  value={tipoSpesa}
                  onChange={(e) => setTipoSpesa(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Tagliando">Tagliando & Filtri</option>
                  <option value="Gomme">Cambio / Riparazione Gomme</option>
                  <option value="Meccanica">Riparazione Meccanica / Motore</option>
                  <option value="Carrozzeria">Carrozzeria & Cristalli</option>
                  <option value="Carburante">Rifornimento Straordinario</option>
                  <option value="Revisione">Revisione Ministeriale</option>
                  <option value="Altro">Altro Costo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Importo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="es. 250.00"
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
                  placeholder="es. Sostituzione pastiglie freno anteriori e olio..."
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Foto Ricevuta o Fattura (PDF/JPG)</label>
                <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center cursor-pointer relative bg-[#0F172A] hover:border-slate-500 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFileFattura(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-300">
                    {fileFattura ? fileFattura.name : 'Seleziona fattura/scontrino'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Registra Spesa
              </button>
            </form>
          </div>

          {/* Colonna Destra: Storico Spese & Totale */}
          <div className="lg:col-span-2 bg-[#1E293B] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2 text-white">
                <Euro className="w-5 h-5 text-emerald-400" />
                Storico Spese Mezzo
              </h2>
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
                Totale Costi: € {totaleSpese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Caricamento spese...</div>
            ) : spese.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-slate-800 rounded-xl bg-[#0F172A]">
                Nessuna spesa o fattura registrata per questo furgone.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {spese.map((s) => (
                  <div key={s.id} className="bg-[#0F172A] border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">€ {Number(s.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium text-[10px] border border-slate-700">
                          {s.tipo_spesa}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{s.descrizione || 'Nessuna descrizione'}</p>
                      <span className="text-[10px] text-slate-500 block">{s.data_spesa}</span>
                    </div>

                    {s.fattura_url && (
                      <a
                        href={s.fattura_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                        Fattura
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