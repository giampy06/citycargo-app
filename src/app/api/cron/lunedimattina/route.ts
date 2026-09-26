import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { inviaMessaggioTelegram } from '@/lib/telegram';
import { costruisciAvvisi } from '@/lib/scadenze';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Protezione: solo Vercel Cron (o chi conosce il CRON_SECRET) può eseguire questo endpoint.
  // Senza questo controllo, chiunque trovi l'URL potrebbe invocarlo manualmente a piacimento.
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Non autorizzato.' }, { status: 401 });
  }

  // Il cron gira senza utente loggato: le regole RLS mostrerebbero 0 righe alla chiave
  // pubblica, quindi serve la chiave server (service_role). Mai dire "tutto ok" se non
  // siamo riusciti a leggere i dati: un report falsamente rassicurante è peggio di nessun report.
  const admin = getSupabaseAdmin();
  if (!admin) {
    const errore = 'Manca SUPABASE_SERVICE_ROLE_KEY: il report scadenze non può leggere i dati.';
    await inviaMessaggioTelegram(`⚠️ *REPORT SETTIMANALE NON ESEGUITO*\n\n${errore}`);
    return NextResponse.json({ success: false, error: errore }, { status: 500 });
  }

  const [resVeicoli, resAutisti] = await Promise.all([
    admin.from('veicoli').select('targa, data_scadenza_assicurazione, data_scadenza_revisione'),
    admin
      .from('autisti')
      .select('nome, cognome, scadenza_patente, possiede_cqc, scadenza_cqc, scadenza_visita_medica, scadenza_corso_sicurezza')
      .eq('stato', 'attivo'),
  ]);

  if (resVeicoli.error || resAutisti.error) {
    const errore = resVeicoli.error?.message || resAutisti.error?.message || 'Errore sconosciuto';
    await inviaMessaggioTelegram(`⚠️ *REPORT SETTIMANALE NON ESEGUITO*\n\nNon sono riuscito a leggere i dati: ${errore}`);
    return NextResponse.json({ success: false, error: errore }, { status: 500 });
  }

  const avvisi = costruisciAvvisi(resVeicoli.data ?? [], resAutisti.data ?? [], new Date());

  let messaggio = '📋 *REPORT SETTIMANALE CITY CARGO*\n\n';
  if (avvisi.length === 0) {
    messaggio += `🟢 *Tutto ok!* Nessuna scadenza critica o imminente (${resVeicoli.data?.length ?? 0} furgoni e ${resAutisti.data?.length ?? 0} autisti attivi controllati).`;
  } else {
    messaggio += '⚠️ *Attenzione, scadenze:*\n\n' + avvisi.join('\n');
  }

  const telegram = await inviaMessaggioTelegram(messaggio);
  if (!telegram.ok) {
    return NextResponse.json({ success: false, error: telegram.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Report elaborato e inviato correttamente!', avvisi: avvisi.length });
}
