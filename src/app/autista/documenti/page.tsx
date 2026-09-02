'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  FileText, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  FileSignature, 
  ShieldCheck,
  X,
  Eraser
} from 'lucide-react';

export default function DocumentiAutistaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documenti, setDocumenti] = useState<any[]>([]);

  // Modale Firma
  const [docDaFirmare, setDocDaFirmare] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }

      const { data: autistaData } = await supabase
        .from('autisti')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (autistaData) {
        const { data: docData } = await supabase
          .from('documenti_aziendali')
          .select('*')
          .eq('autista_id', autistaData.id)
          .order('created_at', { ascending: false });

        setDocumenti(docData || []);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  // Gestione Canvas Firma
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1E242B';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const salvaFirmaDigitale = async () => {
    if (!docDaFirmare || !canvasRef.current) return;
    setSigning(true);

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');

      const { error } = await supabase
        .from('documenti_aziendali')
        .update({
          firmato: true,
          data_firma: new Date().toISOString(),
          firma_url: dataUrl
        })
        .eq('id', docDaFirmare.id);

      if (error) throw error;

      setDocumenti(documenti.map(d => d.id === docDaFirmare.id ? { ...d, firmato: true } : d));
      alert('Documento firmato digitalmente con successo!');
      setDocDaFirmare(null);
    } catch (err: any) {
      alert(`Errore salvataggio firma: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento circolari...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 font-sans antialiased">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista" 
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Circolari & Documenti</h1>
            <p className="text-[11px] text-gray-400 font-medium">Disposizioni di servizio</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {documenti.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-600">Nessuna circolare presente</p>
            <p className="text-[11px]">I documenti inviati dall'amministrazione compariranno qui.</p>
          </div>
        ) : (
          documenti.map((doc) => (
            <div key={doc.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#1E242B]">{doc.titolo}</h2>
                  <p className="text-xs text-gray-500 mt-1">{doc.descrizione || 'Prendi visione e firma'}</p>
                </div>
                <div>
                  {doc.firmato ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmato
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] flex items-center gap-1 border border-amber-200">
                      <Clock className="w-3 h-3" /> Da Firmare
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition border border-gray-200"
                >
                  <FileText className="w-4 h-4 text-slate-700" />
                  Leggi PDF
                </a>

                {!doc.firmato && (
                  <button
                    type="button"
                    onClick={() => setDocDaFirmare(doc)}
                    className="flex-1 py-3 bg-[#E05353] hover:bg-[#c94545] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <FileSignature className="w-4 h-4" />
                    Firma Documento
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* MODALE FIRMA */}
      {docDaFirmare && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1E242B]">Firma Documento</h3>
                <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{docDaFirmare.titolo}</p>
              </div>
              <button onClick={() => setDocDaFirmare(null)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="w-full bg-white cursor-crosshair"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold underline flex items-center gap-1"
                >
                  <Eraser className="w-3.5 h-3.5" /> Pulisci firma
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={salvaFirmaDigitale}
              disabled={signing}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
            >
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Conferma e Firma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}