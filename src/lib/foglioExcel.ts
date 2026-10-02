import ExcelJS from 'exceljs';
import { ALIQUOTA_IVA, type FoglioMese } from './foglioPresenze';

const BLU_CHIARO = 'FFDCE6F1';
const BLU_INTESTAZIONE = 'FFC5D9F1';
const BLU_TESTO = 'FF1F3864';
const ROSSO_TESTO = 'FFC00000';
const ROSSO_CELLA = 'FFFF0000';
const ARANCIO = 'FFF79646';
const GRIGIO = 'FFD9D9D9';
const ROSSO_BRAND = 'FFD9262C';

const SOTTILE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const EURO = '#,##0.00';
const EURO_SIMBOLO = '#,##0.00 "€"';

function riempi(cella: ExcelJS.Cell, argb: string) {
  cella.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function stile(cella: ExcelJS.Cell, opzioni: { bold?: boolean; size?: number; color?: string; align?: 'left' | 'center' | 'right'; border?: boolean } = {}) {
  cella.font = { name: 'Calibri', size: opzioni.size ?? 10, bold: !!opzioni.bold, color: opzioni.color ? { argb: opzioni.color } : undefined };
  cella.alignment = { vertical: 'middle', horizontal: opzioni.align ?? 'center' };
  if (opzioni.border !== false) cella.border = SOTTILE;
}

/** Excel con un solo foglio (es. il foglio CITI, identico all'originale). */
export async function generaExcelFoglio(foglio: FoglioMese): Promise<Buffer> {
  return generaExcelFogli([{ nome: 'Presenze', foglio }]);
}

/** Excel con un foglio di lavoro per ciascun appalto (es. "tutti gli appalti"). */
export async function generaExcelFogli(fogli: { nome: string; foglio: FoglioMese }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'City Cargo';
  for (const { nome, foglio } of fogli) aggiungiFoglio(wb, nome, foglio);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

function aggiungiFoglio(wb: ExcelJS.Workbook, nome: string, foglio: FoglioMese) {
  const ws = wb.addWorksheet(nome, {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
    views: [{ showGridLines: false }],
  });

  const nd = foglio.giorni.length;
  const cPrimoGiorno = 4;
  const cUltimoGiorno = cPrimoGiorno + nd - 1;
  const cImporto = cUltimoGiorno + 1;
  const cG = cImporto + 1;
  const cLegCodice = cG + 2;
  const cLegNome = cLegCodice + 1;
  const cLegImporto = cLegCodice + 2;

  const lettera = (c: number) => ws.getColumn(c).letter;
  const RIGA_GIORNO_SIGLA = 1;
  const RIGA_GIORNO_NUM = 2;
  const RIGA_INTESTAZIONE = 3;
  const PRIMA_RIGA = 4;
  const righeTot = Math.max(45, foglio.righe.length);
  const ULTIMA_RIGA = PRIMA_RIGA + righeTot - 1;

  ws.getColumn(1).width = 4.5;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 22;
  for (let c = cPrimoGiorno; c <= cUltimoGiorno; c++) ws.getColumn(c).width = 3.8;
  ws.getColumn(cImporto).width = 12;
  ws.getColumn(cG).width = 4.5;
  ws.getColumn(cG + 1).width = 2;
  ws.getColumn(cLegCodice).width = 4.5;
  ws.getColumn(cLegNome).width = 17;
  ws.getColumn(cLegImporto).width = 11;

  // Titolo mese
  ws.mergeCells(RIGA_GIORNO_SIGLA, 1, RIGA_GIORNO_NUM, 3);
  const titolo = ws.getCell(RIGA_GIORNO_SIGLA, 1);
  titolo.value = foglio.titolo;
  stile(titolo, { bold: true, size: 15, border: false });

  // Giorni: sigla + numero
  foglio.giorni.forEach((g, i) => {
    const c = cPrimoGiorno + i;
    const colore = g.weekend ? ROSSO_TESTO : BLU_TESTO;
    const sigla = ws.getCell(RIGA_GIORNO_SIGLA, c);
    sigla.value = g.sigla;
    stile(sigla, { bold: true, size: 6, color: colore });
    riempi(sigla, BLU_CHIARO);
    const numero = ws.getCell(RIGA_GIORNO_NUM, c);
    numero.value = g.numero;
    numero.numFmt = '00';
    stile(numero, { bold: true, size: 10, color: colore });
    riempi(numero, BLU_CHIARO);
  });

  // Giorni lavorativi
  ws.mergeCells(RIGA_GIORNO_SIGLA, cImporto, RIGA_GIORNO_SIGLA, cG);
  const lavLabel = ws.getCell(RIGA_GIORNO_SIGLA, cImporto);
  lavLabel.value = 'Giorni lavorativi';
  stile(lavLabel, { size: 8 });
  ws.mergeCells(RIGA_GIORNO_NUM, cImporto, RIGA_GIORNO_NUM, cG);
  const lavNum = ws.getCell(RIGA_GIORNO_NUM, cImporto);
  lavNum.value = foglio.giorniLavorativi;
  stile(lavNum, { bold: true, size: 12 });

  // Marchio
  ws.mergeCells(RIGA_GIORNO_SIGLA, cLegCodice, RIGA_GIORNO_NUM, cLegImporto);
  const marchio = ws.getCell(RIGA_GIORNO_SIGLA, cLegCodice);
  marchio.value = 'citycargo';
  stile(marchio, { bold: true, size: 18, color: ROSSO_BRAND, border: false });

  // Intestazione tabella
  const intestazioni: [number, string][] = [[1, 'N.'], [2, 'Giro'], [3, 'Autista'], [cImporto, 'Importo'], [cG, 'G']];
  for (const [c, t] of intestazioni) {
    const cella = ws.getCell(RIGA_INTESTAZIONE, c);
    cella.value = t;
    stile(cella, { bold: true, color: BLU_TESTO });
    riempi(cella, BLU_INTESTAZIONE);
  }
  for (let c = cPrimoGiorno; c <= cUltimoGiorno; c++) {
    const L = lettera(c);
    const cella = ws.getCell(RIGA_INTESTAZIONE, c);
    cella.value = { formula: `COUNTA(${L}${PRIMA_RIGA}:${L}${ULTIMA_RIGA})`, result: foglio.presentiPerGiorno[c - cPrimoGiorno] };
    cella.numFmt = '0;-0;"-"';
    stile(cella, { bold: true, size: 8, color: BLU_TESTO });
    riempi(cella, BLU_INTESTAZIONE);
  }

  // Righe autisti (fino a 45 come nel foglio originale)
  for (let i = 0; i < righeTot; i++) {
    const r = PRIMA_RIGA + i;
    const dati = foglio.righe[i];
    const grigia = i % 2 === 1;

    for (let c = 1; c <= cG; c++) {
      const cella = ws.getCell(r, c);
      stile(cella, { align: c === 2 || c === 3 ? 'center' : 'center' });
      if (grigia) riempi(cella, GRIGIO);
    }

    ws.getCell(r, 1).value = i + 1;
    if (!dati) continue;

    ws.getCell(r, 2).value = dati.giro;
    ws.getCell(r, 3).value = dati.autista;
    dati.celle.forEach((cella, d) => {
      if (!cella) return;
      const x = ws.getCell(r, cPrimoGiorno + d);
      x.value = cella.testo;
      if (cella.daControllare) {
        riempi(x, ROSSO_CELLA);
        x.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
      }
    });

    const imp = ws.getCell(r, cImporto);
    imp.value = dati.importo;
    imp.numFmt = EURO;
    imp.font = { name: 'Calibri', size: 10, bold: true };

    const g = ws.getCell(r, cG);
    g.value = { formula: `COUNTA(${lettera(cPrimoGiorno)}${r}:${lettera(cUltimoGiorno)}${r})`, result: dati.giorniLavorati };
    g.font = { name: 'Calibri', size: 10, bold: true };
  }

  // Legenda
  ws.mergeCells(RIGA_INTESTAZIONE, cLegCodice, RIGA_INTESTAZIONE, cLegImporto);
  const leg = ws.getCell(RIGA_INTESTAZIONE, cLegCodice);
  leg.value = 'Legenda';
  stile(leg, { bold: true, color: BLU_TESTO });
  riempi(leg, ARANCIO);
  const righeLegenda = Math.max(foglio.legenda.length, 12);
  for (let i = 0; i < righeLegenda; i++) {
    const r = PRIMA_RIGA + i;
    const voce = foglio.legenda[i];
    const a = ws.getCell(r, cLegCodice);
    const b = ws.getCell(r, cLegNome);
    const c = ws.getCell(r, cLegImporto);
    stile(a, { bold: true });
    stile(b, { align: 'left' });
    stile(c, { align: 'right' });
    if (i % 2 === 1) [a, b, c].forEach((x) => riempi(x, GRIGIO));
    if (voce) {
      a.value = voce.codice;
      b.value = voce.nome;
      c.value = voce.importo;
      c.numFmt = EURO;
    }
  }

  // Blocco EXTRA (sotto la griglia)
  const RIGA_EXTRA = ULTIMA_RIGA + 3;
  const righeExtra = Math.max(foglio.extra.length, 7);
  const cDescrFine = cPrimoGiorno + 7;
  const cExtraImportoDa = cDescrFine + 1;
  const cExtraImportoA = cExtraImportoDa + 2;

  ws.mergeCells(RIGA_EXTRA, 1, RIGA_EXTRA + righeExtra - 1, 1);
  const etichetta = ws.getCell(RIGA_EXTRA, 1);
  etichetta.value = 'E X T R A';
  etichetta.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 'vertical' };
  etichetta.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BLU_TESTO } };
  riempi(etichetta, BLU_INTESTAZIONE);
  etichetta.border = SOTTILE;

  for (let i = 0; i < righeExtra; i++) {
    const r = RIGA_EXTRA + i;
    const voce = foglio.extra[i];
    ws.mergeCells(r, 3, r, cDescrFine);
    ws.mergeCells(r, cExtraImportoDa, r, cExtraImportoA);
    const data = ws.getCell(r, 2);
    const descr = ws.getCell(r, 3);
    const imp = ws.getCell(r, cExtraImportoDa);
    stile(data);
    stile(descr, { align: 'left' });
    stile(imp, { align: 'right' });
    for (let c = 3; c <= cDescrFine; c++) ws.getCell(r, c).border = SOTTILE;
    for (let c = cExtraImportoDa; c <= cExtraImportoA; c++) ws.getCell(r, c).border = SOTTILE;
    if (i % 2 === 1) for (let c = 2; c <= cExtraImportoA; c++) riempi(ws.getCell(r, c), GRIGIO);
    if (voce) {
      data.value = voce.data;
      descr.value = voce.descrizione;
      imp.value = voce.importo;
      imp.numFmt = EURO;
      if (voce.daControllare) riempi(imp, ROSSO_CELLA);
    }
  }
  const ULTIMA_RIGA_EXTRA = RIGA_EXTRA + righeExtra - 1;

  // Totali (formule vive: se si corregge una cifra a mano, si ricalcolano)
  const RIGA_TOT = Math.max(PRIMA_RIGA + righeLegenda + 2, 22);
  ws.mergeCells(RIGA_TOT, cLegCodice, RIGA_TOT, cLegImporto);
  const banner = ws.getCell(RIGA_TOT, cLegCodice);
  banner.value = 'Totale';
  stile(banner, { bold: true, size: 14, color: 'FFFFFFFF' });
  riempi(banner, ROSSO_BRAND);

  const colImp = lettera(cImporto);
  const colExtra = lettera(cExtraImportoDa);
  const voci: { etichetta: string; formula: (righe: Record<string, number>) => string; risultato: number }[] = [
    { etichetta: 'Giri', formula: () => `SUM(${colImp}${PRIMA_RIGA}:${colImp}${ULTIMA_RIGA})`, risultato: foglio.totali.giri },
    { etichetta: 'Extra', formula: () => `SUM(${colExtra}${RIGA_EXTRA}:${colExtra}${ULTIMA_RIGA_EXTRA})`, risultato: foglio.totali.extra },
    { etichetta: 'Imp.', formula: (r) => `${lettera(cLegImporto)}${r.Giri}+${lettera(cLegImporto)}${r.Extra}`, risultato: foglio.totali.imponibile },
    { etichetta: `IVA ${Math.round(ALIQUOTA_IVA * 100)}%`, formula: (r) => `ROUND(${lettera(cLegImporto)}${r['Imp.']}*${ALIQUOTA_IVA},2)`, risultato: foglio.totali.iva },
    { etichetta: 'Totale', formula: (r) => `${lettera(cLegImporto)}${r['Imp.']}+${lettera(cLegImporto)}${r['IVA']}`, risultato: foglio.totali.totale },
  ];
  const posizioni: Record<string, number> = {};
  voci.forEach((v, i) => {
    const r = RIGA_TOT + 1 + i;
    const chiave = v.etichetta.startsWith('IVA') ? 'IVA' : v.etichetta;
    posizioni[chiave] = r;
    ws.mergeCells(r, cLegCodice, r, cLegNome);
    const label = ws.getCell(r, cLegCodice);
    label.value = v.etichetta;
    stile(label, { size: 11, bold: chiave === 'Totale' });
    ws.getCell(r, cLegNome).border = SOTTILE;
    const val = ws.getCell(r, cLegImporto);
    val.value = { formula: v.formula(posizioni), result: v.risultato };
    val.numFmt = EURO_SIMBOLO;
    stile(val, { size: 11, bold: chiave === 'Totale', align: 'right' });
  });
}
