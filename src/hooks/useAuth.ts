'use client';

import { useEffect, useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { GuildService } from '@/lib/guildService';

let authListener: (() => void) | null = null;
let authState: { user: User | null; discordName: string; showDiscordDialog: boolean } = { 
  user: null, 
  discordName: '', 
  showDiscordDialog: false 
};
let authSubscribers: ((state: { user: User | null; discordName: string; showDiscordDialog: boolean }) => void)[] = [];

const notifySubscribers = () => {
  // Always send a new object reference to force re-render
  const clone = { ...authState };
  authSubscribers.forEach(subscriber => subscriber(clone));
};

const setupAuthListener = () => {
  if (authListener) return;

  console.log('useAuth: Setting up auth listener');
  const auth = getAuth();
  authListener = onAuthStateChanged(auth, async (user) => {
    console.log('useAuth: Auth state changed', user ? 'User logged in' : 'No user');
    authState.user = user;
    
    if (user) {
      // Get the ID token
      const token = await user.getIdToken();
      // Store the token in a cookie
      document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;

      const userMetaRef = ref(db, `users/${user.uid}/meta`);
      const snapshot = await get(userMetaRef);
      if (snapshot.exists()) {
        authState.discordName = snapshot.val().discord || '';
      }

      // เพิ่มสมาชิกเข้ากิลด์อัตโนมัติ
      try {
        const guildRef = ref(db, 'guild');
        const snapshot = await get(guildRef);
        
        if (snapshot.exists()) {
          const memberRef = ref(db, `guild/members/${user.uid}`);
          const memberSnapshot = await get(memberRef);
          
          if (!memberSnapshot.exists()) {
            await GuildService.addMember(user.uid, user.displayName || 'Unknown');
          }
        }
      } catch (error) {
        console.error('Error auto-joining guild:', error);
      }
    } else {
      // Remove the session cookie when user is not authenticated
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      authState.discordName = '';
    }
    
    notifySubscribers();
  });
};

export function useAuth() {
  const [state, setState] = useState<{ user: User | null; discordName: string; showDiscordDialog: boolean }>(() => ({ ...authState }));
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    setupAuthListener();
    
    const subscriber = (newState: { user: User | null; discordName: string; showDiscordDialog: boolean }) => {
      setState(() => ({ ...newState }));
      setLoading(false);
    };
    
    authSubscribers.push(subscriber);
    setLoading(false);

    return () => {
      authSubscribers = authSubscribers.filter(s => s !== subscriber);
    };
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      authState.discordName = '';
      notifySubscribers();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateDiscordName = async (newName: string) => {
    if (!authState.user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    
    // Prevent unnecessary updates if the name is the same
    if (authState.discordName === newName) {
      console.log('Discord name unchanged, skipping update');
      return;
    }
    
    console.log('Updating discord name:', newName);
    try {
      const userRef = ref(db, `users/${authState.user.uid}/meta`);
      await update(userRef, {
        discord: newName
      });
      console.log('Discord name updated in Database');
      
      // Update state and notify subscribers
      authState.discordName = newName;
      notifySubscribers();
      console.log('Local discord name state updated');
    } catch (error) {
      console.error('Error updating discord name:', error);
      throw error;
    }
  };

  const setShowDiscordDialog = (show: boolean) => {
    authState.showDiscordDialog = show;
    notifySubscribers();
  };

  return {
    user: state.user,
    loading,
    discordName: state.discordName,
    showDiscordDialog: state.showDiscordDialog,
    setShowDiscordDialog,
    updateDiscordName,
    signIn,
    signOut,
    isSigningIn
  };
} 