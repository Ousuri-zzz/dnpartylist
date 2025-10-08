"use client";

import React, { useState } from 'react';
import { Calculator, Target, Zap, TrendingUp, Shield, Sword, AlertTriangle } from 'lucide-react';

interface EnhancementData {
  level: number;
  successRate: number;
  breakProbability: number;
  failurePenalty: number;
  cost: number;
  materials: string[];
}

const ENHANCEMENT_DATA: EnhancementData[] = [
  { level: 1, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 1000, materials: ['Enhancement Stone +1'] },
  { level: 2, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 2000, materials: ['Enhancement Stone +2'] },
  { level: 3, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 3000, materials: ['Enhancement Stone +3'] },
  { level: 4, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 4000, materials: ['Enhancement Stone +4'] },
  { level: 5, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 5000, materials: ['Enhancement Stone +5'] },
  { level: 6, successRate: 100, breakProbability: 0, failurePenalty: 0, cost: 6000, materials: ['Enhancement Stone +6'] },
  { level: 7, successRate: 50, breakProbability: 25, failurePenalty: 0, cost: 7000, materials: ['Enhancement Stone +7', 'Protection Stone'] },
  { level: 8, successRate: 40, breakProbability: 25, failurePenalty: -1, cost: 8000, materials: ['Enhancement Stone +8', 'Protection Stone'] },
  { level: 9, successRate: 35, breakProbability: 25, failurePenalty: -2, cost: 9000, materials: ['Enhancement Stone +9', 'Protection Stone'] },
  { level: 10, successRate: 30, breakProbability: 25, failurePenalty: 0, cost: 10000, materials: ['Enhancement Stone +10', 'Protection Stone'] },
  { level: 11, successRate: 25, breakProbability: 25, failurePenalty: -1, cost: 12000, materials: ['Enhancement Stone +11', 'Protection Stone'] },
  { level: 12, successRate: 20, breakProbability: 25, failurePenalty: -2, cost: 14000, materials: ['Enhancement Stone +12', 'Protection Stone',] },
  { level: 13, successRate: 15, breakProbability: 25, failurePenalty: -2, cost: 16000, materials: ['Enhancement Stone +13', 'Protection Stone',] },
  { level: 14, successRate: 5, breakProbability: 25, failurePenalty: -2, cost: 18000, materials: ['Enhancement Stone +14', 'Protection Stone',] },
  { level: 15, successRate: 1, breakProbability: 25, failurePenalty: -2, cost: 20000, materials: ['Enhancement Stone +15', 'Protection Stone',] },
];



export default function EnhancementPage() {
  const [enhancementAttempts, setEnhancementAttempts] = useState<{[key: number]: number}>({});
  const [materialPrices, setMaterialPrices] = useState<{[key: string]: number}>({
    'Enhancement Stone': 1000,
    'Protection Stone': 2000,
  });
  const [totalMaterials, setTotalMaterials] = useState<{[key: string]: number}>({});
  const [totalCost, setTotalCost] = useState(0);

  // คำนวณวัสดุและค่าใช้จ่ายแบบ realtime
  React.useEffect(() => {
    const calculateMaterials = () => {
      const materials: {[key: string]: number} = {};
      let totalCost = 0;

      // คำนวณวัสดุที่ใช้จากจำนวนครั้งที่กรอก
      Object.entries(enhancementAttempts).forEach(([levelStr, attempts]) => {
        const level = parseInt(levelStr);
        const levelData = ENHANCEMENT_DATA[level];
        
        if (levelData && attempts > 0) {
          // เพิ่มวัสดุตามจำนวนครั้ง
          levelData.materials.forEach(material => {
            // แปลงชื่อวัสดุให้เป็นรูปแบบทั่วไป
            let materialKey = material;
            if (material.includes('Enhancement Stone +')) {
              materialKey = 'Enhancement Stone';
            }
            materials[materialKey] = (materials[materialKey] || 0) + attempts;
          });
        }
      });

      // คำนวณค่าใช้จ่ายรวม
      Object.entries(materials).forEach(([material, quantity]) => {
        const price = materialPrices[material] || 0;
        totalCost += price * quantity;
      });

      setTotalMaterials(materials);
      setTotalCost(totalCost);
    };

    calculateMaterials();
  }, [enhancementAttempts, materialPrices]);

  const updateAttempts = (level: number, attempts: number) => {
    setEnhancementAttempts(prev => ({
      ...prev,
      [level]: attempts
    }));
  };

  const updateMaterialPrice = (material: string, price: number) => {
    setMaterialPrices(prev => ({
      ...prev,
      [material]: price
    }));
  };

  const resetCalculation = () => {
    setEnhancementAttempts({});
    setTotalMaterials({});
    setTotalCost(0);
  };

  const getSuccessRate = (level: number) => {
    return ENHANCEMENT_DATA[level]?.successRate || 0;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-4 md:p-5 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="space-y-1">
            <p className="font-bold">ประกาศ: หน้านี้อยู่ระหว่างการพัฒนา (Beta)</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>ฟังก์ชันและสูตรคำนวณอาจยังไม่ครบถ้วนหรือมีความคลาดเคลื่อน</li>
              <li>ข้อมูลการแสดงผล เช่น อัตราสำเร็จ โอกาสแตก และค่าใช้จ่าย อาจเปลี่ยนแปลงได้</li>
              <li>กรุณาใช้เพื่อการประมาณการเบื้องต้น และตรวจสอบกับข้อมูลจริงก่อนตัดสินใจ</li>
              <li>หากพบข้อผิดพลาด โปรดแจ้งทีมพัฒนาพร้อมรายละเอียดประกอบ</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Banner */}
      <div className="relative bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6 md:p-10 mb-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 border border-gray-100 dark:border-gray-800 backdrop-blur-md">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-violet-700 dark:text-violet-300 mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-violet-500" />
                         เครื่องคำนวณตีบวก
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg mb-4">
            คำนวณโอกาสสำเร็จ ค่าใช้จ่าย และผลลัพธ์ของการตีบวกอุปกรณ์ พร้อมข้อมูลอ้างอิงครบถ้วน
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center justify-end md:justify-center">
          <div className="flex gap-2">
            <div className="p-3 rounded-xl bg-gradient-to-r from-violet-100 to-blue-100 dark:from-violet-900 dark:to-blue-900">
              <Sword className="w-6 h-6 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900 dark:to-amber-900">
              <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

             <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
               {/* ข้อมูลการตีบวก */}
               <div className="xl:col-span-2 bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800 backdrop-blur-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  ข้อมูลการตีบวก
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-center py-4 px-2 font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 w-16">ระดับ</th>
                        <th className="text-center py-4 px-2 font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 w-24">โอกาสสำเร็จ</th>
                        <th className="text-center py-4 px-2 font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 w-20">โอกาสแตก</th>
                        <th className="text-center py-4 px-2 font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 w-20">บทลงโทษ</th>
                        <th className="text-center py-4 px-2 font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 w-32">วัสดุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ENHANCEMENT_DATA.map((data, index) => (
                        <tr
                          key={data.level}
                                                     className={`border-b border-gray-100 dark:border-gray-800 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                             index % 2 === 0 ? 'bg-gray-25 dark:bg-gray-800/25' : ''
                           }`}
                        >
                          <td className="py-4 px-2 font-bold text-center text-gray-800 dark:text-gray-200 text-base">+{data.level}</td>
                          <td className="py-4 px-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-green-600 dark:text-green-400 text-base">{getSuccessRate(data.level)}%</span>
                              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                  style={{ width: `${getSuccessRate(data.level)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`font-bold text-base ${data.breakProbability > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              {data.breakProbability > 0 ? `${data.breakProbability}%` : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`font-bold text-base ${data.failurePenalty < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              {data.failurePenalty < 0 ? `-${Math.abs(data.failurePenalty)}` : '-'}
                            </span>
                          </td>
                                                     <td className="py-4 px-2 text-center w-32">
                              <div className="flex flex-col gap-1">
                                {data.materials.map((material, index) => (
                                  <span
                                    key={index}
                                    className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs rounded-full text-center"
                                  >
                                    {material}
                                  </span>
                                ))}
                              </div>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                
               </div>

                               {/* เครื่องคำนวณ */}
                <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800 backdrop-blur-md">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-violet-500" />
                    เครื่องคำนวณวัสดุ
                  </h2>
                  
                  <div className="space-y-6">
                    {/* ราคาวัสดุ */}
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">ราคาวัสดุ (Gold)</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.keys(materialPrices).map((material) => (
                          <div key={material} className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                              {material}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={materialPrices[material]}
                              onChange={(e) => updateMaterialPrice(material, parseInt(e.target.value) || 0)}
                              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Gold</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* จำนวนครั้งที่ตีบวก */}
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">จำนวนครั้งที่ตีบวก</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {ENHANCEMENT_DATA.filter(data => data.level >= 6).map((data) => (
                          <div key={data.level} className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">
                              +{data.level} → +{data.level + 1}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={enhancementAttempts[data.level] || 0}
                              onChange={(e) => updateAttempts(data.level, parseInt(e.target.value) || 0)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">ครั้ง</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={resetCalculation}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      >
                        รีเซ็ต
                      </button>
                    </div>

                    {/* ผลลัพธ์ */}
                    {Object.keys(totalMaterials).length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">ผลการคำนวณ</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-600 dark:text-gray-400">วัสดุที่ใช้</div>
                              <div className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                                {Object.values(totalMaterials).reduce((sum, quantity) => sum + quantity, 0)} ชิ้น
                              </div>
                            </div>
                            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-600 dark:text-gray-400">ค่าใช้จ่ายรวม</div>
                              <div className="font-bold text-red-600 dark:text-red-400 text-lg">{totalCost.toLocaleString()} Gold</div>
                            </div>
                          </div>
                          
                          {/* รายละเอียดวัสดุ */}
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">รายละเอียดวัสดุ:</h4>
                            <div className="space-y-2">
                              {Object.entries(totalMaterials).map(([material, quantity]) => (
                                <div key={material} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">{material}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600 dark:text-gray-400">{quantity} ชิ้น</span>
                                    <span className="text-violet-600 dark:text-violet-400">
                                      × {materialPrices[material]?.toLocaleString()} Gold
                                    </span>
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                      = {(quantity * (materialPrices[material] || 0)).toLocaleString()} Gold
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
             </div>
           </div>
         );
       } 