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
  Clock
} from 'lucide-react';

export default function AutistaCedoliniPage() {
  const router = useRouter();
  const [cedolini, setCedolini] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  const fetchCedolini = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buste_paga')
        .select('*')
        .order('anno', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCedolini(data || []);
    } catch (err: any) {
      console.error('Errore recupero buste paga:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCedolini();
  }, []);

  const handleFirmaAutista = async (id: string, mese: string, anno: number) => {
    const conferma = window.confirm(`Confermi di aver preso visione e ricevuto la busta paga di ${mese} ${anno}?`);
    if (!conferma) return;

    setSigningId(id);
    const codiceRicevuta = `RIC-${anno}${mese.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dataFirma = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('buste_paga')
        .update({
          firmato: true,
          data_firma: dataFirma,
          codice_ricevuta: codiceRicevuta,
        })
        .eq('id', id);

      if (error) throw error;

      alert(`Ricevuta telematica registrata con successo!\nProtocollo: ${codiceRicevuta}`);
      fetchCedolini();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setSigningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased font-sans">
      {/* Header Autista - Tasto Indietro a /autista */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            type="button"
            onClick={() => router.push('/autista')}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">I Miei Cedolini</h1>
            <p className="text-[11px] text-gray-400 font-medium">Buste Paga & Ricevute</p>
          </div>
          <button 
            onClick={fetchCedolini}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Banner Informativo */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
            Scarica il documento in PDF e tocca <strong>"Firma per Ricevuta"</strong> per attestare la consegna.
          </p>
        </div>

        {/* Lista Cedolini */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              Caricamento cedolini...
            </div>
          ) : cedolini.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center text-xs text-gray-400">
              Nessun cedolino presente al momento.
            </div>
          ) : (
            cedolini.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      item.firmato ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-[#E05353]'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1E242B]">
                        Busta Paga {item.mese} {item.anno}
                      </h3>
                      <p className="text-[11px] text-gray-400">{item.autista_nome}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    item.firmato ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.firmato ? '🟢 Ricevuta' : '⚠️ Da Firmare'}
                  </span>
                </div>

                {item.codice_ricevuta && (
                  <div className="text-[11px] bg-[#F8F9FB] p-2.5 rounded-xl font-mono text-gray-500">
                    Protocollo: <strong className="text-emerald-700">{item.codice_ricevuta}</strong>
                  </div>
                )}

                {/* Pulsanti Autista */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {item.file_url && item.file_url !== '#' ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-[#1E242B] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-gray-100"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-600" />
                      Scarica PDF
                    </a>
                  ) : (
                    <button
                      disabled
                      className="py-2.5 px-3 bg-gray-50 text-gray-300 rounded-xl font-bold text-xs"
                    >
                      PDF N/D
                    </button>
                  )}

                  {item.firmato ? (
                    <div className="py-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Firmato
                    </div>
                  ) : (
                    <button
                      disabled={signingId === item.id}
                      onClick={() => handleFirmaAutista(item.id, item.mese, item.anno)}
                      className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      {signingId === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Invio...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Firma Ricevuta
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}