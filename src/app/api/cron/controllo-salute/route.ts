import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';
import { inviaMessaggioTelegram, fetchConTimeout } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const SITO_BASE = 'https://citycargo-app.vercel.app';
const TIMEOUT_SITO_MS = 8000;
const TIMEOUT_DB_MS = 5000;

async function controllaDatabase(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const inizio = Date.now();
  try {
    const risultato = await Promise.race([
      supabase.from('veicoli').select('*', { count: 'exact', head: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_DB_MS)
      ),
    ]);
    const { error } = risultato as { error: any };
    if (error) return { ok: false, ms: Date.now() - inizio, error: error.message };
    return { ok: true, ms: Date.now() - inizio };
  } catch (err: any) {
    return { ok: false, ms: Date.now() - inizio, error: err.message || 'Errore database.' };
  }
}

export async function GET(req: NextRequest) {
  // Protezione: stesso schema del cron esistente (/api/cron/lunedimattina) —
  // solo Vercel Cron (o chi conosce il CRON_SECRET) può eseguire questo endpoint.
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Non autorizzato.' }, { status: 401 });
  }

  const [home, login, db] = await Promise.all([
    fetchConTimeout(`${SITO_BASE}/`, TIMEOUT_SITO_MS),
    fetchConTimeout(`${SITO_BASE}/login`, TIMEOUT_SITO_MS),
    controllaDatabase(),
  ]);

  const righeSito = [
    `${home.ok ? '✅' : '❌'} Home (${SITO_BASE}/): ${home.ok ? `ok, ${home.ms}ms` : (home.error || `HTTP ${home.status}`)}`,
    `${login.ok ? '✅' : '❌'} Login: ${login.ok ? `ok, ${login.ms}ms` : (login.error || `HTTP ${login.status}`)}`,
  ];
  const rigaDb = `${db.ok ? '✅' : '❌'} Database: ${db.ok ? `ok, ${db.ms}ms` : db.error}`;

  const tuttoOk = home.ok && login.ok && db.ok;
  const adesso = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  const messaggio =
    `🩺 *Controllo Salute City Cargo* — ${adesso}\n\n` +
    `${righeSito.join('\n')}\n${rigaDb}\n\n` +
    (tuttoOk ? '🟢 Tutto funziona correttamente.' : '🔴 Attenzione: almeno un controllo è fallito.');

  const telegram = await inviaMessaggioTelegram(messaggio);

  return NextResponse.json({
    success: true,
    tuttoOk,
    home,
    login,
    db,
    messaggioTelegram: messaggio,
    telegramInviato: telegram.ok,
    telegramError: telegram.error,
  });
}
