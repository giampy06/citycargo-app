import { NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const TELEGRAM_BOT_TOKEN = '8869110646:AAEwimc2bMvITHVpQLPks8SzHyb2EaqHVLU';
    const CHAT_ID_ADMIN = '1144345988';

    // Recupero dati sicuro con blocchi separati
    let veicoli: any[] = [];
    let autisti: any[] = [];

    const resVeicoli = await supabase.from('veicoli').select('*');
    if (!resVeicoli.error && resVeicoli.data) {
      veicoli = resVeicoli.data;
    }

    const resAutisti = await supabase.from('profili').select('*');
    if (!resAutisti.error && resAutisti.data) {
      autisti = resAutisti.data;
    }

    const oggi = new Date();
    let avvisi: string[] = [];

    // Controllo veicoli
    veicoli.forEach((v: any) => {
      const targa = v.targa || 'Mezzo';
      if (v.scadenza_assicurazione) {
        const diff = Math.ceil((new Date(v.scadenza_assicurazione).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 15) avvisi.push(`🚐 Furgone *${targa}*: Assicurazione in scadenza il ${v.scadenza_assicurazione}`);
      }
      if (v.scadenza_revisione) {
        const diff = Math.ceil((new Date(v.scadenza_revisione).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 15) avvisi.push(`🚐 Furgone *${targa}*: Revisione in scadenza il ${v.scadenza_revisione}`);
      }
    });

    // Controllo autisti
    autisti.forEach((a: any) => {
      const nome = `${a.nome || ''} ${a.cognome || ''}`.trim() || 'Autista';
      if (a.scadenza_patente) {
        const diff = Math.ceil((new Date(a.scadenza_patente).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 30) avvisi.push(`👤 Autista *${nome}*: Patente in scadenza il ${a.scadenza_patente}`);
      }
      if (a.scadenza_visita_medica) {
        const diff = Math.ceil((new Date(a.scadenza_visita_medica).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 30) avvisi.push(`👤 Autista *${nome}*: Visita medica in scadenza il ${a.scadenza_visita_medica}`);
      }
    });

    let messaggio = "📋 *REPORT SETTIMANALE CITY CARGO*\n\n";
    if (avvisi.length === 0) {
      messaggio += "🟢 *Tutto ok!* Nessuna scadenza critica o imminente da segnalare per questa settimana.";
    } else {
      messaggio += "⚠️ *Attenzione, scadenze in arrivo:*\n\n" + avvisi.join('\n');
    }

    // Invio a Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID_ADMIN,
        text: messaggio,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ success: true, message: 'Report elaborato e inviato correttamente!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}