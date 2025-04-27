import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Character, CharacterClass, EditableCharacter, EditableStats, convertToCharacterStats } from '../types/character';
import { CHARACTER_CLASSES } from '../config/constants';
import { toast } from 'react-hot-toast';
import { Shield, Sword, Zap, Star, Crown, Sparkles, User, Target, Heart, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterCardEditProps {
  character: Character;
  onSave: (character: Character) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  [key: string]: string;
}

export function CharacterCardEdit({ character, onSave, onCancel }: CharacterCardEditProps) {
  const [formData, setFormData] = useState<EditableCharacter>({
    ...character,
    stats: {
      str: character.stats.str.toString(),
      agi: character.stats.agi.toString(),
      int: character.stats.int.toString(),
      vit: character.stats.vit.toString(),
      spr: character.stats.spr.toString(),
      points: character.stats.points.toString(),
      atk: character.stats.atk.toString(),
      hp: character.stats.hp.toString(),
      fd: character.stats.fd.toString(),
      cri: character.stats.cri.toString(),
      ele: character.stats.ele.toString(),
      pdef: character.stats.pdef.toString(),
      mdef: character.stats.mdef.toString()
    }
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateStats = (stats: EditableStats): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    // Check for empty values
    Object.entries(stats).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = 'ค่านี้จำเป็น';
      }
    });

    // Validate numeric values and ranges
    if (stats.str && (Number(stats.str) < 0 || Number(stats.str) > 999)) {
      newErrors.str = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.agi && (Number(stats.agi) < 0 || Number(stats.agi) > 999)) {
      newErrors.agi = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.int && (Number(stats.int) < 0 || Number(stats.int) > 999)) {
      newErrors.int = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.vit && (Number(stats.vit) < 0 || Number(stats.vit) > 999)) {
      newErrors.vit = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.spr && (Number(stats.spr) < 0 || Number(stats.spr) > 999)) {
      newErrors.spr = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.points && (Number(stats.points) < 0 || Number(stats.points) > 999)) {
      newErrors.points = 'ค่าต้องอยู่ระหว่าง 0-999';
    }

    // Combat stats validation
    if (stats.atk && (Number(stats.atk) < 0 || Number(stats.atk) > 999999)) {
      newErrors.atk = 'ค่าต้องอยู่ระหว่าง 0-999999';
    }
    if (stats.hp && (Number(stats.hp) < 0 || Number(stats.hp) > 999999)) {
      newErrors.hp = 'ค่าต้องอยู่ระหว่าง 0-999999';
    }
    if (stats.fd && (Number(stats.fd) < 0 || Number(stats.fd) > 999)) {
      newErrors.fd = 'ค่าต้องอยู่ระหว่าง 0-999';
    }
    if (stats.cri && (Number(stats.cri) < 0 || Number(stats.cri) > 100)) {
      newErrors.cri = 'ค่าต้องอยู่ระหว่าง 0-100';
    }
    if (stats.ele && (Number(stats.ele) < 0 || Number(stats.ele) > 100)) {
      newErrors.ele = 'ค่าต้องอยู่ระหว่าง 0-100';
    }
    if (stats.pdef && (Number(stats.pdef) < 0 || Number(stats.pdef) > 100)) {
      newErrors.pdef = 'ค่าต้องอยู่ระหว่าง 0-100';
    }
    if (stats.mdef && (Number(stats.mdef) < 0 || Number(stats.mdef) > 100)) {
      newErrors.mdef = 'ค่าต้องอยู่ระหว่าง 0-100';
    }

    return newErrors;
  };

  const handleStatsChange = (stat: keyof EditableStats) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and empty string
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const newStats = {
        ...formData.stats,
        [stat]: value
      };
      
      // Clear error when user starts typing
      if (errors[stat]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[stat];
          return newErrors;
        });
      }

      setFormData(prev => ({
        ...prev,
        stats: newStats
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submitting
    const validationErrors = validateStats(formData.stats);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('กรุณาแก้ไขข้อผิดพลาดในฟอร์ม');
      return;
    }

    // Convert EditableStats back to CharacterStats
    const updatedCharacter: Character = {
      ...formData,
      stats: convertToCharacterStats(formData.stats)
    };
    
    onSave(updatedCharacter);
  };

  // ฟังก์ชันสำหรับเลือก Icon ตามอาชีพ
  const getClassIcon = (subClass: string) => {
    switch (subClass) {
      case 'Sword Master':
        return <Sword className="h-5 w-5 text-red-500" />;
      case 'Mercenary':
        return <Sword className="h-5 w-5 text-red-500" />;
      case 'Bowmaster':
        return <Zap className="h-5 w-5 text-emerald-500" />;
      case 'Acrobat':
        return <Zap className="h-5 w-5 text-emerald-500" />;
      case 'Force User':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      case 'Elemental Lord':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      case 'Paladin':
        return <Shield className="h-5 w-5 text-sky-500" />;
      case 'Priest':
        return <Shield className="h-5 w-5 text-sky-500" />;
      case 'Engineer':
        return <Star className="h-5 w-5 text-amber-500" />;
      case 'Alchemist':
        return <Star className="h-5 w-5 text-amber-500" />;
      default:
        return <Crown className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <User className="h-5 w-5 text-violet-500" />
          แก้ไขข้อมูลตัวละคร
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        {/* Basic Info Section */}
        <div className="space-y-4 p-4 rounded-lg bg-white/60 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-medium flex items-center gap-2 text-slate-700">
            <User className="h-4 w-4 text-violet-500" />
            ข้อมูลพื้นฐาน
          </h3>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-slate-600">
                ชื่อตัวละคร
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3 bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right text-slate-600">
                คลาส
              </Label>
              <Select
                value={formData.class}
                onValueChange={(value: CharacterClass) => setFormData({ ...formData, class: value })}
              >
                <SelectTrigger className="col-span-3 bg-white/70 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20">
                  <SelectValue placeholder="เลือกคลาส" />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_CLASSES.map((characterClass: CharacterClass) => (
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

        {/* Base Stats Section */}
        <div className="space-y-4 p-4 rounded-lg bg-white/60 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-medium flex items-center gap-2 text-slate-700">
            <Target className="h-4 w-4 text-violet-500" />
            สเตตัสพื้นฐาน
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="str" className="text-slate-600">STR</Label>
              <Input
                id="str"
                type="text"
                inputMode="decimal"
                value={formData.stats.str}
                onChange={handleStatsChange('str')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.str ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.str && <p className="text-xs text-red-500">{errors.str}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agi" className="text-slate-600">AGI</Label>
              <Input
                id="agi"
                type="text"
                inputMode="decimal"
                value={formData.stats.agi}
                onChange={handleStatsChange('agi')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.agi ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.agi && <p className="text-xs text-red-500">{errors.agi}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="int" className="text-slate-600">INT</Label>
              <Input
                id="int"
                type="text"
                inputMode="decimal"
                value={formData.stats.int}
                onChange={handleStatsChange('int')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.int ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.int && <p className="text-xs text-red-500">{errors.int}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vit" className="text-slate-600">VIT</Label>
              <Input
                id="vit"
                type="text"
                inputMode="decimal"
                value={formData.stats.vit}
                onChange={handleStatsChange('vit')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.vit ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.vit && <p className="text-xs text-red-500">{errors.vit}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="spr" className="text-slate-600">SPR</Label>
              <Input
                id="spr"
                type="text"
                inputMode="decimal"
                value={formData.stats.spr}
                onChange={handleStatsChange('spr')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.spr ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.spr && <p className="text-xs text-red-500">{errors.spr}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="points" className="text-slate-600">Points</Label>
              <Input
                id="points"
                type="text"
                inputMode="decimal"
                value={formData.stats.points}
                onChange={handleStatsChange('points')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.points ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.points && <p className="text-xs text-red-500">{errors.points}</p>}
            </div>
          </div>
        </div>

        {/* Combat Stats Section */}
        <div className="space-y-4 p-4 rounded-lg bg-white/60 border border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-medium flex items-center gap-2 text-slate-700">
            <Sword className="h-4 w-4 text-violet-500" />
            สเตตัสการต่อสู้
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="atk" className="text-slate-600">ATK</Label>
              <Input
                id="atk"
                type="text"
                inputMode="decimal"
                value={formData.stats.atk}
                onChange={handleStatsChange('atk')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.atk ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.atk && <p className="text-xs text-red-500">{errors.atk}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hp" className="text-slate-600">HP</Label>
              <Input
                id="hp"
                type="text"
                inputMode="decimal"
                value={formData.stats.hp}
                onChange={handleStatsChange('hp')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.hp ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.hp && <p className="text-xs text-red-500">{errors.hp}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fd" className="text-slate-600">FD%</Label>
              <Input
                id="fd"
                type="text"
                inputMode="decimal"
                value={formData.stats.fd}
                onChange={handleStatsChange('fd')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.fd ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.fd && <p className="text-xs text-red-500">{errors.fd}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cri" className="text-slate-600">CRI%</Label>
              <Input
                id="cri"
                type="text"
                inputMode="decimal"
                value={formData.stats.cri}
                onChange={handleStatsChange('cri')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.cri ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.cri && <p className="text-xs text-red-500">{errors.cri}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ele" className="text-slate-600">ELE%</Label>
              <Input
                id="ele"
                type="text"
                inputMode="decimal"
                value={formData.stats.ele}
                onChange={handleStatsChange('ele')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.ele ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.ele && <p className="text-xs text-red-500">{errors.ele}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pdef" className="text-slate-600">PDEF%</Label>
              <Input
                id="pdef"
                type="text"
                inputMode="decimal"
                value={formData.stats.pdef}
                onChange={handleStatsChange('pdef')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.pdef ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.pdef && <p className="text-xs text-red-500">{errors.pdef}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mdef" className="text-slate-600">MDEF%</Label>
              <Input
                id="mdef"
                type="text"
                inputMode="decimal"
                value={formData.stats.mdef}
                onChange={handleStatsChange('mdef')}
                required
                className={cn("bg-white/70 border-slate-200 transition-colors", 
                  errors.mdef ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'
                )}
              />
              {errors.mdef && <p className="text-xs text-red-500">{errors.mdef}</p>}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex items-center gap-2 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
          ยกเลิก
        </Button>
        <Button 
          type="submit"
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white"
        >
          <Save className="h-4 w-4" />
          บันทึก
        </Button>
      </DialogFooter>
    </form>
  );
}

export default CharacterCardEdit; 