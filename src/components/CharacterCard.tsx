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
    let bg = '';
    let border = '';
    let text = '';
    switch (className) {
      case 'Sword Master':
      case 'Mercenary':
        bg = 'bg-red-200';
        border = 'border-red-400';
        text = 'text-red-700';
        break;
      case 'Bowmaster':
      case 'Acrobat':
        bg = 'bg-emerald-200';
        border = 'border-emerald-400';
        text = 'text-emerald-700';
        break;
      case 'Force User':
      case 'Elemental Lord':
        bg = 'bg-purple-200';
        border = 'border-purple-400';
        text = 'text-purple-700';
        break;
      case 'Paladin':
      case 'Priest':
        bg = 'bg-sky-200';
        border = 'border-sky-400';
        text = 'text-sky-700';
        break;
      case 'Engineer':
      case 'Alchemist':
        bg = 'bg-amber-200';
        border = 'border-amber-400';
        text = 'text-amber-700';
        break;
      default:
        bg = 'bg-gray-200';
        border = 'border-gray-400';
        text = 'text-gray-700';
    }
    const base = `inline-flex items-center justify-center w-12 h-12 rounded-full ${bg} border-4 ${border} shadow ${text} text-2xl`;
    switch (className) {
      case 'Sword Master':
        return <span className={base}><i className="ra ra-sword" title="Sword Master" /></span>;
      case 'Mercenary':
        return <span className={base}><i className="ra ra-axe" title="Mercenary" /></span>;
      case 'Bowmaster':
        return <span className={base}><i className="ra ra-archer" title="Bowmaster" /></span>;
      case 'Acrobat':
        return <span className={base}><i className="ra ra-player-dodge" title="Acrobat" /></span>;
      case 'Force User':
        return <span className={base}><i className="ra ra-crystal-ball" title="Force User" /></span>;
      case 'Elemental Lord':
        return <span className={base}><i className="ra ra-fire-symbol" title="Elemental Lord" /></span>;
      case 'Paladin':
        return <span className={base}><i className="ra ra-shield" title="Paladin" /></span>;
      case 'Priest':
        return <span className={base}><i className="ra ra-hospital-cross" title="Priest" /></span>;
      case 'Engineer':
        return <span className={base}><i className="ra ra-gear-hammer" title="Engineer" /></span>;
      case 'Alchemist':
        return <span className={base}><i className="ra ra-flask" title="Alchemist" /></span>;
      default:
        return <span className={base}><i className="ra ra-player" title="Unknown" /></span>;
    }
  };

  const mainClass = getMainClass(character);
  const colors = getColors(mainClass);

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 group",
      "bg-white/90 backdrop-blur-sm border border-pink-200 dark:bg-gray-900/90 dark:border-pink-900/60",
      mainClass === 'Warrior' && 'border-red-400/90 dark:border-red-700',
      mainClass === 'Archer' && 'border-emerald-400/90 dark:border-emerald-700',
      mainClass === 'Sorceress' && 'border-purple-400/90 dark:border-purple-700',
      mainClass === 'Cleric' && 'border-sky-400/90 dark:border-sky-700',
      mainClass === 'Academic' && 'border-amber-400/90 dark:border-amber-700',
      !mainClass && 'border-gray-400/90 dark:border-gray-700',
      "hover:shadow-[0_12px_36px_0_rgba(124,58,237,0.18)] hover:bg-white hover:ring-2 hover:ring-opacity-80 dark:hover:bg-gray-800/90"
    )} style={{
      boxShadow: '0 8px 32px 0 rgba(124, 58, 237, 0.13)'
    }}>
      {/* Header bar with class color */}
      <div className={cn(
        "w-full h-10 rounded-t-3xl flex items-center justify-center relative",
        "transition-all duration-500",
        mainClass === 'Warrior' && 'bg-gradient-to-r from-rose-300/90 to-pink-200/80 dark:from-rose-900/80 dark:to-pink-900/60',
        mainClass === 'Archer' && 'bg-gradient-to-r from-lime-300/90 to-green-200/80 dark:from-lime-900/80 dark:to-green-900/60',
        mainClass === 'Sorceress' && 'bg-gradient-to-r from-fuchsia-300/90 to-purple-200/80 dark:from-fuchsia-900/80 dark:to-purple-900/60',
        mainClass === 'Cleric' && 'bg-gradient-to-r from-cyan-300/90 to-blue-200/80 dark:from-cyan-900/80 dark:to-blue-900/60',
        mainClass === 'Academic' && 'bg-gradient-to-r from-yellow-300/90 to-amber-200/80 dark:from-yellow-900/80 dark:to-amber-900/60',
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
            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-700",
            "transition-all duration-500",
            mainClass === 'Warrior' && 'bg-rose-100 dark:bg-rose-900/60',
            mainClass === 'Archer' && 'bg-lime-100 dark:bg-lime-900/60',
            mainClass === 'Sorceress' && 'bg-fuchsia-100 dark:bg-fuchsia-900/60',
            mainClass === 'Cleric' && 'bg-cyan-100 dark:bg-cyan-900/60',
            mainClass === 'Academic' && 'bg-yellow-100 dark:bg-yellow-900/60',
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
                className="hover:bg-red-200/60 dark:hover:bg-red-900/40 transition-all duration-300 rounded-full"
              >
                <Trash2 className="h-5 w-5 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-700 dark:text-red-300" />
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
        <h3 className={cn("text-xl font-bold flex items-center gap-2 mt-2 mb-1 text-gray-900 dark:text-gray-100")}>{character.name}</h3>
        <p className={cn("text-base font-semibold flex items-center gap-1 mb-4",
          mainClass === 'Warrior' && 'text-red-700 dark:text-red-300',
          mainClass === 'Archer' && 'text-emerald-700 dark:text-emerald-300',
          mainClass === 'Sorceress' && 'text-purple-700 dark:text-purple-300',
          mainClass === 'Cleric' && 'text-sky-700 dark:text-sky-300',
          mainClass === 'Academic' && 'text-amber-700 dark:text-amber-300',
        )}>
          {character.class}
        </p>
        <div className="w-full flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm shadow-inner border border-gray-300 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-2 flex items-center justify-between text-gray-900 dark:text-gray-100">
              <span className="flex items-center gap-1">
                <Target className={cn("h-4 w-4",
                  mainClass === 'Warrior' && 'text-red-600 dark:text-red-300',
                  mainClass === 'Archer' && 'text-emerald-600 dark:text-emerald-300',
                  mainClass === 'Sorceress' && 'text-purple-600 dark:text-purple-300',
                  mainClass === 'Cleric' && 'text-sky-600 dark:text-sky-300',
                  mainClass === 'Academic' && 'text-amber-600 dark:text-amber-300',
                  "transition-all duration-500 group-hover:scale-110",
                  "group-hover:drop-shadow-[0_0_4px_rgba(0,0,0,0.2)]"
                )} />
                สถานะตัวละคร
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 rounded-full p-1 ml-2",
                  hasMissingRequiredStats(character) && "hover:bg-red-200/60 dark:hover:bg-red-900/40"
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
                  hasMissingRequiredStats(character) ? "text-red-600 dark:text-red-300 blink-scale" : "text-gray-800 dark:text-gray-100"
                )} />
              </Button>
            </h4>
            <CharacterStats stats={character.stats} />
          </div>
          <div className="p-3 rounded-xl bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm shadow-inner border border-gray-300 dark:border-gray-700">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-gray-900 dark:text-gray-100">
              <CheckCircle2 className={cn("h-4 w-4",
                mainClass === 'Warrior' && 'text-red-600 dark:text-red-300',
                mainClass === 'Archer' && 'text-emerald-600 dark:text-emerald-300',
                mainClass === 'Sorceress' && 'text-purple-600 dark:text-purple-300',
                mainClass === 'Cleric' && 'text-sky-600 dark:text-sky-300',
                mainClass === 'Academic' && 'text-amber-600 dark:text-amber-300',
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