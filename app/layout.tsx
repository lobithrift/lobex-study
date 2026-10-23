import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/navigation/Footer';
import { PwaProvider } from '@/components/pwa/PwaContext';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { InstallModal } from '@/components/pwa/InstallModal';

export const metadata: Metadata = {
  title: 'Lobex Study | Academic Learning, Document Summarization & Exam Preparation',
  description:
    'Academic learning platform featuring document & PDF lecture note summarization, rigorous concept tutoring, examination practice tests, active recall flashcards, and personalized study timetables.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lobex Study',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <PwaProvider>
          <Navbar />
          <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
          <Footer />
          <InstallBanner />
          <InstallModal />
        </PwaProvider>
      </body>
    </html>
  );
}
