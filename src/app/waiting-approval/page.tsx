"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FaDiscord } from "react-icons/fa";

export default function WaitingApprovalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [guildName, setGuildName] = useState("");

  useEffect(() => {
    const checkApproval = async () => {
      if (!user || authLoading) return;
      try {
        const metaRef = ref(db, `users/${user.uid}/meta`);
        const metaSnapshot = await get(metaRef);
        const approved = metaSnapshot.exists() && metaSnapshot.val().approved;
        if (approved) {
          router.push('/mypage');
        } else {
          // ดึงชื่อกิลด์
          const guildRef = ref(db, 'guild/name');
          const guildSnapshot = await get(guildRef);
          if (guildSnapshot.exists()) {
            setGuildName(guildSnapshot.val());
          }
        }
      } catch (error) {
        console.error('Error checking approval:', error);
        toast.error('เกิดข้อผิดพลาดในการตรวจสอบการอนุมัติ');
      } finally {
        setIsChecking(false);
      }
    };
    checkApproval();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-200 p-8 md:p-12 w-full max-w-xl text-center relative overflow-hidden"
      >
        {/* Discord Icon with floating animation */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: [0, -10, 0], opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
          className="mb-4"
        >
          <FaDiscord className="w-20 h-20 text-[#5865F2] mx-auto drop-shadow-lg" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-extrabold text-pink-600 mb-4 tracking-tight drop-shadow"
        >
          รอการอนุมัติจาก <span className="text-[#5865F2]">หัวกิลด์</span>
        </motion.h1>
        {guildName && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-lg font-bold text-pink-500 mb-4"
          >
            กิลด์: {guildName}
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-base md:text-lg text-gray-600 mb-4 leading-relaxed"
        >
          ขณะนี้ข้อมูลของคุณอยู่ระหว่างการตรวจสอบโดยหัวกิลด์<br />
          กรุณารอให้หัวกิลด์อนุมัติการเข้าใช้งานระบบ
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="text-sm text-pink-400 mb-8"
        >
          คุณจะได้รับสิทธิ์เข้าถึงระบบทันทีหลังจากได้รับการอนุมัติ
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6"
        >
          <a
            href="https://discord.com/users/1163943838826631258"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-500/90 hover:bg-sky-600/90 text-white shadow-lg text-base font-bold transition-all"
          >
            <FaDiscord className="w-5 h-5" />
            ติดต่อหัวกิลด์
          </a>
        </motion.div>
        {/* เอฟเฟคพื้นหลังเบา ๆ */}
        <motion.div
          className="absolute -top-10 -right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-2xl z-0"
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "loop" }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl z-0"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, repeatType: "loop" }}
        />
      </motion.div>
    </div>
  );
} 