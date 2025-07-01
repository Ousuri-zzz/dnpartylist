'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useThemeContext } from './ThemeProvider';

export function BackgroundImage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { resolvedTheme } = useThemeContext();

  useEffect(() => {
    // ตรวจสอบว่าหน้าเว็บโหลดเสร็จแล้วหรือยัง
    if (document.readyState === 'complete') {
      setIsLoaded(true);
    } else {
      window.addEventListener('load', () => setIsLoaded(true));
      return () => window.removeEventListener('load', () => setIsLoaded(true));
    }
  }, []);

  const bgSrc = resolvedTheme === 'dark' ? '/images/background-dark.jpg' : '/images/background.jpg';
  const bgColor = resolvedTheme === 'dark' ? '#18181b' : '#f8f9fa';

  return (
    <div 
      className="fixed inset-0 w-full h-full -z-10"
      style={{
        backgroundColor: bgColor,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0
      }}
    >
      <Image
        src={bgSrc}
        alt="Background"
        fill
        priority
        quality={100}
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
          filter: resolvedTheme === 'dark' ? 'brightness(0.95)' : undefined
        }}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
} 