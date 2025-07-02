'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { FaCat } from 'react-icons/fa';
import { useTheme } from '../../hooks/useTheme';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/mypage';
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!loading && user) {
      router.push(from);
    }
  }, [user, loading, router, from]);

  if (!resolvedTheme) {
    return <div className="min-h-screen" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-transparent">
        <div className="relative">
          {/* Spinning ring */}
          <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 relative"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="relative group">
          <div key={resolvedTheme} className="relative p-6 sm:p-10 space-y-6 bg-white/90 dark:!bg-black/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-200">
            <div className="text-center space-y-2">
              <motion.h1
                className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-bold bg-clip-text text-transparent drop-shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <FaCat className="w-8 h-8 drop-shadow-sm shimmer-pastel" style={{ color: '#22d3ee', filter: 'drop-shadow(0 1px 2px #fff6) brightness(1.08)' }} />
                <span
                  className="shimmer-text"
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(90deg, #f9a8d4 0%, #fbc2eb 12%, #c4b5fd 25%, #a7ffeb 37%, #7dd3fc 50%, #b9fbc0 62%, #fff1fa 75%, #f9a8d4 87%, #f9a8d4 100%)',
                    backgroundSize: '400% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 1px 2px #fff6)'
                  }}
                >
                  GalaxyCat
                </span>
                <FaCat className="w-8 h-8 drop-shadow-sm shimmer-pastel" style={{ color: '#f59e42', filter: 'drop-shadow(0 1px 2px #fff6) brightness(1.08)' }} />
                <style jsx global>{`
                  .shimmer-text {
                    animation: shimmer-gradient 2.5s linear infinite;
                    background-size: 400% 100%;
                  }
                  @keyframes shimmer-gradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                  }
                  .shimmer-pastel {
                    filter: drop-shadow(0 1px 2px #fff6) brightness(1.08);
                    animation: pastel-gradient 4s linear infinite;
                    transition: filter 0.3s;
                  }
                  @keyframes pastel-gradient {
                    0% { filter: hue-rotate(0deg) brightness(1.08) drop-shadow(0 1px 2px #fff6); }
                    100% { filter: hue-rotate(360deg) brightness(1.08) drop-shadow(0 1px 2px #fff6); }
                  }
                `}</style>
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