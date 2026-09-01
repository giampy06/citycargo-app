'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ArrowLeft, 
  Wrench, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  User, 
  ExternalLink, 
  Gauge, 
  Loader2,
  Euro,
  Receipt
} from 'lucide-react';

export default function SchedaTecnicaFurgonePage() {
  const params = useParams();
  const targa = (params?.targa as string)?.toUpperCase();

  const [veicolo, setVeicolo] = useState<any | null>(null);
  const [storicoUtilizzi, setStoricoUtilizzi] = useState<any[]>([]);
  const [speseMezzo, setSpeseMezzo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStato, setUpdatingStato] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (targa) {
      fetchDatiMezzo();
    }
  }, [targa]);

  const fetchDatiMezzo = async () => {
    setLoading(true);
    try {
      // 1. Dati Anagrafici Mezzo
      const { data: vData, error: vError } = await supabase
        .from('veicoli')
        .select('*')
        .eq('targa', targa)
        .maybeSingle();

      if (vError) throw vError;
      setVeicolo(vData);

      // 2. Storico Autisti
      const { data: tData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('targa_mezzo', targa)
        .order('created_at', { ascending: false })
        .limit(20);

      if (tData) setStoricoUtilizzi(tData);

      // 3. Spese & Fatture Collegate al Mezzo
      const { data: sData } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .eq('targa', targa)
        .order('data_spesa', { ascending: false });

      if (sData) setSpeseMezzo(sData);

    } catch (err: any) {
      console.error('Errore recupero scheda:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCambioStato = async (nuovoStato: string) => {
    if (!veicolo) return;
    setUpdatingStato(true);
    try {
      const { error } = await supabase
        .from('veicoli')
        .update({ stato: nuovoStato })
        .eq('targa', targa);

      if (error) throw error;
      setVeicolo({ ...veicolo, stato: nuovoStato });
    } catch (err: any) {
      alert(`Errore aggiornamento stato: ${err.message}`);
    } finally {
      setUpdatingStato(false);
    }
  };

  const handleUploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'libretto' | 'assicurazione') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(tipo);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `vehicle-docs/${targa}_${tipo}_${Date.now()}.${fileExt}`;

      const { error: upErr } = await supabase.storage.from('fleet-documents').upload(filePath, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('fleet-documents').getPublicUrl(filePath);
      const updateField = tipo === 'libretto' ? { libretto_url: urlData.publicUrl } : { assicurazione_url: urlData.publicUrl };

      const { error: dbErr } = await supabase.from('veicoli').update(updateField).eq('targa', targa);
      if (dbErr) throw dbErr;

      setVeicolo({ ...veicolo, ...updateField });
      alert(`Documento ${tipo} salvato con successo!`);
    } catch (err: any) {
      alert(`Errore upload: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-300 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
        Caricamento scheda veicolo...
      </div>
    );
  }

  const stato = veicolo?.stato || 'disponibile';
  const totaleCostiSostenuti = speseMezzo.reduce((acc, curr) => acc + Number(curr.importo || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8 antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Scheda Mezzo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/flotta" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">{targa}</h1>
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                  {veicolo?.appalto_default || 'CITI'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{veicolo?.modello || 'Furgone Aziendale'}</p>
            </div>
          </div>

          {/* Selettore Stato Mezzo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[#1E293B] p-1.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-semibold text-slate-400 px-2">Stato:</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={updatingStato}
                onClick={() => handleCambioStato('disponibile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  stato === 'disponibile' || stato === 'attivo'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Attivo
              </button>
              <button
                type="button"
                disabled={updatingStato}
                onClick={() => handleCambioStato('manutenzione')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  stato === 'manutenzione'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                In Manutenzione
              </button>
              <button
                type="button"
                disabled={updatingStato}
                onClick={() => handleCambioStato('fermo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  stato === 'fermo'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fermo
              </button>
            </div>
          </div>
        </div>

        {/* Griglia Informazioni Mezzo & Costi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Specifiche & Chilometraggio */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Gauge className="w-5 h-5 text-red-500" />
              Specifiche & Scadenze
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#0F172A] rounded-2xl flex justify-between items-center">
                <span className="text-slate-400 font-medium">Chilometri Attuali:</span>
                <span className="text-base font-extrabold text-white">
                  {Number(veicolo?.km_attuali || 0).toLocaleString('it-IT')} km
                </span>
              </div>

              <div className="p-3 bg-[#0F172A] rounded-2xl flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Wrench className="w-4 h-4 text-slate-500" /> Prossimo Tagliando:
                </span>
                <span className="font-bold text-white">
                  {veicolo?.km_prossimo_tagliando ? `${Number(veicolo.km_prossimo_tagliando).toLocaleString('it-IT')} km` : 'Non impostato'}
                </span>
              </div>

              <div className="p-3 bg-[#0F172A] rounded-2xl flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-slate-500" /> Assicurazione:
                </span>
                <span className="font-bold text-white">{veicolo?.data_scadenza_assicurazione || 'Non registrata'}</span>
              </div>

              <div className="p-3 bg-[#0F172A] rounded-2xl flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-500" /> Revisione:
                </span>
                <span className="font-bold text-white">{veicolo?.data_scadenza_revisione || 'Non registrata'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Documenti di Bordo */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-red-500" />
              Documenti di Bordo
            </h2>

            <div className="p-4 bg-[#0F172A] rounded-2xl space-y-2 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">Libretto Circolazione</span>
                {veicolo?.libretto_url ? (
                  <a href={veicolo.libretto_url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1">
                    Visualizza <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500">Mancante</span>
                )}
              </div>
              <label className="block border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-2 text-center cursor-pointer transition text-[11px] text-slate-400">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleUploadDocumento(e, 'libretto')} className="hidden" />
                {uploadingDoc === 'libretto' ? 'Caricamento...' : 'Carica / Aggiorna Libretto'}
              </label>
            </div>

            <div className="p-4 bg-[#0F172A] rounded-2xl space-y-2 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">Polizza Assicurativa</span>
                {veicolo?.assicurazione_url ? (
                  <a href={veicolo.assicurazione_url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1">
                    Visualizza <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500">Mancante</span>
                )}
              </div>
              <label className="block border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-2 text-center cursor-pointer transition text-[11px] text-slate-400">
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleUploadDocumento(e, 'assicurazione')} className="hidden" />
                {uploadingDoc === 'assicurazione' ? 'Caricamento...' : 'Carica / Aggiorna Polizza'}
              </label>
            </div>
          </div>

          {/* Card 3: Totale Costi Sostenuti */}
          <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-white">
                <Euro className="w-5 h-5 text-emerald-400" />
                Costi Sostenuti Totali
              </h2>
              <div className="mt-4 p-4 bg-[#0F172A] rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Somma Fatture & Rifornimenti</span>
                <span className="text-3xl font-black text-emerald-400">
                  € {totaleCostiSostenuti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">{speseMezzo.length} fatture/voci registrate</span>
              </div>
            </div>

            <Link
              href="/spese"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
            >
              <Receipt className="w-4 h-4" />
              Gestione Contabile Fatture
            </Link>
          </div>
        </div>

        {/* Tabella Fatture e Storico Interventi del Mezzo */}
        <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Receipt className="w-5 h-5 text-red-500" />
              Fatture & Interventi Collegati
            </h2>
            <span className="text-xs text-slate-400">{speseMezzo.length} registrazioni</span>
          </div>

          {speseMezzo.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-[#0F172A] rounded-2xl border border-slate-800">
              Nessuna spesa o fattura registrata per questo veicolo.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {speseMezzo.map((s) => (
                <div key={s.id} className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">€ {Number(s.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">{s.tipo_spesa}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{s.descrizione || 'Intervento registrato'}</p>
                    <span className="text-[10px] text-slate-500">{s.data_spesa}</span>
                  </div>

                  {s.fattura_url && (
                    <a href={s.fattura_url} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition text-[11px] border border-slate-700">
                      <ExternalLink className="w-3.5 h-3.5 text-red-400" /> Vedi Doc
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storico Utilizzi & Conducenti */}
        <div className="bg-[#1E293B] border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-red-500" />
              Storico Conducenti & Turni
            </h2>
            <span className="text-xs text-slate-400">{storicoUtilizzi.length} turni</span>
          </div>

          {storicoUtilizzi.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-[#0F172A] rounded-2xl border border-slate-800">
              Nessun turno registrato con questo mezzo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0F172A] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3 rounded-l-xl">Data</th>
                    <th className="p-3">Conducente</th>
                    <th className="p-3">Km Inizio / Fine</th>
                    <th className="p-3">Percorrenza</th>
                    <th className="p-3 rounded-r-xl">Verbale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {storicoUtilizzi.map((t) => {
                    const kmIn = Number(t.km_inizio) || 0;
                    const kmFi = Number(t.km_fine) || kmIn;
                    const diff = kmFi >= kmIn ? kmFi - kmIn : 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-white">{new Date(t.created_at).toLocaleDateString('it-IT')}</td>
                        <td className="p-3 font-bold text-white capitalize">{t.nome_autista || 'Autista'}</td>
                        <td className="p-3">{kmIn.toLocaleString('it-IT')} → {t.km_fine ? `${kmFi.toLocaleString('it-IT')} km` : 'in corso'}</td>
                        <td className="p-3 font-bold text-emerald-400">+{diff} km</td>
                        <td className="p-3 text-[10px] text-slate-400 font-mono">{t.codice_verbale}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}