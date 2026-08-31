import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'City Cargo - Logistics & Fleet Hub',
  description: 'Piattaforma di gestione flotta, check-in autisti e presenze City Cargo.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'City Cargo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E05353',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-[#F8F9FB] text-[#1E242B] antialiased">
        {children}
      </body>
    </html>
  );
}