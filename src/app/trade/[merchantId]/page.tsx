'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, ShoppingCart, History, DollarSign, ShoppingBag, Store, Coins, Banknote, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useSearchParams } from 'next/navigation';
import { FaDiscord } from 'react-icons/fa';
import { FeedService } from '@/lib/feedService';

export default function MerchantShopPage({ params }: { params: { merchantId: string } }) {
  const { user, discordName } = useAuth();
  const [merchant, setMerchant] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyingTrade, setBuyingTrade] = useState<any>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanDueTime, setLoanDueTime] = useState('');
  const [isLoaning, setIsLoaning] = useState(false);
  const searchParams = useSearchParams();
  const [pendingBuy, setPendingBuy] = useState<any | null>(null);

  useEffect(() => {
    const merchantRef = ref(db, `tradeMerchants/${params.merchantId}`);
    const tradesRef = ref(db, 'trade');
    const itemsRef = ref(db, 'tradeItems');

    const unsubscribeMerchant = onValue(merchantRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMerchant({ id: params.merchantId, ...data });
      }
    });

    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val();
      const tradesList = data ? Object.entries(data)
        .map(([id, trade]: [string, any]) => ({
          id,
          ...trade,
          confirms: trade.confirms || {}
        }))
        .filter((trade) => trade.merchantId === params.merchantId && trade.status === 'open')
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setTrades(tradesList);
    });

    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      const itemsList = data ? Object.entries(data)
        .map(([id, item]: [string, any]) => ({
          id,
          ...item
        }))
        .filter((item) => item.merchantId === params.merchantId)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setItems(itemsList);
    });

    return () => {
      unsubscribeMerchant();
      unsubscribeTrades();
      unsubscribeItems();
    };
  }, [params.merchantId]);

  useEffect(() => {
    const buyId = searchParams.get('buy');
    if (buyId && trades.length > 0) {
      const tradeToBuy = trades.find(t => t.id === buyId);
      if (tradeToBuy) {
        setBuyingTrade(tradeToBuy);
        setBuyAmount('');
        setShowBuyDialog(true);
      }
    }
  }, [searchParams, trades]);

  // Subscribe pending buy confirm ของ user ปัจจุบัน
  useEffect(() => {
    if (!user) return;
    // subscribe ทุก trade ของร้านนี้
    const unsubscribes: (() => void)[] = [];
    trades.forEach(trade => {
      const confirmsRef = ref(db, `trade/${trade.id}/confirms`);
      const unsubscribe = onValue(confirmsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data[user.uid] && data[user.uid].status === 'waiting') {
          setPendingBuy({
            tradeId: trade.id,
            amount: data[user.uid].amount,
            pricePer100: trade.pricePer100,
            merchantName: merchant?.discordName || merchant?.name || '',
            createdAt: data[user.uid].confirmedAt,
            status: data[user.uid].status
          });
        } else {
          setPendingBuy(null);
        }
      });
      unsubscribes.push(unsubscribe);
    });
    return () => { unsubscribes.forEach(unsub => unsub()); };
  }, [user, trades, merchant]);

  // ฟังก์ชันยกเลิกการซื้อ
  const handleCancelBuy = async () => {
    if (!pendingBuy || !user) return;
    try {
      const confirmRef = ref(db, `trade/${pendingBuy.tradeId}/confirms/${user.uid}`);
      await remove(confirmRef);
      toast.success('ยกเลิกรายการซื้อแล้ว');
      setPendingBuy(null);
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการยกเลิก');
    }
  };

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลร้านค้า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Merchant Info Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-indigo-50 via-pink-50 to-purple-50 rounded-2xl shadow-lg border border-pink-100 px-8 py-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center bg-[#5865F2] text-white rounded-full w-12 h-12 shadow-md">
                <FaDiscord className="w-7 h-7" />
              </span>
              <h1 className="text-3xl font-extrabold text-[#5865F2] drop-shadow-sm tracking-wide">
                {merchant.discordName || merchant.discord_name || merchant.discord || merchant.name || merchant.displayName || 'ไม่พบชื่อ Discord'}
              </h1>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <a
                href={`https://discord.com/users/${merchant.discordId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors flex items-center space-x-2 border border-pink-200"
              >
                <MessageSquare className="w-5 h-5" />
                <span>DM</span>
              </a>
              <button
                onClick={() => setShowLoanDialog(true)}
                className="px-4 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-600 transition-colors flex items-center space-x-2 border border-yellow-200"
              >
                <DollarSign className="w-5 h-5 text-yellow-500" />
                <span>ขอกู้ยืม</span>
              </button>
              <Link
                href={`/trade/${merchant.id}/feed`}
                className="px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors flex items-center space-x-2 border border-purple-200"
              >
                <History className="w-5 h-5" />
                <span>ดูประวัติร้าน</span>
              </Link>
            </div>
          </div>
          <div className="mt-2 md:mt-4">
            {merchant.advertisement && (
              <p className="text-gray-600 italic flex items-center gap-2"><Banknote className="w-4 h-4 text-pink-400" />{merchant.advertisement}</p>
            )}
            {merchant.goldLeft ? (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" />Gold ที่มี: {merchant.goldLeft}G</p>
            ) : null}
          </div>
        </motion.div>

        {/* Gold ที่ขาย */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-pink-600">Gold ที่ขาย</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trades.length > 0 ? trades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-pink-100 flex flex-col gap-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-gray-800 flex-1">
                    Gold ที่ขาย: <span className='text-yellow-600 font-bold'>{trade.amountLeft}G</span>
                  </h3>
                  <span className="px-2 py-1 text-sm rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200 font-bold">{trade.pricePer100} บาท/1G</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setBuyingTrade(trade);
                      setBuyAmount('');
                      setShowBuyDialog(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors border border-pink-200"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>กดซื้อ</span>
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100 col-span-2">
                <p className="text-gray-500">ยังไม่มีรายการ Gold ที่ขาย</p>
              </div>
            )}
          </div>
        </div>

        {/* ไอเทมที่ขาย */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-purple-600">สินค้าและบริการ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.length > 0 ? items
              .slice()
              .sort((a, b) => {
                if (a.status === 'sold' && b.status !== 'sold') return 1;
                if (a.status !== 'sold' && b.status === 'sold') return -1;
                return b.createdAt - a.createdAt;
              })
              .map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "bg-white rounded-xl p-6 shadow-sm border flex flex-col gap-2",
                  item.status === 'sold' ? 'border-gray-200' : 'border-pink-100'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-pink-400" />
                  <h3 className="text-lg font-semibold text-green-600 flex-1">{item.itemName}</h3>
                  <span className={`px-2 py-1 text-sm rounded-full ${item.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-pink-100 text-pink-600'}`}>{item.price}G</span>
                  {item.status === 'sold' && (
                    <span className="px-2 py-1 text-sm rounded-full bg-gray-100 text-gray-800">ติดจอง</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-gray-600 mb-2">{item.description}</p>
                )}
                {item.status === 'available' && (
                  <div className="flex justify-end">
                    <a
                      href={`https://discord.com/users/${merchant.discordId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-4 py-0 flex items-center justify-center rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-600 transition-colors border border-pink-200"
                    >
                      <MessageSquare className="w-5 h-5 mr-1" /> DM
                    </a>
                  </div>
                )}
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100 col-span-2">
                <p className="text-gray-500">ยังไม่มีรายการไอเทมที่ขาย</p>
              </div>
            )}
          </div>
        </div>

        {/* Dialog popup ยืนยันการซื้อ Gold */}
        <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
          <DialogContent className="bg-white/90 rounded-2xl shadow-2xl border border-pink-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-pink-600">ยืนยันการซื้อ Gold</DialogTitle>
              <DialogDescription className="text-gray-500">กรอกจำนวน Gold ที่ต้องการซื้อและตรวจสอบราคาก่อนยืนยัน</DialogDescription>
            </DialogHeader>
            {buyingTrade && (
              <div className="space-y-4">
                <div className="flex justify-between gap-2">
                  <div className="bg-pink-50 rounded-lg p-3 flex-1 text-center">
                    <div className="text-xs text-gray-500">Gold ที่เหลือ</div>
                    <div className="text-lg font-bold text-pink-600">{buyingTrade.amountLeft}G</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex-1 text-center">
                    <div className="text-xs text-gray-500">ราคาต่อ 1G</div>
                    <div className="text-lg font-bold text-purple-600">{buyingTrade.pricePer100} บาท</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน Gold ที่ต้องการซื้อ</label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={e => setBuyAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white"
                    placeholder="เช่น 300"
                    min={1}
                    max={buyingTrade.amountLeft}
                  />
                  {buyAmount && !isNaN(Number(buyAmount)) && (
                    <div className="text-right text-pink-600 font-semibold mt-2">
                      ราคาที่ต้องจ่าย: {Number(buyAmount) * buyingTrade.pricePer100} บาท
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  disabled={isBuying}
                >
                  ยกเลิก
                </button>
              </DialogClose>
              <button
                onClick={async () => {
                  if (!user || !buyingTrade || !buyAmount) return;
                  const amountNum = parseInt(buyAmount);
                  if (isNaN(amountNum) || amountNum <= 0) {
                    toast.error('กรุณากรอกจำนวน Gold ที่ต้องการซื้อ');
                    return;
                  }
                  if (amountNum > buyingTrade.amountLeft) {
                    toast.error('จำนวน Gold ที่ต้องการซื้อมากกว่าที่มีอยู่');
                    return;
                  }
                  setIsBuying(true);
                  try {
                    // Create confirmation
                    const confirmsRef = ref(db, `trade/${buyingTrade.id}/confirms`);
                    const newConfirmRef = push(confirmsRef);
                    await set(newConfirmRef, {
                      buyerId: user.uid,
                      buyerName: discordName || '',
                      amount: amountNum,
                      status: 'waiting',
                      confirmedAt: Date.now(),
                      buyerDiscord: discordName || ''
                    });

                    // Create feed notification for merchant
                    await FeedService.addTradeFeed(
                      buyingTrade.merchantId,
                      discordName || '',
                      amountNum,
                      merchant.discordName || merchant.discord || merchant.name || merchant.displayName || '',
                      discordName || '',
                      merchant.discordName || merchant.discord || merchant.name || merchant.displayName || ''
                    );

                    toast.success('รอการยืนยันจากพ่อค้า');
                    setShowBuyDialog(false);
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาดในการยืนยัน');
                  } finally {
                    setIsBuying(false);
                  }
                }}
                disabled={isBuying || !buyAmount}
                className={cn(
                  'px-4 py-2 rounded-lg text-white font-bold transition-colors',
                  isBuying || !buyAmount
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500'
                )}
              >
                {isBuying ? 'กำลังยืนยัน...' : 'ยืนยันการซื้อ'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog popup ยืนยันการกู้ยืม Gold */}
        <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
          <DialogContent className="bg-white/90 rounded-2xl shadow-2xl border border-yellow-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-yellow-600">ยืนยันการขอกู้ยืม Gold</DialogTitle>
              <DialogDescription className="text-gray-500">กรอกจำนวน Gold ที่ต้องการกู้ยืมและกำหนดวันคืน (ถ้ามี)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน Gold ที่ต้องการกู้ยืม</label>
              <input
                type="number"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                placeholder="เช่น 300"
                min={1}
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ครบกำหนดคืน (ไม่บังคับ)</label>
              <input
                type="date"
                value={loanDueDate}
                onChange={e => setLoanDueDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
              />
              <DialogFooter>
                <DialogClose asChild>
                  <button
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    disabled={isLoaning}
                  >
                    ยกเลิก
                  </button>
                </DialogClose>
                <button
                  onClick={async () => {
                    if (!user || !merchant || !loanAmount) return;
                    const amountNum = parseInt(loanAmount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                      toast.error('กรุณากรอกจำนวน Gold ที่ต้องการกู้ยืม');
                      return;
                    }
                    setIsLoaning(true);
                    try {
                      const loansRef = ref(db, 'merchantLoans');
                      const newLoanRef = push(loansRef);
                      const loanId = newLoanRef.key;
                      let dueDateString = undefined;
                      if (loanDueDate) {
                        dueDateString = loanDueDate;
                        if (loanDueTime) dueDateString += 'T' + loanDueTime;
                      }
                      const loanData = {
                        loanId,
                        amount: amountNum,
                        status: 'waitingApproval' as 'waitingApproval',
                        source: {
                          type: 'merchant' as 'merchant',
                          merchantId: merchant.id
                        },
                        borrower: {
                          discordId: user.uid,
                          name: discordName || ''
                        },
                        dueDate: dueDateString,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                      };
                      await set(newLoanRef, loanData);
                      await FeedService.addLoanFeed(loanData, 'create', user.uid);
                      toast.success('ส่งคำขอกู้ยืมสำเร็จ');
                      setShowLoanDialog(false);
                      setLoanDueDate('');
                      setLoanDueTime('');
                      setLoanAmount('');
                    } catch (error) {
                      toast.error('เกิดข้อผิดพลาดในการขอกู้ยืม');
                    } finally {
                      setIsLoaning(false);
                    }
                  }}
                  disabled={isLoaning || !loanAmount}
                  className={cn(
                    'px-4 py-2 rounded-lg text-white font-bold transition-colors',
                    isLoaning || !loanAmount
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-400 to-pink-400 hover:from-yellow-500 hover:to-pink-500'
                  )}
                >
                  {isLoaning ? 'กำลังส่งคำขอ...' : 'ยืนยันการกู้ยืม'}
                </button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Overlay รายการซื้อที่รอยืนยัน */}
        {pendingBuy && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-50 border border-yellow-300 rounded-xl shadow-lg px-6 py-4 flex items-center gap-4 animate-fade-in">
            <Coins className="w-7 h-7 text-yellow-400" />
            <div className="flex flex-col">
              <span className="font-bold text-yellow-700">รอการยืนยันจากพ่อค้า</span>
              <span className="text-sm text-gray-700">จำนวน: <b>{pendingBuy.amount}G</b> | ราคา: <b>{pendingBuy.pricePer100} บาท/1G</b></span>
              <span className="text-xs text-gray-500">ร้าน: {pendingBuy.merchantName}</span>
              <span className="text-xs text-gray-400">เวลายืนยัน: {new Date(pendingBuy.createdAt).toLocaleString()}</span>
            </div>
            <button onClick={handleCancelBuy} className="ml-4 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold flex items-center gap-1 border border-red-200 transition-all">
              <XCircle className="w-5 h-5" /> ยกเลิกการซื้อ
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 