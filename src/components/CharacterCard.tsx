import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Shield, Sword, Zap, Star, Crown, Sparkles, User, Target, Heart, Shield as ShieldIcon, Sword as SwordIcon, Zap as ZapIcon, Sparkles as SparklesIcon, Star as StarIcon, CheckCircle2 } from 'lucide-react';
import { CharacterStats } from './CharacterStats';
import { CharacterChecklist } from './CharacterChecklist';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Character, CharacterMainClass, CharacterClass, CharacterStats as CharacterStatsType, CharacterChecklist as CharacterChecklistType } from '@/types/character';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Map sub-classes to main classes
const CLASS_TO_MAIN_CLASS: Record<CharacterClass, CharacterMainClass> = {
  'Sword Master': 'Warrior',
  'Mercenary': 'Warrior',
  'Bowmaster': 'Archer',
  'Acrobat': 'Archer',
  'Force User': 'Sorceress',
  'Elemental Lord': 'Sorceress',
  'Paladin': 'Cleric',
  'Priest': 'Cleric',
  'Engineer': 'Academic',
  'Alchemist': 'Academic'
};

// สีตามอาชีพหลัก
const classColors: Record<CharacterMainClass, {text: string, bg: string, border: string, accent: string, icon?: string}> = {
  'Warrior': {
    text: 'text-red-600',
    bg: 'bg-gradient-to-br from-red-100 to-rose-200/70',
    border: 'border-red-300',
    accent: 'text-red-500'
  },
  'Archer': {
    text: 'text-emerald-600',
    bg: 'bg-gradient-to-br from-emerald-100 to-green-200/70',
    border: 'border-emerald-300',
    accent: 'text-emerald-500'
  },
  'Sorceress': {
    text: 'text-purple-600',
    bg: 'bg-gradient-to-br from-purple-100 to-violet-200/70',
    border: 'border-purple-300',
    accent: 'text-purple-500'
  },
  'Cleric': {
    text: 'text-sky-600',
    bg: 'bg-gradient-to-br from-sky-100 to-blue-200/70',
    border: 'border-sky-300',
    accent: 'text-sky-500'
  },
  'Academic': {
    bg: 'from-amber-100 to-yellow-200/70',
    text: 'text-amber-600',
    border: 'border-amber-300',
    accent: 'text-amber-500',
    icon: '🔧'
  }
};

// ค่าสีเริ่มต้น
const defaultColors = {
  text: 'text-gray-600',
  bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50',
  border: 'border-gray-200',
  accent: 'text-gray-500'
};

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onChecklistChange: (id: string, checklist: CharacterChecklistType) => void;
}

export function CharacterCard({ character, onEdit, onDelete, onChecklistChange }: CharacterCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    onDelete(character.id);
    setShowDeleteDialog(false);
  };

  // ดึง mainClass จาก character หรือแปลงจาก class
  const getMainClass = (char: Character): CharacterMainClass | undefined => {
    if (char.mainClass && classColors[char.mainClass]) {
      return char.mainClass;
    }
    return CLASS_TO_MAIN_CLASS[char.class as CharacterClass];
  };

  // ดึงสีตาม mainClass
  const getColors = (mainClass: CharacterMainClass | undefined) => {
    if (mainClass && classColors[mainClass]) {
      return classColors[mainClass];
    }
    return defaultColors;
  };

  // ฟังก์ชันสำหรับเลือก Icon ตามอาชีพ
  const getClassIcon = (subClass: string) => {
    const mainClass = CLASS_TO_MAIN_CLASS[subClass as CharacterClass] || subClass;
    
    switch (mainClass) {
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

  const mainClass = getMainClass(character);
  const colors = getColors(mainClass);

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-3xl shadow-xl bg-white/90 border border-white transition-all duration-500 group",
      "hover:shadow-2xl hover:bg-gradient-to-br hover:from-white hover:to-violet-50/70",
      "hover:border-opacity-60 hover:border-violet-100",
      "hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]",
      "hover:ring-1 hover:ring-violet-50/50"
    )} style={{boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)'}}>
      {/* Header bar with class color */}
      <div className={cn(
        "w-full h-10 rounded-t-3xl flex items-center justify-center relative",
        "transition-all duration-500",
        mainClass === 'Warrior' && 'bg-gradient-to-r from-red-500 to-rose-400',
        mainClass === 'Archer' && 'bg-gradient-to-r from-emerald-500 to-green-400',
        mainClass === 'Sorceress' && 'bg-gradient-to-r from-purple-500 to-violet-400',
        mainClass === 'Cleric' && 'bg-gradient-to-r from-sky-500 to-blue-400',
        mainClass === 'Academic' && 'bg-gradient-to-r from-amber-400 to-yellow-300',
        "group-hover:brightness-110 group-hover:contrast-110",
        "group-hover:shadow-inner group-hover:shadow-black/5"
      )}>
        {/* Floating class icon */}
        <div className={cn(
          "absolute left-1/2 -bottom-7 -translate-x-1/2 z-20 flex items-center justify-center",
          "transition-transform duration-500 group-hover:scale-105",
          "group-hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.15)]"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white",
            "transition-all duration-500",
            mainClass === 'Warrior' && 'bg-red-100',
            mainClass === 'Archer' && 'bg-emerald-100',
            mainClass === 'Sorceress' && 'bg-purple-100',
            mainClass === 'Cleric' && 'bg-sky-100',
            mainClass === 'Academic' && 'bg-amber-100',
            "group-hover:shadow-lg group-hover:border-opacity-80",
            "group-hover:bg-opacity-95 group-hover:backdrop-blur-[2px]"
          )}>
            {getClassIcon(character.class)}
          </div>
        </div>
        {/* Floating edit/delete buttons */}
        <div className="absolute top-2 right-4 flex gap-2 z-30">
          <Button
            variant="ghost"
            size="icon"
            className={cn("hover:bg-black/10 transition-all duration-300 rounded-full")}
            onClick={() => {
              if (onEdit && character) {
                onEdit(character);
              }
            }}
          >
            <Pencil className="h-5 w-5 text-gray-600" />
          </Button>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-red-100/40 transition-all duration-300 rounded-full"
              >
                <Trash2 className="h-5 w-5 text-red-500 hover:text-red-600" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  ลบตัวละคร
                </DialogTitle>
                <DialogDescription>
                  คุณแน่ใจหรือไม่ที่จะลบ {character.name}? การกระทำนี้ไม่สามารถย้อนกลับได้
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Content below header */}
      <div className="pt-8 pb-4 px-4 flex flex-col items-center">
        <h3 className={cn("text-xl font-bold flex items-center gap-2 mt-2 mb-1 text-gray-800")}>{character.name}</h3>
        <p className={cn("text-base font-semibold flex items-center gap-1 mb-4",
          mainClass === 'Warrior' && 'text-red-500',
          mainClass === 'Archer' && 'text-emerald-500',
          mainClass === 'Sorceress' && 'text-purple-500',
          mainClass === 'Cleric' && 'text-sky-500',
          mainClass === 'Academic' && 'text-amber-500',
        )}>
          {character.class}
        </p>
        <div className="w-full flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-white/70 shadow-inner border border-gray-100">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-gray-700">
              <Target className={cn("h-4 w-4",
                mainClass === 'Warrior' && 'text-red-400',
                mainClass === 'Archer' && 'text-emerald-400',
                mainClass === 'Sorceress' && 'text-purple-400',
                mainClass === 'Cleric' && 'text-sky-400',
                mainClass === 'Academic' && 'text-amber-400',
                "transition-all duration-500 group-hover:scale-110",
                "group-hover:drop-shadow-[0_0_3px_rgba(0,0,0,0.15)]"
              )} />
              สถานะตัวละคร
            </h4>
            <CharacterStats stats={character.stats} />
          </div>
          <div className="p-3 rounded-xl bg-white/70 shadow-inner border border-gray-100">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-gray-700">
              <CheckCircle2 className={cn("h-4 w-4",
                mainClass === 'Warrior' && 'text-red-400',
                mainClass === 'Archer' && 'text-emerald-400',
                mainClass === 'Sorceress' && 'text-purple-400',
                mainClass === 'Cleric' && 'text-sky-400',
                mainClass === 'Academic' && 'text-amber-400',
                "transition-all duration-500 group-hover:scale-110",
                "group-hover:drop-shadow-[0_0_3px_rgba(0,0,0,0.15)]"
              )} />
              รายการเช็คลิสต์
            </h4>
            <CharacterChecklist
              checklist={character.checklist}
              onChange={(newChecklist) => onChecklistChange(character.id, newChecklist)}
              accentColor={colors.accent}
            />
          </div>
        </div>
      </div>
    </Card>
  );
} 