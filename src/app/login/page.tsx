'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FaCat } from 'react-icons/fa';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/mypage';

  useEffect(() => {
    if (!loading && user) {
      router.push(from);
    }
  }, [user, loading, router, from]);

  if (loading) {
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
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="relative group">
          <div className="relative p-6 sm:p-10 space-y-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-200">
            <div className="text-center space-y-2">
              <motion.h1 
                className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <FaCat className="w-8 h-8 text-pink-300 drop-shadow-sm shimmer-pastel" />
                GalaxyCat
                <FaCat className="w-8 h-8 text-blue-300 drop-shadow-sm shimmer-pastel" />
              </motion.h1>
              <motion.p 
                className="text-sm sm:text-base text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                เข้าสู่ระบบเพื่อจัดการตัวละครของคุณ
              </motion.p>
            </div>

            <motion.button
              onClick={login}
              className="w-full px-6 py-3 text-lg font-bold text-white bg-pink-500/90 hover:bg-pink-600/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl relative group overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative">เข้าสู่ระบบด้วย Google</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 