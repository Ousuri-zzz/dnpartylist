'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';
import { motion } from 'framer-motion';
import { Home, Users, BarChart2, Calendar } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const showNavLinks = pathname !== '/login';
  
  return (
    <nav className="sticky top-0 w-full bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {showNavLinks ? (
            <>
              <div className="flex items-center gap-0 w-1/3">
                <Link
                  href="/mypage"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                    pathname === "/mypage"
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20"
                      : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-300 hover:border-pink-400 hover:text-pink-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Home className={cn(
                      "w-3.5 h-3.5 transition-colors duration-200",
                      pathname === "/mypage" ? "text-white" : "group-hover:text-pink-600 text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      pathname === "/mypage" ? "text-white" : "group-hover:text-pink-600 text-gray-700"
                    )}>
                      My Character
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
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                    pathname === "/party"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20"
                      : "bg-white/60 border border-purple-100 shadow-sm hover:bg-purple-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-purple-300 hover:border-purple-400 hover:text-purple-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Users className={cn(
                      "w-3.5 h-3.5 transition-colors duration-200",
                      pathname === "/party" ? "text-white" : "group-hover:text-purple-600 text-purple-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      pathname === "/party" ? "text-white" : "group-hover:text-purple-600 text-gray-700"
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
                <Link
                  href="/events"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                    pathname === "/events"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
                      : "bg-white/60 border border-indigo-100 shadow-sm hover:bg-indigo-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-indigo-300 hover:border-indigo-400 hover:text-indigo-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Calendar className={cn(
                      "w-3.5 h-3.5 transition-colors duration-200",
                      pathname === "/events" ? "text-white" : "group-hover:text-indigo-600 text-indigo-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      pathname === "/events" ? "text-white" : "group-hover:text-indigo-600 text-gray-700"
                    )}>
                      Event
                    </span>
                  </motion.div>
                  {pathname === "/events" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
                <Link
                  href="/ranking"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                    pathname === "/ranking"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20"
                      : "bg-white/60 border border-blue-100 shadow-sm hover:bg-blue-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-300 hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BarChart2 className={cn(
                      "w-3.5 h-3.5 transition-colors duration-200",
                      pathname === "/ranking" ? "text-white" : "group-hover:text-blue-600 text-blue-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      pathname === "/ranking" ? "text-white" : "group-hover:text-blue-600 text-gray-700"
                    )}>
                      Ranking
                    </span>
                  </motion.div>
                  {pathname === "/ranking" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg -z-10"
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