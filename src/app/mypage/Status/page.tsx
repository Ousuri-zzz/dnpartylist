'use client';
import React, { useState } from 'react';
import type { CharacterClass } from '@/types/character';
import { InformationCircleIcon, BoltIcon, FireIcon, HeartIcon, SparklesIcon, ShieldCheckIcon, ShieldExclamationIcon, ArrowTrendingUpIcon, EyeDropperIcon, UserIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline';

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

  // คำนวณค่าต่างๆ
  const formula = charClass && CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] ? CLASS_FORMULA[charClass as keyof typeof CLASS_FORMULA] : { str: 0, agi: 0, int: 0, vit: 0 };
  const cap = CAP_LEVELS.find(l => l.level === Number(capLevel));
  function statWithPercent(val: string, percent: string) {
    const v = Number(val) || 0;
    const p = Number(percent) || 0;
    return v + (v * p / 100);
  }
  const str = statWithPercent(stats.str, stats.strPercent);
  const agi = statWithPercent(stats.agi, stats.agiPercent);
  const int = statWithPercent(stats.int, stats.intPercent);
  const vit = statWithPercent(stats.vit, stats.vitPercent);
  const patk = statWithPercent(stats.patk, stats.patkPercent);
  const matk = statWithPercent(stats.matk, stats.matkPercent);
  const pdef = statWithPercent(stats.pdef, stats.pdefPercent);
  const mdef = statWithPercent(stats.mdef, stats.mdefPercent);
  const hp = statWithPercent(stats.hp, stats.hpPercent);
  const crit = statWithPercent(stats.crit, stats.critPercent);
  const critres = statWithPercent(stats.critres, stats.critresPercent);
  const fd = statWithPercent(stats.fd, stats.fdPercent);

  // ผลลัพธ์คำนวณ (รวมค่าจาก stat + ค่าดิบ)
  const calcPatk = str * formula.str + agi * formula.agi + patk;
  const calcMatk = int * (['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5) + matk;
  const calcPdef = vit * (['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6) + pdef;
  const calcMdef = int * INT_TO_MDEF + mdef;
  const calcHP = vit * VIT_TO_HP + hp;
  const calcCrit = agi * AGI_TO_CRIT + crit;
  const calcCritRes = agi * AGI_TO_CRITRES + critres;

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
    return Math.round((val / capVal) * 100);
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-2 md:px-8 flex flex-col items-center justify-center min-h-[60vh]">
      {/* ปุ่ม modal ตาราง cap - now at the top */}
      <button
        onClick={() => setOpen(true)}
        className="mb-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-400 via-violet-500 to-pink-400 border-4 border-white text-white text-base md:text-lg font-semibold rounded-xl shadow-lg hover:from-sky-500 hover:via-violet-600 hover:to-pink-500 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <InformationCircleIcon className="w-5 h-5 text-white drop-shadow" />
        ดูตาราง Cap Stat ตามเลเวล
      </button>
      {/* ฟอร์มคำนวณ stat + ระบบคำนวณย่อย */}
      <div className="w-full max-w-3xl mx-auto bg-white/90 rounded-2xl shadow-lg border border-blue-100 p-4 md:p-8 mb-8">
        <h2 className="text-lg md:text-xl font-bold text-blue-700 mb-4">คำนวณค่าสเตตัสตามอาชีพและ Cap Level</h2>
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
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <BoltIcon className="w-5 h-5 text-yellow-500" />
              Strength
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.str} onChange={e=>setStats(s=>({...s,str:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.strPercent} onChange={e=>setStats(s=>({...s,strPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              Agility
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.agi} onChange={e=>setStats(s=>({...s,agi:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.agiPercent} onChange={e=>setStats(s=>({...s,agiPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <FireIcon className="w-5 h-5 text-pink-500" />
              Intellect
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.int} onChange={e=>setStats(s=>({...s,int:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.intPercent} onChange={e=>setStats(s=>({...s,intPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <HeartIcon className="w-5 h-5 text-red-400" />
              Vitality
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.vit} onChange={e=>setStats(s=>({...s,vit:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.vitPercent} onChange={e=>setStats(s=>({...s,vitPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <BoltIcon className="w-5 h-5 text-yellow-500" />
              Physical Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.patk} onChange={e=>setStats(s=>({...s,patk:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.patkPercent} onChange={e=>setStats(s=>({...s,patkPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <FireIcon className="w-5 h-5 text-pink-500" />
              Magic Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.matk} onChange={e=>setStats(s=>({...s,matk:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.matkPercent} onChange={e=>setStats(s=>({...s,matkPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              Physical Defense
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.pdef} onChange={e=>setStats(s=>({...s,pdef:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.pdefPercent} onChange={e=>setStats(s=>({...s,pdefPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ShieldExclamationIcon className="w-5 h-5 text-violet-500" />
              Magic Defense
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.mdef} onChange={e=>setStats(s=>({...s,mdef:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.mdefPercent} onChange={e=>setStats(s=>({...s,mdefPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <HeartIcon className="w-5 h-5 text-red-400" />
              HP
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.hp} onChange={e=>setStats(s=>({...s,hp:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.hpPercent} onChange={e=>setStats(s=>({...s,hpPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              Critical
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.crit} onChange={e=>setStats(s=>({...s,crit:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.critPercent} onChange={e=>setStats(s=>({...s,critPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <EyeDropperIcon className="w-5 h-5 text-blue-400" />
              Crit Resist
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.critres} onChange={e=>setStats(s=>({...s,critres:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.critresPercent} onChange={e=>setStats(s=>({...s,critresPercent:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-blue-800 mb-1 flex items-center gap-1">
              <ArrowTrendingUpIcon className="w-5 h-5 text-pink-400" />
              Final Damage
            </label>
            <div className="flex gap-2">
              <input type="number" className="w-full rounded-lg border-gray-300 focus:ring-blue-400" placeholder="จำนวน" value={stats.fd} onChange={e=>setStats(s=>({...s,fd:e.target.value}))} />
              <input type="number" className="w-20 rounded-lg border-gray-300 focus:ring-blue-400" placeholder="%" value={stats.fdPercent} onChange={e=>setStats(s=>({...s,fdPercent:e.target.value}))} />
            </div>
          </div>
        </div>
        {/* ผลลัพธ์ */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 shadow flex flex-col gap-3 relative">
            <div className="font-bold text-blue-700 mb-2 text-lg flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-blue-500" />
              ผลลัพธ์
            </div>
            <div className="flex flex-col gap-2">
              {/* Physical Damage */}
              <div className="flex justify-between items-center relative group">
                <span className="font-medium text-blue-900 flex items-center gap-1">
                  <BoltIcon className="w-5 h-5 text-yellow-500" />
                  Physical Damage
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                    onMouseEnter={()=>setShowTooltip({patk:true})}
                    onMouseLeave={()=>setShowTooltip({})}
                    onClick={e => { e.stopPropagation(); setShowTooltip(showTooltip.patk ? {} : {patk:true}); }}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด Physical Damage"
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                  {showTooltip.patk && (
                    <div className="absolute left-0 top-7 z-20 w-max min-w-[220px] max-w-xs bg-white border border-blue-200 rounded-xl shadow-lg p-3 text-sm text-blue-900 animate-fadeIn">
                      <div className="font-bold text-blue-700 mb-1">Physical Damage (รวม)</div>
                      <div>สูตร: STR × {formula.str} + AGI × {formula.agi} + Physical Damage</div>
                      <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(str * formula.str + agi * formula.agi).toLocaleString()}</span></div>
                      <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{patk.toLocaleString()}</span></div>
                      <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{calcPatk.toLocaleString()}</span></div>
                    </div>
                  )}
                </span>
                <span className="text-lg font-bold">{calcPatk.toLocaleString()}</span>
              </div>
              {/* Magic Damage */}
              <div className="flex justify-between items-center relative group">
                <span className="font-medium text-blue-900 flex items-center gap-1">
                  <FireIcon className="w-5 h-5 text-pink-500" />
                  Magic Damage
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                    onMouseEnter={()=>setShowTooltip({matk:true})}
                    onMouseLeave={()=>setShowTooltip({})}
                    onClick={()=>setShowTooltip(showTooltip.matk ? {} : {matk:true})}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด Magic Damage"
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                  {showTooltip.matk && (
                    <div className="absolute left-0 top-7 z-20 w-max min-w-[220px] max-w-xs bg-white border border-blue-200 rounded-xl shadow-lg p-3 text-sm text-blue-900 animate-fadeIn">
                      <div className="font-bold text-blue-700 mb-1">Magic Damage (รวม)</div>
                      <div>สูตร: INT × {['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5} + Magic Damage</div>
                      <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(int * (['Force User','Elemental Lord'].includes(charClass) ? 0.75 : 0.5)).toLocaleString()}</span></div>
                      <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{matk.toLocaleString()}</span></div>
                      <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{calcMatk.toLocaleString()}</span></div>
                    </div>
                  )}
                </span>
                <span className="text-lg font-bold">{calcMatk.toLocaleString()}</span>
              </div>
              {/* HP */}
              <div className="flex justify-between items-center relative group">
                <span className="font-medium text-blue-900 flex items-center gap-1">
                  <HeartIcon className="w-5 h-5 text-red-400" />
                  HP
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-600 focus:outline-none"
                    onMouseEnter={()=>setShowTooltip({hp:true})}
                    onMouseLeave={()=>setShowTooltip({})}
                    onClick={()=>setShowTooltip(showTooltip.hp ? {} : {hp:true})}
                    tabIndex={0}
                    aria-label="ดูรายละเอียด HP"
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                  {showTooltip.hp && (
                    <div className="absolute left-0 top-7 z-20 w-max min-w-[180px] max-w-xs bg-white border border-blue-200 rounded-xl shadow-lg p-3 text-sm text-blue-900 animate-fadeIn">
                      <div className="font-bold text-blue-700 mb-1">HP (รวม)</div>
                      <div>สูตร: VIT × 30 + HP</div>
                      <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(vit * 30).toLocaleString()}</span></div>
                      <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{hp.toLocaleString()}</span></div>
                      <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{calcHP.toLocaleString()}</span></div>
                    </div>
                  )}
                </span>
                <span className="text-lg font-bold">{calcHP.toLocaleString()}</span>
              </div>
              {/* Cap bar section */}
              {[
                { label: 'Critical', val: calcCrit, cap: cap?.crit, key: 'crit', formula: `AGI × 3.5 + Critical`, icon: <SparklesIcon className="w-5 h-5 text-yellow-400" /> },
                { label: 'Crit Resist', val: calcCritRes, cap: cap?.crit, key: 'critres', formula: `AGI × 10.5 + Crit Resist`, icon: <EyeDropperIcon className="w-5 h-5 text-blue-400" /> },
                { label: 'Physical Defense', val: calcPdef, cap: cap?.def, key: 'pdef', formula: `VIT × ${['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6} + Physical Defense`, icon: <ShieldCheckIcon className="w-5 h-5 text-green-500" /> },
                { label: 'Magic Defense', val: calcMdef, cap: cap?.def, key: 'mdef', formula: `INT × 0.8 + Magic Defense`, icon: <ShieldExclamationIcon className="w-5 h-5 text-violet-500" /> },
                { label: 'Final Damage', val: fd, cap: cap?.fd, key: 'fd', formula: `Final Damage (กรอก)`, icon: <ArrowTrendingUpIcon className="w-5 h-5 text-pink-400" /> },
              ].map(({label, val, cap:capVal, key, formula, icon}, idx) => {
                const percent = capPercent(val, capVal);
                return (
                  <div key={label} className="flex flex-col gap-1 relative group">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900 flex items-center gap-1">
                        {icon}
                        {label}
                        <button
                          type="button"
                          className="text-blue-400 hover:text-blue-600 focus:outline-none"
                          onMouseEnter={()=>setShowTooltip({[key]:true})}
                          onMouseLeave={()=>setShowTooltip({})}
                          onClick={()=>setShowTooltip(showTooltip[key] ? {} : {[key]:true})}
                          tabIndex={0}
                          aria-label={`ดูรายละเอียด ${label}`}
                        >
                          <InformationCircleIcon className="w-4 h-4" />
                        </button>
                        {showTooltip[key] && (
                          <div className="absolute left-0 top-7 z-20 w-max min-w-[180px] max-w-xs bg-white border border-blue-200 rounded-xl shadow-lg p-3 text-sm text-blue-900 animate-fadeIn">
                            <div className="font-bold text-blue-700 mb-1">{label} (รวม)</div>
                            <div>สูตร: {formula}</div>
                            {key === 'crit' && <>
                              <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(agi * 3.5).toLocaleString()}</span></div>
                              <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{crit.toLocaleString()}</span></div>
                              <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{val.toLocaleString()}</span></div>
                            </>}
                            {key === 'critres' && <>
                              <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(agi * 10.5).toLocaleString()}</span></div>
                              <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{critres.toLocaleString()}</span></div>
                              <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{val.toLocaleString()}</span></div>
                            </>}
                            {key === 'pdef' && <>
                              <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(vit * (['Force User','Elemental Lord','Engineer','Alchemist'].includes(charClass) ? 0.72 : 0.6)).toLocaleString()}</span></div>
                              <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{pdef.toLocaleString()}</span></div>
                              <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{val.toLocaleString()}</span></div>
                            </>}
                            {key === 'mdef' && <>
                              <div className="mt-1">จาก Stat: <span className="font-semibold text-blue-900">{(int * 0.8).toLocaleString()}</span></div>
                              <div>จากค่าดิบ: <span className="font-semibold text-blue-900">{mdef.toLocaleString()}</span></div>
                              <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{val.toLocaleString()}</span></div>
                            </>}
                            {key === 'fd' && <>
                              <div className="mt-1">จากค่าดิบ: <span className="font-semibold text-blue-900">{fd.toLocaleString()}</span></div>
                              <div>รวมทั้งหมด: <span className="font-semibold text-blue-900">{val.toLocaleString()}</span></div>
                            </>}
                          </div>
                        )}
                      </span>
                      <span className={`text-lg font-bold ${capColor(val, capVal)}`}>{val.toLocaleString()} <span className="text-base font-normal text-gray-500">/ {capVal?.toLocaleString() ?? '-'} ({percent}%)</span></span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${percent>=100 ? 'bg-green-400' : percent>=80 ? 'bg-yellow-400' : 'bg-blue-400'}`} style={{width: `${Math.min(percent, 100)}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 p-0 md:p-0 animate-fadeIn">
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-blue-500 text-2xl font-bold focus:outline-none"
              aria-label="ปิด"
            >
              ×
            </button>
            <div className="p-6 pt-8 pb-4">
              <h2 className="text-xl md:text-2xl font-extrabold text-center bg-gradient-to-r from-violet-600 via-blue-500 to-pink-500 bg-clip-text text-transparent mb-6 drop-shadow">Dragon Nest Stat Cap Table by Level</h2>
              <div className="overflow-x-auto rounded-2xl shadow bg-white/90 border border-blue-100">
                <table className="min-w-full text-sm md:text-base text-right">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 via-violet-100 to-pink-100 text-blue-900">
                      <th className="py-3 px-4 text-left rounded-tl-2xl font-bold">เลเวล</th>
                      <th className="py-3 px-4 font-bold">Crit/Resist Cap<br className='hidden md:inline'/> (≈90%)</th>
                      <th className="py-3 px-4 font-bold">Defense Cap<br className='hidden md:inline'/> (≈85%)</th>
                      <th className="py-3 px-4 font-bold">Critical Damage Cap</th>
                      <th className="py-3 px-4 rounded-tr-2xl font-bold">Final Damage<br className='hidden md:inline'/> (FD 100%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAP_LEVELS.map((row, i) => (
                      <tr key={row.level} className={
                        `transition-colors ${i%2===0 ? 'bg-white/70' : 'bg-blue-50/60'} hover:bg-blue-100/60`}
                      >
                        <td className="py-2 px-4 text-left font-semibold text-blue-700">{row.level}</td>
                        <td className="py-2 px-4">{row.crit.toLocaleString()}</td>
                        <td className="py-2 px-4">{row.def.toLocaleString()}</td>
                        <td className="py-2 px-4">{row.critdmg.toLocaleString()}</td>
                        <td className="py-2 px-4">{row.fd.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-800 text-sm shadow flex flex-col gap-1">
                <div className="font-bold mb-1">หมายเหตุ:</div>
                <ul className="list-disc pl-6">
                  <li>Crit/Resist Cap ≈ 90%</li>
                  <li>Defense Cap ≈ 85%</li>
                  <li>FD Cap คือค่าที่ทำให้ได้ Final Damage เต็ม 100%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 