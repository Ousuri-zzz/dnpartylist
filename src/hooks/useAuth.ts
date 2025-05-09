'use client';

import { useEffect, useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { GuildService } from '@/lib/guildService';
import { useRouter, usePathname } from 'next/navigation';

let authListener: (() => void) | null = null;
let authState: { 
  user: User | null; 
  discordName: string; 
  showDiscordDialog: boolean;
  isInitialized: boolean;
} = { 
  user: null, 
  discordName: '', 
  showDiscordDialog: false,
  isInitialized: false
};
let authSubscribers: ((state: { 
  user: User | null; 
  discordName: string; 
  showDiscordDialog: boolean;
  isInitialized: boolean;
}) => void)[] = [];

const notifySubscribers = () => {
  const clone = { ...authState };
  authSubscribers.forEach(subscriber => subscriber(clone));
};

const setupAuthListener = () => {
  if (authListener) return;

  const auth = getAuth();
  authListener = onAuthStateChanged(auth, async (user) => {
    authState.user = user;
    
    if (user) {
      // Get the ID token
      const token = await user.getIdToken();
      // Store the token in a cookie with longer expiration
      document.cookie = `auth-token=${token}; path=/; max-age=604800; SameSite=Lax`;

      try {
        // ดึงข้อมูล Discord name
        const userMetaRef = ref(db, `users/${user.uid}/meta`);
        const snapshot = await get(userMetaRef);
        if (snapshot.exists()) {
          authState.discordName = snapshot.val().discord || '';
        }

        // เพิ่มสมาชิกเข้ากิลด์อัตโนมัติ
        const guildRef = ref(db, 'guild');
        const guildSnapshot = await get(guildRef);
        
        if (guildSnapshot.exists()) {
          const memberRef = ref(db, `guild/members/${user.uid}`);
          const memberSnapshot = await get(memberRef);
          
          if (!memberSnapshot.exists()) {
            await GuildService.addMember(user.uid, user.displayName || 'Unknown');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    } else {
      // Remove the session cookie when user is not authenticated
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      authState.discordName = '';
    }
    
    authState.isInitialized = true;
    notifySubscribers();
  });
};

export function useAuth() {
  const [state, setState] = useState<{ 
    user: User | null; 
    discordName: string; 
    showDiscordDialog: boolean;
    isInitialized: boolean;
  }>(() => ({ ...authState }));
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setupAuthListener();
    
    const subscriber = (newState: { 
      user: User | null; 
      discordName: string; 
      showDiscordDialog: boolean;
      isInitialized: boolean;
    }) => {
      setState(() => ({ ...newState }));
      setLoading(false);
    };
    
    authSubscribers.push(subscriber);
    setLoading(false);

    return () => {
      authSubscribers = authSubscribers.filter(s => s !== subscriber);
    };
  }, []);

  const login = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // หลังจาก login สำเร็จ ให้ redirect ไปที่หน้าที่กำลังอยู่
      const currentPath = window.location.pathname;
      if (currentPath === '/login') {
        router.push('/mypage');
      }
      
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      authState.discordName = '';
      notifySubscribers();
      router.push('/login');
    } catch (error) {
      throw error;
    }
  };

  return {
    user: state.user,
    loading: loading || !state.isInitialized,
    discordName: state.discordName,
    showDiscordDialog: state.showDiscordDialog,
    setShowDiscordDialog: (show: boolean) => {
      authState.showDiscordDialog = show;
      notifySubscribers();
    },
    updateDiscordName: async (newName: string) => {
      if (!authState.user) {
        console.error('No user logged in');
        throw new Error('No user logged in');
      }
      
      if (authState.discordName === newName) {
        console.log('Discord name unchanged, skipping update');
        return;
      }
      
      try {
        const userRef = ref(db, `users/${authState.user.uid}/meta`);
        await update(userRef, {
          discord: newName
        });
        
        authState.discordName = newName;
        notifySubscribers();
      } catch (error) {
        console.error('Error updating discord name:', error);
        throw error;
      }
    },
    login,
    logout,
    isSigningIn
  };
} 