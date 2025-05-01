'use client';

import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { Sidebar } from './Sidebar';
import { useUsers } from '../hooks/useUsers';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { useDiscordCheck } from '../hooks/useDiscordCheck';

const NavigationWrapper = dynamic(() => import('./Navigation').then(mod => ({ default: mod.Navigation })), {
  ssr: false,
}) as unknown as typeof import('./Navigation').Navigation;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { users } = useUsers();
  const pathname = usePathname();
  const showSidebar = pathname !== '/login' && pathname !== '/ranking';
  useDiscordCheck();

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-100 to-sky-100">
        <NavigationWrapper />
        <div className="container mx-auto px-4">
          <div className="flex gap-6 pt-4">
            {/* Main Content */}
            <div className={cn(
              "flex-1",
              pathname === '/login' && "max-w-3xl mx-auto"
            )}>
              {children}
            </div>
            
            {/* Sidebar */}
            {showSidebar && (
              <div className="w-72 hidden lg:block">
                <div className="sticky top-16">
                  <div className="bg-white/30 backdrop-blur-md border border-pink-200/50 shadow-lg p-4 rounded-xl">
                    <Sidebar users={users} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <footer className="py-4 text-center text-gray-600 text-sm mt-8">
          Guild GalaxyCat by Ousuri
        </footer>
      </div>
    </ErrorBoundary>
  );
} 