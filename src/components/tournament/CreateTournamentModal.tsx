'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateTournamentModal({ isOpen, onClose, onSubmit }: CreateTournamentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(firestore, 'tournaments'), {
        name,
        description,
        status: 'pending',
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        participants: [],
        brackets: [],
        currentRound: 0,
        maxParticipants: 32, // เริ่มต้นที่ 32 คน
      });

      onSubmit();
      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างทัวร์นาเมนต์');
      console.error('Error creating tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-pink-700 mb-4">สร้างทัวร์นาเมนต์</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อทัวร์นาเมนต์
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                รายละเอียด
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 h-32"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'กำลังสร้าง...' : 'สร้างทัวร์นาเมนต์'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 