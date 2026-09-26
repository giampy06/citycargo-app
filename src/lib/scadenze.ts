export type VeicoloScadenze = {
  targa?: string | null;
  data_scadenza_assicurazione?: string | null;
  data_scadenza_revisione?: string | null;
};

export type AutistaScadenze = {
  nome?: string | null;
  cognome?: string | null;
  scadenza_patente?: string | null;
  possiede_cqc?: boolean | null;
  scadenza_cqc?: string | null;
  scadenza_visita_medica?: string | null;
  scadenza_corso_sicurezza?: string | null;
};

export type PermessoScadenze = {
  zona?: string | null;
  ente?: string | null;
  data_scadenza?: string | null;
  targa?: string | null;
};

const SOGLIA_VEICOLI_GIORNI = 15;
const SOGLIA_AUTISTI_GIORNI = 30;
const SOGLIA_PERMESSI_GIORNI = 30;

// Telegram (parse_mode Markdown) si rompe con _ * ` [ nei testi dinamici: li neutralizziamo.
export function escapeMarkdown(testo: string): string {
  return testo.replace(/([_*`\[])/g, '\\$1');
}

// Giorni tra "oggi" (data italiana) e la scadenza. Negativo = già scaduta.
export function giorniAllaScadenza(scadenza: string, adesso: Date): number {
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(adesso);
  const ms = Date.parse(`${scadenza}T00:00:00Z`) - Date.parse(`${oggi}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

function formatoData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function descrizione(etichetta: string, scadenza: string, giorni: number, scaduto = 'SCADUTA'): string {
  if (giorni < 0) {
    const n = Math.abs(giorni);
    return `${etichetta}: *${scaduto}* il ${formatoData(scadenza)} (da ${n} ${n === 1 ? 'giorno' : 'giorni'})`;
  }
  if (giorni === 0) return `${etichetta}: scade *OGGI* (${formatoData(scadenza)})`;
  return `${etichetta}: scade il ${formatoData(scadenza)} (tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'})`;
}

// Restituisce le righe di avviso, dalle più urgenti (già scadute) alle meno urgenti.
export function costruisciAvvisi(
  veicoli: VeicoloScadenze[],
  autisti: AutistaScadenze[],
  adesso: Date,
  permessi: PermessoScadenze[] = []
): string[] {
  const righe: { giorni: number; testo: string }[] = [];

  for (const v of veicoli) {
    const targa = escapeMarkdown(v.targa || 'Mezzo');
    const controlli: [string, string | null | undefined][] = [
      ['Assicurazione', v.data_scadenza_assicurazione],
      ['Revisione', v.data_scadenza_revisione],
    ];
    for (const [etichetta, data] of controlli) {
      if (!data) continue;
      const giorni = giorniAllaScadenza(data, adesso);
      if (giorni <= SOGLIA_VEICOLI_GIORNI) {
        righe.push({ giorni, testo: `🚐 Furgone *${targa}* — ${descrizione(etichetta, data, giorni)}` });
      }
    }
  }

  for (const a of autisti) {
    const nome = escapeMarkdown(`${a.nome || ''} ${a.cognome || ''}`.trim() || 'Autista');
    const controlli: [string, string | null | undefined][] = [
      ['Patente', a.scadenza_patente],
      ['Visita medica', a.scadenza_visita_medica],
      ['Corso sicurezza', a.scadenza_corso_sicurezza],
    ];
    if (a.possiede_cqc) controlli.push(['CQC', a.scadenza_cqc]);

    for (const [etichetta, data] of controlli) {
      if (!data) continue;
      const giorni = giorniAllaScadenza(data, adesso);
      if (giorni <= SOGLIA_AUTISTI_GIORNI) {
        righe.push({ giorni, testo: `👤 Autista *${nome}* — ${descrizione(etichetta, data, giorni)}` });
      }
    }
  }

  for (const p of permessi) {
    if (!p.data_scadenza) continue;
    const giorni = giorniAllaScadenza(p.data_scadenza, adesso);
    if (giorni > SOGLIA_PERMESSI_GIORNI) continue;
    const targa = escapeMarkdown(p.targa || 'Mezzo');
    const zona = escapeMarkdown(p.zona || 'zona non indicata');
    const ente = p.ente ? ` (${escapeMarkdown(p.ente)})` : '';
    righe.push({ giorni, testo: `🚐 Furgone *${targa}* — ${descrizione(`Permesso ZTL ${zona}${ente}`, p.data_scadenza, giorni, 'SCADUTO')}` });
  }

  return righe.sort((x, y) => x.giorni - y.giorni).map((r) => r.testo);
}
