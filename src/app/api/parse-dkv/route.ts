import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  // Protezione: è una funzione riservata all'amministratore (parsing fatture
  // DKV), non un semplice controllo "utente autenticato qualsiasi" —
  // altrimenti un autista potrebbe consumare la quota Gemini a piacimento.
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const supabaseAsCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: userData, error: authError } = await supabaseAsCaller.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }
  const { data: isAdmin, error: adminError } = await supabaseAsCaller.rpc('is_admin');
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: 'Accesso riservato agli amministratori.' }, { status: 403 });
  }

  try {
    const { fileBase64, mimeType } = await req.json();

    if (!fileBase64) {
      return NextResponse.json({ error: 'Nessun file fornito.' }, { status: 400 });
    }

    const prompt = `
Sei un contabile esperto di logistica e flotte aziendali.
Analizza questo estratto conto o fattura carburante/pedaggi (es. DKV, Telepass, Eni, Q8).
Estrai tutte le transazioni o riepiloghi raggruppati per TARGA del veicolo.
Restituisci esclusivamente un array JSON con gli elementi estratti:
- targa: targa del mezzo in lettere maiuscole senza spazi (es. FY123AB). Se non c'è la targa ma il numero carta/dispositivo, usa quel codice.
- importo: importo numerico totale in euro (es. 145.50).
- data_spesa: data in formato YYYY-MM-DD.
- descrizione: dettaglio (es. "Rifornimento Gasolio 80L - Stazione IP Milano" o "Pedaggi autostradali").
- tipo_spesa: imposta a "Carburante" oppure "Pedaggi" oppure "Altro".
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'application/pdf',
                data: fileBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              targa: { type: Type.STRING },
              importo: { type: Type.NUMBER },
              data_spesa: { type: Type.STRING },
              descrizione: { type: Type.STRING },
              tipo_spesa: { type: Type.STRING },
            },
            required: ['targa', 'importo', 'data_spesa', 'tipo_spesa'],
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || '[]');
    return NextResponse.json({ success: true, items: parsedData });
  } catch (error: any) {
    console.error('Errore parsing IA DKV:', error);
    return NextResponse.json({ error: error.message || 'Errore durante l\'analisi del documento.' }, { status: 500 });
  }
}