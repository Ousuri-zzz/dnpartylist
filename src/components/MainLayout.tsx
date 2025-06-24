'use client';

import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { useUsers } from '../hooks/useUsers';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { BackgroundImage } from './BackgroundImage';
import { ThemeProvider } from './ThemeProvider';

const Navigation = dynamic(() => import('./Navigation'), {
  ssr: false,
  loading: () => <div className="h-14 bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm" />
});

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { users } = useUsers();
  const pathname = usePathname();
  const showSidebar = pathname !== '/login' && pathname !== '/ranking';

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThemeProvider>
        <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed transition-all duration-300" 
             style={{
               backgroundImage: "url('/images/background.jpg')",
               filter: "var(--background-filter, none)"
             }} />
        <div className="min-h-screen">
          <Navigation />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full pt-14">
            <div className="flex gap-0 pt-4">
              {/* Main Content */}
              <div className={cn(
                "flex-1 w-full",
                pathname === '/login' && "max-w-3xl mx-auto"
              )}>
                {children}
              </div>
            </div>
          </div>
        </div>
        
        <footer className="py-1.5 text-center mt-4 px-1 w-full">
          <div className="flex items-center w-full">
            <div className="flex-grow h-0.5 bg-border mx-2 md:mx-4 rounded-full" />
            <span
              className="inline-block rounded-full px-2 py-1 border border-border bg-card/90 backdrop-blur-md"
            >
              <span className="flex flex-col items-center justify-center gap-0.5">
                <span className="flex items-center justify-center gap-1">
                  <span className="text-pink-400 text-base md:text-lg align-middle select-none">🐾</span>
                  <span className="text-sm md:text-base font-semibold text-pink-400 select-none" style={{letterSpacing:'0.04em'}}>
                    GalaxyCat — รวมพลคนรัก Dragon Nest
                  </span>
                  <span className="text-pink-400 text-base md:text-lg align-middle select-none">🐾</span>
                </span>
                <span
                  className="text-muted-foreground text-xs select-none font-normal text-center"
                  style={{
                    letterSpacing: '0.02em',
                    textShadow: '0 1px 4px hsl(var(--background) / 0.18)'
                  }}
                >
                  พัฒนาโดย Ousuri | ขอบคุณที่เป็นส่วนหนึ่งของกิลด์เรา!
                </span>
              </span>
            </span>
            <div className="flex-grow h-0.5 bg-border mx-2 md:mx-4 rounded-full" />
          </div>
        </footer>
      </ThemeProvider>
    </ErrorBoundary>
  );
} 