'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';
import { motion } from 'framer-motion';
import { Home, Users, BarChart2, Calendar, ShoppingCart, PiggyBank, Settings, Crown, LogOut, CreditCard, MessageSquare } from 'lucide-react';
import { useGuild } from '@/hooks/useGuild';
import { useAuth } from '@/hooks/useAuth';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import React, { useState } from 'react';
import { useGuildLoanNotification } from '@/hooks/useGuildLoanNotification';
import ReactDOM from 'react-dom';
import { FaCat } from 'react-icons/fa';
import { toast } from 'sonner';

export default function Navigation() {
  const pathname = usePathname();
  const showNavLinks = pathname !== '/login';
  const { isGuildLeader } = useGuild();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = React.useState(0);
  const [pendingMerchantCount, setPendingMerchantCount] = React.useState(0);
  const [pendingGuildLoanCount, setPendingGuildLoanCount] = React.useState(0);
  const [pendingDonationCount, setPendingDonationCount] = React.useState(0);
  const [pendingCashDonationCount, setPendingCashDonationCount] = React.useState(0);
  const [pendingNewMemberCount, setPendingNewMemberCount] = React.useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useGuildLoanNotification();

  React.useEffect(() => {
    if (!user) return;
    const tradesRef = ref(db, 'trade');
    const loansRef = ref(db, 'merchantLoans');
    let returnedLoanCount = 0;
    let tradeCount = 0;
    let loanCount = 0;

    const updateCount = () => {
      setPendingCount(tradeCount + loanCount + returnedLoanCount);
    };

    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val();
      tradeCount = 0;
      if (data) {
        Object.values(data).forEach((trade: any) => {
          if (trade.merchantId === user.uid && trade.confirms) {
            Object.values(trade.confirms).forEach((confirm: any) => {
              if (confirm.status === 'waiting') tradeCount++;
            });
          }
        });
      }
      updateCount();
    });

    const unsubscribeLoans = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      loanCount = 0;
      returnedLoanCount = 0;
      if (data) {
        Object.values(data).forEach((loan: any) => {
          if (
            loan.source?.type === 'merchant' &&
            loan.source?.merchantId === user.uid &&
            loan.status === 'waitingApproval'
          ) {
            loanCount++;
          }
          if (
            loan.source?.type === 'merchant' &&
            loan.source?.merchantId === user.uid &&
            loan.status === 'returned'
          ) {
            returnedLoanCount++;
          }
        });
      }
      updateCount();
    });

    return () => {
      unsubscribeTrades();
      unsubscribeLoans();
    };
  }, [user]);

  React.useEffect(() => {
    if (!isGuildLeader) return;
    const merchantsRef = ref(db, 'tradeMerchants');
    const unsubscribe = onValue(merchantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const merchants = Object.values(snapshot.val());
        const pending = merchants.filter((m: any) => m.status === 'pending');
        setPendingMerchantCount(pending.length);
      } else {
        setPendingMerchantCount(0);
      }
    });
    return () => unsubscribe();
  }, [isGuildLeader]);

  React.useEffect(() => {
    if (!isGuildLeader) return;
    const loansRef = ref(db, 'guildLoans');
    const unsubscribe = onValue(loansRef, (snapshot) => {
      if (snapshot.exists()) {
        const loans = Object.values(snapshot.val());
        const pending = loans.filter(
          (l: any) => l.status === 'waitingApproval' || l.status === 'returned'
        );
        setPendingGuildLoanCount(pending.length);
      } else {
        setPendingGuildLoanCount(0);
      }
    });
    return () => unsubscribe();
  }, [isGuildLeader]);

  React.useEffect(() => {
    const donatesRef = ref(db, 'guilddonate');
    const unsubscribe = onValue(donatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const waiting = Object.values(data).filter((d: any) => d.status === 'waiting');
        setPendingDonationCount(waiting.length);
      } else {
        setPendingDonationCount(0);
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!isGuildLeader) return;
    const cashRef = ref(db, 'guilddonatecash');
    const unsubscribe = onValue(cashRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const waitingCash = Object.values(data).filter((d: any) => d.status === 'waiting' && d.type === 'cash');
        setPendingCashDonationCount(waitingCash.length);
      } else {
        setPendingCashDonationCount(0);
      }
    });
    return () => unsubscribe();
  }, [isGuildLeader]);

  React.useEffect(() => {
    if (!isGuildLeader) return;
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();
        const pending = Object.entries(users)
          .filter(([uid, u]: [string, any]) => u.meta && u.meta.discord && u.meta.approved === false);
        setPendingNewMemberCount(pending.length);
      } else {
        setPendingNewMemberCount(0);
      }
    });
    return () => unsubscribe();
  }, [isGuildLeader]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 w-full bg-white/30 backdrop-blur-md border-b border-pink-200/50 shadow-sm z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {showNavLinks ? (
            <>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden mr-2 p-2 rounded-lg hover:bg-pink-50/50 transition-all duration-300 hover:scale-105"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Mobile Navigation Modal Overlay using React Portal */}
              {isMobileMenuOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-md flex flex-col min-h-screen">
                  <div className="flex justify-between items-center p-4 border-b border-pink-100">
                    <span className="text-lg font-bold text-gray-800">Menu</span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-lg hover:bg-pink-50/50 transition-colors"
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                    <Link href="/mypage" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 text-gray-700">
                      <Home className="w-5 h-5" />
                      <span className="font-medium">My Character</span>
                    </Link>
                    <Link href="/party" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-purple-50/50 text-gray-700">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Party List</span>
                    </Link>
                    <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-indigo-50/50 text-gray-700">
                      <Calendar className="w-5 h-5" />
                      <span className="font-medium">Event</span>
                    </Link>
                    <Link href="/ranking" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-50/50 text-gray-700">
                      <BarChart2 className="w-5 h-5" />
                      <span className="font-medium">Ranking</span>
                    </Link>
                    <Link href="/trade" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 text-gray-700">
                      <ShoppingCart className="w-5 h-5" />
                      <span className="font-medium">Trade</span>
                      {pendingCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold shadow">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/guild-donate/history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 text-gray-700">
                      <Crown className="w-5 h-5" />
                      <span className="font-medium">Donation History</span>
                      {isGuildLeader && pendingDonationCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow">
                          {pendingDonationCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/guild-donate/cash" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 text-gray-700">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">Cash History</span>
                      {isGuildLeader && pendingCashDonationCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow">
                          {pendingCashDonationCount}
                        </span>
                      )}
                    </Link>
                    <a
                      href="https://discord.com/users/1163943838826631258"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-sky-50/50 text-gray-700"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span className="font-medium">ติดต่อหัวกิลด์</span>
                    </a>
                    {isGuildLeader && (
                      <Link href="/guild/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-green-50/50 text-gray-700 relative">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Guild Settings</span>
                        {(pendingGuildLoanCount > 0 || pendingMerchantCount > 0) && (
                          <div className="absolute top-0 right-0 flex gap-0 z-30">
                            {pendingGuildLoanCount > 0 && (
                              <Link
                                href="/guildloan"
                                className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-md border border-red-400 cursor-pointer hover:bg-red-400 transition-colors drop-shadow"
                                style={{ minWidth: 20, textAlign: 'center' }}
                                title="มีคำขอกู้ยืมใหม่"
                              >
                                {pendingGuildLoanCount}
                              </Link>
                            )}
                            {pendingMerchantCount > 0 && (
                              <Link
                                href="/guild/settings"
                                className="px-1.5 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold shadow-md border border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors drop-shadow -ml-[6px]"
                                style={{ minWidth: 20, textAlign: 'center' }}
                                title="มีร้านค้ารออนุมัติ"
                              >
                                {pendingMerchantCount}
                              </Link>
                            )}
                          </div>
                        )}
                      </Link>
                    )}
                  </nav>
                  <div className="p-4 border-t border-pink-100 bg-white/95 backdrop-blur-md">
                    <DiscordDropdown inMobileMenu={true} />
                  </div>
                </div>,
                document.body
              )}

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/mypage"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/mypage"
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20"
                      : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-300 hover:border-pink-400 hover:text-pink-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Home className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/mypage" ? "text-white" : "group-hover:text-pink-600 text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/mypage" ? "text-white" : "group-hover:text-pink-600 text-gray-700"
                    )}>
                      My Character
                    </span>
                  </motion.div>
                  {pathname === "/mypage" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>

                <Link
                  href="/party"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/party"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md shadow-purple-500/20"
                      : "bg-white/60 border border-purple-100 shadow-sm hover:bg-purple-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-purple-300 hover:border-purple-400 hover:text-purple-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Users className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/party" ? "text-white" : "group-hover:text-purple-600 text-purple-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/party" ? "text-white" : "group-hover:text-purple-600 text-gray-700"
                    )}>
                      Party List
                    </span>
                  </motion.div>
                  {pathname === "/party" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>

                <Link
                  href="/events"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/events"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
                      : "bg-white/60 border border-indigo-100 shadow-sm hover:bg-indigo-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-indigo-300 hover:border-indigo-400 hover:text-indigo-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Calendar className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/events" ? "text-white" : "group-hover:text-indigo-600 text-indigo-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/events" ? "text-white" : "group-hover:text-indigo-600 text-gray-700"
                    )}>
                      Event
                    </span>
                  </motion.div>
                  {pathname === "/events" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>

                <Link
                  href="/ranking"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/ranking"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20"
                      : "bg-white/60 border border-blue-100 shadow-sm hover:bg-blue-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-300 hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <BarChart2 className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/ranking" ? "text-white" : "group-hover:text-blue-600 text-blue-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/ranking" ? "text-white" : "group-hover:text-blue-600 text-gray-700"
                    )}>
                      Ranking
                    </span>
                  </motion.div>
                  {pathname === "/ranking" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              </div>

              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-3 group relative">
                  <FaCat className="w-6 h-6 text-pink-300 drop-shadow-sm shimmer-pastel" />
                  <span className="text-xl lg:text-2xl font-extrabold tracking-wide bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 bg-clip-text text-transparent px-1 drop-shadow-sm shimmer-text">
                    GalaxyCat
                  </span>
                  <FaCat className="w-6 h-6 text-blue-300 drop-shadow-sm shimmer-pastel" />
                </div>
                <style jsx global>{`
                  .shimmer-text {
                    background-size: 200% 100%;
                    animation: shimmer-gradient 3.5s linear infinite;
                  }
                  @keyframes shimmer-gradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                  }
                  .shimmer-pastel {
                    filter: drop-shadow(0 1px 2px #fff6) brightness(1.08);
                    transition: filter 0.3s;
                  }
                  .shimmer-pastel:hover {
                    filter: drop-shadow(0 2px 6px #fff9) brightness(1.18);
                  }
                `}</style>
              </div>

              {/* Desktop Right Side */}
              <div className="hidden lg:flex items-center gap-2 w-1/3 justify-end">
                <Link
                  href="/trade"
                  className={cn(
                    "relative group px-5 py-2 rounded-2xl transition-all duration-300 cursor-pointer",
                    pathname === "/trade"
                      ? "bg-gradient-to-r from-pink-200 via-yellow-100 to-purple-200 text-pink-700 shadow-lg shadow-pink-200/30 border-2 border-pink-200"
                      : "bg-gradient-to-r from-pink-50 via-yellow-50 to-purple-50 text-pink-600 border border-pink-100 shadow hover:bg-pink-100/40 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-200"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <ShoppingCart className={cn(
                      "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                      pathname === "/trade" ? "text-pink-600" : "group-hover:text-pink-500 text-pink-400"
                    )} />
                    <span className={cn(
                      "text-base font-bold transition-colors duration-300 tracking-wide",
                      pathname === "/trade" ? "text-pink-700" : "group-hover:text-pink-600 text-pink-500"
                    )}>
                      Trade
                    </span>
                  </motion.div>
                  {pendingCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link
                        href="/trade/mystore"
                        className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold shadow-md border border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors drop-shadow"
                        style={{ zIndex: 30, minWidth: 20, textAlign: 'center' }}
                        title="มีรายการรอยืนยัน"
                      >
                        {pendingCount}
                      </Link>
                    </motion.div>
                  )}
                  {pathname === "/trade" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-pink-200 via-yellow-100 to-purple-200 rounded-2xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>

                <Link
                  href="/guild-donate/history"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/guild-donate/history"
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20"
                      : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-300 hover:border-pink-400 hover:text-pink-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Crown className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/guild-donate/history" ? "text-white" : "group-hover:text-pink-600 text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/guild-donate/history" ? "text-white" : "group-hover:text-pink-600 text-gray-700"
                    )}>
                      Donation History
                    </span>
                    {isGuildLeader && pendingDonationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingDonationCount}
                      </span>
                    )}
                  </motion.div>
                </Link>
                <Link
                  href="/guild-donate/cash"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/guild-donate/cash"
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20"
                      : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-300 hover:border-pink-400 hover:text-pink-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <CreditCard className={cn(
                      "w-3.5 h-3.5 transition-colors duration-300",
                      pathname === "/guild-donate/cash" ? "text-white" : "group-hover:text-pink-600 text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/guild-donate/cash" ? "text-white" : "group-hover:text-pink-600 text-gray-700"
                    )}>
                      Cash History
                    </span>
                    {isGuildLeader && pendingCashDonationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingCashDonationCount}
                      </span>
                    )}
                  </motion.div>
                </Link>
                <DiscordDropdown />
              </div>

              {/* Mobile Right Side */}
              <div className="flex lg:hidden items-center gap-2 ml-auto">
                <Link
                  href="/trade"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-200",
                    pathname === "/trade"
                      ? "bg-gradient-to-r from-pink-200 via-yellow-100 to-purple-200 text-pink-700"
                      : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50"
                  )}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <DiscordDropdown />
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <DiscordDropdown />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 