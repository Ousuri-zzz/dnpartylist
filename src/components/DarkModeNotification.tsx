'use client';

import { useThemeContext } from './ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Moon } from 'lucide-react';

export function DarkModeNotification() {
  const { resolvedTheme } = useThemeContext();

  // แสดงเฉพาะเมื่ออยู่ในโหมดมืด
  if (resolvedTheme !== 'dark') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="dark-mode-notification-container"
      >
        <div className="relative dark-mode-notification mx-auto">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/40 via-orange-500/30 to-yellow-500/40 blur-lg rounded-full scale-125 opacity-90"></div>
          
          {/* Main notification */}
          <div className="relative px-5 py-2.5 bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-yellow-600/95 backdrop-blur-lg rounded-full shadow-xl border border-amber-300/80">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-50 flex-shrink-0 drop-shadow-sm" />
              <span className="text-xs font-bold text-white tracking-wider uppercase drop-shadow-sm">
                โหมดมืดกำลังพัฒนา ยังไม่สมบูรณ์
              </span>
              <Moon className="w-4 h-4 text-amber-50 flex-shrink-0 drop-shadow-sm" />
            </div>
            
            {/* Enhanced shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 