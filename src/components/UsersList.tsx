import { useUsers } from '@/hooks/useUsers';
import { motion } from 'framer-motion';

export function UsersList() {
  const { users, isLoading, error } = useUsers();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50/50 to-purple-50/50"
      >
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
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
      </div>
    );
  }

  const usersArray = Object.values(users);
  if (usersArray.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        <p>ไม่พบข้อมูลผู้เล่น</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2 p-4"
    >
      {usersArray.map((user) => (
        <motion.div
          key={user.uid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-sm">
                {(user.displayName || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">
              {user.meta?.discord || user.discordName || 'ไม่ระบุชื่อ'}
            </span>
            <span className="text-xs text-gray-500">
              {user.meta?.discord || user.discordName || 'ไม่ได้เชื่อมต่อ Discord'}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
} 