'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';
import { motion } from 'framer-motion';
import { Home, Users, BarChart2, Calendar, ShoppingCart, PiggyBank, Settings, Crown, LogOut, CreditCard, MessageSquare, SplitSquareHorizontal, Menu } from 'lucide-react';
import { useGuild } from '@/hooks/useGuild';
import { useAuth } from '@/hooks/useAuth';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import React, { useState } from 'react';
import { useGuildLoanNotification } from '@/hooks/useGuildLoanNotification';
import ReactDOM from 'react-dom';
import { FaCat, FaCoins } from 'react-icons/fa';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';

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
  const [charactersWithMissingStats, setCharactersWithMissingStats] = React.useState(0);

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
  }, [user, isGuildLeader]);

  React.useEffect(() => {
    if (!user) return;
    const charactersRef = ref(db, `users/${user.uid}/characters`);
    
    const unsubscribe = onValue(charactersRef, (snapshot) => {
      if (snapshot.exists()) {
        const characters = snapshot.val();
        const missingStatsCount = Object.values(characters).filter((char: any) => {
          return !char.stats.atk || !char.stats.hp || !char.stats.pdef || !char.stats.mdef;
        }).length;
        setCharactersWithMissingStats(missingStatsCount);
      } else {
        setCharactersWithMissingStats(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 w-full h-14 backdrop-blur-md border-b border-gray-200/50 shadow-sm z-[100000]">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {showNavLinks ? (
            <>
              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-md bg-white/60 backdrop-blur-md border border-white/30 hover:bg-pink-100/60 transition-all relative"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                <Menu className={cn("w-6 h-6 text-pink-500 transition-transform duration-200", isMobileMenuOpen && "rotate-90")} />
                {(charactersWithMissingStats > 0 || pendingCount > 0 || (isGuildLeader && (pendingDonationCount > 0 || pendingCashDonationCount > 0)) || (isGuildLeader && (pendingGuildLoanCount > 0 || pendingMerchantCount > 0 || pendingNewMemberCount > 0))) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 min-w-4 min-h-4 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow select-none z-30 lg:hidden">
                    {charactersWithMissingStats + pendingCount + (isGuildLeader ? (pendingDonationCount + pendingCashDonationCount + pendingGuildLoanCount + pendingMerchantCount + pendingNewMemberCount) : 0)}
                  </span>
                )}
              </button>

              {/* Mobile Navigation Modal Overlay using React Portal */}
              {isMobileMenuOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
                <div 
                  className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-md flex flex-col min-h-screen"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  <div className="flex justify-between items-center p-4 border-b border-pink-100">
                    <span className="text-lg font-bold text-gray-800">Menu</span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-lg hover:bg-pink-50/50 transition-colors"
                      aria-label="Close menu"
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                    <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/60 backdrop-blur-md border border-pink-100">
                      <ThemeToggle />
                      <span className="text-sm font-medium text-gray-700">สลับธีม</span>
                    </div>
                    <Link href="/mypage" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 relative",
                      pathname === "/mypage" ? "bg-pink-50" : "text-gray-700"
                    )}>
                      <Home className={cn("w-5 h-5", pathname === "/mypage" ? "text-blue-600" : "text-blue-400")} />
                      <span className={cn("font-medium", pathname === "/mypage" ? "text-blue-600" : undefined)}>My Character</span>
                      {charactersWithMissingStats > 0 && (
                        <>
                          {/* Mobile badge */}
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 min-w-4 min-h-4 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow select-none z-30 lg:hidden">
                            {charactersWithMissingStats}
                          </span>
                          {/* Desktop badge */}
                          <span className="absolute -top-4 -right-4 w-5 h-5 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow z-30 hidden lg:flex">
                            {charactersWithMissingStats}
                          </span>
                        </>
                      )}
                    </Link>
                    <Link href="/party" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-purple-50/50",
                      pathname === "/party" ? "bg-purple-50" : "text-gray-700"
                    )}>
                      <Users className={cn("w-5 h-5", pathname === "/party" ? "text-purple-600" : "text-purple-400")} />
                      <span className={cn("font-medium", pathname === "/party" ? "text-purple-600" : undefined)}>Party List</span>
                    </Link>
                    <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-indigo-50/50",
                      pathname === "/events" ? "bg-indigo-50" : "text-gray-700"
                    )}>
                      <Calendar className={cn("w-5 h-5", pathname === "/events" ? "text-indigo-600" : "text-indigo-400")} />
                      <span className={cn("font-medium", pathname === "/events" ? "text-indigo-600" : undefined)}>Event</span>
                    </Link>
                    <Link href="/ranking" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-50/50",
                      pathname.startsWith("/ranking") ? "bg-blue-50" : "text-gray-700"
                    )}>
                      <BarChart2 className={cn("w-5 h-5", pathname.startsWith("/ranking") ? "text-green-600" : "text-green-400")} />
                      <span className={cn("font-medium", pathname.startsWith("/ranking") ? "text-green-600" : undefined)}>Ranking</span>
                    </Link>
                    <Link
                      href="/split"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50",
                        pathname === "/split" ? "bg-yellow-50" : "text-gray-700"
                      )}
                    >
                      <FaCoins className={cn("w-5 h-5", pathname === "/split" ? "text-yellow-500" : "text-yellow-400")} />
                      <span className={cn("font-medium", pathname === "/split" ? "text-yellow-600" : undefined)}>Loot</span>
                    </Link>
                    <Link href="/trade" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 relative",
                      pathname === "/trade" ? "bg-pink-50" : "text-gray-700"
                    )}>
                      <ShoppingCart className={cn("w-5 h-5", pathname === "/trade" ? "text-pink-600" : "text-pink-400")} />
                      <span className={cn("font-medium", pathname === "/trade" ? "text-pink-600" : undefined)}>Trade</span>
                      {pendingCount > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold shadow">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/guild-donate/history" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 relative",
                      pathname === "/guild-donate/history" ? "bg-yellow-50" : "text-gray-700"
                    )}>
                      <Crown className={cn("w-5 h-5", pathname === "/guild-donate/history" ? "text-yellow-600" : "text-yellow-400")} />
                      <span className={cn("font-medium whitespace-nowrap flex items-center", pathname === "/guild-donate/history" ? "text-yellow-600" : undefined)}>
                        บริจาคกิลด์
                      </span>
                    </Link>
                    {isGuildLeader && (
                      <Link href="/guild/settings" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-green-50/50 relative",
                        pathname === "/guild/settings" ? "bg-emerald-50" : "text-gray-700"
                      )}>
                        <Settings className={cn("w-5 h-5", pathname === "/guild/settings" ? "text-emerald-600" : "text-emerald-400")} />
                        <span className={cn("font-medium whitespace-nowrap flex items-center", pathname === "/guild/settings" ? "text-emerald-600" : undefined)}>จัดการกิลด์</span>
                        {(pendingGuildLoanCount > 0 || pendingMerchantCount > 0 || pendingNewMemberCount > 0 || pendingDonationCount > 0 || pendingCashDonationCount > 0) && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 min-w-4 min-h-4 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow select-none z-30 lg:hidden">
                            {pendingGuildLoanCount + pendingMerchantCount + pendingNewMemberCount + pendingDonationCount + pendingCashDonationCount}
                          </span>
                        )}
                      </Link>
                    )}
                    <a
                      href="https://discord.com/users/1163943838826631258"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-sky-50/50",
                        pathname === "/contact-guild-leader" ? "bg-sky-50" : "text-gray-700"
                      )}
                    >
                      <MessageSquare className={cn("w-5 h-5", pathname === "/contact-guild-leader" ? "text-sky-600" : "text-sky-400")} />
                      <span className={cn("font-medium", pathname === "/contact-guild-leader" ? "text-sky-600" : undefined)}>ติดต่อหัวกิลด์</span>
                    </a>
                  </nav>
                  <div className="p-4 border-t border-pink-100 bg-white/95 backdrop-blur-md">
                    <DiscordDropdown inMobileMenu={true} />
                  </div>
                </div>,
                document.body
              )}

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-2">
                <ThemeToggle />
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
                    className="flex items-center gap-1.5 relative"
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
                    {charactersWithMissingStats > 0 && (
                      <>
                        {/* Mobile badge */}
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 min-w-4 min-h-4 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow select-none z-30 lg:hidden">
                          {charactersWithMissingStats}
                        </span>
                        {/* Desktop badge */}
                        <span className="absolute -top-4 -right-4 w-5 h-5 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow z-30 hidden lg:flex">
                          {charactersWithMissingStats}
                        </span>
                      </>
                    )}
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
                    pathname.startsWith("/ranking")
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
                      pathname.startsWith("/ranking") ? "text-white" : "group-hover:text-blue-600 text-blue-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname.startsWith("/ranking") ? "text-white" : "group-hover:text-blue-600 text-gray-700"
                    )}>
                      Ranking
                    </span>
                  </motion.div>
                  {pathname.startsWith("/ranking") && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>

                <Link
                  href="/split"
                  className={cn(
                    "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer",
                    pathname === "/split"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-white/60 border border-amber-100 shadow-sm hover:bg-amber-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-amber-300 hover:border-amber-400 hover:text-amber-600"
                  )}
                >
                  <motion.div
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <FaCoins className={cn(
                      "w-5 h-5 text-yellow-500 transition-colors duration-300",
                      pathname === "/split" ? "text-white" : "group-hover:text-amber-600 text-amber-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      pathname === "/split" ? "text-white" : "group-hover:text-amber-600 text-gray-700"
                    )}>
                      Loot
                    </span>
                  </motion.div>
                  {pathname === "/split" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg -z-10"
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
                  /* Force GalaxyCat gradient in dark mode */
                  [data-theme="dark"] .shimmer-text {
                    background: linear-gradient(90deg, #f9a8d4, #c4b5fd 60%, #a5b4fc 100%) !important;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: transparent;
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
                    pathname.startsWith("/guild-donate/history")
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
                      pathname.startsWith("/guild-donate/history") ? "text-white" : "group-hover:text-pink-600 text-pink-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300 whitespace-nowrap flex items-center",
                      pathname.startsWith("/guild-donate/history") ? "text-white" : "group-hover:text-pink-600 text-gray-700"
                    )}>
                      บริจาคกิลด์
                    </span>
                  </motion.div>
                </Link>
                {isGuildLeader && (
                  <Link
                    href="/guild/settings"
                    className={cn(
                      "guild-settings-desktop-right",
                      "relative group px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2",
                      pathname === "/guild/settings"
                        ? "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-md shadow-green-500/20"
                        : "bg-white/60 border border-green-100 shadow-sm hover:bg-green-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-green-300 hover:border-green-400 hover:text-green-600"
                    )}
                  >
                    <Settings className={cn(
                      "w-4 h-4 transition-colors duration-300",
                      pathname === "/guild/settings" ? "text-white" : "group-hover:text-green-600 text-green-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300 whitespace-nowrap flex items-center",
                      pathname === "/guild/settings" ? "text-white" : "group-hover:text-green-600 text-gray-700"
                    )}>
                      จัดการกิลด์
                    </span>
                    {(pendingGuildLoanCount > 0 || pendingMerchantCount > 0 || pendingNewMemberCount > 0 || pendingDonationCount > 0 || pendingCashDonationCount > 0) && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow z-30 hidden lg:flex">
                        {pendingGuildLoanCount + pendingMerchantCount + pendingNewMemberCount + pendingDonationCount + pendingCashDonationCount}
                      </span>
                    )}
                  </Link>
                )}
                <DiscordDropdown />
              </div>

              {/* Mobile Right Side */}
              <div className="flex lg:hidden items-center ml-auto">
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