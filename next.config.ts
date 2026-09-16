import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prima era `ignoreBuildErrors: true`: nascondeva gli errori TypeScript durante il
  // build invece di segnalarli. È esattamente per questo che il bug della pagina
  // /presenze (sovrascritta per errore, senza componente valido) non è mai emerso:
  // il progetto continuava a "buildare" anche con un file rotto. Ora gli errori
  // bloccano il build, così se succede di nuovo te ne accorgi subito.
};

export default nextConfig;