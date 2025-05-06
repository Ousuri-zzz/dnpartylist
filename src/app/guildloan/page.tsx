'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { LoanService } from '@/lib/loanService';
import { FeedService } from '@/lib/feedService';
import { toast } from 'react-hot-toast';
import { Plus, History, Users, Coins, Check, X, RotateCcw, Crown } from 'lucide-react';
import { Loan } from '@/types/trade';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function GuildLoanPage() {
  const { user, discordName } = useAuth();
  const { guild, isGuildLeader } = useGuild();
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [guildLoans, setGuildLoans] = useState<Loan[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user) return;
    // โหลด myLoans
    const myLoansRef = ref(db, 'guildLoans');
    const unsubMyLoans = onValue(myLoansRef, (snapshot) => {
      const data = snapshot.val();
      const myList: Loan[] = data ? (Object.values(data) as Loan[]).filter((loan) => loan.borrower?.discordId === user?.uid) : [];
      setMyLoans(myList);
    });
    // โหลด guildLoans (สำหรับหัวหน้ากิลด์)
    let unsubGuildLoans = () => {};
    if (isGuildLeader && guild) {
      const guildLoansRef = ref(db, 'guildLoans');
      unsubGuildLoans = onValue(guildLoansRef, (snapshot) => {
        const data = snapshot.val();
        const guildList: Loan[] = data ? (Object.values(data) as Loan[]).filter((loan) => loan.source?.guild === guild.name) : [];
        setGuildLoans(guildList);
      });
    }
    return () => {
      unsubMyLoans();
      unsubGuildLoans();
    };
  }, [user, isGuildLeader, guild]);

  const handleCreateLoan = async () => {
    if (!user || !guild || !user.uid || !discordName) return;

    try {
      const loanId = await LoanService.createLoan({
        amount: Number(amount),
        status: 'waitingApproval',
        source: {
          type: 'guild',
          guild: guild.name
        },
        borrower: {
          discordId: user.uid,
          name: discordName
        },
        dueDate: dueDate || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      if (loanId) {
        setShowLoanModal(false);
        setAmount('');
        setDueDate('');
        toast.success('ส่งคำขอกู้ยืมสำเร็จ');
      }
    } catch (error) {
      toast.error('ไม่สามารถส่งคำขอกู้ยืมได้');
    }
  };

  const handleMarkAsReturned = async (loanId: string) => {
    try {
      const success = await LoanService.markLoanAsReturned(loanId);
    } catch (error) {
      toast.error('ไม่สามารถแจ้งคืนเงินได้');
    }
  };

  const handleCompleteLoan = async (loanId: string) => {
    if (!user) return;
    try {
      const success = await LoanService.completeLoan(loanId, user.uid);
      if (success) {
        toast.success('ยืนยันการคืนเงินสำเร็จ');
      }
    } catch (error) {
      toast.error('ไม่สามารถยืนยันการคืนเงินได้');
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    if (!user || !user.uid) return;
    try {
      await LoanService.approveLoan(loanId, user.uid);
    } catch {
      toast.error('ไม่สามารถอนุมัติได้');
    }
  };

  const handleRejectLoan = async (loanId: string) => {
    if (!user || !user.uid) return;
    try {
      await LoanService.rejectLoan(loanId, user.uid);
    } catch {
      toast.error('ไม่สามารถปฏิเสธได้');
    }
  };

  const handleCompleteLoanLeader = async (loanId: string) => {
    if (!user || !user.uid) return;
    try {
      await LoanService.completeLoan(loanId, user.uid);
    } catch {
      toast.error('ไม่สามารถยืนยันคืนเงินได้');
    }
  };

  // ฟังก์ชันจัดเรียง loan (อัปเดต filter เฉพาะสถานะที่ต้องการแสดง)
  function getVisibleLoans(loans: Loan[]) {
    return loans.filter(loan => ['waitingApproval', 'active', 'returned', 'completed'].includes(loan.status));
  }
  function sortLoans(loans: Loan[]) {
    const statusPriority: Record<string, number> = {
      waitingApproval: 4,
      returned: 3,
      active: 2,
      completed: 1
    };
    return loans.slice().sort((a, b) => {
      const aP = statusPriority[a.status] || 0;
      const bP = statusPriority[b.status] || 0;
      if (aP !== bP) return bP - aP;
      return b.createdAt - a.createdAt;
    });
  }

  // Loan ที่ผ่านการ sort แล้ว (ใช้กับทั้ง myLoans และ guildLoans)
  const sortedMyLoans = sortLoans(getVisibleLoans(myLoans));
  const sortedGuildLoans = sortLoans(getVisibleLoans(guildLoans));

  // Pagination
  function getPageItems<T>(items: T[], page: number, perPage: number) {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }
  const totalMyPages = Math.ceil(sortedMyLoans.length / ITEMS_PER_PAGE) || 1;
  const totalGuildPages = Math.ceil(sortedGuildLoans.length / ITEMS_PER_PAGE) || 1;

  // Reset page to 1 เมื่อข้อมูลเปลี่ยน (เช่น loan ถูก approve/reject)
  useEffect(() => {
    setCurrentPage(1);
  }, [myLoans, guildLoans]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Users className="text-pink-500 w-8 h-8 drop-shadow" />
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
              ระบบกู้ยืมจากกิลด์
            </h1>
            <Coins className="text-yellow-400 w-7 h-7 ml-2 drop-shadow" />
          </div>
          <button
            onClick={() => setShowLoanModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-400 to-purple-300 hover:from-pink-500 hover:to-purple-400 text-white font-bold rounded-full shadow-lg text-lg transition-all"
          >
            <Plus size={22} />
            ขอกู้เงินจากกิลด์
          </button>
        </div>

        {/* Loan Modal */}
        {showLoanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-2 border-pink-100 relative animate-fadeIn">
              <h2 className="text-2xl font-bold mb-4 text-pink-700 flex items-center gap-2">
                <Plus className="text-pink-400" /> ยื่นขอกู้ยืมเงิน
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    💸 จำนวนที่ต้องการยืม
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-transparent text-lg"
                    placeholder="กรอกจำนวนเงิน"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">
                    📅 วันที่จะคืน (ไม่บังคับ)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-transparent text-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowLoanModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateLoan}
                    className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-300 hover:from-pink-500 hover:to-purple-400 text-white font-bold rounded-lg shadow"
                  >
                    ส่งคำขอ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Loans */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <History className="text-purple-600 w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-800">ประวัติกู้ยืมของฉัน</h2>
          </div>
          <div className="grid gap-4">
            {getPageItems(sortedMyLoans, currentPage, ITEMS_PER_PAGE).map((loan) => (
              <div
                key={loan.loanId}
                className="bg-white p-5 rounded-xl shadow-md border-2 border-purple-100 hover:shadow-lg transition-all group relative"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                      <Coins className="text-yellow-400 w-5 h-5" /> {loan.amount}G
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      วันที่ขอ: {new Date(loan.createdAt).toLocaleDateString()}
                    </p>
                    {loan.dueDate && (
                      <p className="text-sm text-gray-500">
                        กำหนดคืน: {loan.dueDate}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-base font-semibold shadow-sm
                      ${loan.status === 'waitingApproval' ? 'bg-yellow-100 text-yellow-800' :
                        loan.status === 'active' ? 'bg-green-100 text-green-800' :
                        loan.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {loan.status === 'waitingApproval' && (<><RotateCcw className="w-4 h-4" /> รออนุมัติ</>)}
                      {loan.status === 'active' && (<><Check className="w-4 h-4" /> ยืนยันแล้ว</>)}
                      {loan.status === 'returned' && (<><Coins className="w-4 h-4" /> แจ้งคืนแล้ว</>)}
                      {loan.status === 'completed' && (<><Crown className="w-4 h-4" /> คืนสำเร็จ</>)}
                    </span>
                  </div>
                </div>
                {loan.status === 'active' && (
                  <button
                    onClick={() => handleMarkAsReturned(loan.loanId)}
                    className="mt-4 w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Coins className="w-5 h-5" /> แจ้งคืนเงินแล้ว
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalMyPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <span className="px-3 py-1 text-gray-700 font-semibold">{currentPage} / {totalMyPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalMyPages, p + 1))}
                disabled={currentPage === totalMyPages}
                className="px-3 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>

        {/* Guild Loans (for leaders) */}
        {isGuildLeader && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="text-yellow-500 w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800">ประวัติกู้ยืมของกิลด์</h2>
            </div>
            <div className="grid gap-4">
              {getPageItems(sortedGuildLoans, currentPage, ITEMS_PER_PAGE).map((loan) => (
                <div
                  key={loan.loanId}
                  className="bg-white p-5 rounded-xl shadow-md border-2 border-pink-100 hover:shadow-lg transition-all group relative"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-2xl font-bold text-pink-700 flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" /> {loan.amount}G - {loan.borrower?.name || 'ไม่ระบุ'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        วันที่ขอ: {new Date(loan.createdAt).toLocaleDateString()}
                      </p>
                      {loan.dueDate && (
                        <p className="text-sm text-gray-500">
                          กำหนดคืน: {loan.dueDate}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-base font-semibold shadow-sm
                        ${loan.status === 'waitingApproval' ? 'bg-yellow-100 text-yellow-800' :
                          loan.status === 'active' ? 'bg-green-100 text-green-800' :
                          loan.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {loan.status === 'waitingApproval' && (<><RotateCcw className="w-4 h-4" /> รออนุมัติ</>)}
                        {loan.status === 'active' && (<><Check className="w-4 h-4" /> ยืนยันแล้ว</>)}
                        {loan.status === 'returned' && (<><Coins className="w-4 h-4" /> แจ้งคืนแล้ว</>)}
                        {loan.status === 'completed' && (<><Crown className="w-4 h-4" /> คืนสำเร็จ</>)}
                      </span>
                    </div>
                  </div>
                  {loan.status === 'waitingApproval' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleApproveLoan(loan.loanId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-semibold shadow"
                      >
                        <Check className="w-5 h-5" /> อนุมัติ
                      </button>
                      <button
                        onClick={() => handleRejectLoan(loan.loanId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-semibold shadow"
                      >
                        <X className="w-5 h-5" /> ปฏิเสธ
                      </button>
                    </div>
                  )}
                  {loan.status === 'returned' && (
                    <button
                      onClick={() => handleCompleteLoanLeader(loan.loanId)}
                      className="mt-4 w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Check className="w-5 h-5" /> ยืนยันการคืนเงินแล้ว
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalGuildPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <span className="px-3 py-1 text-gray-700 font-semibold">{currentPage} / {totalGuildPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalGuildPages, p + 1))}
                  disabled={currentPage === totalGuildPages}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 