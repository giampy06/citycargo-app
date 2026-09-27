'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/supabase';
import NotificationsBell from '@/components/NotificationsBell';
import {
  RefreshCw,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Users,
  FileSignature,
  Loader2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  UserCheck,
  Gauge,
} from 'lucide-react';

const GIORNI_ROSSO = 15;
const GIORNI_GIALLO = 30;
const ORE_ANOMALIA_TURNO_APERTO = 14;

function giorniDaOggi(dataStr: string | null): number | null {
  if (!dataStr) return null;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const data = new Date(dataStr);
  data.setHours(0, 0, 0, 0);
  return Math.round((data.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
}

function coloreScadenza(giorni: number | null) {
  if (giorni === null) return null;
  if (giorni < GIORNI_ROSSO) return 'rosso';
  if (giorni < GIORNI_GIALLO) return 'giallo';
  return null; // verde: non mostrato, non è "in arrivo"
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [autisti, setAutisti] = useState<any[]>([]);
  const [turni, setTurni] = useState<any[]>([]);
  const [spese, setSpese] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [cedolini, setCedolini] = useState<any[]>([]);

  const fetchDati = async () => {
    setLoading(true);
    try {
      const [vRes, aRes, tRes, sRes, dRes, cRes] = await Promise.all([
        supabase.from('veicoli').select('id, targa, stato, data_scadenza_assicurazione, data_scadenza_revisione, km_attuali, km_prossimo_tagliando'),
        supabase.from('autisti').select('id, nome, cognome, stato, scadenza_patente, scadenza_cqc, scadenza_visita_medica, scadenza_corso_sicurezza'),
        supabase.from('turni_presenze').select('id, autista_id, nome_autista, targa_mezzo, stato, created_at, km_percorsi, compenso_giornaliero'),
        supabase.from('vehicle_expenses').select('importo, data_spesa'),
        supabase.from('documenti_aziendali').select('id, titolo, firmato, richiede_firma'),
        supabase.from('cedolini').select('id, mese_riferimento, firmato, autista_nome'),
      ]);

      setVeicoli(vRes.data || []);
      setAutisti(aRes.data || []);
      setTurni(tRes.data || []);
      setSpese(sRes.data || []);
      setDocumenti(dRes.data || []);
      setCedolini(cRes.data || []);
    } catch (err) {
      console.error('Errore recupero dati dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, []);

  // 1. Stato flotta in tempo reale
  const statoFlotta = useMemo(() => {
    const conteggio = { disponibile: 0, in_servizio: 0, manutenzione: 0 };
    veicoli.forEach((v) => {
      if (v.stato in conteggio) conteggio[v.stato as keyof typeof conteggio]++;
    });
    return conteggio;
  }, [veicoli]);

  // 2. Scadenze in arrivo (semaforo) — veicoli + autisti
  const scadenzeInArrivo = useMemo(() => {
    const lista: { label: string; dettaglio: string; giorni: number; colore: string }[] = [];

    veicoli.forEach((v) => {
      const gAssicurazione = giorniDaOggi(v.data_scadenza_assicurazione);
      const cAssicurazione = coloreScadenza(gAssicurazione);
      if (cAssicurazione && gAssicurazione !== null) {
        lista.push({ label: v.targa, dettaglio: 'Assicurazione', giorni: gAssicurazione, colore: cAssicurazione });
      }
      const gRevisione = giorniDaOggi(v.data_scadenza_revisione);
      const cRevisione = coloreScadenza(gRevisione);
      if (cRevisione && gRevisione !== null) {
        lista.push({ label: v.targa, dettaglio: 'Revisione', giorni: gRevisione, colore: cRevisione });
      }
      if (v.km_prossimo_tagliando !== null && v.km_prossimo_tagliando !== undefined) {
        const kmRimanenti = Number(v.km_prossimo_tagliando) - Number(v.km_attuali);
        if (kmRimanenti < 1000) {
          lista.push({ label: v.targa, dettaglio: `Tagliando (${Math.max(kmRimanenti, 0).toLocaleString('it-IT')} km)`, giorni: kmRimanenti < 0 ? -1 : 0, colore: kmRimanenti < 0 ? 'rosso' : 'giallo' });
        }
      }
    });

    autisti.forEach((a) => {
      const nomeCompleto = `${a.nome} ${a.cognome}`;
      const scadenzeAutista: [string, string][] = [
        [a.scadenza_patente, 'Patente'],
        [a.scadenza_cqc, 'CQC'],
        [a.scadenza_visita_medica, 'Visita medica'],
        [a.scadenza_corso_sicurezza, 'Corso sicurezza'],
      ];
      scadenzeAutista.forEach(([data, tipo]) => {
        const g = giorniDaOggi(data);
        const colore = coloreScadenza(g);
        if (colore && g !== null) {
          lista.push({ label: nomeCompleto, dettaglio: tipo, giorni: g, colore });
        }
      });
    });

    return lista.sort((a, b) => a.giorni - b.giorni);
  }, [veicoli, autisti]);

  // 3. Turni aperti ora
  const turniAperti = useMemo(() => turni.filter((t) => t.stato === 'aperto'), [turni]);

  // 4. Documenti/cedolini da firmare
  const documentiDaFirmare = useMemo(
    () => documenti.filter((d) => d.richiede_firma && !d.firmato),
    [documenti]
  );
  const cedoliniDaFirmare = useMemo(() => cedolini.filter((c) => !c.firmato), [cedolini]);

  // 5. Trend spese e km (mese corrente vs precedente)
  const trend = useMemo(() => {
    const oggi = new Date();
    const meseCorrente = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}`;
    const mesePrecedenteDate = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
    const mesePrecedente = `${mesePrecedenteDate.getFullYear()}-${String(mesePrecedenteDate.getMonth() + 1).padStart(2, '0')}`;

    const speseCorrente = spese.filter((s) => s.data_spesa?.slice(0, 7) === meseCorrente).reduce((acc, s) => acc + Number(s.importo || 0), 0);
    const spesePrecedente = spese.filter((s) => s.data_spesa?.slice(0, 7) === mesePrecedente).reduce((acc, s) => acc + Number(s.importo || 0), 0);

    const kmCorrente = turni.filter((t) => t.created_at?.slice(0, 7) === meseCorrente).reduce((acc, t) => acc + Number(t.km_percorsi || 0), 0);
    const kmPrecedente = turni.filter((t) => t.created_at?.slice(0, 7) === mesePrecedente).reduce((acc, t) => acc + Number(t.km_percorsi || 0), 0);

    return { speseCorrente, spesePrecedente, kmCorrente, kmPrecedente };
  }, [spese, turni]);

  // 6. Autisti in attesa di approvazione
  const autistiInAttesa = useMemo(() => autisti.filter((a) => a.stato === 'in_attesa'), [autisti]);

  // 7. Anomalie: turni aperti da troppe ore
  const turniAnomali = useMemo(() => {
    const sogliaMs = ORE_ANOMALIA_TURNO_APERTO * 60 * 60 * 1000;
    const ora = Date.now();
    return turniAperti.filter((t) => ora - new Date(t.created_at).getTime() > sogliaMs);
  }, [turniAperti]);

  const variazionePct = (attuale: number, precedente: number) => {
    if (precedente === 0) return attuale > 0 ? 100 : 0;
    return Math.round(((attuale - precedente) / precedente) * 100);
  };

  const saluto = useMemo(() => {
    const ora = new Date().getHours();
    if (ora < 6) return 'Buonanotte';
    if (ora < 13) return 'Buongiorno';
    if (ora < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  const dataOggiFormattata = useMemo(
    () =>
      new Date().toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).replace(/^./, (c) => c.toUpperCase()),
    []
  );

  const numeroCriticita =
    scadenzeInArrivo.length + turniAnomali.length + autistiInAttesa.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Caricamento Control Room...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center shadow-sm flex-shrink-0">
              <img src="/logo.png" alt="City Cargo Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">CONTROL ROOM</span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Vista d'insieme flotta e operazioni</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <Link
              href="/autista"
              className="h-9 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E05353] font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-100"
            >
              <Smartphone className="w-3.5 h-3.5" /> App Autista
            </Link>
            <button
              onClick={fetchDati}
              title="Aggiorna Dati"
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Saluto + riepilogo criticità */}
        <div className="bg-[#1E242B] rounded-3xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">{saluto}</p>
            <h1 className="text-xl sm:text-2xl font-black mt-1">{dataOggiFormattata}</h1>
          </div>
          {numeroCriticita === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-300 px-4 py-2.5 rounded-2xl text-sm font-bold self-start sm:self-auto">
              ✅ Tutto sotto controllo
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#E05353]/15 text-[#ff8a8a] px-4 py-2.5 rounded-2xl text-sm font-bold self-start sm:self-auto">
              <AlertTriangle className="w-4 h-4" />
              {numeroCriticita} {numeroCriticita === 1 ? 'punto richiede attenzione' : 'punti richiedono attenzione'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* 1. Stato flotta in tempo reale */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gray-100 rounded-xl"><Truck className="w-4 h-4 text-[#1E242B]" /></div>
              <h2 className="text-sm font-extrabold">Stato Flotta</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-2xl py-3">
                <div className="text-xl font-black text-emerald-700">{statoFlotta.disponibile}</div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Disponibili</div>
              </div>
              <div className="bg-amber-50 rounded-2xl py-3">
                <div className="text-xl font-black text-amber-700">{statoFlotta.in_servizio}</div>
                <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">In Servizio</div>
              </div>
              <div className="bg-rose-50 rounded-2xl py-3">
                <div className="text-xl font-black text-[#E05353]">{statoFlotta.manutenzione}</div>
                <div className="text-[10px] font-bold text-[#E05353] uppercase mt-0.5">Manutenzione</div>
              </div>
            </div>
            <Link href="/flotta" className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1">
              Vai a Flotta <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* 2. Scadenze in arrivo */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 rounded-xl"><ShieldAlert className="w-4 h-4 text-[#E05353]" /></div>
              <h2 className="text-sm font-extrabold">Scadenze in Arrivo</h2>
            </div>
            {scadenzeInArrivo.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nessuna scadenza critica nei prossimi {GIORNI_GIALLO} giorni.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {scadenzeInArrivo.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#F8F9FB]">
                    <span className="font-bold text-gray-700 capitalize">{s.label} <span className="text-gray-400 font-medium">— {s.dettaglio}</span></span>
                    <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${s.colore === 'rosso' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.giorni < 0 ? 'SCADUTO' : s.giorni === 0 ? 'oggi' : `${s.giorni}gg`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Turni aperti ora */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 rounded-xl"><Gauge className="w-4 h-4 text-amber-600" /></div>
              <h2 className="text-sm font-extrabold">In Giro Adesso</h2>
            </div>
            <div className="text-2xl font-black">{turniAperti.length} <span className="text-xs font-normal text-gray-400">turni aperti</span></div>
            {turniAperti.length === 0 ? (
              <p className="text-xs text-gray-400">Nessun autista attualmente in servizio.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {turniAperti.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#F8F9FB]">
                    <span className="font-bold text-gray-700 capitalize">{t.nome_autista || 'Autista'}</span>
                    <span className="font-mono text-gray-500">{t.targa_mezzo}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/presenze" className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1">
              Vai a Presenze <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* 4. Documenti/cedolini da firmare */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 rounded-xl"><FileSignature className="w-4 h-4 text-slate-700" /></div>
              <h2 className="text-sm font-extrabold">Firme in Attesa</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#F8F9FB] rounded-2xl py-3">
                <div className="text-xl font-black text-[#1E242B]">{documentiDaFirmare.length}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Documenti</div>
              </div>
              <div className="bg-[#F8F9FB] rounded-2xl py-3">
                <div className="text-xl font-black text-[#1E242B]">{cedoliniDaFirmare.length}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Cedolini</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/documenti" className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1">
                Documenti <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/cedolini" className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1">
                Cedolini <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* 5. Trend spese e km */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-xl"><ArrowUpRight className="w-4 h-4 text-emerald-600" /></div>
              <h2 className="text-sm font-extrabold">Trend Mese Corrente</h2>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Spese flotta</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black">€ {trend.speseCorrente.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend.speseCorrente > trend.spesePrecedente ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {trend.speseCorrente > trend.spesePrecedente ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(variazionePct(trend.speseCorrente, trend.spesePrecedente))}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Km percorsi</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black">{trend.kmCorrente.toLocaleString('it-IT')} km</span>
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend.kmCorrente >= trend.kmPrecedente ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {trend.kmCorrente >= trend.kmPrecedente ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(variazionePct(trend.kmCorrente, trend.kmPrecedente))}%
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Rispetto al mese precedente</p>
            </div>
          </section>

          {/* 6. Autisti in attesa di approvazione */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 rounded-xl"><UserCheck className="w-4 h-4 text-blue-600" /></div>
              <h2 className="text-sm font-extrabold">Nuovi Autisti</h2>
            </div>
            <div className="text-2xl font-black">{autistiInAttesa.length} <span className="text-xs font-normal text-gray-400">in attesa</span></div>
            {autistiInAttesa.length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna candidatura da approvare.</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {autistiInAttesa.map((a) => (
                  <div key={a.id} className="text-xs font-bold text-gray-700 py-1 px-2.5 rounded-xl bg-[#F8F9FB]">
                    {a.nome} {a.cognome}
                  </div>
                ))}
              </div>
            )}
            <Link href="/autisti" className="text-xs font-bold text-[#E05353] hover:underline flex items-center gap-1">
              Vai ad Autisti <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* 7. Anomalie: turni aperti da troppo tempo */}
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 rounded-xl"><AlertTriangle className="w-4 h-4 text-[#E05353]" /></div>
              <h2 className="text-sm font-extrabold">Anomalie</h2>
            </div>
            {turniAnomali.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Nessun turno aperto da più di {ORE_ANOMALIA_TURNO_APERTO} ore.</p>
            ) : (
              <div className="space-y-1.5">
                {turniAnomali.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-rose-50">
                    <span className="font-bold text-rose-700 capitalize flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {t.nome_autista || 'Autista'} — {t.targa_mezzo}
                    </span>
                    <span className="font-black text-rose-700 text-[10px]">
                      {Math.round((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60))}h aperto
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
