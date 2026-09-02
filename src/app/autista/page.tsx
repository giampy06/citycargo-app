'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  LogOut, 
  Play, 
  Square, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  Loader2, 
  FileSignature, 
  ShieldCheck,
  X,
  Gauge
} from 'lucide-react';

export default function AppAutistaDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [autista, setAutista] = useState<any | null>(null);
  const [turnoAttivo, setTurnoAttivo] = useState<any | null>(null);
  const [mieiTurni, setMieiTurni] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);

  // Modale Firma Digitale
  const [docDaFirmare, setDocDaFirmare] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function initAuthAndData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }

      // Recupera profilo autista
      const { data: autistaData } = await supabase
        .from('autisti')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      setAutista(autistaData);

      // Recupera turno attivo se esiste
      const { data: turnoData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .eq('stato', 'aperto')
        .maybeSingle();

      setTurnoAttivo(turnoData);

      // Recupera storico turni dell'autista
      const { data: turniData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .order('created_at', { ascending: false });

      setMieiTurni(turniData || []);

      // Recupera documenti aziendali inviati all'autista
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
    initAuthAndData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/autista/login');
  };

  // Gestione Firma su Canvas
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
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

  const stopDrawing = () => {
    setIsDrawing(false);
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
        Caricamento portale autista...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 font-sans antialiased">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Portale Conducente</span>
          <h1 className="font-extrabold text-sm">{autista?.nome} {autista?.cognome}</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">
        {autista?.stato !== 'attivo' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-3">
            <Clock className="w-8 h-8 text-amber-600 mx-auto animate-pulse" />
            <h2 className="font-black text-base text-amber-900">Account in Attesa di Approvazione</h2>
            <p className="text-xs text-amber-700">
              Il tuo account è in fase di verifica da parte dell'amministrazione. Potrai iniziare i turni e firmare i documenti non appena verrai approvato.
            </p>
          </div>
        ) : (
          <>
            {/* Box Gestione Turno */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    ● Account Attivo
                  </span>
                  <h2 className="font-black text-base mt-2">Gestione Turno</h2>
                </div>
              </div>

              {turnoAttivo ? (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-bold">Turno in Corso:</span>
                    <span className="font-mono font-bold text-emerald-900">{turnoAttivo.targa_mezzo}</span>
                  </div>
                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" /> Termina Turno (Check-out)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/checkin')}
                  className="w-full py-4 bg-[#E05353] hover:bg-[#c94545] text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Inizia Nuovo Turno (Check-in)
                </button>
              )}
            </div>

            {/* SEZIONE DOCUMENTI & CIRCOLARI DA FIRMARE */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E05353]" /> Circolari & Documenti
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {documenti.filter(d => !d.firmato).length} da firmare
                </span>
              </div>

              {documenti.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  Nessun documento o circolare ricevuta al momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {documenti.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <h4 className="font-extrabold text-xs text-[#1E242B] truncate">{doc.titolo}</h4>
                        <p className="text-[11px] text-gray-500 truncate">{doc.descrizione || 'Prendi visione e firma'}</p>
                        <span className="text-[9px] text-gray-400 block">
                          {new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        {doc.firmato ? (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-xl flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Firmato
                          </span>
                        ) : (
                          <button
                            onClick={() => setDocDaFirmare(doc)}
                            className="px-3.5 py-2 bg-[#E05353] hover:bg-[#c94545] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1"
                          >
                            <FileSignature className="w-3.5 h-3.5" /> Firma
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STORICO TURNI & PRESENZE */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-600" /> Storico Turni Effettuati
                </h3>
                <span className="text-xs text-gray-400 font-bold">{mieiTurni.length} turni</span>
              </div>

              {mieiTurni.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Non hai ancora registrato alcun turno.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mieiTurni.map((t) => (
                    <div key={t.id} className="p-3.5 bg-[#F8F9FB] rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#1E242B]">{t.targa_mezzo}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            t.stato === 'chiuso' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {t.stato}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(t.created_at).toLocaleDateString('it-IT')} • {t.appalto || 'CITI'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-[#E05353]">{t.km_percorsi ? `${t.km_percorsi} km` : 'In corso'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODALE FIRMA DIGITALE TOUCH */}
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
              <a
                href={docDaFirmare.file_url}
                target="_blank"
                rel="noreferrer"
                className="block p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-center text-xs font-bold text-[#E05353] transition"
              >
                Apri e Leggi il Documento Originale 📄
              </a>

              <p className="text-[11px] text-gray-500 font-medium">
                Apponi la tua firma nel riquadro sottostante:
              </p>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full bg-white cursor-crosshair"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold underline"
                >
                  Cancella firma
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
              Conferma e Firma Digitalmente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}