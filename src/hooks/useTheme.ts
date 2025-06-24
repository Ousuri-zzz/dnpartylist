'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // ดึง theme จาก localStorage หรือใช้ system เป็นค่าเริ่มต้น
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    // ลบ class เดิม
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // ใช้ system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setResolvedTheme(systemTheme);
      root.classList.add(systemTheme);
    } else {
      // ใช้ theme ที่เลือก
      setResolvedTheme(theme);
      root.classList.add(theme);
    }

    // บันทึก theme ลง localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลง system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    resolvedTheme,
  };
} 