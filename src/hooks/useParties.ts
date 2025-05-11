'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, get, set, push, serverTimestamp, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { Party, PartyWithMembers, NestType } from '../types/party';
import { Character } from '../types/character';
import { useAuth } from './useAuth';
import { getDatabase } from 'firebase/database';

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const db = getDatabase();

  useEffect(() => {
    console.log('useParties: Initializing...');
    
    const partiesRef = ref(db, 'parties');
    console.log('useParties: Parties reference:', partiesRef.toString());

    // Initial fetch to get data quickly
    get(partiesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const processedParties = processPartiesData(data);
        setParties(processedParties);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('useParties: Initial fetch error:', error);
      setError(error.message);
      setLoading(false);
    });

    // Real-time updates
    const unsubscribe = onValue(partiesRef, (snapshot) => {
      console.log('useParties: Snapshot received:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.val();
        const processedParties = processPartiesData(data);
        setParties(processedParties);
      } else {
        console.log('useParties: No parties found');
        setParties([]);
      }
    }, (error) => {
      console.error('useParties: Real-time update error:', error);
      setError(error.message);
    });

    return () => {
      console.log('useParties: Cleaning up subscription');
      unsubscribe();
    };
  }, []); // Remove user dependency since we want to listen for parties regardless of auth state

  // ลบปาร์ตี้อัตโนมัติเมื่อไม่มีสมาชิก
  useEffect(() => {
    parties.forEach(party => {
      if (!party.members || Object.keys(party.members).length === 0) {
        // ลบปาร์ตี้นี้ออกจากฐานข้อมูล
        set(ref(db, `parties/${party.id}`), null);
      }
    });
  }, [parties, db]);

  // Helper function to process parties data
  const processPartiesData = (data: any): Party[] => {
    return Object.entries(data).map(([id, partyData]: [string, any]) => {
      console.log('useParties: Processing party:', id);
      
      // Ensure members object exists and is properly formatted
      const members = partyData.members || {};
      const processedMembers = Object.entries(members).reduce((acc, [charId, memberData]) => {
        // Handle both boolean and object formats
        const processedMemberData = typeof memberData === 'boolean' 
          ? { userId: partyData.leader, joinedAt: new Date().toISOString() }
          : memberData;
        
        return { ...acc, [charId]: processedMemberData };
      }, {});

      return {
        id,
        ...partyData,
        members: processedMembers,
        goals: partyData.goals || {
          atk: 0,
          hp: 0,
          cri: 0,
          def: 0
        }
      } as Party;
    });
  };

  const getMaxMemberByNest = (nest: NestType): number => {
    switch (nest) {
      case 'Sea Dragon':
        return 8;
      default:
        return 4;
    }
  };

  const joinPartyWithKickIfNeeded = async (nest: NestType, character: Character): Promise<string | null> => {
    const duplicateParty = parties.find(p => p.nest === nest && p.members && p.members[character.id]);
    if (duplicateParty) {
      await set(ref(db, `parties/${duplicateParty.id}/members/${character.id}`), null);
      return duplicateParty.id;
    }
    return null;
  };

  const createParty = async (nest: NestType, character: Character, partyName: string) => {
    if (!user?.uid) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนสร้างปาร์ตี้');
    }

    try {
      await joinPartyWithKickIfNeeded(nest, character);
      const partiesRef = ref(db, 'parties');
      const newPartyRef = push(partiesRef);
      
      const partyData: Omit<Party, 'id'> = {
        nest,
        name: partyName || `${character.name}'s Party`,
        leader: user.uid,
        createdBy: user.uid,
        members: {
          [character.id]: {
            userId: user.uid,
            joinedAt: new Date().toISOString()
          }
        },
        maxMember: getMaxMemberByNest(nest),
        createdAt: new Date().toISOString(),
        goals: {
          atk: 0,
          hp: 0,
          cri: 0,
          def: 0
        }
      };
      
      await set(newPartyRef, partyData);
      return newPartyRef.key;
    } catch (error) {
      console.error('Error creating party:', error);
      throw error;
    }
  };

  const deleteParty = async (partyId: string) => {
    if (!user?.uid) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนลบปาร์ตี้');
    }

    try {
      const partyRef = ref(db, `parties/${partyId}`);
      await remove(partyRef);
      return true;
    } catch (error) {
      console.error('Error deleting party:', error);
      throw error;
    }
  };

  return { parties, loading, error, createParty, joinPartyWithKickIfNeeded, deleteParty };
} 