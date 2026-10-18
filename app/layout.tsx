import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';

export const preferredRegion = ['sin1'];

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: { default: 'nontonhub', template: '%s | nontonhub' },
  description: 'Cari dan tonton anime serta video favoritmu di nontonhub.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="wrap">
          <header className="top">
            <Link href="/" className="logo" aria-label="nontonhub, ke beranda">
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <rect width="30" height="30" rx="10" fill="#ff6f91" />
                <path d="M12 9.5v11l9-5.5z" fill="#1b1740" />
              </svg>
              nontonhub
            </Link>
            <form action="/" role="search" className="search">
              <input type="search" name="q" placeholder="Cari anime atau video" aria-label="Cari anime atau video" />
              <button type="submit">Cari</button>
            </form>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
