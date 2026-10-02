export type TurnoFoglio = {
  id: string;
  created_at: string;
  autista_id: string | null;
  nome_autista: string | null;
  appalto: string | null;
  giro: string | null;
  compenso_giornaliero: number | string | null;
  da_controllare: boolean | null;
};

export type AutistaFoglio = { id: string; nome: string; cognome: string };

export type TariffaFoglio = {
  nome: string;
  codice: string | null;
  importo: number | string | null;
  appalto: string;
  ordine?: number | null;
};

export type ExtraManuale = { id?: string; data: string; descrizione: string; importo: number | string; autista_id?: string | null };

export type CellaFoglio = { testo: string; daControllare: boolean };

export type RigaFoglio = {
  n: number;
  giro: string;
  autista: string;
  celle: (CellaFoglio | null)[];
  importo: number;
  giorniLavorati: number;
};

export type ExtraFoglioRiga = {
  data: string;
  descrizione: string;
  importo: number;
  origine: 'turno' | 'manuale';
  daControllare: boolean;
};

export type FoglioMese = {
  anno: number;
  mese: number;
  titolo: string;
  giorni: { numero: number; sigla: string; weekend: boolean }[];
  giorniLavorativi: number;
  presentiPerGiorno: number[];
  righe: RigaFoglio[];
  legenda: { codice: string; nome: string; importo: number }[];
  extra: ExtraFoglioRiga[];
  totali: { giri: number; extra: number; imponibile: number; iva: number; totale: number };
};

export const ALIQUOTA_IVA = 0.22;

export type AppaltoFoglio = 'CITI' | 'EDF' | 'RHENUS';
export const APPALTI_FOGLIO: AppaltoFoglio[] = ['CITI', 'EDF', 'RHENUS'];

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const SIGLE = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];

const num = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const arrotonda = (n: number): number => Math.round(n * 100) / 100;

// Data (YYYY-MM-DD) in fuso italiano di un timestamp.
export function dataItaliana(timestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(timestamp));
}

// Lettera mostrata nella griglia: quella della tariffa. Senza lettera: per CITI le prime
// 2 lettere del nome del giro; per EDF e RHENUS l'iniziale dell'appalto (E, R).
export function codiceGiro(nome: string, tariffe: TariffaFoglio[], appalto: AppaltoFoglio = 'CITI'): string {
  const t = tariffe.find((x) => x.nome === nome);
  if (t?.codice) return t.codice;
  if (appalto !== 'CITI') return appalto[0];
  return nome.trim().slice(0, 2).toUpperCase() || '?';
}

export function costruisciFoglio(opzioni: {
  anno: number;
  mese: number; // 1-12
  turni: TurnoFoglio[];
  autisti: AutistaFoglio[];
  tariffe: TariffaFoglio[]; // vengono usate solo quelle dell'appalto del foglio
  extraManuali: ExtraManuale[]; // già filtrati per appalto da chi chiama
  /** Appalto del foglio (default CITI, il foglio originale). */
  appalto?: AppaltoFoglio;
}): FoglioMese {
  const { anno, mese, turni, autisti, tariffe, extraManuali } = opzioni;
  const appalto = opzioni.appalto ?? 'CITI';
  const nGiorni = new Date(anno, mese, 0).getDate();
  const prefisso = `${anno}-${String(mese).padStart(2, '0')}-`;

  const giorni = Array.from({ length: nGiorni }, (_, i) => {
    const dow = new Date(anno, mese - 1, i + 1).getDay();
    return { numero: i + 1, sigla: SIGLE[dow], weekend: dow === 0 || dow === 6 };
  });
  const giorniLavorativi = giorni.filter((g) => !g.weekend).length;

  const tariffeAppalto = tariffe.filter((t) => t.appalto === appalto);
  const eExtra = (giro: string | null) => {
    const t = tariffeAppalto.find((x) => x.nome === giro);
    return !!t && t.importo === null;
  };

  const nomeAutista = (id: string | null, fallback: string | null) => {
    const a = autisti.find((x) => x.id === id);
    return a ? `${a.nome} ${a.cognome}`.trim() : fallback || 'Autista';
  };

  // Solo l'appalto del foglio e solo il mese richiesto (data italiana).
  const turniMese = turni
    .filter((t) => t.appalto === appalto)
    .map((t) => ({ ...t, giorno: dataItaliana(t.created_at) }))
    .filter((t) => t.giorno.startsWith(prefisso))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const extra: ExtraFoglioRiga[] = [];
  const perAutista = new Map<string, { nome: string; turni: typeof turniMese }>();

  for (const t of turniMese) {
    if (eExtra(t.giro)) {
      const dd = t.giorno.slice(8, 10);
      const mm = t.giorno.slice(5, 7);
      extra.push({
        data: `${dd}/${mm}`,
        descrizione: `Extra - ${nomeAutista(t.autista_id, t.nome_autista)}`,
        importo: num(t.compenso_giornaliero),
        origine: 'turno',
        daControllare: !!t.da_controllare || num(t.compenso_giornaliero) === 0,
      });
      continue;
    }
    const chiave = t.autista_id || `nome:${t.nome_autista}`;
    if (!perAutista.has(chiave)) perAutista.set(chiave, { nome: nomeAutista(t.autista_id, t.nome_autista), turni: [] });
    perAutista.get(chiave)!.turni.push(t);
  }

  for (const e of extraManuali) {
    if (!e.data.startsWith(prefisso)) continue;
    const autista = e.autista_id ? autisti.find((a) => a.id === e.autista_id) : null;
    extra.push({
      data: `${e.data.slice(8, 10)}/${e.data.slice(5, 7)}`,
      descrizione: autista ? `${e.descrizione} - ${autista.nome} ${autista.cognome}`.trim() : e.descrizione,
      importo: num(e.importo),
      origine: 'manuale',
      daControllare: false,
    });
  }
  extra.sort((a, b) => a.data.split('/').reverse().join('').localeCompare(b.data.split('/').reverse().join('')));

  const presentiPerGiorno = new Array(nGiorni).fill(0);
  const righe: RigaFoglio[] = [...perAutista.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    .map((a, i) => {
      const celle: (CellaFoglio | null)[] = new Array(nGiorni).fill(null);
      const giriUsati = new Map<string, number>();
      let importo = 0;

      const perGiorno = new Map<number, typeof a.turni>();
      for (const t of a.turni) {
        const g = Number(t.giorno.slice(8, 10));
        if (!perGiorno.has(g)) perGiorno.set(g, []);
        perGiorno.get(g)!.push(t);
        importo += num(t.compenso_giornaliero);
        const nomeGiro = t.giro || 'Giro Standard';
        giriUsati.set(nomeGiro, (giriUsati.get(nomeGiro) || 0) + 1);
      }

      for (const [g, lista] of perGiorno) {
        const lettere = [...new Set(lista.map((t) => codiceGiro(t.giro || 'Giro Standard', tariffeAppalto, appalto)))];
        celle[g - 1] = { testo: lettere.join('/'), daControllare: lista.some((t) => !!t.da_controllare) };
        presentiPerGiorno[g - 1] += 1;
      }

      const giroPrincipale = [...giriUsati.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || '';
      return {
        n: i + 1,
        giro: giroPrincipale,
        autista: a.nome,
        celle,
        importo: arrotonda(importo),
        giorniLavorati: perGiorno.size,
      };
    });

  const legenda = tariffeAppalto
    .filter((t) => t.importo !== null)
    .sort((a, b) => num(a.ordine) - num(b.ordine))
    .map((t) => ({ codice: codiceGiro(t.nome, tariffeAppalto, appalto), nome: t.nome, importo: num(t.importo) }));

  const giri = arrotonda(righe.reduce((s, r) => s + r.importo, 0));
  const totExtra = arrotonda(extra.reduce((s, e) => s + e.importo, 0));
  const imponibile = arrotonda(giri + totExtra);
  const iva = arrotonda(imponibile * ALIQUOTA_IVA);

  return {
    anno,
    mese,
    // Il foglio CITI resta identico all'originale; gli altri riportano l'appalto nel titolo.
    titolo: appalto === 'CITI' ? `${MESI[mese - 1]} ${anno}` : `${MESI[mese - 1]} ${anno} · ${appalto}`,
    giorni,
    giorniLavorativi,
    presentiPerGiorno,
    righe,
    legenda,
    extra,
    totali: { giri, extra: totExtra, imponibile, iva, totale: arrotonda(imponibile + iva) },
  };
}
