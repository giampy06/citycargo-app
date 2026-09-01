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
  ShieldAlert,
  TrendingUp, 
  PlusCircle, 
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function AutistaHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statoAutista, setStatoAutista] = useState<string>('attivo');

  // Turni di oggi
  const [turnoAperto, setTurnoAperto] = useState<any | null>(null);
  const [turniOggi, setTurniOggi] = useState<any[]>([]);

  // Statistiche mese corrente
  const [totaleMaturatoMese, setTotaleMaturatoMese] = useState<number>(0);
  const [giorniLavoratiMese, setGiorniLavoratiMese] = useState<number>(0);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      // Controllo stato approvazione admin
      const { data: autistaProfilo } = await supabase
        .from('autisti')
        .select('stato')
        .eq('email', session.user.email?.toLowerCase())
        .maybeSingle();

      if (autistaProfilo && autistaProfilo.stato === 'in_attesa') {
        setStatoAutista('in_attesa');
        setLoading(false);
        return;
      }

      if (autistaProfilo && autistaProfilo.stato === 'sospeso') {
        setStatoAutista('sospeso');
        setLoading(false);
        return;
      }

      await fetchDatiAutista(session.user.id);
    }
    init();
  }, [router]);

  const fetchDatiAutista = async (userId: string) => {
    setLoading(true);
    try {
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const oggiISO = oggi.toISOString();

      const { data: dataOggi } = await supabase
        .from('turni_presenze')
        .select('*')
        .eq('autista_id', userId)
        .gte('created_at', oggiISO)
        .order('created_at', { ascending: false });

      const turniOggiList = dataOggi || [];
      setTurniOggi(turniOggiList);
      setTurnoAperto(turniOggiList.find((t) => t.stato === 'aperto') || null);

      const primoDelMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString();

      const { data: dataMese } = await supabase
        .from('turni_presenze')
        .select('created_at, compenso_giornaliero')
        .eq('autista_id', userId)
        .gte('created_at', primoDelMese);

      if (dataMese) {
        const mat = dataMese.reduce((acc, curr) => acc + (Number(curr.compenso_giornaliero) || 0), 0);
        setTotaleMaturatoMese(mat);

        const distGiorni = new Set(dataMese.map(t => new Date(t.created_at).toDateString())).size;
        setGiorniLavoratiMese(distGiorni);
      }
    } catch (err) {
      console.error('Errore recupero dati autista:', err);
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
        Verifica autorizzazioni...
      </div>
    );
  }

  // SCHERMATA BLOCCO: SE L'AUTISTA NON È ANCORA STATO APPROVATO DALL'ADMIN
  if (statoAutista === 'in_attesa') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1E242B]">Account in Attesa di Approvazione</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            La tua registrazione e le foto dei documenti sono state ricevute correttamente.
            <br /><br />
            L'amministrazione di <b>City Cargo</b> deve convalidare i tuoi dati prima di abilitarti ai turni e alla guida dei mezzi.
          </p>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
            >
              Esci dall'Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (statoAutista === 'sospeso') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1E242B]">Profilo Sospeso</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Il tuo profilo conducente risulta momentaneamente disattivato. Contatta l'ufficio traffico di City Cargo.
          </p>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
            >
              Esci dall'Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nomeAutista = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Autista';
  const numeroTurnoProssimo = turniOggi.length + 1;
  const nomeMeseCorrente = new Date().toLocaleDateString('it-IT', { month: 'long' });

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
        {/* Maturato Mese */}
        <div className="bg-gradient-to-br from-[#1E242B] to-[#2C353F] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider capitalize">
              Maturato di {nomeMeseCorrente}
            </span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              € {totaleMaturatoMese.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-400 font-medium">lordo stimato</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
            <span>Giornate Lavorate: <b className="text-white">{giorniLavoratiMese} gg</b></span>
            <Link 
              href="/autista/calendario" 
              className="text-[11px] text-rose-300 hover:text-white font-bold flex items-center gap-0.5"
            >
              Vedi dettaglio <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Turno Attuale */}
        {turnoAperto ? (
          <div className="bg-white text-[#1E242B] border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Turno in Corso
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                {turnoAperto.codice_verbale}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400">Furgone Assegnato:</span>
              <h2 className="text-3xl font-black tracking-tight mt-0.5 text-[#1E242B]">
                {turnoAperto.targa_mezzo}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Appalto: <b className="text-[#1E242B]">{turnoAperto.appalto}</b> | Partenza: <b>{Number(turnoAperto.km_inizio).toLocaleString('it-IT')} km</b>
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
                  : `Hai già completato ${turniOggi.length} turno oggi. Puoi avviare un secondo turno con lo stesso o un altro mezzo.`}
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

        {/* Menu Rapido */}
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
              <p className="text-[10px] text-gray-400 mt-0.5">Storico turni e compensi</p>
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
      </main>
    </div>
  );
}