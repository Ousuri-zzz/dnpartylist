'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCharacters } from '@/hooks/useCharacters';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';

export default function JoinPartyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { characters } = useCharacters();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [party, setParty] = useState<any>(null);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);

  // Fetch party data and check available characters
  useEffect(() => {
    const fetchPartyAndCharacters = async () => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!characters?.length) {
        router.replace('/mypage');
        return;
      }

      try {
        // Get party data
        const partyRef = ref(db, `parties/${params.id}`);
        const partySnapshot = await get(partyRef);
        const partyData = partySnapshot.val();

        if (!partyData) {
          toast.error('ไม่พบข้อมูลปาร์ตี้');
          router.replace('/');
          return;
        }

        // Check if party is full
        const currentMemberCount = Object.keys(partyData.members || {}).length;
        if (currentMemberCount >= partyData.maxMember) {
          toast.error('ปาร์ตี้เต็มแล้ว');
          router.replace(`/party/${params.id}`);
          return;
        }

        setParty(partyData);

        // Get all parties in the same nest
        const allPartiesRef = ref(db, 'parties');
        const allPartiesSnapshot = await get(allPartiesRef);
        const allParties = allPartiesSnapshot.val();

        // Filter available characters
        const available = characters.filter(char => {
          // Check if character is not in any party in the same nest
          const isInOtherParty = Object.values(allParties).some((p: any) => 
            p.nest === partyData.nest && 
            p.members && 
            p.members[char.id]
          );

          return !isInOtherParty;
        });

        if (available.length === 0) {
          toast.error('คุณไม่มีตัวละครที่สามารถเข้าร่วมปาร์ตี้นี้ได้');
          router.replace(`/party/${params.id}`);
          return;
        }

        setAvailableCharacters(available);
        setIsLoading(false);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        router.replace('/');
      }
    };

    fetchPartyAndCharacters();
  }, [user, characters, params.id, router]);

  const handleJoinParty = async (charId: string) => {
    if (!user?.uid || isJoining) {
      toast.error('กรุณาเข้าสู่ระบบก่อนเข้าร่วมปาร์ตี้');
      router.replace('/login');
      return;
    }

    try {
      setIsJoining(true);

      // ตรวจสอบข้อมูลตัวละคร
      const userCharRef = ref(db, `users/${user.uid}/characters/${charId}`);
      const charSnapshot = await get(userCharRef);
      if (!charSnapshot.exists()) {
        toast.error('ไม่พบข้อมูลตัวละคร');
        setIsJoining(false);
        return;
      }

      // ตรวจสอบว่า characterId นี้ไม่ได้อยู่ในปาร์ตี้อื่นของเนสต์เดียวกัน
      const allPartiesRef = ref(db, 'parties');
      const allPartiesSnapshot = await get(allPartiesRef);
      const allParties = allPartiesSnapshot.val() || {};
      let foundInOtherParty = false;
      let otherPartyId = '';
      let otherPartyName = '';
      Object.entries(allParties).forEach(([pid, pdata]: [string, any]) => {
        if (pdata.nest === party?.nest && pdata.members && pdata.members[charId]) {
          foundInOtherParty = true;
          otherPartyId = pid;
          otherPartyName = pdata.name || pid;
        }
      });
      if (foundInOtherParty) {
        toast.error(`ตัวละครนี้อยู่ในปาร์ตี้อื่นของเนสต์เดียวกันแล้ว (${otherPartyName})`);
        setIsJoining(false);
        return;
      }

      // ตรวจสอบปาร์ตี้ล่าสุดอีกครั้ง
      const partyRef = ref(db, `parties/${params.id}`);
      const partySnapshot = await get(partyRef);
      const partyData = partySnapshot.val();
      if (!partyData) {
        toast.error('ไม่พบข้อมูลปาร์ตี้');
        router.replace('/');
        setIsJoining(false);
        return;
      }
      const members = partyData.members || {};
      const isAlreadyMember = Object.entries(members).some(([, memberData]: [string, any]) => 
        memberData.userId === user.uid
      );
      if (isAlreadyMember) {
        toast.error('คุณอยู่ในปาร์ตี้นี้แล้ว');
        router.replace(`/party/${params.id}`);
        setIsJoining(false);
        return;
      }
      const currentMemberCount = Object.keys(members).length;
      if (currentMemberCount >= partyData.maxMember) {
        toast.error('ปาร์ตี้เต็มแล้ว');
        router.replace(`/party/${params.id}`);
        setIsJoining(false);
        return;
      }

      // Join party (format ตรงกับ rule)
      await update(ref(db, `parties/${params.id}/members/${charId}`), {
        userId: user.uid,
        joinedAt: new Date().toISOString()
      });

      toast.success('เข้าร่วมปาร์ตี้สำเร็จ!');
      router.replace(`/party/${params.id}`);
    } catch (error) {
      console.error('Error joining party:', error);
      toast.error('เกิดข้อผิดพลาดในการเข้าร่วมปาร์ตี้');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!party) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
            เลือกตัวละครเข้าร่วมปาร์ตี้
          </h1>
          <p className="text-gray-600">
            {party.nest} ({Object.keys(party.members || {}).length}/{party.maxMember})
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableCharacters.map((character) => (
            <motion.button
              key={character.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isJoining}
              onClick={() => handleJoinParty(character.id)}
              className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 flex items-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100/20"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-100 to-indigo-100 flex items-center justify-center shadow-inner">
                <span className="text-2xl font-bold bg-gradient-to-br from-pink-500 to-indigo-500 bg-clip-text text-transparent">
                  {character.mainClass.charAt(0)}
                </span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800">{character.name}</h3>
                <p className="text-sm text-gray-500">{character.class}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-600">
                    ATK {character.stats?.atk || 0}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                    DEF {character.stats?.def || 0}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600">
                    HP {character.stats?.hp || 0}
                  </span>
                </div>
              </div>
              {isJoining && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
} 