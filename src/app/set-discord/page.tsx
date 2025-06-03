"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaDiscord } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { ref, set, update } from "firebase/database";
import { db } from "@/lib/firebase";

export default function SetDiscordPage() {
  const { updateDiscordName, approved } = useAuth();
  const router = useRouter();
  const [discordName, setDiscordName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordName.trim()) {
      setError("กรุณากรอก Discord Name");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await updateDiscordName(discordName.trim());
      // กำหนด approved: false ใน meta เสมอ
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userMetaRef = ref(db, `users/${user.uid}/meta`);
        await update(userMetaRef, {
          discord: discordName.trim(),
          approved: false,
        });
      }
      // รอจนกว่า approved === false จริง ๆ ก่อน redirect
      let waited = 0;
      const maxWait = 2000; // 2 วินาที
      while (waited < maxWait) {
        if (approved === false) {
          router.replace("/waiting-approval");
          return;
        }
        await new Promise(res => setTimeout(res, 200));
        waited += 200;
      }
      // fallback
      router.replace("/waiting-approval");
      return;
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการบันทึกชื่อ Discord");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="relative">
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-200 p-10 w-full max-w-md text-center relative overflow-hidden"
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
          กรอกชื่อ <span className="text-[#5865F2]">Discord Name</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-base md:text-lg text-gray-500 mb-2 font-medium"
        >
          คุณต้องกรอก Discord Name เพื่อให้หัวกิลด์อนุมัติการเข้าใช้งานระบบ
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-sm text-pink-400 mb-6"
        >
          หลังจากบันทึก กรุณารอหัวกิลด์อนุมัติ
        </motion.p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.input
            type="text"
            className="w-full px-5 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-center bg-white/90 text-lg font-semibold shadow-sm transition-all duration-200 focus:scale-105 placeholder:text-gray-300"
            placeholder="กรอก Discord Name ของคุณ"
            value={discordName}
            onChange={e => setDiscordName(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          />
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-red-500 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            type="submit"
            className="w-full px-4 py-3 rounded-xl bg-pink-500/90 hover:bg-pink-600/90 text-white font-bold shadow-lg transition-all text-lg tracking-wide flex items-center justify-center gap-2"
            disabled={isSubmitting || !discordName.trim()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            whileTap={{ scale: 0.97 }}
          >
            {isSubmitting ? (
              <motion.span
                className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : null}
            {isSubmitting ? "กำลังยืนยัน..." : "ยืนยัน"}
          </motion.button>
        </form>
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