import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Shield, Sword, Zap, Star, Crown, Sparkles, User, Target, Heart, Shield as ShieldIcon, Sword as SwordIcon, Zap as ZapIcon, Sparkles as SparklesIcon, Star as StarIcon, CheckCircle2 } from 'lucide-react';
import { CharacterStats } from './CharacterStats';
import { CharacterChecklist } from './CharacterChecklist';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Character, CharacterMainClass, CharacterClass, CharacterStats as CharacterStatsType, CharacterChecklist as CharacterChecklistType } from '@/types/character';
import { cn } from '@/lib/utils';

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
      "relative overflow-hidden border-2 transition-all duration-300 group",
      colors.bg,
      colors.border,
      "hover:shadow-lg hover:scale-[1.02]"
    )}>
      {/* Decorative corner elements */}
      <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg", colors.border)}></div>
      <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg", colors.border)}></div>
      <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg", colors.border)}></div>
      <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg", colors.border)}></div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full bg-white/50 backdrop-blur-sm", colors.border)}>
              {getClassIcon(character.class)}
            </div>
            <div>
              <h3 className={cn("text-base font-semibold flex items-center gap-1", colors.accent)}>
                <User className={cn("h-5 w-5", colors.accent)} />
                {character.name}
              </h3>
              <p className={cn("text-lg font-semibold flex items-center gap-1", colors.text)}>
                {getClassIcon(character.class)}
                {character.class}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn("hover:bg-black/5 transition-all duration-300", colors.accent)}
              onClick={() => {
                if (onEdit && character) {
                  onEdit(character);
                }
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-red-100/20 transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
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

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Target className={cn("h-4 w-4", colors.accent)} />
              สถานะตัวละคร
            </h4>
            <CharacterStats stats={character.stats} />
          </div>
          
          <div className="p-3 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <CheckCircle2 className={cn("h-4 w-4", colors.accent)} />
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