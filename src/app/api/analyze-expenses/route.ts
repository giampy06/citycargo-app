import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Client "di servizio" usato solo per verificare il token dell'utente che chiama l'endpoint.
const supabaseAuthCheck = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  // Protezione: senza un utente autenticato, chiunque trovi l'URL potrebbe
  // chiamare questo endpoint a piacimento e consumare la quota a pagamento di Gemini.
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: authError } = await supabaseAuthCheck.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  try {
    const { expenses, vehicles } = await req.json();

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ 
        error: 'Nessun dato di spesa registrato da analizzare.' 
      }, { status: 400 });
    }

    const prompt = `
Sei un Fleet Manager e Consulente Finanziario esperto nel settore dei trasporti e consegne merci su gomma (veicoli commerciali leggeri tipo Ducato, Daily, Boxer).
Analizza i dati delle spese sostenute e della flotta forniti di seguito:

DATI FLOTTA:
${JSON.stringify(vehicles || [])}

REGISTRO FATTURE E SPESE:
${JSON.stringify(expenses)}

Fornisci una risposta analitica, dettagliata, professionale ed esaustiva strutturata rigorosamente in formato JSON con questi 4 campi:
1. "sintesi": un riassunto esecutivo (2-3 paragrafi) sull'andamento economico della flotta e sulla spesa complessiva.
2. "analisi_categorie": un array di oggetti con i campi "categoria" (es. Carburante, Manutenzione Meccanica, Gomme, Tagliandi), "incidenza_valutazione" (un commento sull'impatto di questa categoria sui margini aziendali), "stato_allerta" ("ok", "attenzione", "critico").
3. "anomalie_rilevate": un array di stringhe che evidenzia eventuali criticità specifiche (ad esempio furgoni che hanno subito troppe riparazioni straordinarie, consumi anomali, tagliandi troppo ravvicinati o costi sproporzionati su una certa targa).
4. "consigli_strategici": un array di 4 o 5 consigli pratici, numerati e immediatamente attuabili per abbattere i costi di gestione, ottimizzare la flotta e prevenire guasti costosi.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error: any) {
    console.error('Errore analisi IA spese:', error);
    return NextResponse.json({ error: error.message || 'Errore durante la generazione del report.' }, { status: 500 });
  }
}