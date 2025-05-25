'use client';

import { useEffect, useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, set, update, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { GuildService } from '@/lib/guildService';
import { useRouter, usePathname } from 'next/navigation';

let authListener: (() => void) | null = null;
let userListener: (() => void) | null = null;
let approvalListener: (() => void) | null = null;
let authState: { 
  user: User | null; 
  discordName: string; 
  isInitialized: boolean;
  approved?: boolean;
} = { 
  user: null, 
  discordName: '', 
  isInitialized: false,
  approved: undefined
};
let authSubscribers: ((state: { 
  user: User | null; 
  discordName: string; 
  isInitialized: boolean;
  approved?: boolean;
}) => void)[] = [];

// เพิ่ม debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ปรับปรุง notifySubscribers ให้ใช้ debounce
const notifySubscribers = debounce(() => {
  const clone = { ...authState };
  authSubscribers.forEach(subscriber => subscriber(clone));
}, 100);

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
        // สร้างข้อมูล User เริ่มต้น
        await GuildService.initializeUser(user.uid, user);
        
        // ตรวจสอบและอัปเดต photoURL ใน Database หากไม่มี
        const userDbRef = ref(db, `users/${user.uid}`);
        const userSnapshot = await get(userDbRef);
        if (user.photoURL && (!userSnapshot.exists() || !userSnapshot.val().photoURL)) {
          try {
            await update(userDbRef, { photoURL: user.photoURL });
            console.log(`Updated photoURL for user ${user.uid}`);
          } catch (dbError) {
            console.error('Error updating photoURL in database:', dbError);
          }
        }
        
        // ดึงข้อมูล Discord name และ approved
        const userMetaRef = ref(db, `users/${user.uid}/meta`);
        const snapshot = await get(userMetaRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const discordName = userData.discord;
          let approved = userData.approved;
          
          // แปลงค่า approved ให้เป็น boolean เสมอ
          if (typeof approved === 'string') {
            approved = approved === 'true';
          }
          
          // ถ้าเป็นผู้ใช้เก่า (มี Discord name แต่ไม่มีค่า approved) ให้เซ็ตเป็น true
          if (discordName && typeof approved !== 'boolean') {
            approved = true;
            await update(userMetaRef, { approved: true });
          }
          
          if (discordName) {
            authState.discordName = discordName;
            authState.approved = approved;
            // เซ็ต cookie approved
            document.cookie = `approved=${approved}; path=/; max-age=604800; SameSite=Lax`;
            // เพิ่มสมาชิกเข้ากิลด์อัตโนมัติ
            const guildRef = ref(db, 'guild');
            const guildSnapshot = await get(guildRef);
            
            if (guildSnapshot.exists()) {
              const memberRef = ref(db, `guild/members/${user.uid}`);
              const memberSnapshot = await get(memberRef);
              
              if (!memberSnapshot.exists()) {
                await GuildService.addMember(user.uid, discordName);
              }
            }

            // เพิ่มการตรวจสอบว่าผู้ใช้ยังอยู่ในระบบหรือไม่
            if (userListener) {
              userListener();
            }
            userListener = onValue(ref(db, `users/${user.uid}`), async (snapshot) => {
              // ถ้าผู้ใช้หายไปจากฐานข้อมูล
              if (!snapshot.exists()) {
                // บังคับ Logout
                await signOut(auth);
                // ลบ cookies
                document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'approved=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                // รีเซ็ต state
                authState.discordName = '';
                authState.approved = undefined;
                notifySubscribers();
                // redirect ไปหน้า login
                window.location.href = '/login';
              }
            });

            // เพิ่มการตรวจสอบสถานะการอนุมัติแบบ realtime
            if (approvalListener) {
              approvalListener();
            }
            approvalListener = onValue(userMetaRef, async (snapshot) => {
              if (snapshot.exists()) {
                const userData = snapshot.val();
                const newApproved = userData.approved === true;
                
                // ถ้าได้รับการอนุมัติ
                if (!authState.approved && newApproved) {
                  authState.approved = true;
                  // อัพเดท cookie
                  document.cookie = 'approved=true; path=/; max-age=604800; SameSite=Lax';
                  notifySubscribers();
                } else if (authState.approved && !newApproved) {
                  // ถ้าถูกยกเลิกการอนุมัติ
                  authState.approved = false;
                  document.cookie = 'approved=false; path=/; max-age=604800; SameSite=Lax';
                  notifySubscribers();
                }
              }
            });
          } else {
            authState.discordName = '';
            authState.approved = undefined;
            // ลบ cookie approved
            document.cookie = 'approved=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        } else {
          authState.discordName = '';
          authState.approved = undefined;
          // ลบ cookie approved
          document.cookie = 'approved=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        authState.discordName = '';
        authState.approved = undefined;
        // ลบ cookie approved
        document.cookie = 'approved=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    } else {
      // Remove the session cookie when user is not authenticated
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'approved=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      authState.discordName = '';
      authState.approved = undefined;
      
      // ยกเลิกการตรวจสอบสถานะผู้ใช้
      if (userListener) {
        userListener();
        userListener = null;
      }
      // ยกเลิกการตรวจสอบสถานะการอนุมัติ
      if (approvalListener) {
        approvalListener();
        approvalListener = null;
      }
    }
    
    authState.isInitialized = true;
    notifySubscribers();
  });
};

export function useAuth() {
  const [state, setState] = useState<{ 
    user: User | null; 
    discordName: string; 
    isInitialized: boolean;
    approved?: boolean;
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
      isInitialized: boolean;
      approved?: boolean;
    }) => {
      setState(prev => {
        // ตรวจสอบว่ามีการเปลี่ยนแปลงจริงหรือไม่
        if (JSON.stringify(prev) === JSON.stringify(newState)) {
          return prev;
        }
        return { ...newState };
      });
      setLoading(false);
    };
    
    authSubscribers.push(subscriber);
    setLoading(false);

    return () => {
      authSubscribers = authSubscribers.filter(s => s !== subscriber);
    };
  }, []);

  // ปรับปรุงการตรวจสอบการ redirect
  useEffect(() => {
    if (!loading && state.isInitialized) {
      // ถ้าไม่ได้ login ให้ไปหน้า login
      if (!state.user && pathname !== '/login') {
        router.push('/login');
        return;
      }

      // ถ้า login แล้ว
      if (state.user) {
        // ถ้าไม่มี Discord name ให้ไปหน้า set-discord
        if (!state.discordName && pathname !== '/set-discord') {
          router.push('/set-discord');
          return;
        }

        // ถ้ามี Discord name แต่ยังไม่ได้รับการอนุมัติ
        if (state.discordName && state.approved === false) {
          if (pathname !== '/waiting-approval') {
            router.push('/waiting-approval');
            return;
          }
        }

        // ถ้าได้รับการอนุมัติแล้ว
        if (state.approved === true) {
          // ถ้าอยู่ที่หน้า set-discord หรือ waiting-approval ให้ไปหน้า mypage
          if (pathname === '/set-discord' || pathname === '/waiting-approval') {
            router.push('/mypage');
            return;
          }
        }
      }
    }
  }, [state.user, state.discordName, state.approved, pathname, router, loading, state.isInitialized]);

  const login = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // หลังจาก login สำเร็จ ให้ตรวจสอบ approved status ก่อน redirect
      const userMetaRef = ref(db, `users/${result.user.uid}/meta`);
      const snapshot = await get(userMetaRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const hasDiscord = !!userData.discord;
        const isApproved = userData.approved === true;

        if (!hasDiscord) {
          router.push('/set-discord');
        } else if (!isApproved) {
          router.push('/waiting-approval');
        } else {
          router.push('/mypage');
        }
      } else {
        router.push('/set-discord');
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
    approved: state.approved,
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
        // ถ้า approved === false เท่านั้นที่ต้อง set approved: false
        if (authState.approved === false) {
          await GuildService.validateAndUpdateDiscordName(authState.user.uid, newName);
          const userMetaRef = ref(db, `users/${authState.user.uid}/meta`);
          await update(userMetaRef, { approved: false });
          authState.discordName = newName;
          authState.approved = false;
          // เซ็ต cookie approved เป็น false
          document.cookie = 'approved=false; path=/; max-age=604800; SameSite=Lax';
          notifySubscribers();
        } else {
          // approved === true หรือ undefined (user เก่า) → เปลี่ยนชื่อได้ทันที
          await GuildService.validateAndUpdateDiscordName(authState.user.uid, newName);
          authState.discordName = newName;
          notifySubscribers();
        }
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