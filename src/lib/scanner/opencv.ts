import { version as OPENCV_VERSIONE } from '@techstark/opencv-js/package.json';

/**
 * OpenCV.js caricato via <script> non ha tipi affidabili per la build 5.0 (lo dice anche
 * il pacchetto): lo trattiamo come dinamico qui, in un solo punto, invece di spargere any.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCv = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CvMat = any;

/**
 * Carica OpenCV.js (~13 MB, ~3,8 MB compressi) SOLO quando serve: lo copia in
 * public/vendor/ lo script scripts/copia-opencv.mjs a ogni npm install, quindi viene
 * servito dal nostro dominio (nessun CDN di terzi) con cache lunga (next.config.ts).
 *
 * In OpenCV 5 `window.cv` è una Promise che si risolve nel modulo pronto all'uso.
 * Restituiamo il modulo dentro un oggetto ({ cv }) e non direttamente: alcune build
 * di OpenCV.js espongono un `then` sul modulo, e risolvere una Promise con un oggetto
 * "thenable" la manderebbe in attesa infinita.
 */
let caricamento: Promise<{ cv: OpenCv }> | null = null;

export function caricaOpenCv(): Promise<{ cv: OpenCv }> {
  if (caricamento) return caricamento;

  caricamento = new Promise<{ cv: OpenCv }>((resolve, reject) => {
    const w = window as unknown as { cv?: OpenCv };

    const quandoPronto = async () => {
      let modulo = w.cv;
      if (modulo instanceof Promise) {
        modulo = await modulo;
      } else if (modulo && !modulo.Mat) {
        await new Promise<void>((r) => {
          modulo.onRuntimeInitialized = () => r();
        });
      }
      if (!modulo?.Mat) throw new Error('Modulo di scansione non inizializzato.');
      resolve({ cv: modulo });
    };

    if (w.cv) {
      quandoPronto().catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = `/vendor/opencv-${OPENCV_VERSIONE}.js`;
    script.async = true;
    script.onload = () => quandoPronto().catch(reject);
    script.onerror = () => {
      script.remove();
      reject(new Error('Impossibile scaricare il modulo di scansione: controlla la connessione e riprova.'));
    };
    document.head.appendChild(script);
  });

  // Se fallisce (es. rete assente), il prossimo tentativo riparte da zero.
  caricamento.catch(() => {
    caricamento = null;
  });

  return caricamento;
}
