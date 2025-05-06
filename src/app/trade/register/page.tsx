'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Banknote, CreditCard, User, MessageSquare, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [form, setForm] = useState({
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    discordId: ''
  });

  useEffect(() => {
    if (authLoading || !user) return;

    // ตรวจสอบว่าลงทะเบียนแล้วหรือไม่
    const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
    get(merchantRef).then(snapshot => {
      setIsRegistered(snapshot.exists());
      setLoading(false);
    });
  }, [user, authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // ตรวจสอบว่าอยู่ในกิลด์หรือไม่
    const guildMemberRef = ref(db, `guild/members/${user.uid}`);
    const guildMemberSnapshot = await get(guildMemberRef);
    if (!guildMemberSnapshot.exists()) {
      toast.error('คุณต้องเป็นสมาชิกกิลด์ก่อนจึงจะลงทะเบียนเป็นพ่อค้าได้');
      return;
    }

    // ตรวจสอบว่าเคยลงทะเบียนแล้วหรือไม่
    const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
    const merchantSnapshot = await get(merchantRef);
    if (merchantSnapshot.exists()) {
      toast.error('คุณได้ลงทะเบียนเป็นพ่อค้าไปแล้ว');
      return;
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!form.bankAccountName || !form.bankAccountNumber || !form.bankName || !form.discordId) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    try {
      // ดึงข้อมูล Discord จาก user meta
      const userMetaRef = ref(db, `users/${user.uid}/meta/discord`);
      const userMetaSnapshot = await get(userMetaRef);
      const discordName = userMetaSnapshot.exists() ? userMetaSnapshot.val() : '';

      // บันทึกข้อมูลพ่อค้า
      await set(merchantRef, {
        bankAccountName: form.bankAccountName,
        bankAccountNumber: form.bankAccountNumber,
        bankName: form.bankName,
        discordId: form.discordId,
        discord: discordName,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      toast.success('ลงทะเบียนร้านค้าสำเร็จ! กรุณารอหัวกิลด์อนุมัติ');
      router.push('/trade/mystore');
    } catch (error) {
      console.error('Error registering merchant:', error);
      toast.error('เกิดข้อผิดพลาดในการลงทะเบียน');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-8 w-full max-w-md text-center"
        >
          <h2 className="text-2xl font-bold text-pink-600 mb-2">คุณได้ลงทะเบียนเป็นพ่อค้าแล้ว</h2>
          <p className="text-gray-500 mb-4">กรุณารอการอนุมัติจากหัวกิลด์</p>
          <button
            onClick={() => router.push('/trade/mystore')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold shadow hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            ไปที่ร้านค้าของฉัน
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-pink-600 mb-2 text-center">สมัครเป็นพ่อค้า</h2>
        <p className="text-gray-500 mb-6 text-center">กรอกข้อมูลร้านค้าของคุณเพื่อเริ่มต้นขาย Gold หรือไอเทม</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1 flex items-center gap-2">
              <User className="w-4 h-4" />
              ชื่อบัญชีธนาคาร
            </label>
            <input
              type="text"
              name="bankAccountName"
              value={form.bankAccountName}
              onChange={handleChange}
              className="w-full rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="เช่น นายเอ"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              เลขบัญชีธนาคาร
            </label>
            <input
              type="text"
              name="bankAccountNumber"
              value={form.bankAccountNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="เช่น 1234567890"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              ชื่อธนาคาร
            </label>
            <input
              type="text"
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              className="w-full rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="เช่น SCB, KBank"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Discord ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="discordId"
                value={form.discordId}
                onChange={handleChange}
                className="flex-1 rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="เช่น 823456789012345678"
                required
              />
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="ดูคู่มือการหา Discord ID"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">เปิด Developer Mode ใน Discord เพื่อดู ID ของคุณ</p>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold shadow hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            ลงทะเบียนร้านค้า
          </button>
        </form>

        {/* Discord ID Guide Modal */}
        <Dialog
          open={showGuide}
          onClose={() => setShowGuide(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                วิธีหา Discord ID
              </Dialog.Title>
              <div className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>เปิด Discord และไปที่ <span className="font-medium">ตั้งค่า</span></li>
                  <li>เลื่อนลงไปที่ <span className="font-medium">ขั้นสูง</span></li>
                  <li>เปิด <span className="font-medium">โหมดผู้พัฒนา</span></li>
                  <li>กลับไปที่ <span className="font-medium">บัญชีของฉัน</span></li>
                  <li>คลิกที่ <span className="font-medium">...</span> ตรงรูปโปรไฟล์</li>
                  <li>เลือก <span className="font-medium">คัดลอก ID ผู้ใช้</span></li>
                </ol>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    หมายเหตุ: ID จะเป็นตัวเลขยาว เช่น 823456789012345678
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </motion.div>
    </div>
  );
} 