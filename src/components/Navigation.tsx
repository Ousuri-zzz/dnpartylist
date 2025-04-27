'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';

export function Navigation() {
  const pathname = usePathname();
  const showNavLinks = pathname !== '/login';
  
  return (
    <nav className="sticky top-0 w-full bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {showNavLinks ? (
            <>
              <div className="flex items-center gap-6 w-1/3">
                <Link
                  href="/mypage"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-pink-600",
                    pathname === "/mypage" ? "text-pink-600" : "text-gray-600"
                  )}
                >
                  My Page
                </Link>
                <Link
                  href="/party"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-pink-600",
                    pathname === "/party" ? "text-pink-600" : "text-gray-600"
                  )}
                >
                  Party List
                </Link>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm text-gray-500">Guild GalaxyCat by Ousuri</span>
              </div>
              <div className="w-1/3 flex justify-end">
                <DiscordDropdown />
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <DiscordDropdown />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 