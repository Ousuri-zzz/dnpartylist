'use client';

import { useState } from 'react';
import type { Character, CharacterMainClass, CharacterClass, CharacterStats } from '../types/character';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../hooks/useAuth';
import { CHARACTER_CLASSES } from '../config/constants';
import { Shield, Sword, Zap, Star, Crown, Sparkles, User, Target, Heart, Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddCharacterDialogProps {
  onAdd: (character: Omit<Character, 'id'>) => Promise<void>;
}

export function AddCharacterDialog({ onAdd }: AddCharacterDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState<CharacterClass>('Swordsman');
  const [mainClass, setMainClass] = useState<CharacterMainClass>('Warrior');
  const [stats, setStats] = useState<CharacterStats>({
    str: 0,
    agi: 0,
    int: 0,
    vit: 0,
    spr: 0,
    points: 0,
    atk: 0,
    hp: 0,
    pdef: 0,
    mdef: 0,
    cri: 0,
    ele: 0,
    fd: 0
  });

  const handleSubmit = async () => {
    if (!name || !characterClass || !mainClass || !user) return;

    const newCharacter: Omit<Character, 'id'> = {
      userId: user.uid,
      name,
      level: 1,
      class: characterClass,
      mainClass,
      stats: {
        str: Number(stats.str),
        agi: Number(stats.agi),
        int: Number(stats.int),
        vit: Number(stats.vit),
        spr: Number(stats.spr),
        points: Number(stats.points),
        atk: Number(stats.atk),
        hp: Number(stats.hp),
        pdef: Number(stats.pdef),
        mdef: Number(stats.mdef),
        cri: Number(stats.cri),
        ele: Number(stats.ele),
        fd: Number(stats.fd)
      },
      checklist: {
        daily: {
          dailyQuest: false,
          ftg: false
        },
        weekly: {
          minotaur: 0,
          cerberus: 0,
          cerberusHell: 0,
          cerberusChallenge: 0,
          manticore: 0,
          manticoreHell: 0,
          apocalypse: 0,
          apocalypseHell: 0,
          seaDragon: 0,
          seaDragonHell: 0,
          seaDragonChallenge: 0,
          themePark: 0,
          themeHell: 0,
          chaosRiftKamala: 0,
          chaosRiftBairra: 0,
          banquetHall: 0,
          jealousAlbeuteur: 0
        }
      }
    };

    await onAdd(newCharacter);
    setIsOpen(false);
    setName('');
    setCharacterClass('Swordsman');
    setMainClass('Warrior');
    setStats({
      str: 0,
      agi: 0,
      int: 0,
      vit: 0,
      spr: 0,
      points: 0,
      atk: 0,
      hp: 0,
      pdef: 0,
      mdef: 0,
      cri: 0,
      ele: 0,
      fd: 0
    });
  };

  // ฟังก์ชันสำหรับเลือก Icon ตามอาชีพ
  const getClassIcon = (subClass: string) => {
    switch (subClass) {
      case 'Warrior':
        return <Sword className="h-5 w-5 text-red-500" />;
      case 'Archer':
        return <Zap className="h-5 w-5 text-emerald-500" />;
      case 'Sorceress':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      case 'Cleric':
        return <Shield className="h-5 w-5 text-sky-500" />;
      case 'Academic':
        return <Star className="h-5 w-5 text-amber-500" />;
      default:
        return <Crown className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-violet-400 to-indigo-400 hover:from-violet-500 hover:to-indigo-500 text-white font-medium">
          <Plus className="h-4 w-4 mr-2" />
          Add Character
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-b from-white to-slate-50/80 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
            <User className="h-5 w-5 text-violet-500" />
            Add New Character
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Basic Info Section */}
          <div className="space-y-4 p-4 rounded-lg bg-white/60 border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-violet-500" />
              Basic Information
            </h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-600">Character Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter character name"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mainClass" className="text-slate-600">Main Class</Label>
                <Select value={mainClass} onValueChange={(value: CharacterMainClass) => setMainClass(value)}>
                  <SelectTrigger className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20">
                    <SelectValue placeholder="Select main class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warrior" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Sword className="h-4 w-4 text-red-500" />
                        Warrior
                      </span>
                    </SelectItem>
                    <SelectItem value="Archer" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-500" />
                        Archer
                      </span>
                    </SelectItem>
                    <SelectItem value="Sorceress" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Sorceress
                      </span>
                    </SelectItem>
                    <SelectItem value="Cleric" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-sky-500" />
                        Cleric
                      </span>
                    </SelectItem>
                    <SelectItem value="Academic" className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Academic
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="class" className="text-slate-600">Class</Label>
                <Select value={characterClass} onValueChange={(value: CharacterClass) => setCharacterClass(value)}>
                  <SelectTrigger className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARACTER_CLASSES.map((characterClass) => (
                      <SelectItem key={characterClass} value={characterClass} className="flex items-center gap-2">
                        <span className="flex items-center gap-2">
                          {getClassIcon(characterClass)}
                          {characterClass}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-4 p-4 rounded-lg bg-white/60 border border-slate-200/60 shadow-sm">
            <h3 className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <Target className="h-4 w-4 text-violet-500" />
              Character Stats
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="atk" className="text-slate-600">ATK</Label>
                <Input
                  id="atk"
                  type="number"
                  value={stats.atk}
                  onChange={(e) => setStats({ ...stats, atk: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hp" className="text-slate-600">HP</Label>
                <Input
                  id="hp"
                  type="number"
                  value={stats.hp}
                  onChange={(e) => setStats({ ...stats, hp: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdef" className="text-slate-600">P.DEF</Label>
                <Input
                  id="pdef"
                  type="number"
                  value={stats.pdef}
                  onChange={(e) => setStats({ ...stats, pdef: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mdef" className="text-slate-600">M.DEF</Label>
                <Input
                  id="mdef"
                  type="number"
                  value={stats.mdef}
                  onChange={(e) => setStats({ ...stats, mdef: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cri" className="text-slate-600">Critical Rate (%)</Label>
                <Input
                  id="cri"
                  type="number"
                  value={stats.cri}
                  onChange={(e) => setStats({ ...stats, cri: Number(e.target.value) })}
                  min="0"
                  max="100"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ele" className="text-slate-600">Elemental (%)</Label>
                <Input
                  id="ele"
                  type="number"
                  value={stats.ele}
                  onChange={(e) => setStats({ ...stats, ele: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fd" className="text-slate-600">Final Damage (%)</Label>
                <Input
                  id="fd"
                  type="number"
                  value={stats.fd}
                  onChange={(e) => setStats({ ...stats, fd: Number(e.target.value) })}
                  min="0"
                  className="bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-medium"
          >
            <Save className="h-4 w-4 mr-2" />
            Add Character
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 