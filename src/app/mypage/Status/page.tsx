'use client';
import React, { useState } from 'react';
import type { CharacterClass } from '@/types/character';
import { InformationCircleIcon, BoltIcon, FireIcon, HeartIcon, SparklesIcon, ShieldCheckIcon, ShieldExclamationIcon, ArrowTrendingUpIcon, EyeDropperIcon, UserIcon, TrophyIcon, ChartBarIcon, CalculatorIcon } from '@heroicons/react/24/outline';

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

export default function Status() {
  const [charClass, setCharClass] = useState('');
  const [capLevel, setCapLevel] = useState(40);
  const [stats, setStats] = useState({
    str: '', strPercent: '',
    agi: '', agiPercent: '',
    int: '', intPercent: '',
    vit: '', vitPercent: '',
    patk: '', patkPercent: '',
    matk: '', matkPercent: '',
    pdef: '', pdefPercent: '',
    mdef: '', mdefPercent: '',
    hp: '', hpPercent: '',
    crit: '', critPercent: '',
    critres: '', critresPercent: '',
    fd: '', fdPercent: '',
  });
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<{[key:string]:boolean}>({});
  const [tooltipPosition, setTooltipPosition] = useState<{[key:string]:'left'|'right'}>({});
  const [tooltipVertical, setTooltipVertical] = useState<{[key:string]:'top'|'bottom'}>({});

  // คำนวณค่าต่างๆ
  const formula = charClass && CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] ? CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] : { str: 0, agi: 0, int: 0, vit: 0 };
  const cap = CAP_LEVELS.find(l => l.level === Number(capLevel));
  function statWithPercent(val: string, percent: string) {
    const v = Number(val) || 0;
    const p = Number(percent) || 0;
    return v + (v * p / 100);
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
  const fd = statWithPercent(stats.fd, stats.fdPercent);

  // คำนวณค่าจาก % ที่บวกจาก stat
  const patkFromPercent = Math.floor((strToPatk + agiToPatk) * (Number(stats.patkPercent) || 0) / 100);
  const matkFromPercent = Math.floor(intToMatk * (Number(stats.matkPercent) || 0) / 100);
  const pdefFromPercent = Math.floor(vitToPdef * (Number(stats.pdefPercent) || 0) / 100);
  const mdefFromPercent = Math.floor(intToMdef * (Number(stats.mdefPercent) || 0) / 100);
  const hpFromPercent = Math.floor(vitToHp * (Number(stats.hpPercent) || 0) / 100);
  const critFromPercent = Math.floor(agiToCrit * (Number(stats.critPercent) || 0) / 100);
  const critresFromPercent = Math.floor(agiToCritRes * (Number(stats.critresPercent) || 0) / 100);

  // ผลลัพธ์คำนวณ (รวมค่าจาก stat + ค่าดิบ + % จาก stat) - จะคำนวณเฉพาะเมื่อเลือกอาชีพแล้ว
  const calcPatk = charClass ? strToPatk + agiToPatk + Math.max(0, Math.floor(patk)) + patkFromPercent : 0;
  const calcMatk = charClass ? intToMatk + Math.max(0, Math.floor(matk)) + matkFromPercent : 0;
  const calcPdef = charClass ? vitToPdef + Math.max(0, Math.floor(pdef)) + pdefFromPercent : 0;
  const calcMdef = charClass ? intToMdef + Math.max(0, Math.floor(mdef)) + mdefFromPercent : 0;
  const calcHP = charClass ? vitToHp + Math.max(0, Math.floor(hp)) + hpFromPercent : 0;
  const calcCrit = charClass ? agiToCrit + Math.max(0, Math.floor(crit)) + critFromPercent : 0;
  const calcCritRes = charClass ? agiToCritRes + Math.max(0, Math.floor(critres)) + critresFromPercent : 0;

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
            <select value={charClass} onChange={e=>setCharClass(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-blue-400">
              <option value="" disabled>กรุณาเลือกอาชีพ</option>
              {CHARACTER_CLASSES.map(c=>(<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <TrophyIcon className="w-5 h-5 text-amber-500" />
              เลือก Cap Level
            </label>
            <select value={capLevel} onChange={e=>setCapLevel(Number(e.target.value))} className="w-full rounded-lg border-gray-300 focus:ring-blue-400">
              {CAP_LEVELS.map(l=>(<option key={l.level} value={l.level}>Lv.{l.level}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium text-blue-800 mb-1">Base Stats</label>
            <div className="grid grid-cols-4 gap-2">
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <BoltIcon className="w-4 h-4 text-yellow-500" />
                  STR
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="จำนวน" value={stats.str} onChange={e=>setStats(s=>({...s,str:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <SparklesIcon className="w-4 h-4 text-yellow-400" />
                  AGI
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="จำนวน" value={stats.agi} onChange={e=>setStats(s=>({...s,agi:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <FireIcon className="w-4 h-4 text-pink-500" />
                  INT
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="จำนวน" value={stats.int} onChange={e=>setStats(s=>({...s,int:e.target.value}))} />
          </div>
          <div>
                <label className="block text-xs text-blue-600 mb-1 flex items-center gap-1">
                  <HeartIcon className="w-4 h-4 text-red-400" />
                  VIT
            </label>
                <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="จำนวน" value={stats.vit} onChange={e=>setStats(s=>({...s,vit:e.target.value}))} />
              </div>
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <BoltIcon className="w-5 h-5 text-yellow-500" />
              Physical Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.patk} onChange={e=>setStats(s=>({...s,patk:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.patkPercent} onChange={e=>setStats(s=>({...s,patkPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <FireIcon className="w-5 h-5 text-pink-500" />
              Magic Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.matk} onChange={e=>setStats(s=>({...s,matk:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.matkPercent} onChange={e=>setStats(s=>({...s,matkPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
              Physical Defense
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.pdef} onChange={e=>setStats(s=>({...s,pdef:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.pdefPercent} onChange={e=>setStats(s=>({...s,pdefPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldExclamationIcon className="w-5 h-5 text-violet-500" />
              Magic Defense
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.mdef} onChange={e=>setStats(s=>({...s,mdef:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.mdefPercent} onChange={e=>setStats(s=>({...s,mdefPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <HeartIcon className="w-5 h-5 text-red-400" />
              HP
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.hp} onChange={e=>setStats(s=>({...s,hp:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.hpPercent} onChange={e=>setStats(s=>({...s,hpPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              Critical
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.crit} onChange={e=>setStats(s=>({...s,crit:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.critPercent} onChange={e=>setStats(s=>({...s,critPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <EyeDropperIcon className="w-5 h-5 text-green-500" />
              Crit Resist
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.critres} onChange={e=>setStats(s=>({...s,critres:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.critresPercent} onChange={e=>setStats(s=>({...s,critresPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ArrowTrendingUpIcon className="w-5 h-5 text-pink-400" />
              Final Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.fd} onChange={e=>setStats(s=>({...s,fd:e.target.value}))} />
              <input type="number" className="w-24 rounded-lg border-gray-300 focus:ring-blue-400 text-sm" placeholder="โบนัส %" value={stats.fdPercent} onChange={e=>setStats(s=>({...s,fdPercent:e.target.value}))} />
            </div>
          </div>
        </div>
        {/* ผลลัพธ์ */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-blue-50/60 rounded-xl p-3 md:p-4 border border-blue-100 shadow flex flex-col gap-2 md:gap-3 relative">
            <div className="font-bold text-blue-700 mb-2 text-base md:text-lg flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              ผลลัพธ์
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
                    {Number(stats.patkPercent) > 0 && (
                      <div className="text-xs text-green-600">
                        +{patkFromPercent.toLocaleString()} ({stats.patkPercent}%)
                      </div>
                    )}
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
                        
                        {Number(stats.patkPercent) > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                            <span className="font-bold text-blue-900">+{patkFromPercent.toLocaleString()} ({stats.patkPercent}%)</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-purple-800 font-medium">รวมทั้งหมด:</span>
                          <span className="font-bold text-purple-900">{calcPatk.toLocaleString()}</span>
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
                          <div>• จาก Bonus: {Number(stats.patk) || 0} (หัก Stat แล้ว)</div>
                          <div>• จาก %: {(strToPatk + agiToPatk).toLocaleString()} × {Number(stats.patkPercent) || 0}% = {patkFromPercent.toLocaleString()}</div>
                          <div>• รวม: {(strToPatk + agiToPatk).toLocaleString()} + {Math.max(0, patk).toLocaleString()} + {patkFromPercent.toLocaleString()} = {calcPatk.toLocaleString()}</div>
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
                    {Number(stats.matkPercent) > 0 && (
                      <div className="text-xs text-green-600">
                        +{matkFromPercent.toLocaleString()} ({stats.matkPercent}%)
                      </div>
                    )}
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
                        
                        {Number(stats.matkPercent) > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                            <span className="font-bold text-blue-900">+{matkFromPercent.toLocaleString()} ({stats.matkPercent}%)</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-purple-800 font-medium">รวมทั้งหมด:</span>
                          <span className="font-bold text-purple-900">{calcMatk.toLocaleString()}</span>
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
                          <div>• จาก Bonus: {Number(stats.matk) || 0} (หัก Stat แล้ว)</div>
                          <div>• จาก %: {intToMatk.toLocaleString()} × {Number(stats.matkPercent) || 0}% = {matkFromPercent.toLocaleString()}</div>
                          <div>• รวม: {intToMatk.toLocaleString()} + {Math.max(0, matk).toLocaleString()} + {matkFromPercent.toLocaleString()} = {calcMatk.toLocaleString()}</div>
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
                    {Number(stats.hpPercent) > 0 && (
                      <div className="text-xs text-green-600">
                        +{hpFromPercent.toLocaleString()} ({stats.hpPercent}%)
                      </div>
                    )}
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
                        
                        {Number(stats.hpPercent) > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                            <span className="font-bold text-blue-900">+{hpFromPercent.toLocaleString()} ({stats.hpPercent}%)</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-purple-800 font-medium">รวมทั้งหมด:</span>
                          <span className="font-bold text-purple-900">{calcHP.toLocaleString()}</span>
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
                          <div>• จาก Bonus: {Number(stats.hp) || 0} (หัก Stat แล้ว)</div>
                          <div>• จาก %: {vitToHp.toLocaleString()} × {Number(stats.hpPercent) || 0}% = {hpFromPercent.toLocaleString()}</div>
                          <div>• รวม: {vitToHp.toLocaleString()} + {Math.max(0, hp).toLocaleString()} + {hpFromPercent.toLocaleString()} = {calcHP.toLocaleString()}</div>
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
                        {/* แสดงค่าจากเปอร์เซ็นต์แยก */}
                        {Number(stats[`${key}Percent` as keyof typeof stats]) > 0 && (
                          <div className="text-xs text-green-600">
                            +{(() => {
                              switch(key) {
                                case 'crit': return critFromPercent;
                                case 'critres': return critresFromPercent;
                                case 'pdef': return pdefFromPercent;
                                case 'mdef': return mdefFromPercent;
                                default: return 0;
                              }
                            })().toLocaleString()} ({stats[`${key}Percent` as keyof typeof stats]}%)
                          </div>
                        )}
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
                              {Number(stats.critPercent) > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                                  <span className="font-bold text-blue-900">+{critFromPercent.toLocaleString()} ({stats.critPercent}%)</span>
                                </div>
                              )}
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
                              {Number(stats.critresPercent) > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                                  <span className="font-bold text-blue-900">+{critresFromPercent.toLocaleString()} ({stats.critresPercent}%)</span>
                                </div>
                              )}
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
                              {Number(stats.pdefPercent) > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                                  <span className="font-bold text-blue-900">+{pdefFromPercent.toLocaleString()} ({stats.pdefPercent}%)</span>
                                </div>
                              )}
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
                              {Number(stats.mdefPercent) > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                                  <span className="font-bold text-blue-900">+{mdefFromPercent.toLocaleString()} ({stats.mdefPercent}%)</span>
                                </div>
                              )}
                            </>
                          )}
                          {key === 'fd' && (
                            <>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-orange-800 font-medium">จาก Bonus:</span>
                                <span className="font-bold text-orange-900">{fd.toLocaleString()}</span>
                              </div>
                              {Number(stats.fdPercent) > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <span className="text-blue-800 font-medium">จาก Bonus %:</span>
                                  <span className="font-bold text-blue-900">+{((Number(stats.fd) || 0) * Number(stats.fdPercent) / 100).toLocaleString()} ({stats.fdPercent}%)</span>
                                </div>
                              )}
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
                              <div>• จาก Bonus: {Number(stats.crit) || 0} (หัก Stat แล้ว)</div>
                              <div>• จาก %: {agiToCrit.toLocaleString()} × {Number(stats.critPercent) || 0}% = {critFromPercent.toLocaleString()}</div>
                              <div>• รวม: {agiToCrit.toLocaleString()} + {Math.max(0, crit).toLocaleString()} + {critFromPercent.toLocaleString()} = {calcCrit.toLocaleString()}</div>
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
                              <div>• จาก Bonus: {Number(stats.critres) || 0} (หัก Stat แล้ว)</div>
                              <div>• จาก %: {agiToCritRes.toLocaleString()} × {Number(stats.critresPercent) || 0}% = {critresFromPercent.toLocaleString()}</div>
                              <div>• รวม: {agiToCritRes.toLocaleString()} + {Math.max(0, critres).toLocaleString()} + {critresFromPercent.toLocaleString()} = {calcCritRes.toLocaleString()}</div>
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
                              <div>• จาก Bonus: {Number(stats.pdef) || 0} (หัก Stat แล้ว)</div>
                              <div>• จาก %: {vitToPdef.toLocaleString()} × {Number(stats.pdefPercent) || 0}% = {pdefFromPercent.toLocaleString()}</div>
                              <div>• รวม: {vitToPdef.toLocaleString()} + {Math.max(0, pdef).toLocaleString()} + {pdefFromPercent.toLocaleString()} = {calcPdef.toLocaleString()}</div>
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
                              <div>• จาก Bonus: {Number(stats.mdef) || 0} (หัก Stat แล้ว)</div>
                              <div>• จาก %: {intToMdef.toLocaleString()} × {Number(stats.mdefPercent) || 0}% = {mdefFromPercent.toLocaleString()}</div>
                              <div>• รวม: {intToMdef.toLocaleString()} + {Math.max(0, mdef).toLocaleString()} + {mdefFromPercent.toLocaleString()} = {calcMdef.toLocaleString()}</div>
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
    </div>
  );
} 