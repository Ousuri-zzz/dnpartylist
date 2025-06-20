import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'GalaxyCat',
    template: '%s | GalaxyCat'
  },
  description: 'Dragon Nest Party List - เว็บไซต์สำหรับผู้เล่น Dragon Nest (Classic)',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'GalaxyCat',
    description: 'Dragon Nest Party List - เว็บไซต์สำหรับผู้เล่น Dragon Nest (Classic)',
    type: 'website',
  }
} 