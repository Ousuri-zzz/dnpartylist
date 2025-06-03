'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect to login
  }
  
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 