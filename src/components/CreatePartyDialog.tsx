'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParties } from '../hooks/useParties';
import { useCharacters } from '../hooks/useCharacters';
import { useAuth } from '../hooks/useAuth';
import { NestType } from '../types/party';
import { Character } from '../types/character';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Label } from './ui/label';
import { Input } from './ui/input';

export function CreatePartyDialog() {
  const router = useRouter();
  const { createParty, parties, joinPartyWithKickIfNeeded } = useParties();
  const { characters } = useCharacters();
  const { discordName } = useAuth();
  const [selectedNest, setSelectedNest] = useState<NestType | ''>('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [kickInfo, setKickInfo] = useState<{ partyId: string | null, open: boolean, character: Character | null, nest: NestType | null }>({ partyId: null, open: false, character: null, nest: null });
  const [pendingCreate, setPendingCreate] = useState<{ nest: NestType, character: Character, partyName: string } | null>(null);

  const handleSubmit = async () => {
    if (!selectedNest || !selectedCharacter) {
      toast.error('Please select both nest and character');
      return;
    }
    const kickedPartyId = parties.find(p => p.nest === selectedNest && p.members && p.members[selectedCharacter.id]);
    if (kickedPartyId) {
      setKickInfo({ partyId: kickedPartyId.id, open: true, character: selectedCharacter, nest: selectedNest });
      setPendingCreate({ nest: selectedNest, character: selectedCharacter, partyName });
      return;
    }
    await doCreateParty(selectedNest, selectedCharacter, partyName);
  };

  const doCreateParty = async (nest: NestType, character: Character, partyName: string) => {
    const nameToUse = partyName.trim() || (discordName ? `${discordName} party` : 'ชื่อ discord party');
    try {
      await joinPartyWithKickIfNeeded(nest, character);
      const partyId = await createParty(nest, character, nameToUse);
      if (partyId) {
        toast.success('Party created successfully');
        setIsOpen(false);
        router.push(`/party/${partyId}`);
      }
    } catch (error) {
      console.error('Error creating party:', error);
      toast.error('Failed to create party');
    }
  };

  const getAvailableCharacters = () => {
    if (!selectedNest) return characters;
    const characterIdsInNest = parties
      .filter(p => p.nest === selectedNest)
      .flatMap(p => Object.keys(p.members || {}));
    return characters.filter(c => !characterIdsInNest.includes(c.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 rounded-xl flex items-center gap-2 bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-medium shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-shadow"
        >
          <PlusCircle className="w-5 h-5" />
          <span>สร้างปาร์ตี้</span>
        </motion.button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
            สร้างปาร์ตี้ใหม่
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            เลือกเนสต์และตัวละครที่ต้องการใช้ในปาร์ตี้
          </DialogDescription>
        </DialogHeader>

        <Dialog open={kickInfo.open} onOpenChange={open => setKickInfo(k => ({ ...k, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการลบตัวละครออกจากปาร์ตี้เดิม</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>ตัวละครนี้อยู่ในปาร์ตี้เนสต์เดียวกันอยู่แล้ว ต้องการลบออกจากปาร์ตี้เดิมและเข้าร่วมปาร์ตี้ใหม่นี้หรือไม่?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setKickInfo({ partyId: null, open: false, character: null, nest: null }); setPendingCreate(null); }}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={async () => {
                  setKickInfo({ partyId: null, open: false, character: null, nest: null });
                  if (pendingCreate) {
                    await doCreateParty(pendingCreate.nest, pendingCreate.character, pendingCreate.partyName);
                    setPendingCreate(null);
                  }
                }}>
                  ยืนยัน
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">ชื่อปาร์ตี้</Label>
            <Input
              value={partyName}
              onChange={e => setPartyName(e.target.value)}
              placeholder="กรอกชื่อปาร์ตี้"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">เนสต์</Label>
            <Select 
              value={selectedNest} 
              onValueChange={(value: NestType) => setSelectedNest(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกเนสต์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Minotaur">Minotaur</SelectItem>
                <SelectItem value="Cerberus">Cerberus</SelectItem>
                <SelectItem value="Cerberus Hell">Cerberus Hell</SelectItem>
                <SelectItem value="Cerberus Challenge">Cerberus Challenge</SelectItem>
                <SelectItem value="Manticore">Manticore</SelectItem>
                <SelectItem value="Manticore Hell">Manticore Hell</SelectItem>
                <SelectItem value="Apocalypse">Apocalypse</SelectItem>
                <SelectItem value="Apocalypse Hell">Apocalypse Hell</SelectItem>
                <SelectItem value="Sea Dragon">Sea Dragon</SelectItem>
                <SelectItem value="Chaos Rift: Kamala">Chaos Rift: Kamala</SelectItem>
                <SelectItem value="Chaos Rift: Bairra">Chaos Rift: Bairra</SelectItem>
                <SelectItem value="Banquet Hall">Banquet Hall</SelectItem>
                <SelectItem value="Jealous Albeuteur">Jealous Albeuteur</SelectItem>
                <SelectItem value="Theme Park">Theme Park</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">ตัวละคร</Label>
            <Select
              value={selectedCharacter ? selectedCharacter.id : ''}
              onValueChange={(value) => 
                setSelectedCharacter(characters.find(c => c.id === value) || null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกตัวละคร" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCharacters().map((char) => (
                  <SelectItem key={char.id} value={char.id}>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500" />
                      <span>{char.name}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{char.class}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-medium shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-shadow"
          >
            สร้างปาร์ตี้
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 