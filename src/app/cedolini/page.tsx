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
  Eye
} from 'lucide-react';

export default function AdminCedoliniPage() {
  const router = useRouter();
  const [cedolini, setCedolini] = useState<any[]>([]);
  const [autisti, setAutisti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroMese, setFiltroMese] = useState<string>('TUTTI');

  // Modale Caricamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modale Visualizzazione Firma
  const [cedolinoSelezionato, setCedolinoSelezionato] = useState<any | null>(null);

  const [autistaSelezionato, setAutistaSelezionato] = useState('');
  const [mese, setMese] = useState('Settembre');
  const [anno, setAnno] = useState(2026);
  const [filePdf, setFilePdf] = useState<File | null>(null);

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
      
      if (resAutisti.data && resAutisti.data.length > 0 && !autistaSelezionato) {
        setAutistaSelezionato(resAutisti.data[0].id);
      }
    } catch (err: any) {
      console.error('Errore recupero dati:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadCedolino = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!filePdf) {
      setModalError('È obbligatorio allegare il file PDF.');
      return;
    }

    if (!autistaSelezionato) {
      setModalError('Seleziona un autista valido.');
      return;
    }

    setSubmitting(true);

    try {
      const targetAutista = autisti.find(a => a.id === autistaSelezionato);
      const nomeCompleto = targetAutista ? `${targetAutista.cognome} ${targetAutista.nome}` : 'Sconosciuto';

      const fileExt = filePdf.name.split('.').pop();
      const cleanName = nomeCompleto.replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${cleanName}-${mese}-${anno}.${fileExt}`;

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
            autista_id: autistaSelezionato,
            autista_nome: nomeCompleto,
            mese: mese,
            anno: Number(anno),
            mese_riferimento: `${mese} ${anno}`,
            file_url: publicUrlData.publicUrl,
            firmato: false,
          },
        ]);

      if (dbError) throw dbError;

      setFilePdf(null);
      setIsModalOpen(false);
      fetchData();
      alert(`Busta paga caricata e assegnata a ${nomeCompleto}!`);
    } catch (err: any) {
      setModalError(err.message || 'Errore durante il caricamento del file.');
    } finally {
      setSubmitting(false);
    }
  };

  const cedoliniFiltrati = cedolini.filter(c => filtroMese === 'TUTTI' || c.mese === filtroMese);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased">
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
              <h1 className="font-extrabold text-base tracking-tight">Pannello Buste Paga (Admin)</h1>
              <p className="text-[11px] text-gray-400 font-medium">Caricamento PDF e Monitoraggio Firme Autisti</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-10 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Carica Busta Paga
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Banner Legale */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#1E242B]">Registro Notifiche e Ricevute</h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Carica i cedolini per ciascun dipendente. L'autista riceve il documento sulla propria app ed esegue la firma telematica con data certa.
            </p>
          </div>
        </div>

        {/* Filtro Mese */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between overflow-x-auto gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-2">
            <Filter className="w-3.5 h-3.5" /> Filtra Mese:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['TUTTI', 'Settembre', 'Agosto', 'Luglio', 'Giugno'].map((m) => (
              <button
                key={m}
                onClick={() => setFiltroMese(m)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filtroMese === m
                    ? 'bg-[#1E242B] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Elenco Documenti */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
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

                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {item.firmato ? (
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Firmato il {item.data_firma ? new Date(item.data_firma).toLocaleDateString('it-IT') : 'Data non disp.'}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> In attesa che l'autista firmi per ricevuta
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

                  {item.firmato ? (
                    <div className="flex items-center gap-2">
                      <div className="py-2.5 px-4 bg-emerald-50 text-emerald-800 rounded-2xl font-bold text-xs flex items-center gap-1.5 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Firmato
                      </div>
                      
                      {/* BOTTONE VEDI FIRMA (Aggiunto!) */}
                      {item.firma_url && (
                        <button
                          onClick={() => setCedolinoSelezionato(item)}
                          className="py-2.5 px-3.5 bg-[#1E242B] hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Eye className="w-4 h-4" /> Vedi
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-2.5 px-4 bg-amber-50 text-amber-800 rounded-2xl font-bold text-xs flex items-center gap-1.5 border border-amber-200">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Da firmare
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODALE UPLOAD CEDOLINO ADMIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#1E242B]">Carica Cedolino</h3>
                <p className="text-[11px] text-gray-400">Assegna il file PDF al lavoratore</p>
              </div>
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

            <form onSubmit={handleUploadCedolino} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Destinatario</label>
                <select
                  value={autistaSelezionato}
                  onChange={(e) => setAutistaSelezionato(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {autisti.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.cognome} {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Mese</label>
                  <select
                    value={mese}
                    onChange={(e) => setMese(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Anno</label>
                  <input
                    type="number"
                    required
                    value={anno}
                    onChange={(e) => setAnno(Number(e.target.value))}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Documento PDF</label>
                <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  filePdf ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 bg-[#F8F9FB] hover:border-gray-300'
                }`}>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFilePdf(e.target.files[0]);
                      }
                    }}
                  />
                  {filePdf ? (
                    <div className="text-center">
                      <FileCheck className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      <span className="text-xs font-bold text-emerald-800 block truncate max-w-[240px]">
                        {filePdf.name}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <UploadCloud className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-gray-700 block">Carica PDF Busta Paga</span>
                      <span className="text-[10px] text-gray-400">Formato .pdf</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upload in corso...
                    </>
                  ) : (
                    'Pubblica Cedolino'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <span className="text-[#E05353] font-extrabold">{cedolinoSelezionato.mese} {cedolinoSelezionato.anno}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Data/Ora (Timestamp):</span>
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