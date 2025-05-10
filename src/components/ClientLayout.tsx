'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { MainLayout } from './MainLayout';
import { Providers } from '@/app/providers';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, discordName, approved } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // ถ้าไม่ได้ login ให้ไปหน้า login
    if (!user) {
      if (pathname !== '/login') {
        router.push('/login');
      }
      return;
    }

    // ถ้า login แล้ว ตรวจสอบ Discord และ approved
    if (user) {
      // ถ้าไม่มี Discord name ให้ไปหน้า set-discord
      if (!discordName && pathname !== '/set-discord') {
        router.push('/set-discord');
        return;
      }

      // ถ้ามี Discord name แต่ยังไม่ได้รับการอนุมัติ ให้ไปหน้า waiting-approval
      if (discordName && approved === false && pathname !== '/waiting-approval') {
        router.push('/waiting-approval');
        return;
      }

      // ถ้าได้รับการอนุมัติแล้ว และพยายามเข้าหน้า set-discord หรือ waiting-approval ให้ไปหน้า mypage
      if (approved === true && (pathname === '/set-discord' || pathname === '/waiting-approval')) {
        router.push('/mypage');
        return;
      }
    }
  }, [user, loading, discordName, approved, pathname, router]);

  return (
    <Providers>
      <MainLayout>
        {children}
      </MainLayout>
      <Toaster richColors position="top-center" />
    </Providers>
  );
} 