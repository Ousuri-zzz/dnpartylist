'use client';

import { useEffect, useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { db } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [discordName, setDiscordName] = useState<string>('');

  useEffect(() => {
    console.log('useAuth: Setting up auth listener');
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('useAuth: Auth state changed', user ? 'User logged in' : 'No user');
      setUser(user);
      
      if (user) {
        // Get the ID token
        const token = await user.getIdToken();
        // Store the token in a cookie
        document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;

        const userMetaRef = ref(db, `users/${user.uid}/meta`);
        const snapshot = await get(userMetaRef);
        if (snapshot.exists()) {
          setDiscordName(snapshot.val().discord || '');
        }
      } else {
        // Remove the session cookie when user is not authenticated
        document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      setLoading(false);
    });

    return () => {
      console.log('useAuth: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      setDiscordName('');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateDiscordName = async (newName: string) => {
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }
    
    console.log('Updating discord name:', newName);
    try {
      const userRef = ref(db, `users/${user.uid}/meta`);
      await update(userRef, {
        discord: newName
      });
      console.log('Discord name updated in Database');
      
      setDiscordName(newName);
      console.log('Local discord name state updated');
    } catch (error) {
      console.error('Error updating discord name:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    discordName,
    updateDiscordName,
    signIn,
    signOut
  };
} 