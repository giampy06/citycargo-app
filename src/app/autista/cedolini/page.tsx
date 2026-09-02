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
  ExternalLink,
  ShieldCheck,
  Check,
  PenTool,
  Eraser,
  X
} from 'lucide-react';

export default function CedoliniAutistaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mieiCedolini, setMieiCedolini] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stati per la modale e il salvataggio
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signatureModal, setSignatureModal] = useState<string | null>(null); // Contiene l'ID del cedolino da firmare

  // Riferimenti e stati per il Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      // 🔴 IMPORTANTE: Ora filtriamo per autista_id univoco (prima era autista_email)
      const { data, error } = await supabase
        .from('cedolini')
        .select('*')
        .eq('autista_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMieiCedolini(data);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  // --- LOGICA CANVAS FIRMA TOUCH ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // e.preventDefault(); // Rimosso per non bloccare lo scroll globale finché non disegna
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E242B';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault(); // Blocca lo scroll dello schermo mentre si firma
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveFirma = async () => {
    if (!canvasRef.current || !signatureModal) return;
    
    const canvas = canvasRef.current;
    // Crea l'immagine in Base64
    const base64Firma = canvas.toDataURL('image/png');

    setSigningId(signatureModal);
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('cedolini')
        .update({
          firmato: true,
          data_firma: timestamp,
          firma_url: base64Firma
        })
        .eq('id', signatureModal);

      if (error) throw error;

      // Aggiorna l'interfaccia locale
      setMieiCedolini(mieiCedolini.map(c => 
        c.id === signatureModal 
          ? { ...c, firmato: true, data_firma: timestamp, firma_url: base64Firma } 
          : c
      ));
      
      setSignatureModal(null);
      alert('Firma telematica registrata con successo!');
    } catch (err: any) {
      alert(`Errore salvataggio: ${err.message}`);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
        Caricamento buste paga...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista" 
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Le Mie Buste Paga</h1>
            <p className="text-[11px] text-gray-400 font-medium">Archivio Cedolini & Firma Digitale</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {mieiCedolini.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-600">Nessuna busta paga presente</p>
            <p className="text-[11px]">I tuoi cedolini mensili compariranno qui non appena elaborati dall'amministrazione.</p>
          </div>
        ) : (
          mieiCedolini.map((c) => (
            <div key={c.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                    ANNO {c.anno}
                  </span>
                  <h2 className="text-base font-black text-[#1E242B] mt-1.5">{c.mese_riferimento}</h2>
                </div>

                <div>
                  {c.firmato ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmata
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
                  href={c.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition border border-gray-200"
                >
                  <FileText className="w-4 h-4 text-slate-700" />
                  PDF
                </a>

                {!c.firmato && (
                  <button
                    type="button"
                    onClick={() => setSignatureModal(c.id)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <PenTool className="w-4 h-4" />
                    Firma Ricevuta
                  </button>
                )}
              </div>

              {c.firmato && c.data_firma && (
                <div className="text-[10px] text-gray-400 text-center font-medium bg-gray-50 rounded-xl py-2 mt-2 border border-gray-100">
                  Presa visione e firma telematica certificate il <br />
                  <strong className="text-gray-600">{new Date(c.data_firma).toLocaleString('it-IT')}</strong>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {/* MODALE PER FIRMARE SUL CANVAS */}
      {signatureModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg text-[#1E242B]">Apponi la tua firma</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Disegna all'interno del riquadro</p>
              </div>
              <button 
                onClick={() => setSignatureModal(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                La presente firma telematica costituisce ricevuta e presa visione del cedolino paga per le finalità di legge.
              </p>
            </div>

            {/* CONTENITORE CANVAS */}
            <div className="border-2 border-dashed border-emerald-500 bg-emerald-50/10 rounded-2xl overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[200px] touch-none cursor-crosshair bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={clearSignature}
                className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Eraser className="w-4 h-4" />
                Ridisegna
              </button>

              <button
                type="button"
                disabled={signingId === signatureModal}
                onClick={handleSaveFirma}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                {signingId === signatureModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...
                  </>
                ) : (
                  'Conferma e Firma'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}