/**
 * Invia un messaggio Telegram usando le stesse variabili d'ambiente già
 * configurate per il cron del lunedì (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID_ADMIN).
 * Non lancia eccezioni: ritorna { ok, error } così il chiamante decide come reagire.
 */
export async function inviaMessaggioTelegram(
  testo: string
): Promise<{ ok: boolean; error?: string }> {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

  if (!TELEGRAM_BOT_TOKEN || !CHAT_ID_ADMIN) {
    return { ok: false, error: 'Variabili TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID_ADMIN mancanti.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID_ADMIN,
        text: testo,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram ha risposto ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Errore di rete verso Telegram.' };
  }
}

/**
 * Esegue una fetch con timeout (AbortController), per non far restare il cron
 * bloccato in attesa se un endpoint non risponde mai.
 */
export async function fetchConTimeout(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; ms: number; error?: string }> {
  const inizio = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return { ok: res.ok, status: res.status, ms: Date.now() - inizio };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return { ok: false, ms: Date.now() - inizio, error: isTimeout ? 'Timeout' : (err.message || 'Errore di rete') };
  } finally {
    clearTimeout(timer);
  }
}
