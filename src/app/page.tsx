'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { DiscordNameDialog } from '@/components/DiscordNameDialog';
import { toast } from 'sonner';

export default function HomePage() {
  const { user, loading: authLoading, updateDiscordName, showDiscordDialog, setShowDiscordDialog } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkDiscordName = async () => {
      if (!user || authLoading) return;

      try {
        const metaRef = ref(db, `users/${user.uid}/meta`);
        const metaSnapshot = await get(metaRef);
        const hasDiscord = metaSnapshot.exists() && metaSnapshot.val().discord;

        if (!hasDiscord) {
          setShowDiscordDialog(true);
        } else {
          // ถ้ามีชื่อ Discord แล้ว ให้ไปที่หน้า mypage
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
  }, [user, authLoading, router, setShowDiscordDialog]);

  const handleDiscordSubmit = async (discordName: string) => {
    try {
      await updateDiscordName(discordName);
      setShowDiscordDialog(false);
      toast.success('บันทึกชื่อ Discord เรียบร้อยแล้ว');
      router.push('/mypage');
    } catch (error) {
      console.error('Error updating Discord name:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกชื่อ Discord');
    }
  };

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
      {showDiscordDialog && (
        <DiscordNameDialog onSubmit={handleDiscordSubmit} />
      )}
    </div>
  );
} 