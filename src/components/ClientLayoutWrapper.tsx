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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
        <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        {loadingTimeout && (
          <div className="mt-6 text-red-500 font-semibold text-center">
            เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าใหม่ หรือ login ใหม่อีกครั้ง<br/>
            หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
          </div>
        )}
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