import { supabase } from '@/supabase';

export type AppaltoExport = 'CITI' | 'EDF' | 'RHENUS' | 'TUTTI';

// Scarica il foglio presenze (xlsx) del mese per un appalto, o per tutti (un foglio per
// appalto). Lancia un Error con un messaggio leggibile.
export async function scaricaFoglioExcel(anno: number, mese: number, appalto: AppaltoExport = 'CITI'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessione scaduta: accedi di nuovo.');

  const res = await fetch(`/api/export-foglio-presenze?anno=${anno}&mese=${mese}&appalto=${appalto}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 401) throw new Error('Sessione scaduta o non più valida: esci e accedi di nuovo.');
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Errore ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Presenze_${appalto}_${anno}-${String(mese).padStart(2, '0')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
