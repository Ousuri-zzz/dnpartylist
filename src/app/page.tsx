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
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
    </div>
  );
} 