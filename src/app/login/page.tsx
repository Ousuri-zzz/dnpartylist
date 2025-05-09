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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
          <div className="relative p-4 sm:p-8 space-y-4 sm:space-y-6 bg-white/80 backdrop-blur-lg rounded-xl shadow-xl">
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
              className="w-full px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-lg relative group overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative">เข้าสู่ระบบด้วย Google</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 