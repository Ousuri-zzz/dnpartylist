'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useState } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'หน้าแรก | DNPartyList',
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 