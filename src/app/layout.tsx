import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
const analyticsDomain = process.env.NEXT_PUBLIC_ANALYTICS_ID || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'Auralis - Somatic Frequency Generator & Binaural Entrainment',
  description: 'Professional browser-based frequency generator with binaural beats, ambient noise layers, and real-time visualization. Nervous system regulation through high-fidelity sound.',
  keywords: ['binaural beats', 'frequency generator', 'somatic healing', 'meditation', 'sound therapy', 'brainwave entrainment'],
  authors: [{ name: 'Auralis Team' }],
  creator: 'Auralis',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Auralis',
    title: 'Auralis - Somatic Frequency Generator',
    description: 'Real-time frequency generator with binaural beats for meditation, focus, and sleep.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Auralis - Somatic Frequency Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auralis - Somatic Frequency Generator',
    description: 'Real-time frequency generator with binaural beats for meditation, focus, and sleep.',
    images: ['/og-image.png'],
    creator: '@auralis',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics Script */}
        {analyticsEnabled && analyticsDomain && (
          <>
            <Script
              src="https://plausible.io/js/script.js"
              strategy="lazyOnload"
              data-domain={analyticsDomain}
            />
            <Script
              id="plausible-events"
              strategy="lazyOnload"
              dangerouslySetInnerHTML={{
                __html: `
                  window.plausible = window.plausible || function() {
                    (window.plausible.q = window.plausible.q || []).push(arguments)
                  }
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
