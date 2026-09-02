'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  FileText, 
  ChevronLeft, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  Loader2, 
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Filter,
  Clock,
  Eye,
  Send,
  Users
} from 'lucide-react';

export default function AdminCedoliniPage() {
  const router = useRouter();
  const [cedolini, setCedolini] = useState<any[]>([]);
  const [autisti, setAutisti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroMese, setFiltroMese] = useState<string>('TUTTI');

  // Stati per il caricamento rapido per singolo autista
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [MeseSelezionato, setMeseSelezionato] = useState('Ottobre');
  const [AnnoSelezionato, setAnnoSelezionato] = useState(2026);
  const [filePerAutista, setFilePerAutista] = useState<{ [key: string]: File | null }>({});

  // Modale Visualizzazione Firma
  const [cedolinoSelezionato, setCedolinoSelezionato] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCedolini, resAutisti] = await Promise.all([
        supabase.from('cedolini').select('*').order('created_at', { ascending: false }),
        supabase.from('autisti').select('*').eq('stato', 'attivo').order('cognome', { ascending: true })
      ]);

      if (resCedolini.error) throw resCedolini.error;
      if (resAutisti.error) throw resAutisti.error;

      setCedolini(resCedolini.data || []);
      setAutisti(resAutisti.data || []);
    } catch (err: any) {
      console.error('Errore recupero dati:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadRapido = async (autista: any) => {
    const filePdf = filePerAutista[autista.id];
    if (!filePdf) {
      alert(`Seleziona prima un file PDF per ${autista.cognome} ${autista.nome}.`);
      return;
    }

    setUploadingId(autista.id);

    try {
      const nomeCompleto = `${autista.cognome} ${autista.nome}`;
      const fileExt = filePdf.name.split('.').pop();
      const cleanName = nomeCompleto.replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${cleanName}-${MeseSelezionato}-${AnnoSelezionato}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cedolini')
        .upload(fileName, filePdf, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('cedolini')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('cedolini')
        .insert([
          {
            autista_id: autista.id,
            autista_nome: nomeCompleto,
            mese: MeseSelezionato,
            anno: Number(AnnoSelezionato),
            mese_riferimento: `${MeseSelezionato} ${AnnoSelezionato}`,
            file_url: publicUrlData.publicUrl,
            firmato: false,
          },
        ]);

      if (dbError) throw dbError;

      // Pulisci il file per quell'autista
      setFilePerAutista({ ...filePerAutista, [autista.id]: null });
      fetchData();
      alert(`Busta paga caricata con successo per ${nomeCompleto}! L'autista può ora firmarla dall'app.`);
    } catch (err: any) {
      alert(`Errore durante il caricamento: ${err.message}`);
    } finally {
      setUploadingId(null);
    }
  };

  const cedoliniFiltrati = cedolini.filter(c => filtroMese === 'TUTTI' || c.mese === filtroMese);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased font-sans">
      {/* Header Admin */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">Pannello Buste Paga & Caricamento Rapido</h1>
              <p className="text-[11px] text-gray-400 font-medium">Assegnazione diretta per dipendente & Monitoraggio Firme</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
              title="Aggiorna"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* SEZIONE 1: CARICAMENTO RAPIDO PER CIASCUN AUTISTA */}
        <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[#1E242B]">Caricamento Rapido per Dipendente</h2>
                <p className="text-xs text-gray-400">Seleziona mese/anno, allega il PDF e carica direttamente</p>
              </div>
            </div>

            {/* Selettori Mese e Anno Globali per il caricamento */}
            <div className="flex items-center gap-2">
              <select
                value={MeseSelezionato}
                onChange={(e) => setMeseSelezionato(e.target.value)}
                className="bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input
                type="number"
                value={AnnoSelezionato}
                onChange={(e) => setAnnoSelezionato(Number(e.target.value))}
                className="w-20 bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Caricamento autisti attivi...</div>
          ) : autisti.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">Nessun autista attivo trovato in anagrafica.</div>
          ) : (
            <div className="space-y-3">
              {autisti.map((autista) => {
                const fileSelezionato = filePerAutista[autista.id];
                const isUploading = uploadingId === autista.id;

                return (
                  <div 
                    key={autista.id}
                    className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <h3 className="font-extrabold text-xs text-[#1E242B] uppercase">
                        {autista.cognome} {autista.nome}
                      </h3>
                      <p className="text-[10px] text-gray-400">{autista.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                        fileSelezionato 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFilePerAutista({ ...filePerAutista, [autista.id]: e.target.files[0] });
                            }
                          }}
                        />
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate max-w-[150px]">
                          {fileSelezionato ? fileSelezionato.name : 'Seleziona PDF'}
                        </span>
                      </label>

                      <button
                        type="button"
                        disabled={!fileSelezionato || isUploading}
                        onClick={() => handleUploadRapido(autista)}
                        className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Invio...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Carica
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SEZIONE 2: REGISTRO STORICO E FIRME */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Storico Cedolini & Verifiche Firme
            </h3>

            {/* Filtro Mese */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {['TUTTI', 'Settembre', 'Ottobre', 'Agosto', 'Luglio'].map((m) => (
                <button
                  key={m}
                  onClick={() => setFiltroMese(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filtroMese === m
                      ? 'bg-[#1E242B] text-white shadow-sm'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center text-xs text-gray-400">
              Caricamento registro...
            </div>
          ) : cedoliniFiltrati.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center text-xs text-gray-400">
              Nessun cedolino presente per questo filtro.
            </div>
          ) : (
            cedoliniFiltrati.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    item.firmato ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-[#1E242B]">
                        {item.autista_nome}
                      </h3>
                      <span className="text-xs font-bold text-gray-400">
                        — {item.mese} {item.anno}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      {item.firmato ? (
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Firmato il {item.data_firma ? new Date(item.data_firma).toLocaleDateString('it-IT') : 'Data non disp.'}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> In attesa di firma autista
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {item.file_url && item.file_url !== '#' && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3.5 bg-gray-50 hover:bg-gray-100 text-[#1E242B] rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-gray-100"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-600" />
                      PDF
                    </a>
                  )}

                  {item.firmato && item.firma_url && (
                    <button
                      onClick={() => setCedolinoSelezionato(item)}
                      className="py-2.5 px-3.5 bg-[#1E242B] hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Eye className="w-4 h-4" /> Vedi Firma
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODALE VISUALIZZAZIONE FIRMA CEDOLINO */}
      {cedolinoSelezionato && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1E242B]">Certificato di Firma</h3>
                <p className="text-[10px] text-gray-400 font-medium">Ricevuta Busta Paga</p>
              </div>
              <button 
                onClick={() => setCedolinoSelezionato(null)} 
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500 font-bold">Lavoratore:</span>
                  <span className="text-[#1E242B] font-extrabold text-right uppercase">{cedolinoSelezionato.autista_nome}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500 font-bold">Riferimento:</span>
                  <span className="text-emerald-700 font-extrabold">{cedolinoSelezionato.mese} {cedolinoSelezionato.anno}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Timestamp:</span>
                  <span className="text-[#1E242B] font-mono font-bold text-[10px]">
                    {cedolinoSelezionato.data_firma ? new Date(cedolinoSelezionato.data_firma).toLocaleString('it-IT') : 'N/D'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Tratto Grafico (Canvas)</span>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-white flex items-center justify-center h-32 overflow-hidden shadow-inner">
                  <img 
                    src={cedolinoSelezionato.firma_url} 
                    alt="Firma autista" 
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setCedolinoSelezionato(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}