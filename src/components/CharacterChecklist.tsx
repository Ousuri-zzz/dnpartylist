import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import type { CharacterChecklist as CharacterChecklistType } from '@/types/character';
import { cn } from '@/lib/utils';
import * as Progress from '@radix-ui/react-progress';
import { WEEKLY_MAX_VALUES } from '@/constants/checklist';

// ค่าเริ่มต้นสำหรับ checklist
export const DEFAULT_CHECKLIST: CharacterChecklistType = {
  daily: {
    dailyQuest: false,
    ftg: false,
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
    themePark: 0,
    themeHell: 0,
    chaosRiftKamala: 0,
    chaosRiftBairra: 0,
    banquetHall: 0,
    jealousAlbeuteur: 0,
  },
};

interface CharacterChecklistProps {
  checklist: CharacterChecklistType;
  onChange: (checklist: CharacterChecklistType) => void;
  accentColor?: string;
  readOnly?: boolean;
  lineThroughOnComplete?: boolean;
}

// กำหนดกลุ่มรายการสำหรับแต่ละแท็บ
const TAB1_ITEMS = [
  'minotaur',
  'cerberus',
  'cerberusChallenge',
  'chaosRiftBairra',
  'banquetHall',
  'jealousAlbeuteur',
  'themePark'
];

const TAB2_ITEMS = [
  'cerberusHell',
  'manticore',
  'manticoreHell',
  'apocalypse',
  'apocalypseHell',
  'seaDragon',
  'chaosRiftKamala'
];

// เพิ่มฟังก์ชัน mapping accentColor → border color
function accentColorToBorderClass(accentColor: string) {
  switch (accentColor) {
    case 'text-red-500': return 'border-red-500';
    case 'text-pink-400': return 'border-pink-400';
    case 'text-pink-500': return 'border-pink-500';
    case 'text-violet-400': return 'border-violet-400';
    case 'text-violet-500': return 'border-violet-500';
    case 'text-blue-500': return 'border-blue-500';
    case 'text-sky-500': return 'border-sky-500';
    case 'text-emerald-500': return 'border-emerald-500';
    case 'text-purple-500': return 'border-purple-500';
    case 'text-amber-500': return 'border-amber-500';
    case 'text-yellow-500': return 'border-yellow-500';
    case 'text-green-500': return 'border-green-500';
    default: return 'border-gray-300';
  }
}

export function CharacterChecklist({ checklist, onChange, accentColor = "text-blue-500", readOnly = false, lineThroughOnComplete = false }: CharacterChecklistProps) {
  const [activeTab, setActiveTab] = useState<number>(2);

  const handleDailyToggle = (key: keyof CharacterChecklistType['daily']) => {
    if (readOnly) return;
    
    const newChecklist = {
      ...checklist,
      daily: {
        ...checklist.daily,
        [key]: !checklist.daily[key],
      },
    };
    onChange(newChecklist);
  };

  const handleWeeklyToggle = (key: keyof CharacterChecklistType['weekly'], clickedIndex: number) => {
    if (readOnly) return;
    
    const currentValue = checklist.weekly[key];
    const newValue = clickedIndex + 1 === currentValue ? 0 : clickedIndex + 1;
    
    const newChecklist = {
      ...checklist,
      weekly: {
        ...checklist.weekly,
        [key]: newValue,
      },
    };
    onChange(newChecklist);
  };

  // แปลงชื่อให้เป็นภาษาอังกฤษ
  const displayNames: Record<string, string> = {
    minotaur: 'Minotaur',
    cerberus: 'Cerberus',
    cerberusHell: 'Cerberus (Hell)',
    cerberusChallenge: 'Cerberus (Challenge)',
    manticore: 'Manticore',
    manticoreHell: 'Manticore (Hell)',
    apocalypse: 'Apocalypse',
    apocalypseHell: 'Apocalypse (Hell)',
    seaDragon: 'Sea Dragon',
    themePark: 'Theme Park',
    themeHell: 'Theme Park (Hell)',
    chaosRiftKamala: 'Chaos Rift: Kamala',
    chaosRiftBairra: 'Chaos Rift: Bairra',
    banquetHall: 'Banquet Hall',
    jealousAlbeuteur: 'Jealous Albeuteur'
  };

  // คำนวณเปอร์เซ็นต์การทำ checklist รายวัน
  const calculateDailyProgress = () => {
    const totalDailyItems = Object.keys(checklist.daily).length;
    const completedDailyItems = Object.values(checklist.daily).filter(Boolean).length;
    const percentage = Math.round((completedDailyItems / totalDailyItems) * 100);
    return percentage;
  };

  // คำนวณเปอร์เซ็นต์การทำ checklist รายสัปดาห์
  const calculateWeeklyProgress = () => {
    // นับจำนวนรายการทั้งหมด (รวมจำนวนครั้งที่ทำได้)
    const totalWeeklyItems = Object.entries(checklist.weekly).reduce((sum, [key, _]) => {
      return sum + (WEEKLY_MAX_VALUES[key as keyof typeof WEEKLY_MAX_VALUES] || 0);
    }, 0);
    
    // นับจำนวนรายการที่ทำแล้ว
    const completedWeeklyItems = Object.values(checklist.weekly).reduce((sum, value) => sum + value, 0);
    
    const percentage = Math.round((completedWeeklyItems / totalWeeklyItems) * 100);
    return percentage;
  };

  // กำหนดสีตามเปอร์เซ็นต์
  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 60) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // แปลง accentColor เป็นสีพื้นหลัง
  const getAccentBackgroundColor = () => {
    if (accentColor.includes('red')) return 'bg-red-50';
    if (accentColor.includes('emerald')) return 'bg-emerald-50';
    if (accentColor.includes('purple')) return 'bg-purple-50';
    if (accentColor.includes('sky')) return 'bg-sky-50';
    if (accentColor.includes('amber')) return 'bg-amber-50';
    return 'bg-gray-50';
  };

  // แปลง accentColor เป็นสีข้อความ
  const getAccentTextColor = () => {
    if (accentColor.includes('red')) return 'text-red-700';
    if (accentColor.includes('emerald')) return 'text-emerald-700';
    if (accentColor.includes('purple')) return 'text-purple-700';
    if (accentColor.includes('sky')) return 'text-sky-700';
    if (accentColor.includes('amber')) return 'text-amber-700';
    return 'text-gray-700';
  };

  const dailyProgress = calculateDailyProgress();
  const weeklyProgress = calculateWeeklyProgress();
  const dailyProgressColor = getProgressColor(dailyProgress);
  const weeklyProgressColor = getProgressColor(weeklyProgress);
  const accentBgColor = getAccentBackgroundColor();
  const accentTextColor = getAccentTextColor();

  const weeklyChecklistItems: Record<keyof CharacterChecklistType['weekly'], string> = {
    minotaur: 'Minotaur',
    cerberus: 'Cerberus',
    cerberusHell: 'Cerberus (Hell)',
    chaosRiftBairra: 'Chaos Rift: Bairra',
    banquetHall: 'Dark Banquet Hall',
    jealousAlbeuteur: 'Jealous Albeuteur',
    themePark: 'Theme Park',
    cerberusChallenge: 'Cerberus (Challenge)',
    manticore: 'Manticore',
    apocalypse: 'Apocalypse',
    manticoreHell: 'Manticore (Hell)',
    apocalypseHell: 'Apocalypse (Hell)',
    seaDragon: 'Sea Dragon',
    chaosRiftKamala: 'Chaos Rift: Kamala',
    themeHell: 'Theme Park (Hell)'
  };

  const weeklyChecklistMaxValues: Record<keyof CharacterChecklistType['weekly'], number> = {
    minotaur: 1,
    cerberus: 1,
    cerberusHell: 1,
    chaosRiftBairra: 1,
    banquetHall: 1,
    jealousAlbeuteur: 1,
    themePark: 1,
    cerberusChallenge: 1,
    manticore: 1,
    apocalypse: 1,
    manticoreHell: 1,
    apocalypseHell: 1,
    seaDragon: 3,
    chaosRiftKamala: 1,
    themeHell: 1
  };

  const weeklyChecklistTab1: (keyof CharacterChecklistType['weekly'])[] = [
    'minotaur',
    'cerberus',
    'cerberusHell',
    'chaosRiftBairra',
    'chaosRiftKamala',
    'jealousAlbeuteur',
    'themePark'
  ];

  const weeklyChecklistTab2: (keyof CharacterChecklistType['weekly'])[] = [
    'cerberusChallenge',
    'manticore',
    'apocalypse',
    'manticoreHell',
    'apocalypseHell',
    'seaDragon',
    'banquetHall'
  ];

  // เช็คว่า checklist daily/weekly ทำครบทุกข้อ
  const isDailyAllComplete = Object.values(checklist.daily).every(Boolean);
  const isWeeklyAllComplete = Object.entries(checklist.weekly).every(
    ([key, value]) => value >= (WEEKLY_MAX_VALUES[key as keyof typeof WEEKLY_MAX_VALUES] || 0)
  );

  return (
    <div className="w-full space-y-4">
      {/* Daily Tasks Section */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base font-semibold text-gray-700">Daily</h3>
          <span className="text-sm font-medium text-gray-600">{dailyProgress}%</span>
        </div>
        <Progress.Root className="h-2 w-full overflow-hidden rounded-full bg-muted/20 mb-2">
          <Progress.Indicator 
            className={cn("h-full w-full transition-all duration-500 ease-in-out", dailyProgressColor)} 
            style={{ transform: `translateX(-${100 - dailyProgress}%)` }} 
          />
        </Progress.Root>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 justify-start gap-2 rounded-lg hover:bg-muted/20",
              checklist.daily.dailyQuest && "bg-muted/10",
              readOnly && "cursor-default hover:bg-transparent"
            )}
            onClick={() => handleDailyToggle('dailyQuest')}
            disabled={readOnly}
          >
            {checklist.daily.dailyQuest ? (
              <CheckCircle2 className={`h-4 w-4 ${accentColor}`} />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className={cn(
              "text-sm font-medium",
              accentColor,
              (readOnly && isDailyAllComplete) || (lineThroughOnComplete && checklist.daily.dailyQuest) ? ["line-through", "text-gray-400"] : undefined
            )}>Daily Quest</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 justify-start gap-2 rounded-lg hover:bg-muted/20",
              checklist.daily.ftg && "bg-muted/10",
              readOnly && "cursor-default hover:bg-transparent"
            )}
            onClick={() => handleDailyToggle('ftg')}
            disabled={readOnly}
          >
            {checklist.daily.ftg ? (
              <CheckCircle2 className={`h-4 w-4 ${accentColor}`} />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className={cn(
              "text-sm font-medium",
              accentColor,
              (readOnly && isDailyAllComplete) || (lineThroughOnComplete && checklist.daily.ftg) ? ["line-through", "text-gray-400"] : undefined
            )}>FTG 700</span>
          </Button>
        </div>
      </div>

      {/* Weekly Tasks Section */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base font-semibold text-gray-700">Weekly</h3>
          <span className="text-sm font-medium text-gray-600">{weeklyProgress}%</span>
        </div>
        <Progress.Root className="h-2 w-full overflow-hidden rounded-full bg-muted/20 mb-2">
          <Progress.Indicator 
            className={cn("h-full w-full transition-all duration-500 ease-in-out", weeklyProgressColor)} 
            style={{ transform: `translateX(-${100 - weeklyProgress}%)` }} 
          />
        </Progress.Root>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            className={cn(
              "flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all duration-200 border-2",
              activeTab === 1 
                ? `${accentColor} ${accentColorToBorderClass(accentColor)} font-bold bg-transparent` 
                : "border-transparent text-gray-400 bg-transparent hover:text-pink-400 dark:hover:text-pink-300"
            )}
            onClick={() => setActiveTab(1)}
          >
            <span>Tab 1</span>
          </button>
          <button
            className={cn(
              "flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all duration-200 border-2",
              activeTab === 2 
                ? `${accentColor} ${accentColorToBorderClass(accentColor)} font-bold bg-transparent` 
                : "border-transparent text-gray-400 bg-transparent hover:text-violet-400 dark:hover:text-violet-300"
            )}
            onClick={() => setActiveTab(2)}
          >
            <span>Tab 2</span>
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="space-y-2">
          {(activeTab === 1 ? weeklyChecklistTab1 : weeklyChecklistTab2).map((key) => {
            const value = checklist.weekly[key as keyof CharacterChecklistType['weekly']];
            const maxValue = WEEKLY_MAX_VALUES[key as keyof typeof WEEKLY_MAX_VALUES] || 0;
            const displayName = weeklyChecklistItems[key] || key;
            const isCompleted = value >= maxValue;

            return (
              <div key={key} className="flex items-center gap-2 bg-muted/5 rounded-lg p-1.5 hover:bg-muted/10 transition-colors">
                <span className={cn(
                  "text-sm flex-1 font-medium",
                  accentColor,
                  (readOnly && isWeeklyAllComplete) || (lineThroughOnComplete && isCompleted) ? ["line-through", "text-gray-400"] : undefined
                )}>
                  {displayName}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxValue }, (_, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 w-6 p-0 rounded-full hover:bg-muted/20 transition-all duration-200",
                        i < value && "bg-muted/10",
                        readOnly && "cursor-default hover:bg-transparent"
                      )}
                      onClick={() => handleWeeklyToggle(key as keyof CharacterChecklistType['weekly'], i)}
                      disabled={readOnly}
                    >
                      {i < value ? (
                        <CheckCircle2 className={`h-3 w-3 ${accentColor}`} />
                      ) : (
                        <Circle className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}