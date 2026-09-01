'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  Truck, 
  Play, 
  CheckSquare, 
  Calendar, 
  FileText, 
  LogOut, 
  Clock, 
  Gauge, 
  ShieldCheck, 
  PlusCircle, 
  Loader2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function AutistaHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Turni di oggi
  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [turniOggi, setTurniOggi] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);
      fetchTurniOggi(session.user.id);
    }
    init();
  }, [router]);

  const fetchTurniOggi = async (userId: string) => {
    setLoading(true);
    try {
      // Inizio e fine giornata odierna in formato ISO
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const oggiISO = oggi.toISOString();

      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', userId)
        .gte('created_at', oggiISO)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const turni = data || [];
      setTurniOggi(turni);

      // Cerca se c'è un turno attualmente aperto (in corso)
      const aperto = turni.find((t) => t.stato === 'aperto');
      setTurnoAperto(aperto || null);
    } catch (err) {
      console.error('Errore recupero turni autista:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/autista/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento profilo autista...
      </div>
    );
  }

  const nomeAutista = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Autista';
  const haCompletatoAlmenoUnTurno = turniOggi.some((t) => t.stato === 'chiuso');
  const numeroTurnoProssimo = turniOggi.length + 1;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased pb-24">
      {/* Header Autista */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E05353] text-white flex items-center justify-center font-black text-xs shadow-sm">
              CC
            </div>
            <div>
              <h1 className="font-extrabold text-sm capitalize">{nomeAutista}</h1>
              <p className="text-[10px] text-gray-400 font-medium">Portale Operativo Conducenti</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-[#E05353] transition-colors"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {/* STATO OPERATIVO ATTUALE */}
        {turnoAperto ? (
          <div className="bg-[#1E242B] text-white rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🟡 Turno in Corso
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                {turnoAperto.codice_verbale}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400">Furgone Assegnato:</span>
              <h2 className="text-3xl font-black tracking-tight mt-0.5 text-white">
                {turnoAperto.targa_mezzo}
              </h2>
              <p className="text-xs text-emerald-400 mt-1">
                Appalto: <b>{turnoAperto.appalto}</b> | Partenza: <b>{Number(turnoAperto.km_inizio).toLocaleString('it-IT')} km</b>
              </p>
            </div>

            <Link
              href="/checkout"
              className="w-full py-4 bg-[#E05353] hover:bg-[#c94545] text-white rounded-2xl font-black text-xs tracking-wider uppercase shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition"
            >
              <CheckSquare className="w-4 h-4" />
              Fine Servizio (Check-out)
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 Pronto per il Servizio
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-[#1E242B] tracking-tight">
                {turniOggi.length === 0 ? 'Inizia la Giornata di Lavoro' : `Inizia Turno #${numeroTurnoProssimo} (Doppio Turno)`}
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {turniOggi.length === 0
                  ? 'Effettua il check-in iniziale con perizia fotografica a 4 lati del mezzo prima della partenza.'
                  : `Hai già completato ${turniOggi.length} turno oggi. Puoi avviare un secondo turno con lo stesso o un altro furgone.`}
              </p>
            </div>

            <Link
              href="/checkin"
              className={`w-full py-4 text-white rounded-2xl font-black text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition ${
                turniOggi.length === 0 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                  : 'bg-[#1E242B] hover:bg-black'
              }`}
            >
              {turniOggi.length === 0 ? (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Inizia 1° Turno (Check-in)
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  Inizia 2° Turno (Doppio Servizio)
                </>
              )}
            </Link>
          </div>
        )}

        {/* MENU RAPIDO SEZIONI AUTISTA (Calendario Presenze & Buste Paga) */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/autista/calendario"
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E05353] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#1E242B]">Calendario Presenze</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Storico turni e giri svolti</p>
            </div>
          </Link>

          <Link
            href="/autista/cedolini"
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#1E242B]">Buste Paga & Firma</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Ricevute cedolini mensili</p>
            </div>
          </Link>
        </div>

        {/* RIEPILOGO TURNI DI OGGI */}
        {turniOggi.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Turni Registrati Oggi ({turniOggi.length})
            </h3>

            <div className="space-y-2">
              {turniOggi.map((t, index) => (
                <div key={t.id} className="p-3 bg-[#F8F9FB] rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1E242B]">Turno #{turniOggi.length - index}</span>
                      <span className="font-bold text-gray-700">{t.targa_mezzo}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-[#E05353]">
                        {t.appalto}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{t.codice_verbale}</span>
                  </div>

                  <div className="text-right">
                    {t.stato === 'aperto' ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        In corso
                      </span>
                    ) : (
                      <span className="text-xs font-extrabold text-emerald-600">
                        +{t.km_percorsi || 0} km
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}