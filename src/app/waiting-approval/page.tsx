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
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="mb-6"
          >
            <FaDiscord className="w-16 h-16 text-[#5865F2] drop-shadow-lg" />
          </motion.div>
          <motion.div
            className="h-12 w-12 border-4 border-pink-300 border-t-transparent rounded-full animate-spin mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          />
          <motion.p
            className="text-lg text-pink-500 font-semibold mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            กำลังโหลดข้อมูล...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/80 rounded-3xl shadow-2xl border border-pink-100 p-10 w-full max-w-md text-center relative overflow-hidden"
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
          className="text-3xl font-extrabold text-pink-600 mb-3 tracking-tight drop-shadow"
        >
          รอการอนุมัติจาก <span className="text-[#5865F2]">หัวกิลด์</span>
        </motion.h1>
        <AnimatePresence>
          {guildName && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-base md:text-lg text-gray-500 mb-2 font-medium"
            >
              กิลด์: {guildName}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-lg text-pink-400 mb-6"
        >
          กรุณารอหัวกิลด์อนุมัติการเข้าใช้งานระบบ<br />
          คุณจะได้รับสิทธิ์เข้าถึงระบบหลังจากได้รับการอนุมัติ
        </motion.p>
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