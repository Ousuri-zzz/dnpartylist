'use client';
import React, { useState, useEffect } from 'react';
import type { CharacterClass } from '@/types/character';
import {
  InformationCircleIcon, BoltIcon, FireIcon, HeartIcon, SparklesIcon, ShieldCheckIcon, ShieldExclamationIcon, ArrowTrendingUpIcon, EyeDropperIcon, UserIcon, TrophyIcon, ChartBarIcon, CalculatorIcon,
  WrenchScrewdriverIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { Listbox } from '@headlessui/react';
// --- Add RPG-Awesome icon font support for job/class ---
import 'rpg-awesome/css/rpg-awesome.min.css';

const CHARACTER_CLASSES: CharacterClass[] = [
  'Sword Master',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Priest',
  'Engineer',
  'Alchemist',
];

const CAP_LEVELS = [
  { level: 16, crit: 4000, def: 3000, critdmg: 10600, fd: 900 },
  { level: 24, crit: 5600, def: 4200, critdmg: 14840, fd: 1260 },
  { level: 32, crit: 8000, def: 6000, critdmg: 21200, fd: 1800 },
  { level: 40, crit: 11200, def: 8400, critdmg: 29680, fd: 2550 },
  { level: 50, crit: 20000, def: 15000, critdmg: 50350, fd: 3870 },
  { level: 60, crit: 36098, def: 24863, critdmg: 103350, fd: 5550 },
  { level: 70, crit: 80914, def: 57958, critdmg: 211337, fd: 8922 },
  { level: 80, crit: 135689, def: 90714, critdmg: 431970, fd: 13560 },
  { level: 90, crit: 210823, def: 140944, critdmg: 671160, fd: 19101 },
  { level: 93, crit: 237737, def: 198671, critdmg: 832524, fd: 24999 },
  { level: 100, crit: 307264, def: 376599, critdmg: 1075998, fd: 38766 },
];

const CLASS_FORMULA = {
  'Sword Master':      { str: 0.5, agi: 0.25, int: 0.5, vit: 0.6 },
  'Mercenary':         { str: 0.5, agi: 0.25, int: 0.5, vit: 0.6 },
  'Paladin':           { str: 0.5, agi: 0.25, int: 0.5, vit: 0.6 },
  'Priest':            { str: 0.5, agi: 0.25, int: 0.5, vit: 0.6 },
  'Force User':        { str: 0.25, agi: 0.3, int: 0.75, vit: 0.72 },
  'Elemental Lord':    { str: 0.25, agi: 0.3, int: 0.75, vit: 0.72 },
  'Bowmaster':         { str: 0.25, agi: 0.5, int: 0.5, vit: 0.6 },
  'Acrobat':           { str: 0.25, agi: 0.5, int: 0.5, vit: 0.6 },
  'Engineer':          { str: 0.25, agi: 0.5, int: 0.5, vit: 0.72 },
  'Alchemist':         { str: 0.25, agi: 0.5, int: 0.5, vit: 0.72 },
};

const AGI_TO_CRIT = 3.5;
const AGI_TO_CRITRES = 10.5;
const INT_TO_MDEF = 0.8;
const VIT_TO_HP = 30;

// Map class name to icon
const CLASS_ICONS: Record<string, JSX.Element> = {
  'Sword Master': <BoltIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-300 inline-block mr-1" />, // or custom
  'Mercenary': <BoltIcon className="w-5 h-5 text-orange-500 dark:text-orange-300 inline-block mr-1" />,
  'Bowmaster': <ArrowTrendingUpIcon className="w-5 h-5 text-green-500 dark:text-green-300 inline-block mr-1" />,
  'Acrobat': <ArrowTrendingUpIcon className="w-5 h-5 text-lime-500 dark:text-lime-300 inline-block mr-1" />,
  'Force User': <FireIcon className="w-5 h-5 text-violet-500 dark:text-violet-300 inline-block mr-1" />,
  'Elemental Lord': <FireIcon className="w-5 h-5 text-pink-500 dark:text-pink-300 inline-block mr-1" />,
  'Paladin': <ShieldCheckIcon className="w-5 h-5 text-blue-500 dark:text-blue-300 inline-block mr-1" />,
  'Priest': <UserIcon className="w-5 h-5 text-amber-500 dark:text-amber-300 inline-block mr-1" />,
  'Engineer': <WrenchScrewdriverIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-300 inline-block mr-1" />,
  'Alchemist': <BeakerIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-300 inline-block mr-1" />,
};

const LEVEL_ICONS = (level: number) => (
  <TrophyIcon
    className={`w-5 h-5 mr-2 ${
      level >= 90 ? 'text-yellow-500 dark:text-yellow-300'
      : level >= 60 ? 'text-blue-500 dark:text-blue-300'
      : 'text-gray-400 dark:text-gray-500'
    }`}
  />
);

// Add a utility for compact number formatting
function formatCompact(num: number) {
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, '') + 'k';
  return num.toLocaleString();
}

// Add a color mapping for class names
const CLASS_COLORS: Record<string, string> = {
  'Sword Master': 'text-yellow-600 dark:text-yellow-300',
  'Mercenary': 'text-orange-600 dark:text-orange-300',
  'Bowmaster': 'text-green-600 dark:text-green-300',
  'Acrobat': 'text-lime-600 dark:text-lime-300',
  'Force User': 'text-violet-600 dark:text-violet-300',
  'Elemental Lord': 'text-pink-600 dark:text-pink-300',
  'Paladin': 'text-blue-600 dark:text-blue-300',
  'Priest': 'text-amber-600 dark:text-amber-300',
  'Engineer': 'text-cyan-600 dark:text-cyan-300',
  'Alchemist': 'text-emerald-600 dark:text-emerald-300',
};

// Utility สำหรับแสดง % เทียบ cap
function getStatPercent(statKey: string, value: number, cap: any) {
  if (!cap) return null;
  let capVal = 0;
  let percent = 0;
  let capPercent = 0;
  if (statKey === 'crit' || statKey === 'critres') {
    capPercent = 90;
    capVal = cap?.crit ? Math.floor(cap.crit * capPercent / 100) : 0;
    percent = capVal ? Math.floor((value / capVal) * 100) : 0;
    return { percent, capVal, capPercent };
  }
  if (statKey === 'pdef' || statKey === 'mdef') {
    capPercent = 85;
    capVal = cap?.def ? Math.floor(cap.def * capPercent / 100) : 0;
    percent = capVal ? Math.floor((value / capVal) * 100) : 0;
    return { percent, capVal, capPercent };
  }
  if (statKey === 'fd') {
    capPercent = 100;
    capVal = cap?.fd || 0;
    percent = capVal ? Math.ceil((value / capVal) * 100) : 0;
    return { percent, capVal, capPercent };
  }
  return null;
}

// --- Add getClassIcon function (reuse from PartyCard) ---
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
      return <i className={`ra ra-sword ${colorClass} mr-2`} title="Sword Master" />;
    case 'Mercenary':
      return <i className={`ra ra-axe ${colorClass} mr-2`} title="Mercenary" />;
    case 'Bowmaster':
      return <i className={`ra ra-archer ${colorClass} mr-2`} title="Bowmaster" />;
    case 'Acrobat':
      return <i className={`ra ra-player-dodge ${colorClass} mr-2`} title="Acrobat" />;
    case 'Force User':
      return <i className={`ra ra-crystal-ball ${colorClass} mr-2`} title="Force User" />;
    case 'Elemental Lord':
      return <i className={`ra ra-fire-symbol ${colorClass} mr-2`} title="Elemental Lord" />;
    case 'Paladin':
      return <i className={`ra ra-shield ${colorClass} mr-2`} title="Paladin" />;
    case 'Priest':
      return <i className={`ra ra-hospital-cross ${colorClass} mr-2`} title="Priest" />;
    case 'Engineer':
      return <i className={`ra ra-gear-hammer ${colorClass} mr-2`} title="Engineer" />;
    case 'Alchemist':
      return <i className={`ra ra-flask ${colorClass} mr-2`} title="Alchemist" />;
    default:
      return <i className={`ra ra-player ${colorClass} mr-2`} title="Unknown" />;
  }
};

export default function Status() {
  const [charClass, setCharClass] = useState('');
  const [capLevel, setCapLevel] = useState(40);
  const [stats, setStats] = useState({
    str: '',
    agi: '',
    int: '',
    vit: '',
    patk: '',
    matk: '',
    pdef: '',
    mdef: '',
    hp: '',
    crit: '',
    critres: '',
    fd: '',
  });
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<{[key:string]:boolean}>({});
  const [tooltipPosition, setTooltipPosition] = useState<{[key:string]:'left'|'right'}>({});
  const [tooltipVertical, setTooltipVertical] = useState<{[key:string]:'top'|'bottom'}>({});
  const [savedBuilds, setSavedBuilds] = useState<any[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState<number|null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{open: boolean, id: number|null}>({open: false, id: null});
  const [pendingLoadBuild, setPendingLoadBuild] = useState<any|null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Robust localStorage load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem('dnpartylist-stat-saves');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) setSavedBuilds(parsed);
      }
    } catch (e) {
      // ถ้า error ให้ reset
      setSavedBuilds([]);
    }
    setHasLoaded(true);
  }, []);

  // Robust localStorage save
  useEffect(() => {
    if (!hasLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('dnpartylist-stat-saves', JSON.stringify(savedBuilds));
    } catch (e) {
      // ignore
    }
  }, [savedBuilds, hasLoaded]);

  function handleSave() {
    if (!charClass) return;
    setShowSaveModal(true);
  }

  function confirmSave() {
    if (!charClass) return;
    const build = {
      id: Date.now(),
      charClass,
      capLevel,
      stats: { ...stats },
      results: {
        patk: calcPatk,
        matk: calcMatk,
        hp: calcHP,
        crit: calcCrit,
        critres: calcCritRes,
        pdef: calcPdef,
        mdef: calcMdef,
        fd: fd,
      },
    };
    setSavedBuilds([build, ...savedBuilds]);
    setShowSaveModal(false);
  }

  function handleDeleteSaveWithModal(id: number) {
    setShowDeleteModal({open: true, id});
  }

  function confirmDeleteSave() {
    if (showDeleteModal.id !== null) {
      setSavedBuilds(savedBuilds.filter(b => b.id !== showDeleteModal.id));
    }
    setShowDeleteModal({open: false, id: null});
  }

  function handleLoadBuild(build: any) {
    setPendingLoadBuild(build);
    setShowLoadModal(true);
  }

  function confirmLoadBuild() {
    if (pendingLoadBuild) {
      setCharClass(pendingLoadBuild.charClass);
      setCapLevel(pendingLoadBuild.capLevel);
      setStats({ ...pendingLoadBuild.stats });
      setSelectedBuildId(pendingLoadBuild.id);
    }
    setShowLoadModal(false);
    setPendingLoadBuild(null);
  }

  function cancelLoadBuild() {
    setShowLoadModal(false);
    setPendingLoadBuild(null);
  }

  // คำนวณค่าต่างๆ
  const formula = charClass && CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] ? CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] : { str: 0, agi: 0, int: 0, vit: 0 };
  const cap = CAP_LEVELS.find(l => l.level === Number(capLevel));
  function statWithPercent(val: string, percent: string) {
    const v = Number(val) || 0;
    return v;
  }
  
  // ฟังก์ชันสำหรับหักลบค่าจาก stat แบบ realtime (ไม่รวม +%)
  function statWithPercentNet(val: string, statValue: number) {
    const v = Number(val) || 0;
    return v - statValue;
  }
  
  // คำนวณค่าจาก stat (ไม่มี % สำหรับ base stats)
  const str = Number(stats.str) || 0;
  const agi = Number(stats.agi) || 0;
  const int = Number(stats.int) || 0;
  const vit = Number(stats.vit) || 0;
  
  // คำนวณค่าจาก stat
  const strToPatk = Math.floor(str * formula.str);
  const agiToPatk = Math.floor(agi * formula.agi);
  const intToMatk = Math.floor(int * (['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5));
  const vitToPdef = Math.floor(vit * (['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6));
  const intToMdef = Math.floor(int * INT_TO_MDEF);
  const vitToHp = Math.floor(vit * VIT_TO_HP);
  const agiToCrit = Math.floor(agi * AGI_TO_CRIT);
  const agiToCritRes = Math.floor(agi * AGI_TO_CRITRES);
  
  // คำนวณ bonus ที่หักลบค่าจาก stat แล้ว (ไม่รวม +%)
  const patk = statWithPercentNet(stats.patk, strToPatk + agiToPatk);
  const matk = statWithPercentNet(stats.matk, intToMatk);
  const pdef = statWithPercentNet(stats.pdef, vitToPdef);
  const mdef = statWithPercentNet(stats.mdef, intToMdef);
  const hp = statWithPercentNet(stats.hp, vitToHp);
  const crit = statWithPercentNet(stats.crit, agiToCrit);
  const critres = statWithPercentNet(stats.critres, agiToCritRes);
  const fd = statWithPercent(stats.fd, stats.fd);

  // คำนวณค่าจาก % ที่บวกจาก stat
  // (Removed percent-based calculations)

  // ผลลัพธ์คำนวณ (รวมค่าจาก stat + ค่าดิบ + % จาก stat) - จะคำนวณเฉพาะเมื่อเลือกอาชีพแล้ว
  const calcPatk = charClass ? strToPatk + agiToPatk + Math.max(0, Math.floor(patk)) : 0;
  const calcMatk = charClass ? intToMatk + Math.max(0, Math.floor(matk)) : 0;
  const calcPdef = charClass ? vitToPdef + Math.max(0, Math.floor(pdef)) : 0;
  const calcMdef = charClass ? intToMdef + Math.max(0, Math.floor(mdef)) : 0;
  const calcHP = charClass ? vitToHp + Math.max(0, Math.floor(hp)) : 0;
  const calcCrit = charClass ? agiToCrit + Math.max(0, Math.floor(crit)) : 0;
  const calcCritRes = charClass ? agiToCritRes + Math.max(0, Math.floor(critres)) : 0;

  // เทียบกับ cap
  function capColor(val: number, capVal: number|undefined) {
    if (!capVal) return '';
    if (val >= capVal) return 'text-green-600 font-bold';
    if (val >= capVal*0.8) return 'text-yellow-600 font-semibold';
    return '';
  }

  // เทียบกับ cap พร้อม %
  function capPercent(val: number, capVal: number|undefined) {
    if (!capVal || capVal === 0) return 0;
    // ปัดเศษค่าก่อน แล้วค่อยคำนวณเปอร์เซ็นต์
    const roundedVal = Math.floor(val);
    const roundedCap = Math.floor(capVal);
    return Math.floor((roundedVal / roundedCap) * 100);
  }

  // ฟังก์ชันคำนวณ FD แบบพิเศษ (ตรงกับเกม Dragon Nest)
  function calculateFDPercent(fdValue: number, capVal: number|undefined) {
    if (!capVal || capVal === 0) return 0;
    
    // สูตรการคำนวณ FD ของเกม Dragon Nest
    // ใช้การปัดเศษแบบ Round Up สำหรับ FD
    const percent = (fdValue / capVal) * 100;
    return Math.ceil(percent); // ใช้ Math.ceil แทน Math.floor สำหรับ FD
  }

  // ฟังก์ชันตรวจสอบตำแหน่ง tooltip
  const handleTooltipToggle = (key: string, event: React.MouseEvent | null) => {
    if (event) {
      // ตรวจสอบว่ามี tooltip อื่นแสดงอยู่หรือไม่
      const hasOtherTooltip = Object.keys(showTooltip).some(k => k !== key && showTooltip[k]);
      
      // ถ้ามี tooltip อื่นแสดงอยู่ ให้ปิดก่อน
      if (hasOtherTooltip) {
        setShowTooltip({});
        return; // ออกจากฟังก์ชันเพื่อป้องกันการเปิดใหม่ทันที
      }
      
      const rect = event.currentTarget.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isMobile = windowWidth < 768; // ตรวจสอบว่าเป็นมือถือหรือไม่
      
      // ปรับขนาด tooltip ตามอุปกรณ์
      const tooltipWidth = isMobile 
        ? Math.min(windowWidth - 20, 300) // มือถือ: ใช้ความกว้างหน้าจอ - 20px หรือ 300px
        : Math.min(320, windowWidth - 40); // เดสก์ท็อป: ใช้ 320px หรือความกว้างหน้าจอ - 40px
      
      const tooltipHeight = isMobile ? 350 : 400; // มือถือ: ความสูงน้อยกว่าเล็กน้อย
      
      // ตรวจสอบแนวนอน - มือถือมักจะแสดงทางขวา
      const shouldShowRight = isMobile 
        ? rect.left + tooltipWidth > windowWidth - 10 // มือถือ: buffer น้อยกว่า
        : rect.left + tooltipWidth > windowWidth - 20; // เดสก์ท็อป: buffer ปกติ
      
      // ตรวจสอบแนวตั้ง - ปรับให้มีพื้นที่มากขึ้น
      const shouldShowBottom = rect.top + tooltipHeight > windowHeight - (isMobile ? 20 : 40);
      
      setTooltipPosition(prev => ({
        ...prev,
        [key]: shouldShowRight ? 'right' : 'left'
      }));
      
      setTooltipVertical(prev => ({
        ...prev,
        [key]: shouldShowBottom ? 'bottom' : 'top'
      }));
      
      setShowTooltip(prev => ({
        ...prev,
        [key]: true
      }));
    } else {
      // สำหรับ mouse leave
      setShowTooltip(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };

  // ฟังก์ชันสำหรับ mouse leave
  const handleTooltipLeave = (key: string) => {
    setShowTooltip(prev => ({
      ...prev,
      [key]: false
    }));
  };

  // ฟังก์ชันสำหรับ click toggle
  const handleTooltipClick = (key: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowTooltip(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-2 md:px-8 flex flex-col items-center justify-center min-h-[60vh]">
      {/* ปุ่ม modal ตาราง cap - now at the top */}
      <button
        onClick={() => setOpen(true)}
        className="mb-8 group relative inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 text-white text-base md:text-lg font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:ring-opacity-50 border-2 border-white/20 hover:border-white/40"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <InformationCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-white font-bold drop-shadow">ดูตาราง Cap Stat ตามเลเวล</span>
            <span className="text-xs md:text-sm text-white/80 font-normal">คลิกเพื่อดูข้อมูล Cap ตามเลเวล</span>
          </div>
          <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors duration-300">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        {/* Hover animation */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-full"></div>
      </button>
      {/* ฟอร์มคำนวณ stat + ระบบคำนวณย่อย */}
      <div className="w-full max-w-3xl mx-auto bg-white/90 rounded-2xl shadow-lg border border-blue-100 p-4 md:p-8 mb-8">
        <div className="text-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <CalculatorIcon className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
            Stat Calculator
            <CalculatorIcon className="w-6 h-6 md:w-7 md:h-7 text-pink-500" />
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <UserIcon className="w-5 h-5 text-blue-400" />
              เลือกอาชีพ
            </label>
            <Listbox value={charClass} onChange={setCharClass}>
              <div className="relative">
                <Listbox.Button className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                  {charClass ? (
                    <span className="flex items-center">
                      {getClassIcon(charClass)}
                      {charClass}
                    </span>
                  ) : (
                    <span className="text-gray-400">เลือกอาชีพ</span>
                  )}
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-fit min-h-0 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-y-auto focus:outline-none">
                  {CHARACTER_CLASSES.map((c) => (
                    <Listbox.Option
                      key={c}
                      value={c}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`
                      }
                    >
                      <span className="flex items-center">
                        {getClassIcon(c)}
                        {c}
                      </span>
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <TrophyIcon className="w-5 h-5 text-amber-500" />
              เลือก Cap Level
            </label>
            <Listbox value={capLevel} onChange={setCapLevel}>
              <div className="relative">
                <Listbox.Button className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition">
                  <span className="flex items-center">
                    {LEVEL_ICONS(Number(capLevel))}
                    <span className="ml-2">Lv.{capLevel}</span>
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-fit min-h-0 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-y-auto focus:outline-none">
                  {CAP_LEVELS.map((l) => (
                    <Listbox.Option
                      key={l.level}
                      value={l.level}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none relative py-2 pl-8 pr-4 flex items-center ${
                          active ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                        } ${selected ? 'font-bold' : ''}`
                      }
                    >
                      <span className="absolute left-2 flex items-center">
                        {LEVEL_ICONS(l.level)}
                      </span>
                      <span className="ml-2">Lv.{l.level}</span>
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium text-blue-800 mb-1">Base Stats</label>
            <div className="grid grid-cols-4 gap-2">
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <BoltIcon className="w-4 h-4 text-yellow-500" />
                  STR
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.str} onChange={e=>setStats(s=>({...s,str:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <SparklesIcon className="w-4 h-4 text-yellow-400" />
                  AGI
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.agi} onChange={e=>setStats(s=>({...s,agi:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <FireIcon className="w-4 h-4 text-pink-500" />
                  INT
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.int} onChange={e=>setStats(s=>({...s,int:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <HeartIcon className="w-4 h-4 text-red-400" />
                  VIT
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.vit} onChange={e=>setStats(s=>({...s,vit:e.target.value}))} />
              </div>
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <BoltIcon className="w-5 h-5 text-yellow-500" />
              Physical Damage
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.patk} onChange={e=>setStats(s=>({...s,patk:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <FireIcon className="w-5 h-5 text-pink-500" />
              Magic Damage
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.matk} onChange={e=>setStats(s=>({...s,matk:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
              Physical Defense
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.pdef} onChange={e=>setStats(s=>({...s,pdef:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldExclamationIcon className="w-5 h-5 text-violet-500" />
              Magic Defense
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.mdef} onChange={e=>setStats(s=>({...s,mdef:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <HeartIcon className="w-5 h-5 text-red-400" />
              HP
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.hp} onChange={e=>setStats(s=>({...s,hp:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              Critical
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.crit} onChange={e=>setStats(s=>({...s,crit:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <EyeDropperIcon className="w-5 h-5 text-green-500" />
              Crit Resist
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.critres} onChange={e=>setStats(s=>({...s,critres:e.target.value}))} />
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ArrowTrendingUpIcon className="w-5 h-5 text-pink-400" />
              Final Damage
            </label>
            <input type="number" className="w-full rounded-lg border-gray-300 dark:border-gray-600 focus:ring-blue-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="จำนวน" value={stats.fd} onChange={e=>setStats(s=>({...s,fd:e.target.value}))} />
          </div>
        </div>
        {/* ผลลัพธ์ */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-blue-50/60 rounded-xl p-3 md:p-4 border border-blue-100 shadow flex flex-col gap-2 md:gap-3 relative">
            <div className="font-bold text-blue-700 mb-2 text-base md:text-lg flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                ผลลัพธ์
              </span>
              <button
                onClick={handleSave}
                disabled={!charClass}
                className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 transition text-sm"
              >
                Save Build
              </button>
            </div>
            {!charClass ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-blue-600 text-base md:text-lg font-semibold mb-2">กรุณาเลือกอาชีพก่อน</div>
                <div className="text-blue-500 text-xs md:text-sm">เลือกอาชีพเพื่อเริ่มการคำนวณค่าสเตตัส</div>
              </div>
            ) : (
            <div className="flex flex-col gap-1.5 md:gap-2">
              {/* Physical Damage */}
                <div className="flex justify-between items-center relative group" onMouseLeave={() => handleTooltipLeave('patk')}>
                <span className="font-medium text-blue-900 flex items-center gap-1 text-sm md:text-base">
                  <BoltIcon className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Physical Damage
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                      onMouseEnter={(e) => handleTooltipToggle('patk', e)}
                      onClick={(e) => handleTooltipClick('patk', e)}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด Physical Damage"
                  >
                    <InformationCircleIcon className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  </span>
                  <div className="text-right">
                    <div className="text-base md:text-lg font-bold text-yellow-600">{calcPatk.toLocaleString()}</div>
                  </div>
                  
                  {/* Tooltip แยกออกมา */}
                  {showTooltip.patk && (
                    <div className={`absolute z-50 w-max min-w-[280px] md:min-w-[320px] max-w-[calc(100vw-20px)] md:max-w-[calc(100vw-40px)] bg-white border border-blue-200 rounded-xl shadow-lg p-3 md:p-4 text-xs md:text-sm text-blue-900 animate-fadeIn ${tooltipPosition.patk === 'right' ? 'right-0' : 'left-0'} ${tooltipVertical.patk === 'bottom' ? 'bottom-7' : 'top-7'}`} style={{maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', pointerEvents: 'none'}}>
                      <div className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                        <BoltIcon className="w-5 h-5 text-yellow-500" />
                        Physical Damage (รวม)
                      </div>
                      
                      {/* สูตรการคำนวณ */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="font-semibold text-blue-800 mb-1">📐 สูตรการคำนวณ:</div>
                        <div className="text-blue-700">STR × {formula.str} + AGI × {formula.agi} + (Physical Damage - จาก Stat)</div>
                      </div>

                      {/* ผลลัพธ์แยกตามส่วน */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 font-medium">จาก Stat:</span>
                          <span className="font-bold text-green-900">{(strToPatk + agiToPatk).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                          <span className="font-bold text-orange-900">{Math.max(0, patk).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* การคำนวณแบบละเอียด */}
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                          <span role="img" aria-label="calculator">🧮</span>
                          การคำนวณแบบละเอียด:
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>• จาก Stat: STR × {formula.str} + AGI × {formula.agi} = {strToPatk} + {agiToPatk} = {(strToPatk + agiToPatk).toLocaleString()}</div>
                          <div>• จาก Bonus: {Math.max(0, patk).toLocaleString()} (หัก Stat แล้ว)</div>
                          <div>• รวม: {(strToPatk + agiToPatk).toLocaleString()} + {Math.max(0, patk).toLocaleString()} = {calcPatk.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* เส้นแบ่งระหว่าง Physical Damage และ Magic Damage */}
              <div className="border-t-2 border-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-full h-1"></div>

              {/* Magic Damage */}
                <div className="flex justify-between items-center relative group" onMouseLeave={() => handleTooltipLeave('matk')}>
                <span className="font-medium text-blue-900 flex items-center gap-1 text-sm md:text-base">
                  <FireIcon className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                  Magic Damage
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                      onMouseEnter={(e) => handleTooltipToggle('matk', e)}
                      onClick={(e) => handleTooltipClick('matk', e)}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด Magic Damage"
                  >
                    <InformationCircleIcon className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  </span>
                  <div className="text-right">
                    <div className="text-base md:text-lg font-bold text-pink-600">{calcMatk.toLocaleString()}</div>
                  </div>
                  
                  {/* Tooltip แยกออกมา */}
                  {showTooltip.matk && (
                    <div className={`absolute z-50 w-max min-w-[280px] md:min-w-[320px] max-w-[calc(100vw-20px)] md:max-w-[calc(100vw-40px)] bg-white border border-blue-200 rounded-xl shadow-lg p-3 md:p-4 text-xs md:text-sm text-blue-900 animate-fadeIn ${tooltipPosition.matk === 'right' ? 'right-0' : 'left-0'} ${tooltipVertical.matk === 'bottom' ? 'bottom-7' : 'top-7'}`} style={{maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', pointerEvents: 'none'}}>
                      <div className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                        <FireIcon className="w-5 h-5 text-pink-500" />
                        Magic Damage (รวม)
                      </div>
                      
                      {/* สูตรการคำนวณ */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="font-semibold text-blue-800 mb-1">📐 สูตรการคำนวณ:</div>
                        <div className="text-blue-700">INT × {['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5} + (Magic Damage - จาก Stat)</div>
                      </div>

                      {/* ผลลัพธ์แยกตามส่วน */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 font-medium">จาก Stat:</span>
                          <span className="font-bold text-green-900">{intToMatk.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                          <span className="font-bold text-orange-900">{Math.max(0, matk).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* การคำนวณแบบละเอียด */}
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                          <span role="img" aria-label="calculator">🧮</span>
                          การคำนวณแบบละเอียด:
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>• จาก Stat: INT × {['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5} = {intToMatk.toLocaleString()}</div>
                          <div>• จาก Bonus: {Math.max(0, matk).toLocaleString()} (หัก Stat แล้ว)</div>
                          <div>• รวม: {intToMatk.toLocaleString()} + {Math.max(0, matk).toLocaleString()} = {calcMatk.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* เส้นแบ่งระหว่าง Magic Damage และ HP */}
              <div className="border-t-2 border-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-full h-1"></div>

              {/* HP */}
                <div className="flex justify-between items-center relative group" onMouseLeave={() => handleTooltipLeave('hp')}>
                <span className="font-medium text-blue-900 flex items-center gap-1 text-sm md:text-base">
                  <HeartIcon className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                  HP
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                      onMouseEnter={(e) => handleTooltipToggle('hp', e)}
                      onClick={(e) => handleTooltipClick('hp', e)}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด HP"
                  >
                    <InformationCircleIcon className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  </span>
                  <div className="text-right">
                    <div className="text-base md:text-lg font-bold text-red-600">{calcHP.toLocaleString()}</div>
                  </div>
                  
                  {/* Tooltip แยกออกมา */}
                  {showTooltip.hp && (
                    <div className={`absolute z-50 w-max min-w-[280px] md:min-w-[320px] max-w-[calc(100vw-20px)] md:max-w-[calc(100vw-40px)] bg-white border border-blue-200 rounded-xl shadow-lg p-3 md:p-4 text-xs md:text-sm text-blue-900 animate-fadeIn ${tooltipPosition.hp === 'right' ? 'right-0' : 'left-0'} ${tooltipVertical.hp === 'bottom' ? 'bottom-7' : 'top-7'}`} style={{maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', pointerEvents: 'none'}}>
                      <div className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-red-400" />
                        HP (รวม)
                      </div>
                      
                      {/* สูตรการคำนวณ */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="font-semibold text-blue-800 mb-1">📐 สูตรการคำนวณ:</div>
                        <div className="text-blue-700">VIT × 30 + (HP - จาก Stat)</div>
                      </div>

                      {/* ผลลัพธ์แยกตามส่วน */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 font-medium">จาก Stat:</span>
                          <span className="font-bold text-green-900">{vitToHp.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                          <span className="font-bold text-orange-900">{Math.max(0, hp).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* การคำนวณแบบละเอียด */}
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                          <span role="img" aria-label="calculator">🧮</span>
                          การคำนวณแบบละเอียด:
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>• จาก Stat: VIT × 30 = {vitToHp.toLocaleString()}</div>
                          <div>• จาก Bonus: {Math.max(0, hp).toLocaleString()} (หัก Stat แล้ว)</div>
                          <div>• รวม: {vitToHp.toLocaleString()} + {Math.max(0, hp).toLocaleString()} = {calcHP.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* เส้นแบ่งระหว่างผลลัพธ์หลักกับ Cap Bar */}
              <div className="border-t-2 border-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-full h-1"></div>

              {/* Cap bar section */}
              {[
                  { label: 'Critical', val: calcCrit, cap: cap?.crit, key: 'crit', formula: `AGI × 3.5 + Critical`, icon: <SparklesIcon className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />, capPercent: 90, color: 'text-yellow-600' },
                  { label: 'Crit Resist', val: calcCritRes, cap: cap?.crit, key: 'critres', formula: `AGI × 10.5 + Crit Resist`, icon: <EyeDropperIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" />, capPercent: 90, color: 'text-green-600' },
                  { label: 'Physical Defense', val: calcPdef, cap: cap?.def, key: 'pdef', formula: `VIT × ${['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6} + Physical Defense`, icon: <ShieldCheckIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />, capPercent: 85, color: 'text-blue-600' },
                  { label: 'Magic Defense', val: calcMdef, cap: cap?.def, key: 'mdef', formula: `INT × 0.8 + Magic Defense`, icon: <ShieldExclamationIcon className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />, capPercent: 85, color: 'text-violet-600' },
                  { label: 'Final Damage', val: fd, cap: cap?.fd, key: 'fd', formula: `Final Damage (กรอก)`, icon: <ArrowTrendingUpIcon className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />, capPercent: 100, isFD: true, color: 'text-pink-600' },
                ].map(({label, val, cap:capVal, key, formula, icon, capPercent: statCapPercent, isFD, color}, idx) => {
                  const percent = isFD ? calculateFDPercent(val, capVal) : capPercent(val, capVal);
                  // คำนวณ cap value ที่แท้จริง
                  const actualCapValue = capVal ? Math.floor(capVal * statCapPercent / 100) : 0;
                  // คำนวณ % สำหรับหลอด (เทียบกับ cap จริง)
                  const barPercent = capVal ? Math.min((val / actualCapValue) * 100, 100) : 0;
                return (
                  <div key={label} className="flex flex-col gap-1 relative group" onMouseLeave={() => handleTooltipLeave(key)}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900 flex items-center gap-1 text-sm md:text-base">
                        {icon}
                        {label}
                        <button
                          type="button"
                          className="text-blue-400 hover:text-blue-600 focus:outline-none"
                          onMouseEnter={(e) => handleTooltipToggle(key, e)}
                          onClick={(e) => handleTooltipClick(key, e)}
                          tabIndex={0}
                          aria-label={`ดูรายละเอียด ${label}`}
                        >
                          <InformationCircleIcon className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </span>
                      <div className="text-right">
                        <div className={`text-base md:text-lg font-bold ${capColor(val, capVal)}`}>
                          {/* Mobile: แสดงแยกบรรทัด */}
                          <div className="block md:hidden">
                            <div className={`text-sm ${color}`}>{val.toLocaleString()}</div>
                            <div className="text-xs font-normal text-gray-500">
                              / <span className="font-semibold text-gray-700">{actualCapValue.toLocaleString()}</span> 
                              ({percent>=statCapPercent ? statCapPercent : percent}%)
                              {percent>statCapPercent && <span className="text-red-600"> (เกิน {percent-statCapPercent}%)</span>}
                            </div>
                          </div>
                          {/* PC: แสดงในบรรทัดเดียวกัน */}
                          <div className="hidden md:block">
                            <span className={`text-base ${color}`}>{val.toLocaleString()}</span>
                            <span className="text-base font-normal text-gray-500"> / </span>
                            <span className="text-base font-semibold text-gray-700">{actualCapValue.toLocaleString()}</span>
                            <span className="text-sm font-normal text-gray-500">
                              ({percent>=statCapPercent ? statCapPercent : percent}%)
                              {percent>statCapPercent && <span className="text-red-600"> (เกิน {percent-statCapPercent}%)</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tooltip แยกออกมา */}
                    {showTooltip[key] && (
                      <div className={`absolute z-50 w-max min-w-[280px] md:min-w-[320px] max-w-[calc(100vw-20px)] md:max-w-[calc(100vw-40px)] bg-white border border-blue-200 rounded-xl shadow-lg p-3 md:p-4 text-xs md:text-sm text-blue-900 animate-fadeIn ${tooltipPosition[key] === 'right' ? 'right-0' : 'left-0'} ${tooltipVertical[key] === 'bottom' ? 'bottom-7' : 'top-7'}`} style={{maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', pointerEvents: 'none'}}>
                        <div className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                          {icon}
                          {label} (รวม)
                        </div>
                        
                        {/* สูตรการคำนวณ */}
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="font-semibold text-blue-800 mb-1">📐 สูตรการคำนวณ:</div>
                          <div className="text-blue-700">{formula}</div>
                        </div>

                        {/* ผลลัพธ์แยกตามส่วน */}
                        <div className="space-y-2">
                          {key === 'crit' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-green-800 font-medium">จาก Stat:</span>
                                <span className="font-bold text-green-900">{agiToCrit.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                                <span className="font-bold text-orange-900">{Math.max(0, crit).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          {key === 'critres' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-green-800 font-medium">จาก Stat:</span>
                                <span className="font-bold text-green-900">{agiToCritRes.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                                <span className="font-bold text-orange-900">{Math.max(0, critres).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          {key === 'pdef' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-green-800 font-medium">จาก Stat:</span>
                                <span className="font-bold text-green-900">{vitToPdef.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                                <span className="font-bold text-orange-900">{Math.max(0, pdef).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          {key === 'mdef' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-green-800 font-medium">จาก Stat:</span>
                                <span className="font-bold text-green-900">{intToMdef.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus (หัก Stat):</span>
                                <span className="font-bold text-orange-900">{Math.max(0, mdef).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          {key === 'fd' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus:</span>
                                <span className="font-bold text-orange-900">{fd.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          
                          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-purple-800 font-medium">รวมทั้งหมด:</span>
                            <span className="font-bold text-purple-900">{val.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* การคำนวณแบบละเอียดสำหรับ Critical */}
                        {key === 'crit' && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                              <span role="img" aria-label="calculator">🧮</span>
                              การคำนวณแบบละเอียด:
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>• จาก Stat: AGI × 3.5 = {agiToCrit.toLocaleString()}</div>
                              <div>• จาก Bonus: {Math.max(0, crit).toLocaleString()} (หัก Stat แล้ว)</div>
                              <div>• รวม: {agiToCrit.toLocaleString()} + {Math.max(0, crit).toLocaleString()} = {calcCrit.toLocaleString()}</div>
                            </div>
                          </div>
                        )}

                        {/* การคำนวณแบบละเอียดสำหรับ Crit Resist */}
                        {key === 'critres' && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                              <span role="img" aria-label="calculator">🧮</span>
                              การคำนวณแบบละเอียด:
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>• จาก Stat: AGI × 10.5 = {agiToCritRes.toLocaleString()}</div>
                              <div>• จาก Bonus: {Math.max(0, critres).toLocaleString()} (หัก Stat แล้ว)</div>
                              <div>• รวม: {agiToCritRes.toLocaleString()} + {Math.max(0, critres).toLocaleString()} = {calcCritRes.toLocaleString()}</div>
                            </div>
                          </div>
                        )}

                        {/* การคำนวณแบบละเอียดสำหรับ Physical Defense */}
                        {key === 'pdef' && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                              <span role="img" aria-label="calculator">🧮</span>
                              การคำนวณแบบละเอียด:
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>• จาก Stat: VIT × {['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6} = {vitToPdef.toLocaleString()}</div>
                              <div>• จาก Bonus: {Math.max(0, pdef).toLocaleString()} (หัก Stat แล้ว)</div>
                              <div>• รวม: {vitToPdef.toLocaleString()} + {Math.max(0, pdef).toLocaleString()} = {calcPdef.toLocaleString()}</div>
                            </div>
                          </div>
                        )}

                        {/* การคำนวณแบบละเอียดสำหรับ Magic Defense */}
                        {key === 'mdef' && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                              <span role="img" aria-label="calculator">🧮</span>
                              การคำนวณแบบละเอียด:
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>• จาก Stat: INT × 0.8 = {intToMdef.toLocaleString()}</div>
                              <div>• จาก Bonus: {Math.max(0, mdef).toLocaleString()} (หัก Stat แล้ว)</div>
                              <div>• รวม: {intToMdef.toLocaleString()} + {Math.max(0, mdef).toLocaleString()} = {calcMdef.toLocaleString()}</div>
                            </div>
                          </div>
                        )}

                        {/* การคำนวณแบบละเอียดสำหรับ FD */}
                        {key === 'fd' && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                              <span role="img" aria-label="calculator">🧮</span>
                              การคำนวณ %:
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>• {val.toLocaleString()} ÷ {capVal?.toLocaleString()} × 100 = {((val / (capVal || 1)) * 100).toFixed(2)}%</div>
                              <div>• ปัดเศษขึ้น: <span className="font-semibold">{percent}%</span> (ใช้ Math.ceil)</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="w-full h-2 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${barPercent>=75 ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg' : barPercent>=35 ? 'bg-gradient-to-r from-yellow-500 to-amber-600 shadow-md' : 'bg-gradient-to-r from-red-500 to-red-600'}`} style={{width: `${barPercent}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 md:p-4 pt-16 md:pt-20">
          <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden animate-fadeIn">
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 md:top-4 md:right-4 text-gray-400 hover:text-blue-500 text-xl md:text-2xl font-bold focus:outline-none z-10 bg-white/80 rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
              aria-label="ปิด"
            >
              ×
            </button>
            <div className="p-3 md:p-6 pt-6 md:pt-8 pb-4 md:pb-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold text-center bg-gradient-to-r from-violet-600 via-blue-500 to-pink-500 bg-clip-text text-transparent mb-4 md:mb-6 drop-shadow">Dragon Nest Stat Cap Table by Level</h2>
              <div className="overflow-x-auto rounded-xl md:rounded-2xl shadow-lg bg-white/90 border border-blue-100">
                <table className="min-w-full text-xs md:text-sm lg:text-base">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 via-violet-100 to-pink-100 text-blue-900">
                      <th className="py-2 md:py-3 lg:py-4 px-2 md:px-4 lg:px-6 text-left rounded-tl-xl md:rounded-tl-2xl font-bold text-sm md:text-base lg:text-lg border-b-2 border-blue-200">เลเวล</th>
                      <th className="py-2 md:py-3 lg:py-4 px-2 md:px-4 lg:px-6 font-bold text-sm md:text-base lg:text-lg border-b-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xs md:text-sm lg:text-base">Crit/Resist</span>
                          <span className="text-xs font-normal text-blue-700">(≈90%)</span>
                        </div>
                      </th>
                      <th className="py-2 md:py-3 lg:py-4 px-2 md:px-4 lg:px-6 font-bold text-sm md:text-base lg:text-lg border-b-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xs md:text-sm lg:text-base">Defense</span>
                          <span className="text-xs font-normal text-blue-700">(≈85%)</span>
                        </div>
                      </th>
                      <th className="py-2 md:py-3 lg:py-4 px-2 md:px-4 lg:px-6 font-bold text-sm md:text-base lg:text-lg border-b-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xs md:text-sm lg:text-base">Crit DMG</span>
                        </div>
                      </th>
                      <th className="py-2 md:py-3 lg:py-4 px-2 md:px-4 lg:px-6 rounded-tr-xl md:rounded-tr-2xl font-bold text-sm md:text-base lg:text-lg border-b-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xs md:text-sm lg:text-base">Final DMG</span>
                          <span className="text-xs font-normal text-blue-700">(100%)</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAP_LEVELS.map((row, i) => (
                      <tr key={row.level} className={
                        `transition-colors hover:bg-blue-50/80 ${i%2===0 ? 'bg-white/70' : 'bg-blue-50/40'} ${i === CAP_LEVELS.length - 1 ? 'border-b-0' : 'border-b border-blue-100'}`}
                      >
                        <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-left font-bold text-blue-700 text-sm md:text-base lg:text-lg">
                          <div className="flex items-center gap-1 md:gap-2">
                            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-blue-400 to-violet-500 rounded-full"></div>
                            <span className="whitespace-nowrap">Lv.{row.level}</span>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-center font-semibold text-yellow-600">
                          <div className="flex flex-col">
                            <span className="text-sm md:text-base lg:text-lg">{row.crit.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 hidden md:block">Crit/Resist</span>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-center font-semibold text-blue-600">
                          <div className="flex flex-col">
                            <span className="text-sm md:text-base lg:text-lg">{row.def.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 hidden md:block">Defense</span>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-center font-semibold text-purple-600">
                          <div className="flex flex-col">
                            <span className="text-sm md:text-base lg:text-lg">{row.critdmg.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 hidden md:block">Crit DMG</span>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-center font-semibold text-pink-600">
                          <div className="flex flex-col">
                            <span className="text-sm md:text-base lg:text-lg">{row.fd.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 hidden md:block">Final DMG</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl text-blue-800 text-xs md:text-sm shadow-lg">
                <div className="font-bold mb-2 md:mb-3 text-base md:text-lg flex items-center gap-2">
                  <InformationCircleIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  หมายเหตุ:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-500 rounded-full"></div>
                    <span className="font-semibold text-xs md:text-sm">Crit/Resist Cap ≈ 90%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-xs md:text-sm">Defense Cap ≈ 85%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-pink-50 rounded-lg border border-pink-200">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-pink-500 rounded-full"></div>
                    <span className="font-semibold text-xs md:text-sm">FD Cap = 100%</span>
                  </div>
                </div>
                <div className="mt-2 md:mt-3 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-xs md:text-sm">
                    <span className="font-semibold">คำอธิบาย:</span> ค่า Cap คือค่าสูงสุดที่ทำให้ได้ประสิทธิภาพเต็ม 100% ตามประเภทนั้นๆ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating button for mobile */}
      <button
        className="fixed bottom-4 right-4 z-40 bg-blue-600 text-white rounded-full p-3 shadow-lg lg:hidden"
        onClick={() => setShowSidebar(true)}
        title="Saved Builds"
      >
        <ChartBarIcon className="w-6 h-6" />
      </button>

      {/* Sidebar Drawer/Modal for mobile */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl lg:rounded-2xl shadow-xl p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col gap-0">
                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-200 text-lg mb-0">
                  <ChartBarIcon className="w-5 h-5 text-blue-500" />
                  <span>Saved Builds</span>
                </div>
                <span className="text-xs font-normal text-gray-400 dark:text-gray-400 mt-1 mb-2 block">ข้อมูลที่บันทึกจะถูกเก็บไว้ในเครื่องของคุณเท่านั้น</span>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-blue-500 text-2xl font-bold">×</button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[70vh] pr-1">
              {savedBuilds.length === 0 && (
                <div className="text-gray-400 text-sm">No saved builds yet.</div>
              )}
              {savedBuilds.map((b) => (
                <div
                  key={b.id}
                  className={`relative bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 rounded-xl shadow-md px-4 py-3 mb-3 transition cursor-pointer hover:shadow-lg ${selectedBuildId === b.id ? 'ring-2 ring-blue-400 dark:ring-blue-300 border-blue-400 dark:border-blue-300' : ''}`}
                  onClick={() => handleLoadBuild(b)}
                  title="คลิกเพื่อโหลดข้อมูลนี้"
                >
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteSaveWithModal(b.id); }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1 rounded-full text-lg"
                    title="Delete"
                  >
                    ×
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    {getClassIcon(b.charClass)}
                    <span className={`font-bold text-base ${CLASS_COLORS[b.charClass] || 'text-blue-900 dark:text-blue-100'}`}>{b.charClass}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Lv.{b.capLevel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm divide-y-0">
                    {/* P.Atk */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-300"><BoltIcon className="w-4 h-4" />P.Atk</span>
                      <span className="font-bold">{formatCompact(b.results.patk)}</span>
                    </div>
                    {/* M.Atk */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-pink-600 dark:text-pink-300"><FireIcon className="w-4 h-4" />M.Atk</span>
                      <span className="font-bold">{formatCompact(b.results.matk)}</span>
                    </div>
                    {/* HP */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-300"><HeartIcon className="w-4 h-4" />HP</span>
                      <span className="font-bold">{formatCompact(b.results.hp)}</span>
                    </div>
                    {/* FD */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-pink-500 dark:text-pink-200"><ArrowTrendingUpIcon className="w-4 h-4" />FD</span>
                      {(() => { const p = getStatPercent('fd', b.results.fd, CAP_LEVELS.find(l => l.level === b.capLevel));
                        if (!p) return <span className="font-bold">{formatCompact(b.results.fd)}</span>;
                        if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                        return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                      })()}
                    </div>
                    {/* P.Def */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300"><ShieldCheckIcon className="w-4 h-4" />P.Def</span>
                      {(() => { const p = getStatPercent('pdef', b.results.pdef, CAP_LEVELS.find(l => l.level === b.capLevel));
                        if (!p) return <span className="font-bold">{formatCompact(b.results.pdef)}</span>;
                        if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                        return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                      })()}
                    </div>
                    {/* M.Def */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-violet-600 dark:text-violet-300"><ShieldExclamationIcon className="w-4 h-4" />M.Def</span>
                      {(() => { const p = getStatPercent('mdef', b.results.mdef, CAP_LEVELS.find(l => l.level === b.capLevel));
                        if (!p) return <span className="font-bold">{formatCompact(b.results.mdef)}</span>;
                        if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                        return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                      })()}
                    </div>
                    {/* Crit */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-yellow-500 dark:text-yellow-200"><SparklesIcon className="w-4 h-4" />Crit</span>
                      {(() => { const p = getStatPercent('crit', b.results.crit, CAP_LEVELS.find(l => l.level === b.capLevel));
                        if (!p) return <span className="font-bold">{formatCompact(b.results.crit)}</span>;
                        if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                        return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                      })()}
                    </div>
                    {/* Resist */}
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-300"><EyeDropperIcon className="w-4 h-4" />Resist</span>
                      {(() => { const p = getStatPercent('critres', b.results.critres, CAP_LEVELS.find(l => l.level === b.capLevel));
                        if (!p) return <span className="font-bold">{formatCompact(b.results.critres)}</span>;
                        if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                        return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <div className="hidden lg:block fixed top-24 right-4 w-80 max-h-[calc(100vh-7rem)] overflow-y-auto z-30">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 p-4 flex flex-col gap-3">
        <div className="text-xs font-normal text-gray-400 dark:text-gray-400 mt-0 mb-0 -mt-1 block">ข้อมูลที่บันทึกจะถูกเก็บไว้ในเครื่องของคุณเท่านั้น</div>
          <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-200 text-lg mb-0 relative">
            <ChartBarIcon className="w-5 h-5 text-blue-500" />
            <span>Saved Builds</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1">
            {savedBuilds.length === 0 && (
              <div className="text-gray-400 text-sm">No saved builds yet.</div>
            )}
            {savedBuilds.map((b) => (
              <div
                key={b.id}
                className={`relative bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 rounded-xl shadow-md px-4 py-3 mb-3 transition cursor-pointer hover:shadow-lg ${selectedBuildId === b.id ? 'ring-2 ring-blue-400 dark:ring-blue-300 border-blue-400 dark:border-blue-300' : ''}`}
                onClick={() => handleLoadBuild(b)}
                title="คลิกเพื่อโหลดข้อมูลนี้"
              >
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteSaveWithModal(b.id); }}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1 rounded-full text-lg"
                  title="Delete"
                >
                  ×
                </button>
                <div className="flex items-center gap-2 mb-1">
                  {getClassIcon(b.charClass)}
                  <span className={`font-bold text-base ${CLASS_COLORS[b.charClass] || 'text-blue-900 dark:text-blue-100'}`}>{b.charClass}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Lv.{b.capLevel}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm divide-y-0">
                  {/* P.Atk */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-300"><BoltIcon className="w-4 h-4" />P.Atk</span>
                    <span className="font-bold">{formatCompact(b.results.patk)}</span>
                  </div>
                  {/* M.Atk */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-pink-600 dark:text-pink-300"><FireIcon className="w-4 h-4" />M.Atk</span>
                    <span className="font-bold">{formatCompact(b.results.matk)}</span>
                  </div>
                  {/* HP */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-300"><HeartIcon className="w-4 h-4" />HP</span>
                    <span className="font-bold">{formatCompact(b.results.hp)}</span>
                  </div>
                  {/* FD */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-pink-500 dark:text-pink-200"><ArrowTrendingUpIcon className="w-4 h-4" />FD</span>
                    {(() => { const p = getStatPercent('fd', b.results.fd, CAP_LEVELS.find(l => l.level === b.capLevel));
                      if (!p) return <span className="font-bold">{formatCompact(b.results.fd)}</span>;
                      if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                      return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                    })()}
                  </div>
                  {/* P.Def */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300"><ShieldCheckIcon className="w-4 h-4" />P.Def</span>
                    {(() => { const p = getStatPercent('pdef', b.results.pdef, CAP_LEVELS.find(l => l.level === b.capLevel));
                      if (!p) return <span className="font-bold">{formatCompact(b.results.pdef)}</span>;
                      if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                      return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                    })()}
                  </div>
                  {/* M.Def */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-violet-600 dark:text-violet-300"><ShieldExclamationIcon className="w-4 h-4" />M.Def</span>
                    {(() => { const p = getStatPercent('mdef', b.results.mdef, CAP_LEVELS.find(l => l.level === b.capLevel));
                      if (!p) return <span className="font-bold">{formatCompact(b.results.mdef)}</span>;
                      if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                      return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                    })()}
                  </div>
                  {/* Crit */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-yellow-500 dark:text-yellow-200"><SparklesIcon className="w-4 h-4" />Crit</span>
                    {(() => { const p = getStatPercent('crit', b.results.crit, CAP_LEVELS.find(l => l.level === b.capLevel));
                      if (!p) return <span className="font-bold">{formatCompact(b.results.crit)}</span>;
                      if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                      return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                    })()}
                  </div>
                  {/* Resist */}
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-300"><EyeDropperIcon className="w-4 h-4" />Resist</span>
                    {(() => { const p = getStatPercent('critres', b.results.critres, CAP_LEVELS.find(l => l.level === b.capLevel));
                      if (!p) return <span className="font-bold">{formatCompact(b.results.critres)}</span>;
                      if (p.percent >= p.capPercent) return <span className="font-bold text-xs text-red-500 dark:text-red-400">{p.capPercent}%</span>;
                      return <span className="font-bold text-xs text-gray-700 dark:text-gray-100">{p.percent}%</span>;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal ยืนยัน Save */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-xs w-full">
            <div className="font-bold text-blue-700 dark:text-blue-200 text-lg mb-2">ยืนยันการบันทึก Build?</div>
            <div className="text-gray-700 dark:text-gray-200 mb-4">คุณต้องการบันทึก Build นี้ไว้ใน Saved Builds หรือไม่?</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowSaveModal(false)} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold">ยกเลิก</button>
              <button onClick={confirmSave} className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal ยืนยันลบ */}
      {showDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-xs w-full">
            <div className="font-bold text-red-700 dark:text-red-300 text-lg mb-2">ยืนยันการลบ Build?</div>
            <div className="text-gray-700 dark:text-gray-200 mb-4">คุณต้องการลบ Build นี้ออกจาก Saved Builds หรือไม่?</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowDeleteModal({open:false,id:null})} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold">ยกเลิก</button>
              <button onClick={confirmDeleteSave} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal ยืนยันโหลด Build */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-xs w-full">
            <div className="font-bold text-blue-700 dark:text-blue-200 text-lg mb-2">ยืนยันการโหลด Build?</div>
            <div className="text-gray-700 dark:text-gray-200 mb-4">คุณต้องการโหลด Build นี้มากรอกในฟอร์มหรือไม่? ข้อมูลเดิมจะถูกแทนที่</div>
            <div className="flex justify-end gap-2">
              <button onClick={cancelLoadBuild} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold">ยกเลิก</button>
              <button onClick={confirmLoadBuild} className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 