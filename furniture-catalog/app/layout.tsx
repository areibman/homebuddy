import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree, Geist, Geist_Mono, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from './studio/providers';
import './globals.css';
import './studio/studio.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
});

const body = Figtree({
  variable: '--font-body',
  subsets: ['latin'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Homebuddy — Furnish the room you already have',
  description: 'Walk through a furnished apartment, then upload your own floor plan and photos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${body.variable} ${mono.variable} antialiased`}
      >
        <Providers url={process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? ''}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
