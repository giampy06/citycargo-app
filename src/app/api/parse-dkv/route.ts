import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
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