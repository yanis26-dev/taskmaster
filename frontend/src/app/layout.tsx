import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'TaskMaster',
  description: 'Personal task management with Outlook integration',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen bg-monday-surface-secondary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
