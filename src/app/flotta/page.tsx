'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  Truck, 
  ChevronLeft, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Calendar, 
  Gauge, 
  AlertTriangle, 
  X, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wrench,
  ChevronRight,
  Edit3,
  Check,
  Camera,
  Eye,
  ExternalLink
} from 'lucide-react';

export default function FlottaPage() {
  const router = useRouter();
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ricerca, setRicerca] = useState('');
  const [filtroStato, setFiltroStato] = useState('TUTTI');

  // Scheda Dettaglio Furgone Selezionato
  const [selectedVeicolo, setSelectedVeicolo] = useState<any | null>(null);
  const [storicoTurniMezzo, setStoricoTurniMezzo] = useState<any[]>([]);
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);

  // Modifica Rapida Km / Note / Scadenze
  const [editKm, setEditKm] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAssicurazione, setEditAssicurazione] = useState('');
  const [editRevisione, setEditRevisione] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload Documenti Mezzo
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docModalUrl, setDocModalUrl] = useState<string | null>(null);
  const [docModalTitolo, setDocModalTitolo] = useState<string>('');

  // Modale Nuovo Veicolo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targa, setTarga] = useState('');
  const [modello, setModello] = useState('');
  const [kmAttuali, setKmAttuali] = useState('');
  const [scadenzaAssicurazione, setScadenzaAssicurazione] = useState('');
  const [scadenzaRevisione, setScadenzaRevisione] = useState('');
  const [appaltoAssegnato, setAppaltoAssegnato] = useState('CITI');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchVeicoli = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('veicoli')
        .select('*')
        .order('targa', { ascending: true });

      if (error) throw error;
      setVeicoli(data || []);
    } catch (err: any) {
      console.error('Errore caricamento veicoli:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVeicoli();
  }, []);

  // Apertura Scheda Furgone
  const handleOpenScheda = async (veicolo: any) => {
    setSelectedVeicolo(veicolo);
    setEditKm(veicolo.km_attuali?.toString() || '');
    setEditNote(veicolo.note || '');
    setEditAssicurazione(veicolo.scadenza_assicurazione || '');
    setEditRevisione(veicolo.scadenza_revisione || '');
    setLoadingDettaglio(true);

    try {
      const { data: turniData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('targa_mezzo', veicolo.targa)
        .order('created_at', { ascending: false })
        .limit(10);

      setStoricoTurniMezzo(turniData || []);
    } catch (err) {
      console.error('Errore recupero storico mezzo:', err);
      setStoricoTurniMezzo([]);
    } finally {
      setLoadingDettaglio(false);
    }
  };

  // Upload Foto Documento del Mezzo
  const handleUploadDocMezzo = async (file: File, tipo: 'foto_libretto' | 'foto_assicurazione' | 'foto_revisione') => {
    if (!selectedVeicolo) return;
    setUploadingDoc(tipo);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedVeicolo.targa}/${tipo}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('documenti-veicoli').upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('documenti-veicoli').getPublicUrl(path);
      const url = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from('veicoli')
        .update({ [tipo]: url })
        .eq('id', selectedVeicolo.id);

      if (dbErr) throw dbErr;

      const aggiornato = { ...selectedVeicolo, [tipo]: url };
      setSelectedVeicolo(aggiornato);
      setVeicoli(veicoli.map(v => v.id === aggiornato.id ? aggiornato : v));
      alert('Documento caricato con successo!');
    } catch (err: any) {
      alert(`Errore caricamento documento: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Salva Modifiche dalla Scheda Furgone
  const handleSalvaDettagliScheda = async () => {
    if (!selectedVeicolo) return;
    setSavingEdit(true);

    try {
      const { error } = await supabase
        .from('veicoli')
        .update({
          km_attuali: editKm ? Number(editKm) : selectedVeicolo.km_attuali,
          note: editNote.trim() || null,
          scadenza_assicurazione: editAssicurazione || null,
          scadenza_revisione: editRevisione || null,
        })
        .eq('id', selectedVeicolo.id);

      if (error) throw error;

      const aggiornato = {
        ...selectedVeicolo,
        km_attuali: editKm ? Number(editKm) : selectedVeicolo.km_attuali,
        note: editNote.trim() || null,
        scadenza_assicurazione: editAssicurazione || null,
        scadenza_revisione: editRevisione || null,
      };

      setSelectedVeicolo(aggiornato);
      setVeicoli(veicoli.map(v => v.id === aggiornato.id ? aggiornato : v));
      alert('Scheda furgone aggiornata con successo!');
    } catch (err: any) {
      alert(`Errore salvataggio: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Aggiornamento Stato Veicolo
  const handleUpdateStato = async (id: string, nuovoStato: string) => {
    try {
      const { error } = await supabase
        .from('veicoli')
        .update({ stato: nuovoStato })
        .eq('id', id);

      if (error) throw error;

      setVeicoli(veicoli.map(v => v.id === id ? { ...v, stato: nuovoStato } : v));
      if (selectedVeicolo && selectedVeicolo.id === id) {
        setSelectedVeicolo({ ...selectedVeicolo, stato: nuovoStato });
      }
    } catch (err: any) {
      alert(`Errore aggiornamento stato: ${err.message}`);
    }
  };

  // Eliminazione Veicolo
  const handleDeleteVeicolo = async (id: string, targaMezzo: string) => {
    const conferma = window.confirm(`ATTENZIONE: Sei sicuro di voler eliminare definitivamente il furgone targa ${targaMezzo}? L'operazione è irreversibile.`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('veicoli')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVeicoli(veicoli.filter(v => v.id !== id));
      if (selectedVeicolo?.id === id) setSelectedVeicolo(null);
      alert(`Veicolo ${targaMezzo} eliminato dalla flotta.`);
    } catch (err: any) {
      alert(`Errore eliminazione veicolo: ${err.message}`);
    }
  };

  // Creazione Nuovo Veicolo
  const handleCreateVeicolo = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (!targa) throw new Error('Inserisci la targa del veicolo.');

      const { error } = await supabase.from('veicoli').insert([
        {
          targa: targa.trim().toUpperCase(),
          modello: modello.trim() || 'Furgone Aziendale',
          km_attuali: kmAttuali ? Number(kmAttuali) : 0,
          scadenza_assicurazione: scadenzaAssicurazione || null,
          scadenza_revisione: scadenzaRevisione || null,
          appalto_assegnato: appaltoAssegnato,
          stato: 'disponibile',
        },
      ]);

      if (error) throw error;

      setTarga('');
      setModello('');
      setKmAttuali('');
      setScadenzaAssicurazione('');
      setScadenzaRevisione('');
      setIsModalOpen(false);
      fetchVeicoli();
      alert('Veicolo aggiunto alla flotta con successo!');
    } catch (err: any) {
      setModalError(err.message || 'Errore salvataggio veicolo.');
    } finally {
      setSubmitting(false);
    }
  };

  const veicoliFiltrati = veicoli.filter(v => {
    const matchStato = filtroStato === 'TUTTI' || v.stato === filtroStato;
    const matchRicerca = !ricerca || 
      v.targa?.toLowerCase().includes(ricerca.toLowerCase()) || 
      v.modello?.toLowerCase().includes(ricerca.toLowerCase());
    return matchStato && matchRicerca;
  });

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
              <h1 className="font-extrabold text-base tracking-tight">Gestione Flotta Mezzi</h1>
              <p className="text-[11px] text-gray-400 font-medium">Schede Furgoni, Libretti, Assicurazioni e Revisioni</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchVeicoli}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-10 px-4 rounded-2xl bg-[#E05353] hover:bg-[#c94545] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Aggiungi Furgone
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Barra di Ricerca & Filtri Stato */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca mezzo per targa o modello..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['TUTTI', 'disponibile', 'in_uso', 'in_manutenzione', 'fermo'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStato(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  filtroStato === s
                    ? 'bg-[#1E242B] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Griglia Furgoni */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento flotta aziendale...
          </div>
        ) : veicoliFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100">
            Nessun furgone trovato. Clicca su "+ Aggiungi Furgone" per inserire un veicolo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {veicoliFiltrati.map((veicolo) => (
              <div 
                key={veicolo.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-black tracking-wider text-[#1E242B] bg-[#F8F9FB] px-2.5 py-1 rounded-xl border border-gray-200">
                      {veicolo.targa}
                    </span>

                    {/* Stato Veicolo */}
                    <select
                      value={veicolo.stato || 'disponibile'}
                      onChange={(e) => handleUpdateStato(veicolo.id, e.target.value)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border-0 focus:ring-0 cursor-pointer uppercase tracking-wider ${
                        veicolo.stato === 'disponibile' ? 'bg-emerald-50 text-emerald-700' :
                        veicolo.stato === 'in_uso' ? 'bg-amber-50 text-amber-700' :
                        veicolo.stato === 'in_manutenzione' ? 'bg-blue-50 text-blue-700' :
                        'bg-rose-50 text-[#E05353]'
                      }`}
                    >
                      <option value="disponibile">● DISPONIBILE</option>
                      <option value="in_uso">● IN USO</option>
                      <option value="in_manutenzione">● IN MANUTENZIONE</option>
                      <option value="fermo">● FERMO</option>
                    </select>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-extrabold text-sm text-[#1E242B]">{veicolo.modello}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Appalto: <b className="text-gray-700">{veicolo.appalto_assegnato || 'CITI'}</b></p>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-[#F8F9FB] p-3 rounded-2xl text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Gauge className="w-3.5 h-3.5 text-gray-400" /> Chilometri:
                      </span>
                      <b className="text-[#1E242B]">{Number(veicolo.km_attuali || 0).toLocaleString('it-IT')} km</b>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Assicurazione:
                      </span>
                      <span className="text-[11px] font-bold">{veicolo.scadenza_assicurazione || 'Non inserita'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Revisione:
                      </span>
                      <span className="text-[11px] font-bold">{veicolo.scadenza_revisione || 'Non inserita'}</span>
                    </div>
                  </div>
                </div>

                {/* Tasti Azione: Apri Scheda Furgone + Elimina */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteVeicolo(veicolo.id, veicolo.targa)}
                    className="text-xs font-bold text-gray-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition"
                    title="Elimina veicolo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenScheda(veicolo)}
                    className="px-3 py-1.5 bg-[#1E242B] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-sm"
                  >
                    <span>Scheda Furgone & Documenti</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 🟢 SCHEDA DETTAGLIO FURGONE CON UPLOAD FOTO DOCUMENTI */}
      {selectedVeicolo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header Scheda */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="font-mono text-xl font-black bg-[#F8F9FB] border border-gray-300 px-3 py-1 rounded-2xl text-[#1E242B]">
                  {selectedVeicolo.targa}
                </div>
                <div>
                  <h2 className="font-black text-base text-[#1E242B]">{selectedVeicolo.modello}</h2>
                  <span className="text-xs text-gray-400 font-medium">Appalto: <b>{selectedVeicolo.appalto_assegnato || 'CITI'}</b></span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedVeicolo(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stato e Controlli Rapidi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8F9FB] rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Stato Operativo</span>
                <select
                  value={selectedVeicolo.stato || 'disponibile'}
                  onChange={(e) => handleUpdateStato(selectedVeicolo.id, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                >
                  <option value="disponibile">🟢 DISPONIBILE (Pronto al servizio)</option>
                  <option value="in_uso">🟡 IN USO (Turno attivo)</option>
                  <option value="in_manutenzione">🔵 IN MANUTENZIONE (Officina)</option>
                  <option value="fermo">🔴 FERMO (Non utilizzabile)</option>
                </select>
              </div>

              <div className="p-4 bg-[#F8F9FB] rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Chilometraggio Odometrico</span>
                <input
                  type="number"
                  value={editKm}
                  onChange={(e) => setEditKm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1E242B] focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>

            {/* 📸 SEZIONE FOTO DOCUMENTI VEICOLO (Libretto, Assicurazione, Revisione) */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
              <span className="text-[11px] font-extrabold text-[#1E242B] uppercase tracking-wider block">
                Foto Documenti Furgone
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Libretto */}
                <div className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold text-gray-600 block">Libretto di Circolazione</span>
                  {selectedVeicolo.foto_libretto ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => { setDocModalUrl(selectedVeicolo.foto_libretto); setDocModalTitolo(`Libretto - ${selectedVeicolo.targa}`); }}
                        className="w-full py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-[#1E242B] rounded-xl flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#E05353]" /> Vedi Foto
                      </button>
                      <label className="block text-[9px] text-gray-400 hover:text-gray-600 cursor-pointer">
                        Sostituisci foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_libretto')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="py-3 border border-dashed border-gray-300 hover:border-[#E05353] rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white transition">
                      <Camera className="w-4 h-4 text-[#E05353] mb-1" />
                      <span className="text-[10px] font-bold text-gray-700">Carica Libretto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_libretto')}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Assicurazione */}
                <div className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold text-gray-600 block">Polizza Assicurativa</span>
                  {selectedVeicolo.foto_assicurazione ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => { setDocModalUrl(selectedVeicolo.foto_assicurazione); setDocModalTitolo(`Assicurazione - ${selectedVeicolo.targa}`); }}
                        className="w-full py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-[#1E242B] rounded-xl flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" /> Vedi Foto
                      </button>
                      <label className="block text-[9px] text-gray-400 hover:text-gray-600 cursor-pointer">
                        Sostituisci foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_assicurazione')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="py-3 border border-dashed border-gray-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white transition">
                      <Camera className="w-4 h-4 text-blue-500 mb-1" />
                      <span className="text-[10px] font-bold text-gray-700">Carica Polizza</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_assicurazione')}
                      />
                    </label>
                  )}
                </div>

                {/* 3. Revisione */}
                <div className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold text-gray-600 block">Certificato Revisione</span>
                  {selectedVeicolo.foto_revisione ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => { setDocModalUrl(selectedVeicolo.foto_revisione); setDocModalTitolo(`Revisione - ${selectedVeicolo.targa}`); }}
                        className="w-full py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-[#1E242B] rounded-xl flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" /> Vedi Foto
                      </button>
                      <label className="block text-[9px] text-gray-400 hover:text-gray-600 cursor-pointer">
                        Sostituisci foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_revisione')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="py-3 border border-dashed border-gray-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white transition">
                      <Camera className="w-4 h-4 text-emerald-500 mb-1" />
                      <span className="text-[10px] font-bold text-gray-700">Carica Tagliando</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUploadDocMezzo(e.target.files[0], 'foto_revisione')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {uploadingDoc && (
                <div className="text-[11px] text-[#E05353] font-bold flex items-center justify-center gap-1 pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Caricamento documento in corso...
                </div>
              )}
            </div>

            {/* Date di Scadenza Modificabili */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scad. Assicurazione</label>
                <input
                  type="date"
                  value={editAssicurazione}
                  onChange={(e) => setEditAssicurazione(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scad. Revisione</label>
                <input
                  type="date"
                  value={editRevisione}
                  onChange={(e) => setEditRevisione(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>

            {/* Note Mezzo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Note / Manutenzioni / Officina</label>
              <textarea
                rows={2}
                placeholder="es. Tagliando eseguito, gomme invernali montate a 115.000 km..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
              />
            </div>

            {/* Tasto Salva Modifiche Scheda */}
            <button
              type="button"
              onClick={handleSalvaDettagliScheda}
              disabled={savingEdit}
              className="w-full py-3 bg-[#1E242B] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
              Salva Modifiche Scheda Furgone
            </button>

            {/* Storico Ultimi Turni */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ultimi Autisti che hanno guidato questo mezzo</span>
              {loadingDettaglio ? (
                <div className="py-6 text-center text-xs text-gray-400">Caricamento cronologia turni...</div>
              ) : storicoTurniMezzo.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 bg-[#F8F9FB] rounded-xl">
                  Nessun turno registrato per questo veicolo.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {storicoTurniMezzo.map((t) => (
                    <div key={t.id} className="p-2.5 bg-[#F8F9FB] rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-800 capitalize">{t.nome_autista || 'Autista'}</span>
                        <span className="text-[10px] text-gray-400 block">{new Date(t.created_at).toLocaleDateString('it-IT')} - {t.codice_verbale}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {t.km_percorsi ? `+${t.km_percorsi} km` : 'In corso'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con Eliminazione */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteVeicolo(selectedVeicolo.id, selectedVeicolo.targa)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" /> Elimina Mezzo dalla Flotta
              </button>

              <button
                type="button"
                onClick={() => setSelectedVeicolo(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE INGRANDIMENTO FOTO DOCUMENTO */}
      {docModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-sm text-[#1E242B]">{docModalTitolo}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={docModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#E05353] flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Apri originale
                </a>
                <button 
                  onClick={() => setDocModalUrl(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <img 
                src={docModalUrl} 
                alt="Documento Mezzo"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALE INSERIMENTO NUOVO MEZZO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1E242B]">Aggiungi Furgone alla Flotta</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVeicolo} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Targa</label>
                <input
                  type="text"
                  required
                  placeholder="FX123AB"
                  value={targa}
                  onChange={(e) => setTarga(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Modello / Allestimento</label>
                <input
                  type="text"
                  required
                  placeholder="Fiat Ducato L2H2"
                  value={modello}
                  onChange={(e) => setModello(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Km Attuali</label>
                  <input
                    type="number"
                    placeholder="125000"
                    value={kmAttuali}
                    onChange={(e) => setKmAttuali(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Appalto</label>
                  <select
                    value={appaltoAssegnato}
                    onChange={(e) => setAppaltoAssegnato(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  >
                    <option value="CITI">CITI</option>
                    <option value="EDF">EDF</option>
                    <option value="RHENUS">RHENUS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Assicurazione</label>
                  <input
                    type="date"
                    value={scadenzaAssicurazione}
                    onChange={(e) => setScadenzaAssicurazione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Scad. Revisione</label>
                  <input
                    type="date"
                    value={scadenzaRevisione}
                    onChange={(e) => setScadenzaRevisione(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#E05353] hover:bg-[#c94545] disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva Veicolo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}