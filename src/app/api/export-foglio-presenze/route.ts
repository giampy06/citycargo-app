import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { costruisciFoglio } from '@/lib/foglioPresenze';
import { generaExcelFoglio } from '@/lib/foglioExcel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const anno = Number(req.nextUrl.searchParams.get('anno'));
  const mese = Number(req.nextUrl.searchParams.get('mese'));
  if (!Number.isInteger(anno) || anno < 2020 || anno > 2100 || !Number.isInteger(mese) || mese < 1 || mese > 12) {
    return NextResponse.json({ error: 'Parametri anno/mese non validi.' }, { status: 400 });
  }

  // Solo gli amministratori: verifica con il token di chi chiama, poi legge i dati con
  // lo stesso token (le regole RLS restano attive, nessuna chiave privilegiata).
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) return NextResponse.json({ error: 'Accesso riservato agli amministratori.' }, { status: 403 });

  // Margine di un giorno per il fuso orario: il filtro esatto lo fa costruisciFoglio (data italiana).
  const inizio = new Date(Date.UTC(anno, mese - 1, 1) - 24 * 3600 * 1000).toISOString();
  const fine = new Date(Date.UTC(anno, mese, 1) + 24 * 3600 * 1000).toISOString();
  const primoGiorno = `${anno}-${String(mese).padStart(2, '0')}-01`;
  const ultimoGiorno = `${anno}-${String(mese).padStart(2, '0')}-${String(new Date(anno, mese, 0).getDate()).padStart(2, '0')}`;

  const [turni, autisti, tariffe, extra] = await Promise.all([
    supabase
      .from('turni_presenze')
      .select('id, created_at, autista_id, nome_autista, appalto, giro, compenso_giornaliero, da_controllare')
      .gte('created_at', inizio)
      .lt('created_at', fine),
    supabase.from('autisti').select('id, nome, cognome'),
    supabase.from('tariffe_giri').select('nome, codice, importo, appalto, ordine').eq('appalto', 'CITI'),
    supabase.from('extra_servizi').select('id, data, descrizione, importo').eq('appalto', 'CITI').gte('data', primoGiorno).lte('data', ultimoGiorno),
  ]);

  const errore = turni.error || autisti.error || tariffe.error || extra.error;
  if (errore) return NextResponse.json({ error: `Lettura dati non riuscita: ${errore.message}` }, { status: 500 });

  const foglio = costruisciFoglio({
    anno,
    mese,
    turni: turni.data || [],
    autisti: autisti.data || [],
    tariffe: tariffe.data || [],
    extraManuali: extra.data || [],
  });

  const buffer = await generaExcelFoglio(foglio);
  const nomeFile = `Presenze_CITI_${anno}-${String(mese).padStart(2, '0')}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeFile}"`,
      'Cache-Control': 'no-store',
    },
  });
}
