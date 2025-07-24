'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { DiscordDropdown } from './DiscordDropdown';
import { motion } from 'framer-motion';
import { Home, Users, BarChart2, Calendar, ShoppingCart, PiggyBank, Settings, LogOut, CreditCard, MessageSquare, SplitSquareHorizontal, Menu, Crown } from 'lucide-react';
import { useGuild } from '@/hooks/useGuild';
import { useAuth } from '@/hooks/useAuth';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import React, { useState, useEffect, useRef } from 'react';
import { useGuildLoanNotification } from '@/hooks/useGuildLoanNotification';
import ReactDOM from 'react-dom';
import { FaCat } from 'react-icons/fa';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import { useThemeContext } from './ThemeProvider';



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
  const { resolvedTheme } = useThemeContext();
  const [donates, setDonates] = React.useState<any[]>([]);
  const [hasDonatedMinimum, setHasDonatedMinimum] = React.useState(true);

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

  // ปิดเมนูมือถืออัตโนมัติเมื่อหน้าจอขยายเกิน 1024px
  React.useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // ดึงข้อมูลบริจาคกิลด์
  React.useEffect(() => {
    const donatesRef = ref(db, 'guilddonate');
    const unsub = onValue(donatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDonates(Object.values(data));
      }
    });
    return () => unsub();
  }, []);

  // ฟังก์ชันเช็คยอดบริจาคเดือนนี้
  function getLatestMonthDonationAmount(donates: any[], userId: string): number {
    const userDonates = donates.filter(d => d.userId === userId && d.status === 'active');
    if (userDonates.length === 0) return 0;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return userDonates
      .filter(d => {
        const date = new Date(d.createdAt);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((sum, d) => sum + d.amount, 0);
  }

  // ตรวจสอบสถานะการบริจาคขั้นต่ำ
  React.useEffect(() => {
    if (!user) return;
    const amt = getLatestMonthDonationAmount(donates, user.uid);
    setHasDonatedMinimum(amt >= 30);
  }, [donates, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Desktop: Pastel Banner แจ้งเตือนใต้ Navigation */}
      {!hasDonatedMinimum && (
        <div className="hidden lg:flex w-full justify-center z-[9999] fixed top-14 left-0 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 mt-1 rounded-lg shadow border border-pink-200 bg-gradient-to-r from-pink-100 via-yellow-50 to-blue-100 animate-fade-in pointer-events-auto min-w-[240px] max-w-[400px]">
            <Crown className="w-4 h-4 text-yellow-400 drop-shadow" />
            <span className="text-pink-700 font-semibold text-xs">
              ร่วมบริจาค <b className="font-bold">30G</b> ให้กิลด์กันเถอะ!
            </span>
            <Link
              href="/guild-donate"
              className="ml-1 px-2 py-0.5 rounded bg-gradient-to-r from-yellow-200 via-pink-200 to-yellow-100 text-yellow-900 font-bold text-xs shadow flex items-center gap-1 transition transform hover:scale-105 focus:scale-105 animate-pulse hover:animate-none focus:animate-none"
              style={{ boxShadow: '0 0 8px #f9a8d4, 0 0 2px #fde68a' }}
            >
              <span className="text-pink-500">
                <svg xmlns='http://www.w3.org/2000/svg' className='inline w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><path d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'/></svg>
              </span>
              บริจาค
            </Link>
          </div>
        </div>
      )}
      <nav className="fixed top-0 left-0 w-full h-14 backdrop-blur-md border-b border-gray-200/50 shadow-sm z-[100000]">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center h-14 w-full">
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
                    <div className="p-4 border-b border-pink-100 bg-white/95 backdrop-blur-md flex justify-end">
                      <DiscordDropdown inMobileMenu={true} />
                    </div>
                    <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                      <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/60 backdrop-blur-md border border-pink-100">
                        <ThemeToggle isMobile />
                        <span className="text-sm font-medium text-gray-700">สลับธีม</span>
                      </div>
                      <Link href="/mypage" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 dark:hover:bg-pink-900/40 relative",
                        (pathname === "/mypage" || pathname.startsWith("/mypage") || pathname.startsWith("/split")) ? "bg-pink-50 dark:bg-pink-900 text-pink-700 dark:text-pink-300" : "text-gray-700 dark:text-gray-200"
                      )}>
                        <Home className={cn("w-5 h-5", (pathname === "/mypage" || pathname.startsWith("/mypage") || pathname.startsWith("/split")) ? "text-pink-700 dark:text-pink-300" : "text-pink-400 dark:text-pink-300/70")}/>
                        <span className={cn("font-medium", (pathname === "/mypage" || pathname.startsWith("/mypage") || pathname.startsWith("/split")) ? "text-pink-700 dark:text-pink-300" : undefined)}>ตัวละคร</span>
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
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-purple-50/50 dark:hover:bg-purple-900/40",
                        (pathname === "/party" || pathname.startsWith("/party")) ? "bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300" : "text-gray-700 dark:text-gray-200"
                      )}>
                        <Users className={cn("w-5 h-5", (pathname === "/party" || pathname.startsWith("/party")) ? "text-purple-600 dark:text-purple-300" : "text-purple-400 dark:text-purple-300/70")}/>
                        <span className={cn("font-medium", (pathname === "/party" || pathname.startsWith("/party")) ? "text-purple-600 dark:text-purple-300" : undefined)}>ปาร์ตี้</span>
                      </Link>
                      <Link
                        key="/events"
                        href="/events"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/40",
                          (pathname === "/events" || pathname.startsWith("/events"))
                            ? "bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300"
                            : "text-gray-700 dark:text-gray-200"
                        )}
                      >
                        <Calendar className={cn("w-5 h-5", (pathname === "/events" || pathname.startsWith("/events")) ? "text-indigo-600 dark:text-indigo-300" : "text-indigo-400 dark:text-indigo-300/70")}/>
                        <span className={cn("font-medium", (pathname === "/events" || pathname.startsWith("/events")) ? "text-indigo-600 dark:text-indigo-300" : undefined)}>กิจกรรม</span>
                      </Link>
                      <Link href="/ranking" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-green-50/50 dark:hover:bg-green-900/40",
                        pathname.startsWith("/ranking") ? "bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300" : "text-gray-700 dark:text-gray-200"
                      )}>
                        <BarChart2 className={cn("w-5 h-5", pathname.startsWith("/ranking") ? "text-green-600 dark:text-green-300" : "text-green-400 dark:text-green-300/70")}/>
                        <span className={cn("font-medium", pathname.startsWith("/ranking") ? "text-green-600 dark:text-green-300" : undefined)}>จัดอันดับ</span>
                      </Link>
                      <Link href="/trade" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 dark:hover:bg-pink-900/40 relative",
                        pathname === "/trade" ? "bg-pink-50 dark:bg-pink-900 text-pink-700 dark:text-pink-300" : "text-gray-700 dark:text-gray-200"
                      )}>
                        <ShoppingCart className={cn(
                          "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                          pathname === "/trade" ? "text-pink-700 dark:text-pink-300" : "text-pink-400 dark:text-pink-300/70"
                        )} />
                        <span className={cn(
                          "font-medium",
                          pathname === "/trade" ? "text-pink-700 dark:text-pink-300" : undefined
                        )}>
                          Trade
                        </span>
                      </Link>
                      <Link href="/guild-donate/history" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-pink-50/50 dark:hover:bg-yellow-900/40 relative",
                        (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash")) ? "bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300" : "text-gray-700 dark:text-gray-200"
                      )}>
                        <Crown className={cn(
                          "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                          (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash"))
                            ? (typeof window !== 'undefined' && window.innerWidth < 1024 ? "text-yellow-600 dark:text-yellow-300" : "text-white")
                            : "group-hover:text-yellow-500 text-yellow-400 dark:text-yellow-300/70"
                        )} />
                        <span className={cn("font-medium whitespace-nowrap flex items-center", (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash")) ? "text-yellow-600 dark:text-yellow-300" : undefined)}>
                          บริจาคกิลด์
                        </span>
                        {/* จุดแดงแจ้งเตือนถ้ายังไม่บริจาคขั้นต่ำ */}
                        {!hasDonatedMinimum && (
                          <span className="absolute top-2 right-4 w-3 h-3 rounded-full bg-red-500 border-2 border-white z-10"></span>
                        )}
                      </Link>
                      {isGuildLeader && (
                        <Link href="/guild/settings" onClick={() => setIsMobileMenuOpen(false)} className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-green-50/50 dark:hover:bg-green-900/40 relative",
                          pathname === "/guild/settings" ? "bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300" : "text-gray-700 dark:text-gray-200"
                        )}>
                          <Settings className={cn(
                            "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                            pathname === "/guild/settings" ? "text-emerald-600 dark:text-emerald-300" : "group-hover:text-green-600 text-green-500 dark:text-emerald-300/70"
                          )} />
                          <span className={cn("font-medium whitespace-nowrap flex items-center", pathname === "/guild/settings" ? "text-emerald-600 dark:text-emerald-300" : undefined)}>จัดการกิลด์</span>
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
                          "flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-sky-50/50 dark:hover:bg-sky-900/40",
                          pathname === "/contact-guild-leader" ? "bg-sky-50 dark:bg-sky-900 text-sky-600 dark:text-sky-300" : "text-gray-700 dark:text-gray-200"
                        )}
                      >
                        <MessageSquare className={cn("w-5 h-5", pathname === "/contact-guild-leader" ? "text-sky-600 dark:text-sky-300" : "text-sky-400 dark:text-sky-300/70")}/>
                        <span className={cn("font-medium", pathname === "/contact-guild-leader" ? "text-sky-600 dark:text-sky-300" : undefined)}>ติดต่อหัวกิลด์</span>
                      </a>
                    </nav>
                  </div>,
                  document.body
                )}

                {/* Desktop Navigation (Left) */}
                <div className="hidden lg:flex items-center gap-1 flex-1 min-w-0">
                  <ThemeToggle />
                  <div className="flex items-center gap-1">
                    {[
                      { href: "/mypage", icon: <Home />, label: "ตัวละคร", color: "pink", activeBg: "bg-pink-700", hoverBg: "hover:bg-pink-600/30", iconColor: "text-pink-400", border: "hover:border-pink-400 dark:hover:border-pink-400" },
                      { href: "/party", icon: <Users />, label: "ปาร์ตี้", color: "purple", activeBg: "bg-purple-700", hoverBg: "hover:bg-purple-600/30", iconColor: "text-purple-400", border: "hover:border-purple-400 dark:hover:border-purple-400" },
                      { href: "/events", icon: <Calendar />, label: "กิจกรรม", color: "indigo", activeBg: "bg-indigo-700", hoverBg: "hover:bg-indigo-600/30", iconColor: "text-indigo-400", border: "hover:border-indigo-400 dark:hover:border-indigo-400" },
                      { href: "/ranking", icon: <BarChart2 />, label: "จัดอันดับ", color: "green", activeBg: "bg-green-700", hoverBg: "hover:bg-green-600/30", iconColor: "text-green-400", border: "hover:border-green-400 dark:hover:border-green-400" },
                    ].map((tab, idx) => {
                      const isActive =
                        tab.href === "/mypage"
                          ? pathname === "/mypage" || pathname.startsWith("/mypage") || pathname.startsWith("/split")
                          : tab.href === "/party"
                            ? pathname === "/party" || pathname.startsWith("/party")
                            : tab.href === "/events"
                              ? pathname === "/events" || pathname.startsWith("/events")
                              : tab.href === "/ranking"
                                ? pathname === "/ranking" || pathname.startsWith("/ranking")
                                : tab.href === "/guild-donate/history"
                                  ? pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash")
                                  : pathname === tab.href;
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1 transition-all text-base rounded-xl relative font-bold border-2 border-transparent",
                            isActive
                              ? `${tab.activeBg} text-white shadow-lg scale-105 font-bold ${tab.border.replace('hover:', '')}`
                              : `text-white/90 ${tab.hoverBg} hover:text-white ${tab.border}`
                          )}
                          style={{
                            borderTopLeftRadius: idx === 0 ? "0.75rem" : undefined,
                            borderBottomLeftRadius: idx === 0 ? "0.75rem" : undefined,
                            borderTopRightRadius: idx === 3 ? "0.75rem" : undefined,
                            borderBottomRightRadius: idx === 3 ? "0.75rem" : undefined,
                          }}
                        >
                          {React.cloneElement(tab.icon, {
                            className: cn(
                              "w-5 h-5 transition-colors",
                              isActive ? "text-white" : tab.iconColor
                            ),
                          })}
                          <span>{tab.label}</span>
                          {/* Badge/แจ้งเตือนเฉพาะปุ่มตัวละคร */}
                          {tab.href === "/mypage" && charactersWithMissingStats > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow z-30">
                              {charactersWithMissingStats}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* โลโก้ GalaxyCat กึ่งกลางจริง (Absolute Center) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center gap-3 group pointer-events-none select-none">
                  <FaCat className="w-6 h-6 drop-shadow-sm shimmer-pastel" style={{ color: '#22d3ee', filter: 'drop-shadow(0 1px 2px #fff6) brightness(1.08)' }} />
                  <div className="flex flex-col items-center relative">
                    <span
                      className="text-xl lg:text-2xl font-extrabold tracking-wide bg-clip-text text-transparent px-1 drop-shadow-sm shimmer-text"
                      style={{
                        display: 'inline-block',
                        background: 'linear-gradient(90deg, #f9a8d4 0%, #fbc2eb 12%, #c4b5fd 25%, #a7ffeb 37%, #7dd3fc 50%, #b9fbc0 62%, #fff1fa 75%, #f9a8d4 87%, #f9a8d4 100%)',
                        backgroundSize: '400% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        color: 'transparent',
                        filter: 'drop-shadow(0 1px 2px #fff6)'
                      }}
                    >
                      GalaxyCat
                    </span>
                  </div>
                  <FaCat className="w-6 h-6 drop-shadow-sm shimmer-pastel" style={{ color: '#f59e42', filter: 'drop-shadow(0 1px 2px #fff6) brightness(1.08)' }} />
                  <style jsx global>{`
                    .shimmer-text {
                      animation: shimmer-gradient 2.5s linear infinite;
                      background-size: 400% 100%;
                    }
                    @keyframes shimmer-gradient {
                      0% { background-position: 0% 50%; }
                      100% { background-position: 100% 50%; }
                    }
                    .shimmer-pastel {
                      filter: drop-shadow(0 1px 2px #fff6) brightness(1.08);
                      animation: pastel-gradient 4s linear infinite;
                      transition: filter 0.3s;
                    }
                    @keyframes pastel-gradient {
                      0% { filter: hue-rotate(0deg) brightness(1.08) drop-shadow(0 1px 2px #fff6); }
                      100% { filter: hue-rotate(360deg) brightness(1.08) drop-shadow(0 1px 2px #fff6); }
                    }
                  `}</style>
                </div>

                {/* ปุ่มขวา (Desktop Right Side) */}
                <div className="hidden lg:flex items-center gap-2 flex-1 justify-end min-w-0">
                  <Link
                    href="/trade"
                    className={cn(
                      "relative group px-3 py-1 rounded-xl transition-all duration-300 cursor-pointer",
                      pathname === "/trade"
                        ? "bg-gradient-to-r from-pink-200 via-yellow-100 to-purple-200 text-pink-700 shadow-lg shadow-pink-200/30 border-2 !border-pink-200 !dark:!border-pink-200"
                        : "bg-transparent text-white/90 border-2 border-transparent shadow-none hover:bg-pink-100/20 hover:shadow-xl hover:ring-2 hover:ring-pink-200 -ml-px"
                    )}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <ShoppingCart className={cn(
                        "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                        pathname === "/trade" ? "text-pink-700" : "group-hover:text-pink-500 text-pink-400"
                      )} />
                      <span className={cn(
                        "text-base font-bold transition-colors duration-300 tracking-wide",
                        pathname === "/trade" ? "text-pink-700" : "group-hover:text-white text-white/90"
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
                      "relative group px-3 py-1 rounded-xl transition-all text-base font-bold cursor-pointer",
                      (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash"))
                        ? "bg-gradient-to-r from-yellow-400 via-pink-400 to-rose-400 text-white shadow-lg border-2 !border-yellow-200 !dark:!border-yellow-200"
                        : "bg-transparent text-white/90 border-2 border-transparent shadow-none hover:bg-pink-100/20 hover:shadow-xl hover:ring-2 hover:ring-yellow-200 -ml-px"
                    )}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Crown className={cn(
                        "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                        (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash")) ? "text-white" : "group-hover:text-yellow-400 text-yellow-400"
                      )} />
                      <span className={cn(
                        "transition-colors duration-300 whitespace-nowrap flex items-center",
                        (pathname.startsWith("/guild-donate") || pathname.startsWith("/guild-donate-cash")) ? "text-white" : "group-hover:text-white text-white/90"
                      )}>
                        บริจาคกิลด์
                      </span>
                    </motion.div>
                  </Link>
                  {isGuildLeader && (
                    <Link
                      href="/guild/settings"
                      className={cn(
                        "relative group px-3 py-1 rounded-xl transition-all text-base font-bold cursor-pointer flex items-center gap-0",
                        pathname === "/guild/settings"
                          ? "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg border-2 !border-green-200 !dark:!border-green-200"
                          : "bg-transparent text-white/90 border-2 border-transparent shadow-none hover:bg-green-100/20 hover:ring-2 hover:ring-green-200 -ml-px"
                      )}
                    >
                      <motion.div className="flex items-center gap-2" transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Settings className={cn(
                          "w-5 h-5 transition-colors duration-300 drop-shadow-sm",
                          pathname === "/guild/settings" ? "text-white" : "group-hover:text-green-600 text-green-500"
                        )} />
                        <span className={cn(
                          "transition-colors duration-300 whitespace-nowrap flex items-center",
                          pathname === "/guild/settings" ? "text-white" : "group-hover:text-white text-white/90"
                        )}>
                          จัดการกิลด์
                        </span>
                      </motion.div>
                      {(pendingGuildLoanCount > 0 || pendingMerchantCount > 0 || pendingNewMemberCount > 0 || pendingDonationCount > 0 || pendingCashDonationCount > 0) && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 flex justify-center items-center rounded-full bg-red-500 text-white text-xs font-bold shadow z-30 hidden lg:flex">
                          {pendingGuildLoanCount + pendingMerchantCount + pendingNewMemberCount + pendingDonationCount + pendingCashDonationCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <DiscordDropdown
                    className="border-2 !border-pink-400 !dark:!border-pink-400"
                  />
                </div>

                {/* Mobile Right Side */}
                <div className="flex lg:hidden items-center ml-auto">
                  {/* DiscordDropdown removed from here in mobile */}
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
    </>
  );
} 