'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, History, Store, Users, User, PiggyBank, ShoppingBag, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TradeDashboardPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [feedMessages, setFeedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const authCheckRef = useRef(false);
  const [showRegister, setShowRegister] = useState(false);
  const [checkingRegister, setCheckingRegister] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [merchantGoldLeft, setMerchantGoldLeft] = useState<Record<string, number>>({});
  const [merchantItems, setMerchantItems] = useState<Record<string, any[]>>({});
  const [pendingReturnCount, setPendingReturnCount] = React.useState(0);
  const [merchantLatestTrade, setMerchantLatestTrade] = useState<Record<string, any>>({});
  const [merchantSearch, setMerchantSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    if (!user && !authCheckRef.current) {
      authCheckRef.current = true;
      router.push('/');
      return;
    }

    if (isInitialized.current) return;
    isInitialized.current = true;

    const setupData = () => {
      const merchantsRef = ref(db, 'tradeMerchants');
      const feedRef = ref(db, 'feed/all');
      const tradesRef = ref(db, 'trade');
      const itemsRef = ref(db, 'tradeItems');

      const unsubscribeMerchants = onValue(merchantsRef, (snapshot) => {
        const data = snapshot.val();
        const merchantsList = data ? Object.entries(data)
          .map(([id, merchant]: [string, any]) => ({
            id,
            ...merchant
          }))
          .sort((a, b) => b.gold - a.gold) : [];
        setMerchants(merchantsList);
      });

      // ดึง trade ทั้งหมดเพื่อคำนวณ goldLeft ของแต่ละ merchant
      const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
        const data = snapshot.val();
        const goldLeftMap: Record<string, number> = {};
        const latestTradeMap: Record<string, any> = {};
        if (data) {
          Object.values<any>(data).forEach((trade: any) => {
            if (trade.status === 'open' && trade.merchantId) {
              goldLeftMap[trade.merchantId] = (goldLeftMap[trade.merchantId] || 0) + (trade.amountLeft || 0);
              // หา trade ล่าสุดของแต่ละ merchant
              if (!latestTradeMap[trade.merchantId] || trade.createdAt > latestTradeMap[trade.merchantId].createdAt) {
                latestTradeMap[trade.merchantId] = trade;
              }
            }
          });
        }
        setMerchantGoldLeft(goldLeftMap);
        setMerchantLatestTrade(latestTradeMap);
      });

      // ดึง tradeItems ทั้งหมดเพื่อ map ไอเทมของแต่ละ merchant
      const unsubscribeItems = onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        const itemsMap: Record<string, any[]> = {};
        if (data) {
          Object.values<any>(data).forEach((item: any) => {
            if (item.merchantId) {
              if (!itemsMap[item.merchantId]) itemsMap[item.merchantId] = [];
              itemsMap[item.merchantId].push(item);
            }
          });
        }
        setMerchantItems(itemsMap);
      });

      const unsubscribeFeed = onValue(feedRef, (snapshot) => {
        const data = snapshot.val();
        const feedList = data ? Object.entries(data)
          .map(([id, feed]: [string, any]) => ({
            id,
            ...feed
          }))
          .sort((a, b) => b.timestamp - a.timestamp) : [];
        setFeedMessages(feedList);
        setLoading(false);
      });

      unsubscribeRef.current = [unsubscribeMerchants, unsubscribeFeed, unsubscribeTrades, unsubscribeItems];
    };

    setupData();

    // เช็คว่ายังไม่ได้สมัครเป็นพ่อค้าหรือไม่
    if (user && user.uid) {
      const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
      get(merchantRef).then(snapshot => {
        setShowRegister(!snapshot.exists());
        setCheckingRegister(false);
        setIsRegistered(snapshot.exists());
      });
    }

    if (!user) return;
    let merchantCount = 0;
    let guildCount = 0;
    const merchantLoansRef = ref(db, 'merchantLoans');
    const guildLoansRef = ref(db, 'guildLoans');
    const unsubMerchant = onValue(merchantLoansRef, (snapshot) => {
      const data = snapshot.val();
      merchantCount = data
        ? Object.values(data).filter(
            (loan: any) =>
              loan.borrower?.discordId === user.uid &&
              (loan.status === 'active' || loan.status === 'returned')
          ).length
        : 0;
      setPendingReturnCount(merchantCount + guildCount);
    });
    const unsubGuild = onValue(guildLoansRef, (snapshot) => {
      const data = snapshot.val();
      guildCount = data
        ? Object.values(data).filter(
            (loan: any) =>
              loan.borrowerId === user.uid &&
              (loan.status === 'active' || loan.status === 'returned')
          ).length
        : 0;
      setPendingReturnCount(merchantCount + guildCount);
    });

    return () => {
      unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRef.current = [];
      isInitialized.current = false;
      authCheckRef.current = false;
      unsubMerchant();
      unsubGuild();
    };
  }, [user]);

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success('คัดลอกข้อความสำเร็จ');
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-yellow-50 via-pink-50 to-purple-100 rounded-2xl p-4 sm:p-8 shadow-lg border-2 border-pink-200 grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-4 sm:gap-8 items-center"
        >
          <div className="min-w-0 flex-1">
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-yellow-500 to-orange-500 drop-shadow mb-2 flex items-center gap-3 leading-normal py-2 whitespace-nowrap"
              style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'`, lineHeight: 1.2 }}
            >
              <span>💎</span> ตลาดซื้อขายสินค้าและบริการ
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 font-medium mb-2">
              ระบบกลางสำหรับ <span className="text-pink-600 font-bold">ซื้อขาย Gold</span>, <span className="text-yellow-600 font-bold">สินค้า</span>, <span className="text-purple-600 font-bold">บริการ</span> และ <span className="text-blue-600 font-bold">กู้ยืมเงิน</span> จาก <span className="font-bold text-gray-800">พ่อค้า</span> หรือ <span className="font-bold text-gray-800">กิลด์</span>
            </p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm"><Package className="w-4 h-4" /> สินค้า</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-semibold text-sm"><ShoppingBag className="w-4 h-4" /> Gold</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm"><Users className="w-4 h-4" /> บริการ</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm"><PiggyBank className="w-4 h-4" /> กู้ยืม</span>
            </div>
          </div>
          <div className="w-full max-w-[700px] px-0 mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <Link
                href="/trade/feed"
                className="rounded-2xl p-5 shadow-sm border border-pink-100 bg-gradient-to-br from-pink-50 to-white flex flex-row items-center gap-4 min-h-[120px] h-auto w-full transition-all duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-pink-200/40 focus-visible:ring-4 focus-visible:ring-pink-300/60"
              >
                <div className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-xl bg-pink-100 text-pink-500 text-2xl shadow flex-shrink-0">
                  <span>📝</span>
                </div>
                <div className="text-left flex-1 overflow-hidden">
                  <h3 className="font-extrabold text-sm md:text-base text-gray-800 whitespace-normal break-words leading-tight mb-1" style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'` }}>
                    ประวัติทั้งหมด
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 whitespace-normal break-words leading-snug">ดูประวัติธุรกรรมทั้งหมด</p>
                </div>
              </Link>
              <Link
                href="/guildloan"
                className="rounded-2xl p-5 shadow-sm border border-blue-100 bg-gradient-to-br from-blue-50 to-white flex flex-row items-center gap-4 min-h-[120px] h-auto w-full transition-all duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-blue-200/40 focus-visible:ring-4 focus-visible:ring-blue-300/60"
              >
                <div className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-xl bg-blue-100 text-blue-500 text-2xl shadow flex-shrink-0">
                  <span>🤝</span>
                </div>
                <div className="text-left flex-1 overflow-hidden">
                  <h3 className="font-extrabold text-sm md:text-base text-gray-800 whitespace-normal break-words leading-tight mb-1" style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'` }}>
                    กู้ยืมจากกิลด์
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 whitespace-normal break-words leading-snug">ขอสินเชื่อจากกิลด์</p>
                </div>
              </Link>
              <Link
                href="/mypage/transaction"
                className="rounded-2xl p-5 shadow-sm border border-purple-100 bg-gradient-to-br from-purple-50 to-white flex flex-row items-center gap-4 min-h-[120px] h-auto w-full relative transition-all duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-purple-200/40 focus-visible:ring-4 focus-visible:ring-purple-300/60"
              >
                <div className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-xl bg-purple-100 text-purple-500 text-2xl shadow flex-shrink-0">
                  <span>👤</span>
                </div>
                <div className="text-left flex-1 overflow-hidden">
                  <h3 className="font-extrabold text-sm md:text-base text-gray-800 whitespace-normal break-words leading-tight mb-1" style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'` }}>
                    ธุรกรรมของฉัน
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 whitespace-normal break-words leading-snug">ดูประวัติธุรกรรมส่วนตัว</p>
                </div>
                {pendingReturnCount > 0 && (
                  <span className="absolute top-3 right-4 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 z-10">
                    {pendingReturnCount}
                  </span>
                )}
              </Link>
              {user && (
                <>
                  {isRegistered ? (
                    <Link
                      href="/trade/mystore"
                      className="rounded-2xl p-5 shadow-sm border border-green-100 bg-gradient-to-br from-green-50 to-white flex flex-row items-center gap-4 min-h-[120px] h-auto w-full transition-all duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-green-200/40 focus-visible:ring-4 focus-visible:ring-green-300/60"
                    >
                      <div className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-xl bg-green-100 text-green-500 text-2xl shadow flex-shrink-0">
                        <span>🏬</span>
                      </div>
                      <div className="text-left flex-1 overflow-hidden">
                        <h3 className="font-extrabold text-sm md:text-base text-gray-800 whitespace-normal break-words leading-tight mb-1" style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'` }}>
                          ร้านค้าของฉัน
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 whitespace-normal break-words leading-snug">จัดการร้านค้าของคุณ</p>
                      </div>
                    </Link>
                  ) : (
                    <Link
                      href="/trade/register"
                      className="rounded-2xl p-5 shadow-sm border border-green-100 bg-gradient-to-br from-green-50 to-white flex flex-row items-center gap-4 min-h-[120px] h-auto w-full transition-all duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:ring-4 hover:ring-green-200/40 focus-visible:ring-4 focus-visible:ring-green-300/60"
                    >
                      <div className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-xl bg-green-100 text-green-500 text-2xl shadow flex-shrink-0">
                        <span>📝</span>
                      </div>
                      <div className="text-left flex-1 overflow-hidden">
                        <h3 className="font-extrabold text-sm md:text-base text-gray-800 whitespace-normal break-words leading-tight mb-1" style={{ fontFamily: `'Noto Sans Thai', 'Prompt', 'Sarabun', 'Kanit', 'sans-serif'` }}>
                          สมัครเป็นพ่อค้า
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 whitespace-normal break-words leading-snug">เริ่มต้นขายสินค้าและบริการ</p>
                      </div>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* รายการร้านค้า */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-extrabold flex items-center gap-3 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow">
                <Store className="w-7 h-7 text-pink-500" />
                ร้านค้าพ่อค้าทั้งหมด
              </h2>
              <input
                type="text"
                value={merchantSearch}
                onChange={e => setMerchantSearch(e.target.value)}
                placeholder="ค้นหาร้านค้า..."
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent text-gray-700 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-4">
              {merchants.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
                  <p className="text-gray-500">ยังไม่มีร้านเปิดให้บริการในขณะนี้</p>
                </div>
              ) : (
                merchants
                  .filter(merchant =>
                    merchantSearch.trim() === '' ||
                    (merchant.discord || '').toLowerCase().includes(merchantSearch.trim().toLowerCase())
                  )
                  .slice()
                  .sort((a, b) => {
                    const priceA = merchantLatestTrade[a.id]?.pricePer100 ? merchantLatestTrade[a.id].pricePer100 / 100 : Infinity;
                    const priceB = merchantLatestTrade[b.id]?.pricePer100 ? merchantLatestTrade[b.id].pricePer100 / 100 : Infinity;
                    return priceA - priceB;
                  })
                  .map((merchant, index) => (
                    <Link
                      key={merchant.id}
                      href={`/trade/${merchant.id}`}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl p-6 shadow-md border-2 border-pink-200 hover:border-pink-400 hover:shadow-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-blue-600">{merchant.discord || '-'}</h3>
                            {merchant.createdAt && Date.now() - merchant.createdAt < 1000 * 60 * 60 * 24 * 7 && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">ร้านใหม่</span>
                            )}
                          </div>
                          <a
                            href={`https://discord.com/users/${merchant.discordId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 h-9 px-3 rounded-md bg-sky-50 border border-sky-100 hover:bg-sky-100 text-sky-600 hover:text-sky-700 transition-colors font-medium text-sm shadow-sm"
                            onClick={e => e.stopPropagation()}
                            title="DM"
                          >
                            <MessageSquare className="w-5 h-5" />
                            <span className="font-medium text-sm">DM</span>
                          </a>
                        </div>
                        {merchantLatestTrade[merchant.id]?.advertisement && (
                          <div className="mt-2 mb-3">
                            <p className="text-sm text-gray-600 italic flex items-start gap-2 break-words whitespace-pre-line sm:text-sm text-xs">
                              <span className="text-gray-400 mt-0.5">📝</span>
                              <span className="flex-1 break-words whitespace-pre-line overflow-hidden text-ellipsis">{merchantLatestTrade[merchant.id].advertisement}</span>
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <PiggyBank className="w-5 h-5 text-yellow-500" />
                          <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg shadow">
                            Gold คงเหลือ: {merchantGoldLeft[merchant.id] !== undefined ? merchantGoldLeft[merchant.id] : 0}G
                          </span>
                          {merchantLatestTrade[merchant.id]?.pricePer100 && (
                            <span className="font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-lg shadow">
                              ราคา: {merchantLatestTrade[merchant.id].pricePer100} บาท/1G
                            </span>
                          )}
                        </div>
                        {merchantItems[merchant.id] && merchantItems[merchant.id].length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm text-gray-500 font-semibold mb-1 flex items-center gap-1">
                              <Package className="w-4 h-4 text-pink-400" /> สินค้าและบริการ:
                            </div>
                            <ul className="flex flex-wrap gap-2">
                              {merchantItems[merchant.id].slice(0, 3).map((item, idx) => (
                                <li key={idx} className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-1 rounded-full text-xs">
                                  <Package className="w-3 h-3" />
                                  {item.itemName}
                                  <span className="text-gray-400 ml-1">({item.price}G)</span>
                                </li>
                              ))}
                              {merchantItems[merchant.id].length > 3 && (
                                <li className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                  + อีก {merchantItems[merchant.id].length - 3} รายการ
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    </Link>
                  ))
              )}
            </div>
          </div>

          {/* รายการไอเทมที่ขาย */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-extrabold flex items-center gap-3 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow">
                <ShoppingBag className="w-7 h-7 text-pink-500" />
                สินค้าและบริการ
              </h2>
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="ค้นหาสินค้าและบริการ..."
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-gray-700 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-4">
              {Object.values(merchantItems).flat().length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
                  <p className="text-gray-500">ยังไม่มีไอเทมที่ขายในขณะนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(merchantItems)
                    .flat()
                    .filter(item =>
                      itemSearch.trim() === '' ||
                      (item.itemName || '').toLowerCase().includes(itemSearch.trim().toLowerCase())
                    )
                    .sort((a, b) => {
                      if (a.status === 'sold' && b.status !== 'sold') return 1;
                      if (a.status !== 'sold' && b.status === 'sold') return -1;
                      return b.createdAt - a.createdAt;
                    })
                    .map((item, index) => (
                      <Link
                        key={item.id}
                        href={`/trade/${item.merchantId}`}
                        className="block"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-white rounded-lg p-3 shadow-md border-2 ${item.status === 'sold' ? 'border-gray-200' : 'border-pink-200'} hover:shadow-lg transition-all h-full cursor-pointer`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <ShoppingBag className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-sm font-bold text-emerald-600 flex-1 line-clamp-2 break-all">{item.itemName}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-pink-100 text-pink-600'} font-bold shadow`}>
                              {item.price}G
                            </span>
                            {item.status === 'sold' && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-800 font-bold shadow">ติดจอง</span>
                            )}
                            {item.createdAt && Date.now() - item.createdAt < 1000 * 60 * 60 * 3 && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">ใหม่</span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-1 text-xs line-clamp-2 break-all">{item.description}</p>
                          <div className="flex justify-end">
                            <a
                              href={`https://discord.com/users/${item.merchantId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 h-8 px-2 rounded-md bg-sky-50 border border-sky-100 hover:bg-sky-100 text-sky-600 hover:text-sky-700 transition-colors font-medium text-xs shadow-sm"
                              onClick={e => e.stopPropagation()}
                              title="DM"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span className="font-medium text-xs">DM</span>
                            </a>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeDashboardPage; 