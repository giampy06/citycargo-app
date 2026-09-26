import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase con la chiave "service_role": SALTA le regole RLS.
 * Da usare SOLO in codice server (API route/cron protette da CRON_SECRET),
 * MAI importarlo in componenti client. La variabile NON deve avere il prefisso
 * NEXT_PUBLIC_, altrimenti finirebbe nel bundle del browser.
 * Ritorna null se la chiave non è configurata (il chiamante deve gestirlo).
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
