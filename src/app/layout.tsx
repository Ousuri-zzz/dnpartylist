import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'GalaxyCat',
    template: '%s | GalaxyCat'
  },
  description: 'Dragon Nest Party List - เว็บไซต์สำหรับผู้เล่น Dragon Nest (Classic)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
} 