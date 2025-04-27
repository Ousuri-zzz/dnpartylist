'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export default function NavigationWrapper() {
  const pathname = usePathname();
  
  if (pathname === '/login') {
    return null;
  }
  
  return <Navigation />;
} 