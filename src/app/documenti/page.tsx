'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  ChevronLeft, 
  FileSignature, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Download, 
  Search, 
  X, 
  Loader2,
  FileText,
  ShieldCheck
} from 'lucide-react';

export default function RegistroFirmePage() {
  const router = useRouter();
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modale per visualizzare la firma
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const fetchDati = async () => {
    setLoading(true);
    try {
      // Recuperiamo i documenti e gli autisti in parallelo
      const [resDocs, resAutisti] = await Promise.all([
        supabase.from('documenti_aziendali').select('*').order('created_at', { ascending: false }),
        supabase.from('autisti').select('id, nome, cognome')
      ]);

      if (resDocs.error) throw resDocs.error;
      if (resAutisti.error) throw resAutisti.error;

      // Uniamo i dati per avere il nome dell'autista direttamente nella lista
      const docsConNome = (resDocs.data || []).map(doc => {
        const autista = resAutisti.data?.find(a => a.id === doc.autista_id);
        return {
          ...doc,
          nome_autista: autista ? `${autista.cognome} ${autista.nome}` : 'Autista Sconosciuto / Eliminato'
        };
      });

      setDocumenti(docsConNome);
    } catch (error) {
      console.error('Errore nel caricamento del registro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, []);

  // Filtro di ricerca per nome autista o titolo documento
  const documentiFiltrati = documenti.filter(doc => 
    doc.titolo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.nome_autista?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased">
      {/* Header Admin */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
              Registro Circolari e Firme <ShieldCheck className="w-4 h-4 text-[#E05353]" />
            </h1>
            <p className="text-[11px] text-gray-400 font-medium">Controllo legale delle prese visioni aziendali</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Barra di ricerca */}
        <div className="bg-white rounded-2xl p-2.5 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cerca per autista o titolo documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs font-semibold focus:outline-none focus:ring-0 text-[#1E242B] placeholder-gray-400"
          />
        </div>

        {/* Tabella / Lista Documenti */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/50">
                <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <th className="px-5 py-4">Documento</th>
                  <th className="px-5 py-4">Autista Assegnato</th>
                  <th className="px-5 py-4">Data Invio</th>
                  <th className="px-5 py-4">Stato Firma</th>
                  <th className="px-5 py-4 text-right">Azioni Legali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#E05353]" />
                      Sincronizzazione registro...
                    </td>
                  </tr>
                ) : documentiFiltrati.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Nessun documento trovato.
                    </td>
                  </tr>
                ) : (
                  documentiFiltrati.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${doc.firmato ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1E242B]">{doc.titolo}</p>
                            <p className="text-[10px] text-gray-400 max-w-[200px] truncate">{doc.descrizione}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-4">
                        <span className="font-bold uppercase bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-[10px]">
                          {doc.nome_autista}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[11px] text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('it-IT')}
                      </td>

                      <td className="px-5 py-4">
                        {doc.firmato ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full font-bold text-[10px] w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Firmato
                            </span>
                            <span className="text-[9px] text-gray-400 ml-1">
                              il {new Date(doc.data_firma).toLocaleString('it-IT')}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-bold text-[10px] w-fit">
                            <Clock className="w-3.5 h-3.5" /> In attesa
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.file_url && (
                            <a 
                              href={doc.file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                              title="Scarica File Originale"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          
                          {doc.firmato && doc.firma_url && (
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              className="px-3 py-1.5 bg-[#1E242B] hover:bg-black text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> Vedi Firma
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODALE VISUALIZZAZIONE FIRMA */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1E242B]">Certificato di Firma</h3>
                <p className="text-[10px] text-gray-400 font-medium">Validità telematica</p>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)} 
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500 font-bold">Documento:</span>
                  <span className="text-[#1E242B] font-extrabold text-right">{selectedDoc.titolo}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500 font-bold">Firmato da:</span>
                  <span className="text-[#E05353] font-extrabold uppercase">{selectedDoc.nome_autista}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Data/Ora (Timestamp):</span>
                  <span className="text-[#1E242B] font-mono font-bold text-[10px]">
                    {new Date(selectedDoc.data_firma).toLocaleString('it-IT')}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Tratto Grafico (Canvas)</span>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-white flex items-center justify-center h-32 overflow-hidden shadow-inner">
                  <img 
                    src={selectedDoc.firma_url} 
                    alt="Firma autista" 
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDoc(null)}
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