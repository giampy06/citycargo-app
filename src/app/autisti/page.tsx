'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  Users, 
  ChevronLeft, 
  Search, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink, 
  X, 
  Loader2,
  Send,
  FileCheck,
  Megaphone,
  Trash2
} from 'lucide-react';

export default function GestioneAutistiPage() {
  const router = useRouter();
  const [autisti, setAutisti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('TUTTI');
  const [ricerca, setRicerca] = useState('');

  // Scheda Fascicolo Autista Selezionato
  const [selectedAutista, setSelectedAutista] = useState<any | null>(null);
  const [editVisitaMedica, setEditVisitaMedica] = useState('');
  const [editCorsoSicurezza, setEditCorsoSicurezza] = useState('');
  const [savingMedica, setSavingMedica] = useState(false);

  // Invio Documento (Singolo o Broadcast a Tutti)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [titoloDoc, setTitoloDoc] = useState('');
  const [descDoc, setDescDoc] = useState('');
  const [fileDoc, setFileDoc] = useState<File | null>(null);
  const [sendingDoc, setSendingDoc] = useState(false);

  const fetchAutisti = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('autisti')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutisti(data || []);
    } catch (err: any) {
      console.error('Errore recupero autisti:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutisti();
  }, []);

  const handleApprova = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from('autisti')
        .update({ stato: 'attivo' })
        .eq('id', id);

      if (error) throw error;
      setAutisti(autisti.map(a => a.id === id ? { ...a, stato: 'attivo' } : a));
      alert(`Autista ${email} approvato con successo!`);
    } catch (err: any) {
      alert(`Errore approvazione: ${err.message}`);
    }
  };

  // Funzione per eliminare l'autista
  const handleEliminaAutista = async (id: string, nomeCompleto: string) => {
    const conferma = window.confirm(`⚠️ ATTENZIONE: Sei sicuro di voler ELIMINARE definitivamente l'autista ${nomeCompleto}? L'operazione è irreversibile.`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('autisti')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Autista eliminato con successo.');
      fetchAutisti();
    } catch (err: any) {
      alert(`Errore cancellazione: ${err.message}`);
    }
  };

  const handleOpenFascicolo = (autista: any) => {
    setSelectedAutista(autista);
    setEditVisitaMedica(autista.scadenza_visita_medica || '');
    setEditCorsoSicurezza(autista.scadenza_corso_sicurezza || '');
  };

  const handleSalvaScadenzeMediche = async () => {
    if (!selectedAutista) return;
    setSavingMedica(true);

    try {
      const { error } = await supabase
        .from('autisti')
        .update({
          scadenza_visita_medica: editVisitaMedica || null,
          scadenza_corso_sicurezza: editCorsoSicurezza || null,
        })
        .eq('id', selectedAutista.id);

      if (error) throw error;

      const aggiornato = {
        ...selectedAutista,
        scadenza_visita_medica: editVisitaMedica || null,
        scadenza_corso_sicurezza: editCorsoSicurezza || null,
      };

      setSelectedAutista(aggiornato);
      setAutisti(autisti.map(a => a.id === aggiornato.id ? aggiornato : a));
      alert('Scadenze mediche e sicurezza aggiornate!');
    } catch (err: any) {
      alert(`Errore salvataggio: ${err.message}`);
    } finally {
      setSavingMedica(false);
    }
  };

  const handleInviaDocumentoFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileDoc) {
      alert('Seleziona un file da inviare.');
      return;
    }
    setSendingDoc(true);

    try {
      const ext = fileDoc.name.split('.').pop() || 'pdf';
      const path = `documenti-firmati/broadcast-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('documenti-veicoli').upload(path, fileDoc);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('documenti-veicoli').getPublicUrl(path);

      if (isBroadcastMode) {
        const autistiAttivi = autisti.filter(a => a.id);
        if (autistiAttivi.length === 0) {
          throw new Error('Nessun autista registrato in archivio.');
        }

        const payload = autistiAttivi.map(a => ({
          titolo: titoloDoc,
          descrizione: descDoc,
          file_url: urlData.publicUrl,
          autista_id: a.id,
          richiede_firma: true,
          firmato: false
        }));

        const { error: dbErr } = await supabase.from('documenti_aziendali').insert(payload);
        if (dbErr) throw dbErr;

        alert(`Documento inviato con successo a tutti i ${autistiAttivi.length} autisti!`);
      } else {
        if (!selectedAutista) throw new Error('Nessun autista selezionato.');
        
        const { error: dbErr } = await supabase.from('documenti_aziendali').insert([
          {
            titolo: titoloDoc,
            descrizione: descDoc,
            file_url: urlData.publicUrl,
            autista_id: selectedAutista.id,
            richiede_firma: true,
            firmato: false
          }
        ]);
        if (dbErr) throw dbErr;

        alert(`Documento inviato a ${selectedAutista.nome} per la firma digitale!`);
      }

      setIsDocModalOpen(false);
      setTitoloDoc('');
      setDescDoc('');
      setFileDoc(null);
    } catch (err: any) {
      alert(`Errore invio documento: ${err.message}`);
    } finally {
      setSendingDoc(false);
    }
  };

  const autistiFiltrati = autisti.filter(a => {
    const matchStato = filtroStato === 'TUTTI' || a.stato === filtroStato;
    const matchRicerca = !ricerca || 
      a.nome?.toLowerCase().includes(ricerca.toLowerCase()) || 
      a.cognome?.toLowerCase().includes(ricerca.toLowerCase()) ||
      a.email?.toLowerCase().includes(ricerca.toLowerCase());
    return matchStato && matchRicerca;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 font-sans antialiased">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">Anagrafica Personale & Autisti</h1>
              <p className="text-[11px] text-gray-400 font-medium">Fascicoli Dipendenti, Patenti, Visite Mediche e Firma Digitale</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsBroadcastMode(true);
              setSelectedAutista(null);
              setIsDocModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#E05353] hover:bg-[#c94545] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm transition"
          >
            <Megaphone className="w-4 h-4" /> Invia Circolare a Tutti
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cerca autista per nome o email..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['TUTTI', 'in_attesa', 'attivo', 'sospeso'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStato(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition whitespace-nowrap ${
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

        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Caricamento anagrafiche...
          </div>
        ) : autistiFiltrati.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100">
            Nessun autista trovato in archivio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autistiFiltrati.map((autista) => (
              <div 
                key={autista.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1E242B]">{autista.nome} {autista.cognome}</h3>
                      <p className="text-[11px] text-gray-400">{autista.email}</p>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      autista.stato === 'attivo' ? 'bg-emerald-50 text-emerald-700' :
                      autista.stato === 'in_attesa' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-[#E05353]'
                    }`}>
                      ● {autista.stato?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs bg-[#F8F9FB] p-3 rounded-2xl text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Telefono:</span>
                      <b className="text-[#1E242B]">{autista.telefono || 'Non inserito'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Patente:</span>
                      <b className="text-[#1E242B]">{autista.numero_patente || 'Non inserita'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visita Medica:</span>
                      <b className={autista.scadenza_visita_medica ? 'text-gray-800' : 'text-amber-600'}>
                        {autista.scadenza_visita_medica || 'Da programmare'}
                      </b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  {autista.stato === 'in_attesa' ? (
                    <button
                      onClick={() => handleApprova(autista.id, autista.email)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approva Autista
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Convalidato
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenFascicolo(autista)}
                      className="px-3.5 py-1.5 bg-[#1E242B] hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      Fascicolo & Documenti
                    </button>

                    {/* PULSANTE ELIMINA AUTISTA */}
                    <button
                      onClick={() => handleEliminaAutista(autista.id, `${autista.nome} ${autista.cognome}`)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                      title="Elimina Autista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedAutista && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="font-black text-base text-[#1E242B]">
                  {selectedAutista.nome} {selectedAutista.cognome}
                </h2>
                <p className="text-xs text-gray-400">Fascicolo Dipendente & Scadenziario</p>
              </div>
              <button 
                onClick={() => setSelectedAutista(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-[#1E242B] uppercase tracking-wider block">
                Documenti Identità & Patente
              </span>
              <div className="grid grid-cols-2 gap-3">
                {selectedAutista.foto_patente_fronte ? (
                  <a
                    href={selectedAutista.foto_patente_fronte}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl text-center text-xs font-bold text-[#E05353] flex items-center justify-center gap-1 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Patente Fronte
                  </a>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">Patente Fronte non caricata</div>
                )}

                {selectedAutista.foto_patente_retro ? (
                  <a
                    href={selectedAutista.foto_patente_retro}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-[#F8F9FB] border border-gray-200 rounded-2xl text-center text-xs font-bold text-[#E05353] flex items-center justify-center gap-1 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Patente Retro
                  </a>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">Patente Retro non caricata</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F8F9FB] rounded-2xl space-y-3">
              <span className="text-[11px] font-extrabold text-[#1E242B] uppercase tracking-wider block">
                Scadenze Sanitarie & Formazione (D.Lgs 81/08)
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scad. Visita Medica</label>
                  <input
                    type="date"
                    value={editVisitaMedica}
                    onChange={(e) => setEditVisitaMedica(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scad. Corso Sicurezza</label>
                  <input
                    type="date"
                    value={editCorsoSicurezza}
                    onChange={(e) => setEditCorsoSicurezza(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSalvaScadenzeMediche}
                disabled={savingMedica}
                className="w-full py-2.5 bg-[#1E242B] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                {savingMedica ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4 text-emerald-400" />}
                Salva Scadenze
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsBroadcastMode(false);
                  setSelectedAutista(selectedAutista);
                  setIsDocModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#E05353] hover:bg-[#c94545] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <Send className="w-4 h-4" /> Invia Documento a Questo Autista
              </button>

              <button
                type="button"
                onClick={() => setSelectedAutista(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1E242B]">
                  {isBroadcastMode ? '📢 Invia a Tutti gli Autisti' : `Invia Documento a ${selectedAutista?.nome}`}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium">Richiesta di presa visione e firma digitale</p>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviaDocumentoFirma} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-600 block mb-1">Titolo Documento / Circolare</label>
                <input
                  type="text"
                  required
                  placeholder="es. Disposizione di Servizio 2026"
                  value={titoloDoc}
                  onChange={(e) => setTitoloDoc(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-600 block mb-1">Note o Istruzioni</label>
                <textarea
                  rows={2}
                  placeholder="Prendere visione e firmare digitalmente..."
                  value={descDoc}
                  onChange={(e) => setDescDoc(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl p-3 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-600 block mb-1">File PDF o Immagine</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setFileDoc(e.target.files?.[0] || null)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl p-2 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={sendingDoc}
                className="w-full py-3 bg-[#E05353] hover:bg-[#c94545] text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                {sendingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isBroadcastMode ? 'Invia a Tutti gli Autisti' : "Invia all'App Conducente"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}