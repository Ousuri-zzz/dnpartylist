'use client';

import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { useUsers } from '../hooks/useUsers';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { useDiscordCheck } from '../hooks/useDiscordCheck';

const Navigation = dynamic(() => import('./Navigation'), {
  ssr: false,
  loading: () => <div className="h-14 bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm" />
});

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { users } = useUsers();
  const pathname = usePathname();
  const showSidebar = pathname !== '/login' && pathname !== '/ranking';
  useDiscordCheck();

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-100 to-sky-100">
        <Navigation />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
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
        
        <footer className="py-4 text-center text-gray-600 text-sm mt-8 px-4">
          Guild GalaxyCat by Ousuri
        </footer>
      </div>
    </ErrorBoundary>
  );
} 