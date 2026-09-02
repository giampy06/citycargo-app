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
  Banknote,
  Download,
  ChevronRight,
  Euro
} from 'lucide-react';

export default function AppAutistaDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [autista, setAutista] = useState<any | null>(null);
  const [turnoAttivo, setTurnoAttivo] = useState<any | null>(null);
  const [mieiTurni, setMieiTurni] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [cedolini, setCedolini] = useState<any[]>([]);

  // Modale Firma Digitale (per circolari)
  const [docDaFirmare, setDocDaFirmare] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);

  // Calcolo Compenso (Es. 0.15€ al km)
  const TARIFFA_KM = 0.15;
  const kmTotali = mieiTurni.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);
  const compensoStimato = kmTotali * TARIFFA_KM;

  useEffect(() => {
    async function initAuthAndData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }

      const { data: autistaData } = await supabase
        .from('autisti')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setAutista(autistaData);

      const { data: turnoData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .eq('stato', 'aperto')
        .maybeSingle();

      setTurnoAttivo(turnoData);

      const { data: turniData } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', session.user.id)
        .order('created_at', { ascending: false });

      setMieiTurni(turniData || []);

      if (autistaData) {
        const { data: docData } = await supabase
          .from('documenti_aziendali')
          .select('*')
          .eq('autista_id', autistaData.id)
          .order('created_at', { ascending: false });

        setDocumenti(docData || []);

        try {
          const { data: cedoliniData } = await supabase
            .from('cedolini')
            .select('*')
            .eq('autista_id', autistaData.id)
            .order('created_at', { ascending: false });
          setCedolini(cedoliniData || []);
        } catch (err) {
          console.error("Errore recupero cedolini", err);
        }
      }

      setLoading(false);
    }
    initAuthAndData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/autista/login');
  };

  // Gestione Firma (Codice omesso per brevità, usa lo stesso che hai già)
  const startDrawing = (e: any) => { /* ... (Mantieni il tuo codice originale per la firma qui) ... */ };
  const draw = (e: any) => { /* ... (Mantieni il tuo codice originale per la firma qui) ... */ };
  const stopDrawing = () => { setIsDrawing(false); };
  const clearCanvas = () => { /* ... (Mantieni il tuo codice originale per la firma qui) ... */ };
  
  const salvaFirmaDigitale = async () => { /* ... (Mantieni il tuo codice originale per la firma qui) ... */ };

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
            {/* BOX COMPENSI MATURATI */}
            <div className="bg-[#1E242B] text-white rounded-3xl p-6 shadow-xl shadow-black/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compenso Maturato</span>
                <div className="text-2xl font-black mt-1">€ {compensoStimato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Euro className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {/* BOX 1: GESTIONE TURNO */}
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

            {/* WIDGET BUSTE PAGA (CLICCABILE) */}
            <button
              onClick={() => router.push('/autista/cedolini')}
              className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Banknote className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1E242B]">Buste Paga</h3>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{cedolini.length} cedolini archiviati</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
            </button>

            {/* WIDGET CIRCOLARI (CLICCABILE) */}
            <button
              onClick={() => router.push('/autista/documenti')}
              className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:border-amber-200 hover:shadow-md transition group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1E242B]">Circolari & Documenti</h3>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    {documenti.filter(d => !d.firmato).length} da firmare
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
            </button>
            
             {/* WIDGET STORICO (CLICCABILE) */}
             <button
              onClick={() => router.push('/autista/storico')}
              className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 hover:shadow-md transition group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#1E242B]">Storico Turni</h3>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{mieiTurni.length} presenze registrate</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>

          </>
        )}
      </main>
    </div>
  );
}