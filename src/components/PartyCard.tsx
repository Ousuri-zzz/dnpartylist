'use client';

import { Card } from './ui/card';
import Link from 'next/link';
import { Party } from '../types/party';
import { useUsers } from '../hooks/useUsers';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Users, Clock } from 'lucide-react';
import styles from './PartyCard.module.css';

interface PartyCardProps {
  party: Party;
}

export function PartyCard({ party }: PartyCardProps) {
  const { users } = useUsers();

  const { memberCount, maxMembers, sortedMembers } = useMemo(() => {
    const members = [];
    let count = 0;
    
    if (party.members && typeof party.members === 'object') {
      for (const [charId, memberData] of Object.entries(party.members)) {
        const userId = typeof memberData === 'boolean' 
          ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
          : (memberData as { userId: string }).userId;
        
        if (userId && users[userId]?.characters?.[charId]) {
          count++;
          members.push({
            charId,
            info: {
              ...users[userId].characters[charId],
              discordName: users[userId].meta?.discord || 'ไม่ทราบ',
              name: users[userId].characters[charId].name
            }
          });
        }
      }
    }
    
    // Sort members by join date if available
    members.sort((a, b) => {
      const aJoinedAt = party.members[a.charId] && typeof party.members[a.charId] === 'object' 
        ? (party.members[a.charId] as { joinedAt?: string }).joinedAt 
        : undefined;
      const bJoinedAt = party.members[b.charId] && typeof party.members[b.charId] === 'object'
        ? (party.members[b.charId] as { joinedAt?: string }).joinedAt
        : undefined;
      
      if (!aJoinedAt) return 1;
      if (!bJoinedAt) return -1;
      return new Date(aJoinedAt).getTime() - new Date(bJoinedAt).getTime();
    });

    return {
      memberCount: count,
      maxMembers: party.maxMember || 4,
      sortedMembers: members
    };
  }, [party.members, party.maxMember, users]);

  const getClassStyle = (characterClass: string) => {
    switch (characterClass.toLowerCase()) {
      case 'warrior':
      case 'swordsman':
      case 'mercenary':
        return {
          bg: 'from-red-100/80 to-red-200/50',
          text: 'from-red-600 to-red-700',
          border: 'border-red-300/50'
        };
      case 'archer':
      case 'bowmaster':
      case 'acrobat':
        return {
          bg: 'from-emerald-100/80 to-emerald-200/50',
          text: 'from-emerald-600 to-emerald-700',
          border: 'border-emerald-300/50'
        };
      case 'sorceress':
      case 'force user':
      case 'elemental lord':
        return {
          bg: 'from-violet-100/80 to-violet-200/50',
          text: 'from-violet-600 to-violet-700',
          border: 'border-violet-300/50'
        };
      case 'cleric':
      case 'paladin':
      case 'saint':
        return {
          bg: 'from-sky-100/80 to-sky-200/50',
          text: 'from-sky-600 to-sky-700',
          border: 'border-sky-300/50'
        };
      case 'academic':
      case 'engineer':
      case 'alchemist':
        return {
          bg: 'from-amber-100/80 to-amber-200/50',
          text: 'from-amber-600 to-amber-700',
          border: 'border-amber-300/50'
        };
      case 'kali':
        return {
          bg: 'from-rose-100/80 to-rose-200/50',
          text: 'from-rose-600 to-rose-700',
          border: 'border-rose-300/50'
        };
      case 'assassin':
        return {
          bg: 'from-indigo-100/80 to-indigo-200/50',
          text: 'from-indigo-600 to-indigo-700',
          border: 'border-indigo-300/50'
        };
      case 'machina':
        return {
          bg: 'from-cyan-100/80 to-cyan-200/50',
          text: 'from-cyan-600 to-cyan-700',
          border: 'border-cyan-300/50'
        };
      default:
        return {
          bg: 'from-gray-100/80 to-gray-200/50',
          text: 'from-gray-600 to-gray-700',
          border: 'border-gray-300/50'
        };
    }
  };

  return (
    <Link href={`/party/${party.id}`}>
      <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-500 bg-white/80 backdrop-blur-sm border-0">
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          initial={false}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </motion.div>

        <div className="relative z-10 p-6">
          <div className="flex flex-col gap-4">
            {/* Party header */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold">
                <span className={styles.partyName}>
                  {party.name}
                </span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className={styles.nestName}>
                    {party.nest}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <div className="px-2 py-1 rounded-full bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border border-purple-100/30">
                    <span className="text-sm font-medium bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {memberCount}/{maxMembers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members list */}
            <div className="flex flex-col gap-2">
              {sortedMembers.map(({ charId, info }) => {
                if (!info) return null;
                const classStyle = getClassStyle(info.class);
                return (
                  <div
                    key={charId}
                    className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-white/50 to-white/30 border border-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md group/member"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${classStyle.bg} ${classStyle.border} flex items-center justify-center`}>
                        <span className={`text-sm font-bold bg-gradient-to-r ${classStyle.text} bg-clip-text text-transparent`}>
                          {info.class.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {info.discordName}
                        </p>
                        <p className="text-sm text-gray-500 -mt-1">
                          {info.name}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg bg-gradient-to-r ${classStyle.bg} border ${classStyle.border}`}>
                      <span className={`text-xs font-medium bg-gradient-to-r ${classStyle.text} bg-clip-text text-transparent`}>
                        {info.class}
                      </span>
                    </div>
                  </div>
                );
              })}

              {memberCount === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Users className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">ยังไม่มีสมาชิกในปาร์ตี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}