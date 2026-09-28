import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prima era `ignoreBuildErrors: true`: nascondeva gli errori TypeScript durante il
  // build invece di segnalarli. È esattamente per questo che il bug della pagina
  // /presenze (sovrascritta per errore, senza componente valido) non è mai emerso:
  // il progetto continuava a "buildare" anche con un file rotto. Ora gli errori
  // bloccano il build, così se succede di nuovo te ne accorgi subito.

  // SECURITY-AUDIT.md punto 4: nessun header di sicurezza era inviato. Senza
  // X-Frame-Options/frame-ancestors, un sito esterno potrebbe incorporare il
  // pannello admin in un iframe invisibile e indurre un admin già loggato a
  // cliccare azioni reali (clickjacking). Gli altri header sono difesa in
  // profondità a basso rischio di rottura (nessuna CSP più ampia per ora,
  // servirebbe un giro di test dedicato per non bloccare script/fetch legittimi).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;