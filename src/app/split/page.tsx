'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSplitBills } from './useSplitBills';
import { BillCard } from './BillCard';
import { CreateBillModal } from './CreateBillModal';
import { toast } from 'react-hot-toast';
import { BanknotesIcon, CurrencyDollarIcon, SparklesIcon } from '@heroicons/react/24/solid';

export default function SplitPage() {
  const { user } = useAuth();
  const { bills, loading, error } = useSplitBills();
  const [modalOpen, setModalOpen] = useState(false);

  // State สำหรับ input และผลลัพธ์
  const [cash, setCash] = useState('');
  const [goldRate, setGoldRate] = useState('');
  const [baht, setBaht] = useState('');
  const [gold, setGold] = useState('');
  const [goldInput, setGoldInput] = useState('');
  const [goldToBaht, setGoldToBaht] = useState('');

  // ฟังก์ชันคำนวณ
  const handleCalculate = (cashValue: string, goldRateValue: string, goldValue?: string) => {
    const cashNum = parseFloat(cashValue) || 0;
    const goldRateNum = parseFloat(goldRateValue) || 0;
    const goldNum = parseFloat(goldValue || '') || 0;
    if (!cashNum) {
      setBaht('');
      setGold('');
    } else {
      const bahtValue = cashNum / 39;
      setBaht(bahtValue ? bahtValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
      if (goldRateNum) {
        const goldValueCalc = bahtValue / goldRateNum;
        setGold(goldValueCalc ? goldValueCalc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
      } else {
        setGold('');
      }
    }
    // Gold to Baht
    if (!goldNum || !goldRateNum) {
      setGoldToBaht('');
    } else {
      const bahtFromGold = goldNum * goldRateNum;
      setGoldToBaht(bahtFromGold ? bahtFromGold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    }
  };

  useEffect(() => {
    if (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
  }, [error]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-blue-50">
      {/* Decorative Banner */}
      <div className="relative bg-gradient-to-r from-yellow-100 via-white to-emerald-50 py-14 overflow-hidden rounded-b-3xl shadow-sm">
        <div className="absolute inset-0 flex justify-end items-end opacity-15 pointer-events-none select-none">
          {/* ไอคอนเงินขนาดใหญ่เป็นลาย background */}
          <svg width="180" height="180" fill="none" viewBox="0 0 24 24"><circle cx="90" cy="90" r="80" fill="#FEF9C3" /><rect x="120" y="60" width="40" height="20" rx="6" fill="#D1FAE5" /><circle cx="150" cy="70" r="6" fill="#FDE68A" /></svg>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-500 mb-3 drop-shadow-none flex items-center justify-center gap-3">
            <span>จัดสรรแบ่ง Gold ปาร์ตี้</span>
            <svg className="inline h-9 w-9 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /><text x="10" y="14" textAnchor="middle" fontSize="12" fill="#fff">฿</text></svg>
          </h1>
          <p className="text-emerald-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            แบ่งปันค่าใช้จ่ายในปาร์ตี้ของคุณอย่างยุติธรรมและโปร่งใส
          </p>
        </div>
      </div>

      {/* ปุ่มสร้างบิลใหม่ ตรงกลาง ใต้แบนเนอร์ */}
      <div className="flex justify-center mt-4 mb-0">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-yellow-50 to-emerald-50 border border-yellow-200 text-yellow-600 font-semibold text-lg shadow-sm hover:bg-yellow-100 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 focus:ring-offset-2"
          style={{ minWidth: 220 }}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 shadow-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /><text x="10" y="14" textAnchor="middle" fontSize="12" fill="#fff">+</text></svg>
          </span>
          <span>สร้างบิลใหม่</span>
          <span className="flex items-center ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="7" width="18" height="10" rx="2" fill="#FEF9C3" stroke="#FDE68A" strokeWidth="2"/><circle cx="17" cy="12" r="1.5" fill="#FDE68A"/></svg>
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 w-full">
          {/* ส่วนคำนวณราคา */}
          <div className="mb-8 bg-white/80 rounded-3xl p-6 shadow-lg border border-yellow-100">
            <h2 className="text-2xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              เครื่องมือคำนวณราคา
            </h2>
            <div className="bg-gradient-to-br from-yellow-50 to-emerald-50 rounded-2xl p-4 border border-yellow-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ด้านซ้าย - ช่องกรอกข้อมูล */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">จำนวน Cash</label>
                    <input
                      type="number"
                      value={cash}
                      placeholder="กรอกจำนวน Cash"
                      className="w-full rounded-xl border border-yellow-200 px-4 py-2 focus:ring-2 focus:ring-yellow-100 transition bg-white text-gray-700 placeholder-gray-400"
                      onChange={e => {
                        setCash(e.target.value);
                        handleCalculate(e.target.value, goldRate, goldInput);
                      }}
                    />
                    <div className="text-xs text-yellow-600 mt-1">* 39 Cash = 1 บาท (อัตราคงที่)</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">เรท Gold (บาทต่อ 1 Gold)</label>
                    <input
                      type="number"
                      value={goldRate}
                      placeholder="กรอกเรท Gold"
                      className="w-full rounded-xl border border-yellow-200 px-4 py-2 focus:ring-2 focus:ring-yellow-100 transition bg-white text-gray-700 placeholder-gray-400"
                      onChange={e => {
                        setGoldRate(e.target.value);
                        handleCalculate(cash, e.target.value, goldInput);
                      }}
                    />
                    <div className="text-xs text-yellow-600 mt-1">* เช่น 0.6 บาท = 1 Gold</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">จำนวน Gold</label>
                    <input
                      type="number"
                      value={goldInput}
                      placeholder="กรอกจำนวน Gold"
                      className="w-full rounded-xl border border-yellow-200 px-4 py-2 focus:ring-2 focus:ring-yellow-100 transition bg-white text-gray-700 placeholder-gray-400"
                      onChange={e => {
                        setGoldInput(e.target.value);
                        handleCalculate(cash, goldRate, e.target.value);
                      }}
                    />
                    <div className="text-xs text-yellow-600 mt-1">* ใช้คำนวณเงินบาทจาก Gold ที่มี (ต้องกรอกเรท Gold ด้วย)</div>
                  </div>
                </div>

                {/* ด้านขวา - แสดงผลลัพธ์ */}
                <div className="bg-white/90 rounded-xl p-4 border border-yellow-100 flex flex-col justify-center space-y-4">
                  <div>
                    <div className="text-lg font-extrabold text-yellow-700 mb-4 flex items-center gap-2">
                      <SparklesIcon className="w-6 h-6 text-yellow-400" />
                      ผลลัพธ์การคำนวณ
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-white border border-yellow-100 mb-2">
                        <CurrencyDollarIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-700 font-semibold flex-1 text-left">Cash นี้มีมูลค่า</span>
                        <span className="font-extrabold text-yellow-600 text-xl text-center min-w-[80px] drop-shadow mx-auto">{baht}</span>
                        <span className="text-yellow-700 font-semibold text-right min-w-[40px]">บาท</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-white border border-yellow-100 mb-2">
                        <SparklesIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-700 font-semibold flex-1 text-left">Cash นี้แลกได้</span>
                        <span className="font-extrabold text-yellow-600 text-xl text-center min-w-[80px] drop-shadow mx-auto">{gold}</span>
                        <span className="text-yellow-700 font-semibold text-right min-w-[40px]">Gold</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-white border border-yellow-100">
                        <BanknotesIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-700 font-semibold flex-1 text-left">Gold นี้มีมูลค่า</span>
                        <span className="font-extrabold text-yellow-600 text-xl text-center min-w-[80px] drop-shadow mx-auto">{goldInput && goldRate && goldToBaht ? goldToBaht : ''}</span>
                        <span className="text-yellow-700 font-semibold text-right min-w-[40px]">บาท</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-yellow-600 mt-2 leading-relaxed">
                    <span className="inline-block mb-1">- กรอก Cash เพื่อคำนวณเป็นเงินบาทและ Gold</span><br/>
                    <span className="inline-block mb-1">- กรอก Gold เพื่อคำนวณเป็นเงินบาท (ต้องกรอกเรท Gold ด้วย)</span><br/>
                    <span className="inline-block">- เรท Gold คือจำนวนบาทที่ใช้แลก 1 Gold เช่น 0.6 บาท = 1 Gold</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* จบปุ่มสร้างบิลใหม่ */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <span className="animate-spin rounded-full border-4 border-emerald-200 border-t-transparent w-10 h-10 mb-4"></span>
              <span className="text-emerald-400 font-medium">กำลังโหลดข้อมูลบิล...</span>
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="4" y="7" width="16" height="10" rx="4" fill="#A7F3D0" stroke="#34D399" strokeWidth="2"/><circle cx="12" cy="12" r="2" fill="#34D399"/></svg>
              <div className="text-center text-emerald-400 text-lg font-medium">ยังไม่มีบิล</div>
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-4 items-start justify-center py-2 sm:py-4" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(90vw, 1fr))', ...((window.innerWidth >= 640) ? {gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'} : {})}}>
              {bills.map(bill => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>
          )}
          <CreateBillModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
      </div>
    </div>
  );
} 