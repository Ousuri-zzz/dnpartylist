import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { MainLayout } from '../components/MainLayout'
import { Toaster } from 'react-hot-toast'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'DNPartyList',
    template: '%s | DNPartyList'
  },
  description: 'Dragon Nest Party List - เว็บไซต์สำหรับผู้เล่น Dragon Nest (Classic)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
} 