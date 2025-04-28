'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';
import { motion } from 'framer-motion';
import { Home, Users } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const showNavLinks = pathname !== '/login';
  
  return (
    <nav className="sticky top-0 w-full bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {showNavLinks ? (
            <>
              <div className="flex items-center gap-3 w-1/3">
                <Link
                  href="/mypage"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300",
                    pathname === "/mypage" 
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20" 
                      : "hover:bg-pink-50/50"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Home className={cn(
                      "w-3.5 h-3.5",
                      pathname === "/mypage" ? "text-white" : "text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      pathname === "/mypage" ? "text-white" : "text-gray-700"
                    )}>
                      My Page
                    </span>
                  </motion.div>
                  {pathname === "/mypage" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
                <Link
                  href="/party"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300",
                    pathname === "/party" 
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20" 
                      : "hover:bg-purple-50/50"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Users className={cn(
                      "w-3.5 h-3.5",
                      pathname === "/party" ? "text-white" : "text-purple-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      pathname === "/party" ? "text-white" : "text-gray-700"
                    )}>
                      Party List
                    </span>
                  </motion.div>
                  {pathname === "/party" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
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