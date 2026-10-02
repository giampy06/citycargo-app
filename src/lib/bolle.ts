import { supabase } from '@/supabase';

/** Bucket privato dei PDF delle bolle di consegna RHENUS. */
export const BUCKET_BOLLE = 'bolle-consegna';

/** "Marco D'Angèlo" → "MARCO_DANGELO": niente accenti, apostrofi o spazi nel nome del file. */
function perNomeFile(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/ /g, '_');
}

/** Giorno del turno in Italia, nel formato gg-mm-aaaa. */
export function dataTurno(iso: string): string {
  const [g, m, a] = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(new Date(iso))
    .split('/');
  return `${g}-${m}-${a}`;
}

/** Nome del PDF delle bolle: NOMEAUTISTA-TARGA-DATA.pdf (es. MARCO_TOGNI-GH482KL-02-10-2026.pdf). */
export function nomeFileBolle(nomeAutista: string, targa: string, dataIso: string): string {
  return `${perNomeFile(nomeAutista) || 'AUTISTA'}-${perNomeFile(targa) || 'TARGA'}-${dataTurno(dataIso)}.pdf`;
}

/** Turno con un PDF di bolle collegato (i campi servono solo per il nome del file). */
export type TurnoBolle = {
  id: string;
  created_at: string;
  targa_mezzo: string;
  bolle_pdf_path: string | null;
};

/**
 * Nome file per ogni turno con bolle: NOMEAUTISTA-TARGA-DATA.pdf. Se lo stesso autista
 * fa più turni RHENUS con lo stesso furgone nello stesso giorno, dal secondo in poi
 * (in ordine di orario) si aggiunge -2, -3... così i file non si sovrascrivono.
 */
export function assegnaNomiFileBolle<T extends TurnoBolle>(turni: T[], nomeAutista: (t: T) => string): Record<string, string> {
  const nomi: Record<string, string> = {};
  const conteggi: Record<string, number> = {};
  const cronologico = turni.filter((t) => t.bolle_pdf_path).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const t of cronologico) {
    const base = nomeFileBolle(nomeAutista(t), t.targa_mezzo, t.created_at);
    conteggi[base] = (conteggi[base] || 0) + 1;
    nomi[t.id] = conteggi[base] === 1 ? base : base.replace(/\.pdf$/, `-${conteggi[base]}.pdf`);
  }
  return nomi;
}

/**
 * Scarica tutte le bolle di un giorno in un unico .zip (un PDF per turno, ciascuno con
 * il suo nome NOMEAUTISTA-TARGA-DATA). I file vengono letti con la sessione di chi
 * scarica, quindi valgono le stesse regole di accesso del singolo download.
 */
export async function scaricaZipBolle(voci: { percorso: string; nomeFile: string }[], nomeZip: string): Promise<void> {
  if (voci.length === 0) throw new Error('Nessuna bolla da scaricare per questo giorno.');
  const { zipSync } = await import('fflate');
  const contenuti: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const v of voci) {
    const { data, error } = await supabase.storage.from(BUCKET_BOLLE).download(v.percorso);
    if (error || !data) throw new Error(`Impossibile leggere ${v.nomeFile}. Riprova.`);
    // I PDF delle bolle sono già compressi (immagini JPEG): nello zip vanno "così come sono".
    contenuti[v.nomeFile] = [new Uint8Array(await data.arrayBuffer()), { level: 0 }];
  }
  const zip = zipSync(contenuti);
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeZip;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Scarica il PDF delle bolle già con il nome giusto. Il file nello storage resta in
 * turni/<id-turno>/ (le policy di sicurezza si basano su quella cartella): il nome
 * NOMEAUTISTA-TARGA-DATA lo imposta il link firmato (valido 5 minuti) al download.
 */
export async function scaricaPdfBolle(percorso: string, nomeFile: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(BUCKET_BOLLE)
    .createSignedUrl(percorso, 5 * 60, { download: nomeFile });
  if (error || !data?.signedUrl) {
    throw new Error('Impossibile scaricare le bolle in questo momento. Riprova.');
  }
  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
