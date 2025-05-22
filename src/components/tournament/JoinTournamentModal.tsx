'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface JoinTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  tournamentId: string;
}

interface Character {
  id: string;
  name: string;
  class: string;
}

export function JoinTournamentModal({ isOpen, onClose, onSubmit, tournamentId }: JoinTournamentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const { user } = useAuth();

  // โหลดข้อมูลตัวละครของผู้ใช้
  useEffect(() => {
    async function loadCharacters() {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const userData = userDoc.data();
        if (userData?.characters) {
          setCharacters(userData.characters);
        }
      } catch (err) {
        console.error('Error loading characters:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลตัวละคร');
      }
    }

    if (isOpen) {
      loadCharacters();
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCharacter) return;

    setLoading(true);
    setError(null);

    try {
      const character = characters.find(c => c.id === selectedCharacter);
      if (!character) throw new Error('ไม่พบข้อมูลตัวละคร');

      // ตรวจสอบว่าทัวร์นาเมนต์ยังเปิดรับผู้เข้าร่วมอยู่หรือไม่
      const tournamentDoc = await getDoc(doc(firestore, 'tournaments', tournamentId));
      const tournamentData = tournamentDoc.data();
      
      if (!tournamentData) throw new Error('ไม่พบข้อมูลทัวร์นาเมนต์');
      if (tournamentData.status !== 'pending') throw new Error('ทัวร์นาเมนต์นี้ไม่เปิดรับผู้เข้าร่วมแล้ว');
      if (tournamentData.participants?.length >= tournamentData.maxParticipants) {
        throw new Error('ทัวร์นาเมนต์นี้เต็มแล้ว');
      }

      // เพิ่มผู้เข้าร่วม
      await updateDoc(doc(firestore, 'tournaments', tournamentId), {
        participants: arrayUnion({
          uid: user.uid,
          characterId: character.id,
          characterName: character.name,
          class: character.class
        })
      });

      onSubmit();
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าร่วมทัวร์นาเมนต์');
      console.error('Error joining tournament:', err);
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

          <h2 className="text-2xl font-bold text-pink-700 mb-4">เข้าร่วมทัวร์นาเมนต์</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="character" className="block text-sm font-medium text-gray-700 mb-1">
                เลือกตัวละคร
              </label>
              <select
                id="character"
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                required
              >
                <option value="">-- เลือกตัวละคร --</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} ({char.class})
                  </option>
                ))}
              </select>
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
                disabled={loading || !selectedCharacter}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'กำลังเข้าร่วม...' : 'เข้าร่วมทัวร์นาเมนต์'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 