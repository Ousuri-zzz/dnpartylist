import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Shield, Sword, Zap, Star, Crown, Sparkles, User, Target, Heart, Shield as ShieldIcon, Sword as SwordIcon, Zap as ZapIcon, Sparkles as SparklesIcon, Star as StarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
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
    text: 'text-rose-500',
    bg: 'bg-gradient-to-br from-rose-50/90 to-pink-100/80',
    border: 'border-rose-200/80',
    accent: 'text-rose-400'
  },
  'Archer': {
    text: 'text-lime-500',
    bg: 'bg-gradient-to-br from-lime-50/90 to-green-100/80',
    border: 'border-lime-200/80',
    accent: 'text-lime-400'
  },
  'Sorceress': {
    text: 'text-fuchsia-500',
    bg: 'bg-gradient-to-br from-fuchsia-50/90 to-purple-100/80',
    border: 'border-fuchsia-200/80',
    accent: 'text-fuchsia-400'
  },
  'Cleric': {
    text: 'text-cyan-500',
    bg: 'bg-gradient-to-br from-cyan-50/90 to-blue-100/80',
    border: 'border-cyan-200/80',
    accent: 'text-cyan-400'
  },
  'Academic': {
    bg: 'from-yellow-50/90 to-amber-100/80',
    text: 'text-amber-500',
    border: 'border-amber-200/80',
    accent: 'text-amber-400',
    icon: '🔧'
  }
};

// ค่าสีเริ่มต้น
const defaultColors = {
  text: 'text-gray-700',
  bg: 'bg-gradient-to-br from-gray-100 to-gray-200/80',
  border: 'border-gray-300',
  accent: 'text-gray-600'
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

  // Function to check if required stats are missing
  const hasMissingRequiredStats = (char: Character) => {
    return !char.stats.atk || !char.stats.hp || !char.stats.pdef || !char.stats.mdef;
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

  // ฟังก์ชันคืนไอคอนประจำอาชีพ (ใช้ RPG-Awesome)
  const getClassIcon = (className: string) => {
    let colorClass = '';
    switch (className) {
      case 'Sword Master':
      case 'Mercenary':
        colorClass = 'text-red-600';
        break;
      case 'Bowmaster':
      case 'Acrobat':
        colorClass = 'text-emerald-600';
        break;
      case 'Force User':
      case 'Elemental Lord':
        colorClass = 'text-purple-600';
        break;
      case 'Paladin':
      case 'Priest':
        colorClass = 'text-sky-600';
        break;
      case 'Engineer':
      case 'Alchemist':
        colorClass = 'text-amber-600';
        break;
      default:
        colorClass = 'text-gray-700';
    }
    switch (className) {
      case 'Sword Master':
        return <i className={`ra ra-sword text-2xl ${colorClass}`} title="Sword Master" />;
      case 'Mercenary':
        return <i className={`ra ra-axe text-2xl ${colorClass}`} title="Mercenary" />;
      case 'Bowmaster':
        return <i className={`ra ra-archer text-2xl ${colorClass}`} title="Bowmaster" />;
      case 'Acrobat':
        return <i className={`ra ra-player-dodge text-2xl ${colorClass}`} title="Acrobat" />;
      case 'Force User':
        return <i className={`ra ra-crystal-ball text-2xl ${colorClass}`} title="Force User" />;
      case 'Elemental Lord':
        return <i className={`ra ra-fire-symbol text-2xl ${colorClass}`} title="Elemental Lord" />;
      case 'Paladin':
        return <i className={`ra ra-shield text-2xl ${colorClass}`} title="Paladin" />;
      case 'Priest':
        return <i className={`ra ra-hospital-cross text-2xl ${colorClass}`} title="Priest" />;
      case 'Engineer':
        return <i className={`ra ra-gear-hammer text-2xl ${colorClass}`} title="Engineer" />;
      case 'Alchemist':
        return <i className={`ra ra-flask text-2xl ${colorClass}`} title="Alchemist" />;
      default:
        return <i className={`ra ra-player text-2xl ${colorClass}`} title="Unknown" />;
    }
  };

  const mainClass = getMainClass(character);
  const colors = getColors(mainClass);

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 group",
      "bg-white/90 backdrop-blur-sm border border-pink-200",
      mainClass === 'Warrior' && 'border-red-400/90',
      mainClass === 'Archer' && 'border-emerald-400/90',
      mainClass === 'Sorceress' && 'border-purple-400/90',
      mainClass === 'Cleric' && 'border-sky-400/90',
      mainClass === 'Academic' && 'border-amber-400/90',
      !mainClass && 'border-gray-400/90',
      "hover:shadow-[0_12px_36px_0_rgba(124,58,237,0.18)] hover:bg-white hover:ring-2 hover:ring-opacity-80",
    )} style={{
      boxShadow: '0 8px 32px 0 rgba(124, 58, 237, 0.13)'
    }}>
      {/* Header bar with class color */}
      <div className={cn(
        "w-full h-10 rounded-t-3xl flex items-center justify-center relative",
        "transition-all duration-500",
        mainClass === 'Warrior' && 'bg-gradient-to-r from-rose-300/90 to-pink-200/80',
        mainClass === 'Archer' && 'bg-gradient-to-r from-lime-300/90 to-green-200/80',
        mainClass === 'Sorceress' && 'bg-gradient-to-r from-fuchsia-300/90 to-purple-200/80',
        mainClass === 'Cleric' && 'bg-gradient-to-r from-cyan-300/90 to-blue-200/80',
        mainClass === 'Academic' && 'bg-gradient-to-r from-yellow-300/90 to-amber-200/80',
        "group-hover:brightness-110 group-hover:contrast-110",
        "group-hover:shadow-inner group-hover:shadow-black/10"
      )}>
        {/* Floating class icon */}
        <div className={cn(
          "absolute left-1/2 -bottom-7 -translate-x-1/2 z-20 flex items-center justify-center",
          "transition-transform duration-500 group-hover:scale-105",
          "group-hover:drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white",
            "transition-all duration-500",
            mainClass === 'Warrior' && 'bg-rose-100',
            mainClass === 'Archer' && 'bg-lime-100',
            mainClass === 'Sorceress' && 'bg-fuchsia-100',
            mainClass === 'Cleric' && 'bg-cyan-100',
            mainClass === 'Academic' && 'bg-yellow-100',
            "group-hover:shadow-lg group-hover:border-opacity-90",
            "group-hover:bg-opacity-100 group-hover:backdrop-blur-[2px]"
          )}>
            {getClassIcon(character.class)}
          </div>
        </div>
        {/* Delete button */}
        <div className="absolute top-2 right-4 flex gap-2 z-30">
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-red-200/60 transition-all duration-300 rounded-full"
              >
                <Trash2 className="h-5 w-5 text-red-700 hover:text-red-800" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-700" />
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
        <h3 className={cn("text-xl font-bold flex items-center gap-2 mt-2 mb-1 text-gray-900")}>{character.name}</h3>
        <p className={cn("text-base font-semibold flex items-center gap-1 mb-4",
          mainClass === 'Warrior' && 'text-red-700',
          mainClass === 'Archer' && 'text-emerald-700',
          mainClass === 'Sorceress' && 'text-purple-700',
          mainClass === 'Cleric' && 'text-sky-700',
          mainClass === 'Academic' && 'text-amber-700',
        )}>
          {character.class}
        </p>
        <div className="w-full flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-inner border border-gray-300">
            <h4 className="text-sm font-semibold mb-2 flex items-center justify-between text-gray-900">
              <span className="flex items-center gap-1">
                <Target className={cn("h-4 w-4",
                  mainClass === 'Warrior' && 'text-red-600',
                  mainClass === 'Archer' && 'text-emerald-600',
                  mainClass === 'Sorceress' && 'text-purple-600',
                  mainClass === 'Cleric' && 'text-sky-600',
                  mainClass === 'Academic' && 'text-amber-600',
                  "transition-all duration-500 group-hover:scale-110",
                  "group-hover:drop-shadow-[0_0_4px_rgba(0,0,0,0.2)]"
                )} />
                สถานะตัวละคร
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-black/10 transition-all duration-300 rounded-full p-1 ml-2",
                  hasMissingRequiredStats(character) && "hover:bg-red-200/60"
                )}
                onClick={() => {
                  if (onEdit && character) {
                    onEdit(character);
                  }
                }}
                tabIndex={0}
                aria-label="แก้ไขสถานะตัวละคร"
              >
                <Pencil className={cn(
                  "h-4 w-4",
                  hasMissingRequiredStats(character) ? "text-red-600 blink-scale" : "text-gray-800"
                )} />
              </Button>
            </h4>
            <CharacterStats stats={character.stats} />
          </div>
          <div className="p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-inner border border-gray-300">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-gray-900">
              <CheckCircle2 className={cn("h-4 w-4",
                mainClass === 'Warrior' && 'text-red-600',
                mainClass === 'Archer' && 'text-emerald-600',
                mainClass === 'Sorceress' && 'text-purple-600',
                mainClass === 'Cleric' && 'text-sky-600',
                mainClass === 'Academic' && 'text-amber-600',
                "transition-all duration-500 group-hover:scale-110",
                "group-hover:drop-shadow-[0_0_4px_rgba(0,0,0,0.2)]"
              )} />
              รายการเช็คลิสต์
            </h4>
            <CharacterChecklist
              checklist={character.checklist}
              onChange={(newChecklist) => onChecklistChange(character.id, newChecklist)}
              accentColor={colors.accent}
              lineThroughOnComplete={true}
            />
          </div>
        </div>
      </div>
    </Card>
  );
} 