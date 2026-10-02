/**
 * Elaborazione "da scanner" delle foto delle bolle di consegna, con OpenCV.js:
 * 1. rilevaAngoli: trova i 4 angoli del foglio (o dice onestamente che non ci è riuscito);
 * 2. scansiona: raddrizza il foglio sui 4 angoli (confermati o corretti a mano
 *    dall'autista) e lo converte in bianco e nero ad alto contrasto.
 *
 * Tutte le Mat di OpenCV vanno liberate a mano (.delete()): la memoria WebAssembly
 * non è gestita dal garbage collector, e su telefono finirebbe dopo poche foto.
 */

import type { CvMat, OpenCv } from './opencv';

export type Punto = { x: number; y: number };
/** In ordine: alto-sinistra, alto-destra, basso-destra, basso-sinistra. */
export type Angoli = [Punto, Punto, Punto, Punto];

/** Lato lungo massimo dell'immagine di lavoro: abbastanza per una bolla leggibile,
 *  senza riempire la memoria del telefono con foto da 12+ megapixel. */
const LATO_LAVORO = 2200;
/** Lato lungo massimo per il rilevamento dei bordi (più piccolo = più veloce e
 *  meno disturbato dai dettagli del testo). */
const LATO_RILEVAMENTO = 800;
/** Di quanto (0-255) il foglio deve essere più chiaro di ciò che ha intorno per contare
 *  come rilevato in automatico. Vedi rilevaAngoli per la taratura. */
const CONTRASTO_MIN = 15;
/** Lato lungo della pagina scansionata: ~A4 a 150 dpi. */
const LATO_SCANSIONE = 1754;

/** Decodifica la foto (rispettando l'orientamento EXIF, come fa il browser per <img>)
 *  e la riduce a LATO_LAVORO. */
export async function caricaFoto(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scala = Math.min(1, LATO_LAVORO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scala);
    canvas.height = Math.round(img.naturalHeight * scala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non disponibile.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    throw new Error('Impossibile leggere la foto. Riprova a scattarla.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function distanza(a: Punto, b: Punto) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Ordina 4 punti qualsiasi come alto-sx, alto-dx, basso-dx, basso-sx. */
export function ordinaAngoli(punti: Punto[]): Angoli {
  const somma = (p: Punto) => p.x + p.y;
  const diff = (p: Punto) => p.y - p.x;
  const altoSx = punti.reduce((a, b) => (somma(b) < somma(a) ? b : a));
  const bassoDx = punti.reduce((a, b) => (somma(b) > somma(a) ? b : a));
  const altoDx = punti.reduce((a, b) => (diff(b) < diff(a) ? b : a));
  const bassoSx = punti.reduce((a, b) => (diff(b) > diff(a) ? b : a));
  return [altoSx, altoDx, bassoDx, bassoSx];
}

/** Rettangolo di partenza quando il rilevamento fallisce: l'autista lo trascina sui bordi. */
export function angoliPredefiniti(larghezza: number, altezza: number): Angoli {
  const mx = larghezza * 0.1;
  const my = altezza * 0.1;
  return [
    { x: mx, y: my },
    { x: larghezza - mx, y: my },
    { x: larghezza - mx, y: altezza - my },
    { x: mx, y: altezza - my },
  ];
}

/** Gli angoli interni del quadrilatero sono plausibili per un foglio fotografato
 *  (anche storto)? Scarta forme a "freccia" o quasi triangolari. */
function angoliPlausibili(q: Angoli): boolean {
  for (let i = 0; i < 4; i++) {
    const p = q[i];
    const a = q[(i + 3) % 4];
    const b = q[(i + 1) % 4];
    const v1 = { x: a.x - p.x, y: a.y - p.y };
    const v2 = { x: b.x - p.x, y: b.y - p.y };
    const coseno = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
    const gradi = (Math.acos(Math.max(-1, Math.min(1, coseno))) * 180) / Math.PI;
    if (gradi < 45 || gradi > 135) return false;
  }
  return true;
}

/** Tutti i quadrilateri convessi plausibili in un'immagine binaria (bordi o soglia). */
function quadrilateri(cv: OpenCv, binaria: CvMat, areaMin: number, areaMax: number): { q: Angoli; area: number }[] {
  const contorni = new cv.MatVector();
  const gerarchia = new cv.Mat();
  const trovati: { q: Angoli; area: number }[] = [];
  try {
    cv.findContours(binaria, contorni, gerarchia, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contorni.size(); i++) {
      const c = contorni.get(i);
      try {
        const area = cv.contourArea(c);
        if (area < areaMin || area > areaMax) continue;
        const perimetro = cv.arcLength(c, true);
        const approx = new cv.Mat();
        try {
          for (const eps of [0.02, 0.03, 0.045]) {
            cv.approxPolyDP(c, approx, eps * perimetro, true);
            if (approx.rows === 4) break;
          }
          if (approx.rows !== 4 || !cv.isContourConvex(approx)) continue;
          const areaQ = cv.contourArea(approx);
          if (areaQ < areaMin || areaQ > areaMax) continue;
          const d = approx.data32S;
          const q = ordinaAngoli([
            { x: d[0], y: d[1] },
            { x: d[2], y: d[3] },
            { x: d[4], y: d[5] },
            { x: d[6], y: d[7] },
          ]);
          if (!angoliPlausibili(q)) continue;
          trovati.push({ q, area: areaQ });
        } finally {
          approx.delete();
        }
      } finally {
        c.delete();
      }
    }
  } finally {
    contorni.delete();
    gerarchia.delete();
  }
  return trovati;
}

/** Quanti angoli cadono (quasi) sul bordo della foto. */
function angoliSulBordo(q: Angoli, larghezza: number, altezza: number): number {
  const margine = Math.max(larghezza, altezza) * 0.015;
  return q.filter((p) => p.x <= margine || p.y <= margine || p.x >= larghezza - margine || p.y >= altezza - margine).length;
}

/** Mediana di un'immagine in scala di grigi (per soglie di Canny adattate alla luce). */
function mediana(grigio: CvMat): number {
  const dati: Uint8Array = grigio.data;
  const istogramma = new Array(256).fill(0);
  for (let i = 0; i < dati.length; i++) istogramma[dati[i]]++;
  let cumulato = 0;
  for (let v = 0; v < 256; v++) {
    cumulato += istogramma[v];
    if (cumulato >= dati.length / 2) return v;
  }
  return 127;
}

/**
 * Quanto è più chiara la fascia appena DENTRO il quadrilatero rispetto a quella appena
 * FUORI (75° percentile: è il "colore della carta", non si lascia ingannare dal testo).
 * Sul bordo vero del foglio, fuori c'è il tavolo; su un riquadro stampato dentro la bolla
 * (es. la tabella) fuori c'è ancora carta bianca e la differenza è circa zero.
 * Restituisce null se non ci sono abbastanza punti da confrontare dentro la foto.
 */
function contrastoBordo(grigio: CvMat, q: Angoli): number | null {
  const w = grigio.cols;
  const h = grigio.rows;
  const dati: Uint8Array = grigio.data;
  const d = Math.hypot(w, h) * 0.015;
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  const leggi = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi < 0 || yi < 0 || xi >= w || yi >= h ? null : dati[yi * w + xi];
  };
  const dentro: number[] = [];
  const fuori: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const lx = b.x - a.x;
    const ly = b.y - a.y;
    const lung = Math.hypot(lx, ly) || 1;
    let nx = -ly / lung;
    let ny = lx / lung;
    // Normale rivolta verso l'esterno del quadrilatero.
    if (((a.x + b.x) / 2 - cx) * nx + ((a.y + b.y) / 2 - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    for (let t = 0.1; t <= 0.9; t += 0.04) {
      const px = a.x + lx * t;
      const py = a.y + ly * t;
      const vDentro = leggi(px - nx * d, py - ny * d);
      const vFuori = leggi(px + nx * d, py + ny * d);
      if (vDentro !== null && vFuori !== null) {
        dentro.push(vDentro);
        fuori.push(vFuori);
      }
    }
  }
  if (fuori.length < 20) return null;
  const p75 = (v: number[]) => [...v].sort((x, y) => x - y)[Math.floor(v.length * 0.75)];
  return p75(dentro) - p75(fuori);
}

export type EsitoRilevamento = 'trovato' | 'incerto' | 'non_trovato';

/**
 * Trova i 4 angoli del foglio. Prova più strategie (bordi con soglie fisse, bordi con
 * soglie adattate alla luminosità della foto, foglio chiaro su sfondo scuro) e tiene il
 * quadrilatero plausibile più grande. Se nessuna strategia trova un foglio credibile
 * restituisce 'non_trovato' con un rettangolo di partenza: in quel caso l'autista
 * sistema gli angoli a mano, non resta mai bloccato.
 */

export function rilevaAngoli(cv: OpenCv, foto: HTMLCanvasElement): { angoli: Angoli; esito: EsitoRilevamento } {
  const scala = Math.min(1, LATO_RILEVAMENTO / Math.max(foto.width, foto.height));
  const src = cv.imread(foto);
  const piccola = new cv.Mat();
  const grigio = new cv.Mat();
  const sfocata = new cv.Mat();
  const lavoro = new cv.Mat();
  const nucleo = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  try {
    cv.resize(src, piccola, new cv.Size(Math.round(foto.width * scala), Math.round(foto.height * scala)), 0, 0, cv.INTER_AREA);
    cv.cvtColor(piccola, grigio, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grigio, sfocata, new cv.Size(5, 5), 0);

    const areaImg = piccola.cols * piccola.rows;
    const areaMin = areaImg * 0.15;
    // Un "foglio" grande quanto tutta la foto è quasi sempre il bordo dell'immagine stessa.
    const areaMax = areaImg * 0.98;

    const candidati: { q: Angoli; area: number }[] = [];
    const prova = () => {
      candidati.push(...quadrilateri(cv, lavoro, areaMin, areaMax));
    };

    // 1. Bordi con soglie classiche, chiusi con una dilatazione per unire i tratti spezzati.
    cv.Canny(sfocata, lavoro, 50, 150);
    cv.dilate(lavoro, lavoro, nucleo);
    prova();

    // 2. Bordi con soglie adattate alla luminosità mediana (aiuta con luce scarsa o forte).
    const m = mediana(sfocata);
    cv.Canny(sfocata, lavoro, Math.max(0, 0.66 * m), Math.min(255, 1.33 * m));
    cv.dilate(lavoro, lavoro, nucleo);
    prova();

    // 3. Foglio chiaro su sfondo più scuro: soglia automatica (Otsu) + chiusura dei buchi del testo.
    cv.threshold(sfocata, lavoro, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.morphologyEx(lavoro, lavoro, cv.MORPH_CLOSE, nucleo);
    prova();

    // Un candidato vale solo se è più chiaro di ciò che lo circonda (CONTRASTO_MIN):
    // scarta i riquadri stampati dentro la bolla, come la tabella. Taratura fatta su foto
    // di prova: fogli veri tra +59 e +155, tabella interna tra -22 e 0.
    // Poi, in base agli angoli che cadono sul bordo della foto:
    //   3+ = è il contorno della foto stessa, non un foglio: scartato;
    //   1-2 = foglio probabilmente tagliato fuori dall'inquadratura: proposto, ma "incerto";
    //   0 = foglio interamente visibile: "trovato".
    const w = piccola.cols;
    const h = piccola.rows;
    const piuGrande = (lista: { q: Angoli; area: number }[]) => lista.reduce((a, b) => (b.area > a.area ? b : a));
    const credibili = candidati.filter((c) => (contrastoBordo(sfocata, c.q) ?? -Infinity) >= CONTRASTO_MIN);
    const puliti = credibili.filter((c) => angoliSulBordo(c.q, w, h) === 0);
    const sulBordo = credibili.filter((c) => {
      const n = angoliSulBordo(c.q, w, h);
      return n > 0 && n < 3;
    });

    let scelto: { q: Angoli; area: number } | null = null;
    let esito: EsitoRilevamento = 'non_trovato';
    if (puliti.length > 0) {
      scelto = piuGrande(puliti);
      esito = 'trovato';
    } else if (sulBordo.length > 0) {
      scelto = piuGrande(sulBordo);
      esito = 'incerto';
    }

    if (!scelto) return { angoli: angoliPredefiniti(foto.width, foto.height), esito };
    const angoli = scelto.q.map((p) => ({ x: p.x / scala, y: p.y / scala })) as Angoli;
    return { angoli, esito };
  } finally {
    src.delete();
    piccola.delete();
    grigio.delete();
    sfocata.delete();
    lavoro.delete();
    nucleo.delete();
  }
}

/**
 * Proporzioni REALI (larghezza/altezza) del foglio fotografato in prospettiva.
 * Misurare i lati nella foto non basta: il lato più lontano dall'obiettivo appare più
 * corto e la pagina esce deformata (in una simulazione con fotocamera reale, errore
 * mediano 16% e fino al 56%). Qui si usa il metodo di Zhang & He ("Whiteboard scanning
 * and image enhancement", 2007): dai 4 angoli si ricava la focale della fotocamera e
 * da lì il rapporto vero, con il centro ottico al centro della foto.
 * Se il telefono è inclinato su un solo asse (caso frequente) la focale non si può
 * ricavare, o la stima è poco credibile: allora si usa la focale tipica di un
 * telefono (obiettivo principale ~26 mm equivalenti = 0,6 × diagonale della foto).
 * Verifica su 3000 pose simulate con ±6 px di errore sugli angoli: errore mediano
 * ~1% (95° percentile ~8%) senza zoom, ~3% con zoom 2x.
 */
export function rapportoReale(angoli: Angoli, larghezzaFoto: number, altezzaFoto: number): number | null {
  const [as, ad, bd, bs] = angoli;
  const m1 = [as.x, as.y, 1];
  const m2 = [ad.x, ad.y, 1];
  const m3 = [bs.x, bs.y, 1];
  const m4 = [bd.x, bd.y, 1];
  const u0 = larghezzaFoto / 2;
  const v0 = altezzaFoto / 2;
  const focaleTipica = 0.6 * Math.hypot(larghezzaFoto, altezzaFoto);

  const vett = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const scal = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  const k2 = scal(vett(m1, m4), m3) / scal(vett(m2, m4), m3);
  const k3 = scal(vett(m1, m4), m2) / scal(vett(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]);
  const n3 = m3.map((v, i) => k3 * v - m1[i]);
  if (![k2, k3, ...n2, ...n3].every(Number.isFinite)) return null;

  const [n21, n22, n23] = n2;
  const [n31, n32, n33] = n3;
  const f2Stimata =
    Math.abs(n23 * n33) < 1e-12
      ? -1
      : -(1 / (n23 * n33)) *
        (n21 * n31 - (n21 * n33 + n23 * n31) * u0 + n23 * n33 * u0 * u0 +
          (n22 * n32 - (n22 * n33 + n23 * n32) * v0 + n23 * n33 * v0 * v0));
  const credibile = f2Stimata > 0 && Math.sqrt(f2Stimata) >= 0.5 * focaleTipica && Math.sqrt(f2Stimata) <= 2 * focaleTipica;
  const f2 = credibile ? f2Stimata : focaleTipica * focaleTipica;

  // n^T (A^-1)^T A^-1 n, con A = matrice della fotocamera [f 0 u0; 0 f v0; 0 0 1]
  const quad = (n: number[]) => {
    const [x, y, z] = n;
    return (x * x + y * y - 2 * z * (x * u0 + y * v0)) / f2 + z * z * ((u0 * u0 + v0 * v0) / f2 + 1);
  };
  const rapporto = Math.sqrt(quad(n2) / quad(n3));
  return Number.isFinite(rapporto) && rapporto > 0.2 && rapporto < 5 ? rapporto : null;
}

/**
 * Raddrizza il foglio sui 4 angoli e lo converte in bianco e nero "da scanner".
 * Il bianco e nero non usa una soglia unica (fallirebbe con ombre o luce non uniforme):
 * prima stima il colore della carta zona per zona e lo "toglie" (così un'ombra su metà
 * foglio sparisce), poi applica la soglia.
 */
export function scansiona(cv: OpenCv, foto: HTMLCanvasElement, angoli: Angoli): HTMLCanvasElement {
  const [as, ad, bd, bs] = angoli;
  // Proporzioni vere del foglio (correzione della prospettiva); se non stimabili,
  // ripiego sui lati misurati nella foto.
  const rapporto =
    rapportoReale(angoli, foto.width, foto.height) ??
    Math.max(distanza(as, ad), distanza(bs, bd)) / Math.max(distanza(as, bs), distanza(ad, bd));
  const w = Math.max(1, Math.round(rapporto >= 1 ? LATO_SCANSIONE : LATO_SCANSIONE * rapporto));
  const h = Math.max(1, Math.round(rapporto >= 1 ? LATO_SCANSIONE / rapporto : LATO_SCANSIONE));

  const src = cv.imread(foto);
  const da = cv.matFromArray(4, 1, cv.CV_32FC2, [as.x, as.y, ad.x, ad.y, bd.x, bd.y, bs.x, bs.y]);
  const a = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
  const trasformazione = cv.getPerspectiveTransform(da, a);
  const raddrizzata = new cv.Mat();
  const ritagliata = new cv.Mat();
  const grigio = new cv.Mat();
  const sfondo = new cv.Mat();
  const normalizzata = new cv.Mat();
  const risultato = new cv.Mat();
  const nucleo = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9));
  try {
    cv.warpPerspective(src, raddrizzata, trasformazione, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());

    // Toglie lo 0,8% per lato: un filo di tavolo lungo i bordi del foglio diventerebbe
    // una riga nera nella scansione. Le bolle hanno sempre un margine bianco.
    const mx = Math.round(w * 0.008);
    const my = Math.round(h * 0.008);
    const zona = raddrizzata.roi(new cv.Rect(mx, my, w - 2 * mx, h - 2 * my));
    zona.copyTo(ritagliata);
    zona.delete();
    cv.cvtColor(ritagliata, grigio, cv.COLOR_RGBA2GRAY);

    // Stima della carta senza scritte: la dilatazione "cancella" il testo scuro, la
    // mediana ampia leviga il risultato. Quello che resta sono luce e ombre.
    cv.dilate(grigio, sfondo, nucleo);
    cv.medianBlur(sfondo, sfondo, 31);

    // Carta / sfondo stimato → carta ~255 ovunque, anche nelle zone in ombra.
    cv.divide(grigio, sfondo, normalizzata, 255);

    // Soglia sull'immagine ormai uniforme: Otsu separa inchiostro e carta.
    cv.threshold(normalizzata, risultato, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    const canvas = document.createElement('canvas');
    cv.imshow(canvas, risultato);
    return canvas;
  } finally {
    src.delete();
    da.delete();
    a.delete();
    trasformazione.delete();
    raddrizzata.delete();
    ritagliata.delete();
    grigio.delete();
    sfondo.delete();
    normalizzata.delete();
    risultato.delete();
    nucleo.delete();
  }
}

/** Canvas → JPEG compatto (per anteprima, memoria e PDF). */
export function canvasInJpeg(canvas: HTMLCanvasElement, qualita = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione immagine non riuscita.'))), 'image/jpeg', qualita);
  });
}
