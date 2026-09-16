import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      nome,
      cognome,
      codiceFiscale,
      telefono,
      appaltoDefault,
      numeroPatente,
      scadenzaPatente,
      possiedeCqc,
      scadenzaCqc
    } = await req.json();

    if (!email || !password || !nome || !cognome) {
      return NextResponse.json(
        { error: 'Nome, cognome, email e password sono obbligatori.' },
        { status: 400 }
      );
    }

    // Registrazione utente in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        emailRedirectTo: 'https://citycargo-app.vercel.app/autista/login',
        data: {
          nome: nome.trim(),
          cognome: cognome.trim(),
          full_name: `${nome.trim()} ${cognome.trim()}`,
          ruolo: 'autista',
        },
      },
    });

    if (authError) throw authError;

    // Registrazione in anagrafica autisti
    const { error: dbError } = await supabase.from('autisti').insert([
      {
        nome: nome.trim(),
        cognome: cognome.trim(),
        codice_fiscale: codiceFiscale?.trim().toUpperCase() || null,
        telefono: telefono?.trim() || null,
        email: email.trim().toLowerCase(),
        appalto_default: appaltoDefault || 'CITI',
        numero_patente: numeroPatente?.trim().toUpperCase() || null,
        scadenza_patente: scadenzaPatente || null,
        possiede_cqc: possiedeCqc || false,
        scadenza_cqc: possiedeCqc && scadenzaCqc ? scadenzaCqc : null,
        stato: 'attivo',
      },
    ]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Errore creazione autista:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la registrazione.' },
      { status: 500 }
    );
  }
}