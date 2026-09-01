export interface WatermarkData {
  targa: string;
  autista: string;
  tipoControllo: string;
  codiceVerbale: string;
  gps?: string;
}

export async function applicaWatermarkLegale(
  file: File,
  dati: WatermarkData
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas non supportato'));
          return;
        }

        // Imposta dimensioni massime ottimizzate (Full HD)
        const maxWidth = 1920;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Disegna l'immagine originale
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Disegna la fascia scura semi-trasparente per il timbro legale in basso
        const barHeight = 90;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Bordo superiore rosso aziendale
        ctx.fillStyle = '#E05353';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, 4);

        // Testo del Watermark
        const dataOra = new Date().toLocaleString('it-IT', {
          timeZone: 'Europe/Rome',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`CITY CARGO AUDIT | ${dati.targa} | ${dati.tipoControllo.toUpperCase()}`, 24, canvas.height - 52);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'normal 18px sans-serif';
        const infoDettaglio = `Data: ${dataOra} | Conducente: ${dati.autista} | Verbale: ${dati.codiceVerbale}${dati.gps ? ` | GPS: ${dati.gps}` : ''}`;
        ctx.fillText(infoDettaglio, 24, canvas.height - 22);

        // Esporta in JPEG compresso al 90%
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Errore creazione file con filigrana'));
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Errore caricamento immagine sorgente'));
    };

    reader.onerror = () => reject(new Error('Errore lettura file'));
  });
}