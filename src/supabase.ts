import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local in locale, "Environment Variables" su Vercel).'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Genera un URL firmato e temporaneo per un file su uno storage bucket privato.
 * Da usare al posto di getPublicUrl() per qualsiasi documento sensibile
 * (patenti, libretti, foto veicoli, cedolini, fatture).
 *
 * @param bucket nome del bucket (es. 'documenti-veicoli')
 * @param path percorso del file dentro il bucket
 * @param expiresInSeconds durata di validità del link (default 1 ora)
 */
export async function getPrivateFileUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 60 * 60
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error(`Errore generazione URL firmato (${bucket}/${path}):`, error);
    return null;
  }

  return data.signedUrl;
}
