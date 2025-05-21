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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-yellow-700 drop-shadow text-center md:text-left">จัดสรรแบ่ง Gold ปาร์ตี้</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 px-6 py-2 text-white font-bold shadow hover:scale-105 transition text-lg"
          >
            + สร้างบิลใหม่
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="animate-spin rounded-full border-4 border-yellow-400 border-t-transparent w-10 h-10"></span>
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-lg">ยังไม่มีบิล</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {bills.map(bill => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}
        <CreateBillModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
} 