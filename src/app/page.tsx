'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function HomePage() {
  const { user, loading: authLoading, updateDiscordName } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkDiscordName = async () => {
      if (!user || authLoading) return;

      try {
        const metaRef = ref(db, `users/${user.uid}/meta`);
        const metaSnapshot = await get(metaRef);
        const hasDiscord = metaSnapshot.exists() && metaSnapshot.val().discord;

        if (hasDiscord) {
          router.push('/mypage');
        }
      } catch (error) {
        console.error('Error checking Discord name:', error);
        toast.error('เกิดข้อผิดพลาดในการตรวจสอบชื่อ Discord');
      } finally {
        setIsChecking(false);
      }
    };

    checkDiscordName();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
    </div>
  );
} 