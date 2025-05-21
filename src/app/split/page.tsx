'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSplitBills } from './useSplitBills';
import { BillCard } from './BillCard';
import { CreateBillModal } from './CreateBillModal';
import { toast } from 'react-hot-toast';

export default function SplitPage() {
  const { user } = useAuth();
  const { bills, loading, error } = useSplitBills();
  const [modalOpen, setModalOpen] = useState(false);

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

      {/* Main Content */}
      <div className="py-8">
        <div className="max-w-5xl mx-auto px-2 sm:px-4">
          {/* ปุ่มสร้างบิลใหม่ ตรงกลาง ใต้แบนเนอร์ */}
          <div className="flex justify-center mb-10">
            <button
              onClick={() => setModalOpen(true)}
              className="relative flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-yellow-100 via-white to-emerald-50 border border-yellow-200 text-yellow-700 font-semibold shadow-sm hover:bg-yellow-50 hover:shadow-md transition-all duration-200 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-100 focus:ring-offset-2"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 mr-2 shadow-none">
                {/* ไอคอนเหรียญทองและเครื่องหมาย + */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /><text x="10" y="14" textAnchor="middle" fontSize="12" fill="#fff">+</text></svg>
              </span>
              สร้างบิลใหม่
              <span className="ml-1">
                {/* ไอคอนกระเป๋าสตางค์ */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="7" width="18" height="10" rx="2" fill="#FEF9C3" stroke="#FDE68A" strokeWidth="2"/><circle cx="17" cy="12" r="1.5" fill="#FDE68A"/></svg>
              </span>
            </button>
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
            <div className="grid gap-6 items-start" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'}}>
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