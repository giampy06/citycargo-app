import { supabase } from '@/supabase';

// Scarica il foglio presenze CITI (xlsx) del mese indicato. Lancia un Error con un messaggio leggibile.
export async function scaricaFoglioExcel(anno: number, mese: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessione scaduta: accedi di nuovo.');

  const res = await fetch(`/api/export-foglio-presenze?anno=${anno}&mese=${mese}`, {
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
  a.download = `Presenze_CITI_${anno}-${String(mese).padStart(2, '0')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
