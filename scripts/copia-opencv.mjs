// Copia OpenCV.js dal pacchetto npm (versione bloccata in package.json) in
// public/vendor/, così la pagina di check-out lo carica dal nostro dominio solo
// quando serve (scansione bolle RHENUS), senza CDN di terzi e senza tenere un file
// da 13 MB nella storia Git. Gira in automatico dopo ogni npm install / npm ci
// (anche su Vercel e nella CI GitHub).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const radice = join(dirname(fileURLToPath(import.meta.url)), '..');

const { version } = require('@techstark/opencv-js/package.json');
const sorgente = require.resolve('@techstark/opencv-js/dist/opencv.js');
const cartella = join(radice, 'public', 'vendor');
const destinazione = join(cartella, `opencv-${version}.js`);

if (!existsSync(cartella)) mkdirSync(cartella, { recursive: true });
copyFileSync(sorgente, destinazione);
console.log(`OpenCV.js ${version} copiato in public/vendor/`);
