'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeContext } from './ThemeProvider';
import { motion } from 'framer-motion';

export function ThemeToggle({ isMobile = false }: { isMobile?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useThemeContext();

  const toggleTheme = () => {
    if (theme === 'system') {
      // ถ้าเป็น system ให้สลับไปเป็น light หรือ dark ตาม resolvedTheme ปัจจุบัน
      setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    } else {
      // ถ้าเป็น light หรือ dark ให้สลับไปเป็นตรงข้าม
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const getIcon = () => {
    return resolvedTheme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button 
        onClick={toggleTheme}
        className={
          `h-8 w-8 px-1 py-1 rounded-lg font-bold ${isMobile ? '' : 'text-white/90'} bg-transparent shadow-lg transition-all duration-200
          hover:bg-gray-600/60 focus:bg-gray-700 active:bg-gray-700
          flex items-center justify-center`
        }
        style={{ minWidth: '32px', minHeight: '32px' }}
        title={`โหมด${resolvedTheme === 'dark' ? 'มืด' : 'สว่าง'} - คลิกเพื่อสลับเป็นโหมด${resolvedTheme === 'dark' ? 'สว่าง' : 'มืด'}`}
      >
        <motion.div
          key={resolvedTheme}
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {resolvedTheme === 'dark'
            ? <Moon className={`h-4 w-4 ${isMobile ? 'text-white' : 'text-white'}`} />
            : <Sun className={`h-4 w-4 ${isMobile ? 'text-black' : 'text-white'}`} />
          }
        </motion.div>
        <span className="sr-only">Toggle theme</span>
      </Button>
    </motion.div>
  );
} 