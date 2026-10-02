/** Una pagina già scansionata (raddrizzata + bianco e nero), pronta per il PDF. */
export type PaginaBolla = {
  id: string;
  jpeg: Blob;
  /** Object URL per l'anteprima: va revocato quando la pagina viene eliminata. */
  url: string;
  larghezza: number;
  altezza: number;
};

const A4 = { lato: 210, altezza: 297 }; // mm

/**
 * Unisce tutte le pagine scansionate in un unico PDF A4 (una bolla per pagina,
 * verticale o orizzontale secondo la forma del foglio, centrata senza deformarla).
 * jsPDF viene caricato solo qui, al momento di generare il PDF.
 */
export async function creaPdfBolle(pagine: PaginaBolla[], titolo: string): Promise<Blob> {
  if (pagine.length === 0) throw new Error('Nessuna pagina da inserire nel PDF.');
  const { jsPDF } = await import('jspdf');

  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const pagina of pagine) {
    const orizzontale = pagina.larghezza > pagina.altezza;
    const orientamento = orizzontale ? 'l' : 'p';
    if (!pdf) {
      pdf = new jsPDF({ orientation: orientamento, unit: 'mm', format: 'a4', compress: true });
    } else {
      pdf.addPage('a4', orientamento);
    }
    const larghezzaPagina = orizzontale ? A4.altezza : A4.lato;
    const altezzaPagina = orizzontale ? A4.lato : A4.altezza;
    const scala = Math.min(larghezzaPagina / pagina.larghezza, altezzaPagina / pagina.altezza);
    const w = pagina.larghezza * scala;
    const h = pagina.altezza * scala;
    const dati = new Uint8Array(await pagina.jpeg.arrayBuffer());
    pdf.addImage(dati, 'JPEG', (larghezzaPagina - w) / 2, (altezzaPagina - h) / 2, w, h, undefined, 'FAST');
  }

  pdf!.setProperties({ title: titolo, creator: 'City Cargo' });
  return pdf!.output('blob');
}

/** Fa scaricare un Blob al browser con il nome indicato. */
export function scaricaBlob(blob: Blob, nomeFile: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeFile;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
