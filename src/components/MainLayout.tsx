'use client';

import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { useUsers } from '../hooks/useUsers';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';

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
        
        <footer className="py-6 text-center mt-8 px-4">
          <span className="inline-block bg-white/80 rounded-full px-6 py-3 border border-pink-100 backdrop-blur-sm">
            <span className="flex flex-col items-center justify-center gap-0.5">
              <span className="text-lg md:text-xl font-semibold text-pink-400 select-none" style={{letterSpacing:'0.04em'}}>
                🐾 GalaxyCat — รวมพลคนรัก Dragon Nest
              </span>
              <span className="text-pink-300 text-sm md:text-base select-none" style={{letterSpacing:'0.02em'}}>
                พัฒนาโดย Ousuri | ขอบคุณที่เป็นส่วนหนึ่งของกิลด์เรา!
              </span>
            </span>
          </span>
        </footer>
      </div>
    </ErrorBoundary>
  );
} 