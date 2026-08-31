'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { 
  Truck, 
  ChevronLeft, 
  Camera, 
  PenTool, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShieldAlert
} from 'lucide-react';

export default function CheckinPage() {
  const router = useRouter();

  const [appalto, setAppalto] = useState<'CITI' | 'EDF' | 'RHENUS'>('CITI');
  const [targa, setTarga] = useState('');
  const [kmInizio, setKmInizio] = useState('');
  const [noteIniziali, setNoteIniziali] = useState('');
  const [loading, setLoading] = useState(false);
  const [giaRegistratoOggi, setGiaRegistratoOggi] = useState(false);
  const [checkingToday, setCheckingToday] = useState(true);

  // Canvas Firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Verifica se esiste già un turno creato oggi
  useEffect(() => {
    async function checkTodayShift() {
      setCheckingToday(true);
      const oggiInizio = new Date();
      oggiInizio.setHours(0, 0, 0, 0);

      try {
        const { data, error } = await supabase
          .from('turni_presenze')
          .select('id, created_at, stato')
          .gte('created_at', oggiInizio.toISOString())
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setGiaRegistratoOggi(true);
        }
      } catch (err) {
        console.error('Errore verifica turno odierno:', err);
      } finally {
        setCheckingToday(false);
      }
    }

    checkTodayShift();
  }, []);

  // Gestione Canvas Firma
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E242B';
    ctx.lineTo(x, y);
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
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (giaRegistratoOggi) {
      alert('Hai già effettuato un Check-in per la giornata di oggi. È consentito un solo turno al giorno.');
      return;
    }

    if (!targa.trim()) {
      alert('Inserisci la targa o matricola del mezzo.');
      return;
    }

    if (!kmInizio || Number(kmInizio) <= 0) {
      alert('Inserisci un chilometraggio iniziale valido.');
      return;
    }

    setLoading(true);

    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : null;
      const codiceVerbale = `CHK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await supabase
        .from('turni_presenze')
        .insert([
          {
            codice_verbale: codiceVerbale,
            appalto,
            targa_mezzo: targa.trim().toUpperCase(),
            km_inizio: Number(kmInizio),
            note_inizio: noteIniziali || null,
            firma_autista_url: signatureDataUrl,
            stato: 'aperto',
          },
        ]);

      if (error) throw error;

      alert(`Check-in registrato con successo!\nCodice Verbale: ${codiceVerbale}`);
      router.push('/autista');
    } catch (err: any) {
      console.error('Errore salvataggio check-in:', err);
      alert(`Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button 
            type="button"
            onClick={() => router.push('/autista')}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Inizio Turno (Check-in)</h1>
            <p className="text-[11px] text-gray-400 font-medium">Presa in Carico Mezzo</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4">
        {checkingToday ? (
          <div className="bg-white rounded-3xl p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#E05353]" />
            Verifica disponibilità turno...
          </div>
        ) : giaRegistratoOggi ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-base text-amber-900">Check-in Già Effettuato Oggi</h2>
            <p className="text-xs text-amber-700 leading-relaxed max-w-sm mx-auto">
              È consentito registrare un solo turno al giorno per autista. Se hai commesso un errore o devi modificare il mezzo o i km, puoi farlo direttamente dalla tua schermata iniziale.
            </p>
            <button
              onClick={() => router.push('/autista')}
              className="mt-2 py-3 px-6 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              Torna alla Home Autista
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Appalto */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                1. Committente di Oggi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CITI', 'EDF', 'RHENUS'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAppalto(item)}
                    className={`py-3 rounded-2xl font-black text-xs transition-all border ${
                      appalto === item
                        ? item === 'CITI' ? 'bg-[#E05353] text-white border-[#E05353] shadow-sm' :
                          item === 'EDF' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' :
                          'bg-teal-700 text-white border-teal-700 shadow-sm'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Mezzo e KM */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                2. Dati Mezzo & Chilometri
              </label>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Targa o Matricola Mezzo</label>
                <input
                  type="text"
                  required
                  placeholder="es. FY123AB"
                  value={targa}
                  onChange={(e) => setTarga(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Km Iniziali Quadro Strumenti</label>
                <input
                  type="number"
                  required
                  placeholder="es. 124500"
                  value={kmInizio}
                  onChange={(e) => setKmInizio(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                />
              </div>
            </div>

            {/* 3. Firma Digitale */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  3. Firma Presa in Carico
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] font-bold text-gray-400 hover:text-[#E05353] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Pulisci
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-[#F8F9FB]">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#E05353] hover:bg-[#c94545] disabled:bg-gray-300 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrazione in corso...
                </>
              ) : (
                'Conferma Presa in Carico & Inizia Turno'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}