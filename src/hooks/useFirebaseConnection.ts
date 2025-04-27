'use client';

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';

export function useFirebaseConnection() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // ตรวจสอบสถานะการเชื่อมต่อ
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // เช็คสถานะเริ่มต้น

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeFirebase() {
      try {
        // เช็คว่า Firestore พร้อมใช้งานหรือไม่
        if (db) {
          if (mounted) {
            setIsInitialized(true);
          }
        }
      } catch (err) {
        console.error('Failed to initialize Firebase:', err);
        if (mounted) {
          setError(err as Error);
        }
      }
    }

    initializeFirebase();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, isOnline, error };
} 