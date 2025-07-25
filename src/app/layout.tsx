import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import ClientLayout from '@/components/ClientLayout';
import MusicPlayerWithEffects from '@/components/MusicPlayerWithEffects';


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
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="google-site-verification" content="jjWe_j0H4xlf3zDPsmTJfrjEqt2CrEiJqgFu9fXlBYU" />
        <link
          rel="preload"
          href="/images/background.jpg"
          as="image"
          type="image/jpeg"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    // Default to light mode
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {
                  // If error, default to light mode
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <MusicPlayerWithEffects 
          audioSrc="/audio/background-music.mp3"
          autoPlay={false}
          loop={true}
        />
      </body>
    </html>
  );
} 