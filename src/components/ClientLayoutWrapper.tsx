"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, discordName, approved } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRedirecting = useRef(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting.current) return;
    // ถ้าไม่ login
    if (!user) {
      if (pathname !== "/login") {
        isRedirecting.current = true;
        setTimeout(() => {
          router.replace("/login");
          isRedirecting.current = false;
        }, 200);
      }
      return;
    }
    // ถ้า login แล้ว ไม่มีชื่อ discord
    if (!discordName) {
      if (pathname !== "/set-discord") {
        isRedirecting.current = true;
        setTimeout(() => {
          router.replace("/set-discord");
          isRedirecting.current = false;
        }, 200);
      }
      return;
    }
    // ถ้า login แล้ว มีชื่อ discord แล้ว approved === false
    if (approved === false) {
      if (pathname !== "/waiting-approval") {
        isRedirecting.current = true;
        setTimeout(() => {
          router.replace("/waiting-approval");
          isRedirecting.current = false;
        }, 200);
        return;
      }
      return;
    }
    // ถ้า login แล้ว approved === true หรือ undefined (สมาชิกเก่า)
    // แต่ยังอยู่ที่ /waiting-approval ให้ redirect ไป /mypage
    if ((approved === true || typeof approved === 'undefined') && pathname === "/waiting-approval") {
      isRedirecting.current = true;
      setTimeout(() => {
        router.replace("/mypage");
        isRedirecting.current = false;
      }, 200);
      return;
    }
    // ให้เข้าใช้งานระบบปกติ
  }, [user, loading, discordName, approved, router, pathname]);

  useEffect(() => {
    if (!loadingTimeout && loading) {
      const timeout = setTimeout(() => setLoadingTimeout(true), 10000);
      return () => clearTimeout(timeout);
    } else if (!loading) {
      setLoadingTimeout(false);
    }
  }, [loading, loadingTimeout]);

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Outer ring with gradient */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg animate-pulse"></div>
          
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
          
          {/* Inner ring with gradient */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 shadow-inner animate-pulse"></div>
          </div>
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  // ถ้าอยู่ที่ /login และยังไม่ login ให้ render children (UI login เดิม)
  if (!user && pathname === "/login") {
    return <>{children}</>;
  }
  // ถ้า login แล้ว ไม่มีชื่อ discord และอยู่ที่ /set-discord ให้ render children
  if (user && !discordName && pathname === "/set-discord") {
    return <>{children}</>;
  }
  // ขณะ redirect
  if (!user || (!discordName && pathname !== "/set-discord") || (approved === false && pathname !== "/waiting-approval")) {
    return null;
  }
  // ปกติ
  return <>{children}</>;
} 