'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Plus, Check, X, Package, MessageSquare, Copy, Settings, UserPlus, User, KeyRound, DollarSign, Clock, CheckCircle2, XCircle, Crown, ChevronDown, ChevronUp, LogOut, History, Store, ShoppingBag, Edit, Trash2, PlusCircle, ClipboardList, PiggyBank } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, push, set, onValue, update, get, remove } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { FeedService } from '@/lib/feedService';
import Link from 'next/link';

export default function MyStorePage() {
  const { user, loading: authLoading, discordName } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newTrade, setNewTrade] = useState({
    amountTotal: '',
    amountLeft: '',
    pricePer100: '',
    advertisement: ''
  });
  const [newItem, setNewItem] = useState({
    itemName: '',
    description: '',
    price: ''
  });
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [merchantStatus, setMerchantStatus] = useState<'pending' | 'approved' | 'active' | null>(null);
  const [isGuildVerified, setIsGuildVerified] = useState(false);
  const [merchantDesc, setMerchantDesc] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openTrade, setOpenTrade] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteTradeModal, setShowDeleteTradeModal] = useState(false);
  const [isDeletingTrade, setIsDeletingTrade] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [returnedLoans, setReturnedLoans] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;

    const tradesRef = ref(db, 'trade');
    const itemsRef = ref(db, 'tradeItems');

    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val();
      const tradesList = data ? Object.entries(data)
        .map(([id, trade]: [string, any]) => ({
          id,
          ...trade,
          confirms: trade.confirms || {}
        }))
        .filter((trade) => trade.merchantId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setTrades(tradesList);
      const open = tradesList.find((t) => t.status === 'open');
      setOpenTrade(open || null);
    });

    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      const itemsList = data ? Object.entries(data)
        .map(([id, item]: [string, any]) => ({
          id,
          ...item
        }))
        .filter((item) => item.merchantId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setItems(itemsList);
    });

    const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
    get(merchantRef).then(snapshot => {
      setIsRegistered(snapshot.exists());
      setLoading(false);
    });

    // ดึง loan ที่รออนุมัติ
    const loansRef = ref(db, 'merchantLoans');
    const unsubscribeLoans = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      const loansList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({ id, ...loan }))
        .filter(loan => loan.source?.type === 'merchant' && loan.source?.merchantId === user.uid && loan.status === 'waitingApproval')
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setPendingLoans(loansList);
    });

    // ดึง loan ที่แจ้งคืนเงินแล้ว
    const merchantLoansRef = ref(db, 'merchantLoans');
    const unsubscribeReturnedLoans = onValue(merchantLoansRef, (snapshot) => {
      const data = snapshot.val();
      const returnedList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({ id, ...loan }))
        .filter(loan => loan.source?.type === 'merchant' && loan.source?.merchantId === user.uid && loan.status === 'returned')
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setReturnedLoans(returnedList);
    });

    // ดึง loan ที่ยังไม่ได้เงินคืน (active)
    const unsubscribeActiveLoans = onValue(merchantLoansRef, (snapshot) => {
      const data = snapshot.val();
      const activeList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({ id, ...loan }))
        .filter(loan => loan.source?.type === 'merchant' && loan.source?.merchantId === user.uid && loan.status === 'active')
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setActiveLoans(activeList);
    });

    return () => {
      unsubscribeTrades();
      unsubscribeItems();
      unsubscribeLoans();
      unsubscribeReturnedLoans();
      unsubscribeActiveLoans();
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
    get(merchantRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMerchantStatus(data.status);
        setIsGuildVerified(!!data.isGuildVerified);
        setMerchantDesc(data.description || '');
      }
    });
  }, [user, isRegistered]);

  const handleCreateTrade = async () => {
    if (!user) return;

    try {
      const tradeRef = ref(db, 'trade');
      const newTradeRef = push(tradeRef);
      
      await set(newTradeRef, {
        merchantId: user.uid,
        merchantName: discordName || '',
        amountTotal: parseInt(newTrade.amountLeft),
        amountLeft: parseInt(newTrade.amountLeft),
        pricePer100: parseFloat(newTrade.pricePer100),
        status: 'open',
        advertisement: newTrade.advertisement,
        createdAt: Date.now()
      });

      setIsCreating(false);
      setNewTrade({ amountLeft: '', amountTotal: '', pricePer100: '', advertisement: '' });
      toast.success('สร้างรายการขายสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการสร้างรายการ');
    }
  };

  const handleCreateItem = async () => {
    if (!user) return;

    try {
      const itemsRef = ref(db, 'tradeItems');
      const newItemRef = push(itemsRef);
      
      await set(newItemRef, {
        merchantId: user.uid,
        merchantName: discordName || '',
        itemName: newItem.itemName,
        description: newItem.description,
        price: parseInt(newItem.price),
        status: 'available',
        createdAt: Date.now()
      });

      setIsCreatingItem(false);
      setNewItem({ itemName: '', description: '', price: '' });
      toast.success('เพิ่มไอเทมสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มไอเทม');
    }
  };

  const handleConfirmTrade = async (tradeId: string, buyerId: string) => {
    if (!user) return;
    try {
      const confirmRef = ref(db, `trade/${tradeId}/confirms/${buyerId}`);
      const tradeRef = ref(db, `trade/${tradeId}`);
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) {
        toast.error('ไม่พบรายการขาย');
        return;
      }
      const confirm: any = trade.confirms[buyerId];
      if (!confirm) {
        toast.error('ไม่พบรายการยืนยัน');
        return;
      }
      if (confirm.status !== 'waiting') {
        toast.error('รายการนี้ได้รับการยืนยันแล้ว');
        return;
      }
      // Update confirm status
      await update(confirmRef, { status: 'done' });
      // Update trade amount
      const newAmountLeft = trade.amountLeft - confirm.amount;
      await update(tradeRef, {
        amountLeft: newAmountLeft,
        status: newAmountLeft <= 0 ? 'closed' : 'open'
      });
      // Create feed notification (done)
      await FeedService.addTradeCompleteFeed(
        trade.merchantId,
        confirm.buyerName || '',
        confirm.amount,
        trade.merchantName || '',
        confirm.buyerDiscord || '',
        trade.discordName || trade.merchantDiscord || trade.merchantName || ''
      );
      toast.success('ยืนยันการซื้อขายสำเร็จ');
    } catch (error) {
      console.error('Error confirming trade:', error);
      toast.error('เกิดข้อผิดพลาดในการยืนยัน');
    }
  };

  const handleCancelConfirmTrade = async (tradeId: string, buyerId: string) => {
    try {
      const confirmRef = ref(db, `trade/${tradeId}/confirms/${buyerId}`);
      await update(confirmRef, { status: 'cancelled' });
      toast.success('ยกเลิกรายการสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการยกเลิก');
    }
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: 'available' | 'sold') => {
    try {
      const itemRef = ref(db, `tradeItems/${itemId}`);
      await update(itemRef, { status: newStatus });
      toast.success(`อัปเดตสถานะไอเทมเป็น ${newStatus === 'sold' ? 'ขายแล้ว' : 'พร้อมขาย'}`);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleEditTrade = async () => {
    if (!user || !openTrade) return;
    try {
      const tradeRef = ref(db, `trade/${openTrade.id}`);
      await update(tradeRef, {
        amountTotal: parseInt(newTrade.amountTotal),
        amountLeft: newTrade.amountLeft !== '' ? parseInt(newTrade.amountLeft) : openTrade.amountLeft,
        pricePer100: parseFloat(newTrade.pricePer100),
        advertisement: newTrade.advertisement
      });
      setIsCreating(false);
      setIsEditing(false);
      toast.success('แก้ไขรายการขายสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไขรายการขาย');
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-8 w-full max-w-md text-center"
        >
          <h2 className="text-2xl font-bold text-pink-600 mb-2">คุณยังไม่ได้ลงทะเบียนเป็นพ่อค้า</h2>
          <p className="text-gray-500 mb-4">กรุณาลงทะเบียนก่อนจึงจะสามารถใช้งานฟีเจอร์นี้ได้</p>
          <button
            onClick={() => router.push('/trade/register')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold shadow hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            ไปที่หน้าลงทะเบียน
          </button>
        </motion.div>
      </div>
    );
  }

  if (merchantStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-8 w-full max-w-md text-center"
        >
          <h2 className="text-2xl font-bold text-pink-600 mb-2">รอการอนุมัติจากหัวกิลด์</h2>
          <p className="text-gray-500 mb-4">ร้านค้าของคุณกำลังรอการอนุมัติจากหัวกิลด์ กรุณารอ...</p>
        </motion.div>
      </div>
    );
  }

  if (merchantStatus === 'approved') {
    // แสดงหน้าร้านค้าของตัวเอง พร้อมป้ายรับรอง ปุ่มยกเลิกการเป็นพ่อค้า และแท็บ feed ส่วนตัว
    const [activeTab, setActiveTab] = useState<'trade' | 'loan'>('trade');
    const [feed, setFeed] = useState<any[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);

    useEffect(() => {
      if (!user) return;
      setFeedLoading(true);
      const feedRef = ref(db, `feed/merchant/${user.uid}/${activeTab}`);
      const unsubscribe = onValue(feedRef, (snapshot) => {
        const data = snapshot.val();
        const feedList = data ? Object.entries(data)
          .map(([id, item]: [string, any]) => ({ id, ...item }))
          .sort((a, b) => b.timestamp - a.timestamp) : [];
        setFeed(feedList);
        setFeedLoading(false);
      });
      return () => unsubscribe();
    }, [user, activeTab]);

    return (
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-pink-50 to-purple-50 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-8 w-full max-w-2xl mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-pink-600 mb-1">ร้านค้าของฉัน <span className="ml-2 text-green-500 text-lg">✅ รับรอง</span></h2>
              <div className="text-gray-700 font-semibold">{merchantDesc}</div>
            </div>
            <Link
              href={`/trade/${user?.uid}/feed`}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-bold shadow hover:from-purple-200 hover:to-pink-200 transition-all flex items-center gap-2"
            >
              <History className="w-5 h-5" />
              <span>ดูประวัติร้านค้า</span>
            </Link>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('trade')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'trade' ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-pink-50'}`}
            >
              Feed ซื้อขาย
            </button>
            <button
              onClick={() => setActiveTab('loan')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'loan' ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}
            >
              Feed กู้ยืม
            </button>
          </div>
          <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-4 min-h-[180px]">
            {feedLoading ? (
              <div className="text-center py-8 text-gray-400">กำลังโหลด feed...</div>
            ) : feed.length === 0 ? (
              <div className="text-center py-8 text-gray-400">ยังไม่มีข้อมูลใน feed นี้</div>
            ) : (
              <ul className="space-y-2">
                {feed.map((item) => (
                  <li key={item.id} className="p-3 rounded-lg bg-pink-50 text-gray-700 shadow-sm">
                    <span className="font-semibold">{new Date(item.timestamp).toLocaleString('th-TH')}</span> — {item.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-gradient-to-r from-pink-100 via-yellow-50 to-purple-100 shadow-lg border-2 border-pink-200">
            <Store className="w-10 h-10 text-pink-500 drop-shadow" />
            <div>
              <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-yellow-500 to-orange-500 drop-shadow mb-1 flex items-center gap-2">ร้านค้าของฉัน</h1>
              <p className="text-lg text-gray-700 font-medium flex items-center gap-2"><ClipboardList className="w-5 h-5 text-purple-400" /> จัดการรายการขาย Gold และไอเทม</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gold Trade Section */}
          <div className="bg-white/80 rounded-2xl shadow-xl border border-pink-100 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-8 h-8 text-yellow-500 drop-shadow" />
              <h2 className="text-2xl font-bold text-yellow-700 flex items-center gap-2">การขาย Gold <span className="ml-2"><Clock className="w-5 h-5 text-yellow-400" /></span></h2>
            </div>
            <div className="flex justify-between items-center mb-6">
              {!openTrade && !isCreating && (
                <motion.button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-yellow-400 text-white font-bold shadow-lg hover:from-pink-500 hover:to-yellow-500 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> สร้างรายการขายใหม่
                </motion.button>
              )}
            </div>

            {openTrade && !isEditing ? (
              <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-pink-100 relative">
                <button
                  onClick={() => {
                    const message = `:tada: ขาย Gold DN Classic sv.Geriant (G) :tada:\n:moneybag: จำนวน: ${openTrade.amountLeft}G\n:dollar: ราคาต่อ 1G: ${openTrade.pricePer100} บาท\n:shopping_cart: ร้านค้า: https://dnpartylist.vercel.app/trade/${openTrade.merchantId}?buy=${openTrade.id}\n:envelope_with_arrow: สนใจทักแชทหรือกดลิงก์เพื่อซื้อได้เลย!`;
                    navigator.clipboard.writeText(message);
                    toast.success('คัดลอกข้อความสำเร็จ');
                  }}
                  className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center shadow font-semibold text-sm"
                  title="คัดลอกรายละเอียด"
                >
                  <Copy className="w-5 h-5 mr-1" />
                  คัดลอก
                </button>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">เหลือ:</span>
                    <span className="text-lg font-bold text-pink-600">{openTrade.amountLeft}G</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">ราคาต่อ 1G:</span>
                    <span className="text-lg font-bold text-yellow-600">{openTrade.pricePer100} บาท</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">ข้อความโฆษณา:</span>
                    <span className="text-gray-600 break-all">{openTrade.advertisement}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setNewTrade({
                        amountTotal: openTrade.amountTotal.toString(),
                        amountLeft: openTrade.amountLeft.toString(),
                        pricePer100: openTrade.pricePer100.toString(),
                        advertisement: openTrade.advertisement || ''
                      });
                      setIsEditing(true);
                    }}
                    className="px-6 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-bold transition-colors shadow"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => setShowDeleteTradeModal(true)}
                    className="px-6 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-bold transition-colors shadow"
                  >
                    ลบ
                  </button>
                </div>
                {/* เพิ่มส่วนแสดงรายการรอยืนยันใน openTrade */}
                {openTrade.confirms && Object.entries(openTrade.confirms).filter(([_, confirm]: [string, any]) => confirm.status === 'waiting').length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">รายการรอยืนยัน</h4>
                    {Object.entries(openTrade.confirms)
                      .filter(([_, confirm]: [string, any]) => confirm.status === 'waiting')
                      .map(([buyerId, confirm]: [string, any]) => (
                        <div key={buyerId} className="mb-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 shadow flex items-center gap-3">
                          <Clock className="w-6 h-6 text-yellow-400 mr-2" />
                          <div className="flex-1">
                            <p className="font-medium flex items-center gap-1"><UserPlus className="w-4 h-4 text-blue-400" /> @{confirm.buyerDiscord || confirm.buyerName}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1"><Package className="w-4 h-4 text-pink-400" /> จำนวน: <span className="font-bold text-yellow-700">{confirm.amount}G</span></p>
                            <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" /> ยืนยันเมื่อ: {new Date(confirm.confirmedAt).toLocaleString()}</p>
                            <div className="mt-2 text-sm flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded"><DollarSign className="w-4 h-4" /> เรทราคา: <span className="font-bold text-yellow-600">{openTrade.pricePer100} บาท/1G</span></span>
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded"><CheckCircle2 className="w-4 h-4" /> จำนวนเงินที่ต้องได้รับ: <span className="font-bold text-green-600">{(confirm.amount * openTrade.pricePer100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span></span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleConfirmTrade(openTrade.id, buyerId)}
                              className="px-3 py-1 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors flex items-center gap-1 shadow"
                            >
                              <Check className="w-4 h-4" /> ยืนยัน
                            </button>
                            <button
                              onClick={() => handleCancelConfirmTrade(openTrade.id, buyerId)}
                              className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1 shadow"
                            >
                              <X className="w-4 h-4" /> ยกเลิก
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : null}

            {(isCreating || isEditing) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-pink-100"
              >
                <h3 className="text-lg font-semibold mb-4">{isEditing ? 'แก้ไขรายการขาย Gold' : 'สร้างรายการขายใหม่'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวน Gold ที่ขาย (G)
                    </label>
                    <input
                      type="number"
                      value={newTrade.amountLeft}
                      onChange={(e) => setNewTrade({ ...newTrade, amountLeft: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ราคาต่อ 1G
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newTrade.pricePer100}
                      onChange={(e) => setNewTrade({ ...newTrade, pricePer100: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ข้อความโฆษณา
                    </label>
                    <textarea
                      value={newTrade.advertisement}
                      maxLength={50}
                      onChange={(e) => setNewTrade({ ...newTrade, advertisement: e.target.value.slice(0, 50) })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1 text-right">{newTrade.advertisement.length}/50 ตัวอักษร</div>
                  <div className="flex space-x-4">
                    <button
                      onClick={isEditing ? handleEditTrade : handleCreateTrade}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-yellow-400 text-white font-bold shadow-lg hover:from-pink-500 hover:to-yellow-500 transition-all flex items-center gap-2"
                    >
                      {isEditing ? 'บันทึก' : 'สร้างรายการ'}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              {trades
                .filter(trade => !openTrade || trade.id !== openTrade.id)
                .map((trade, index) => (
                  <motion.div
                    key={trade.id}
                    id={`trade-${trade.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "bg-white rounded-xl p-6 shadow-sm border",
                      Object.values(trade.confirms || {}).some((confirm: any) => confirm.status === 'waiting')
                        ? "border-yellow-200"
                        : "border-pink-100"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          รายการขาย #{trade.id.slice(0, 6)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          สร้างเมื่อ: {new Date(trade.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-sm',
                        trade.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {trade.status === 'open' ? 'เปิดขาย' : 'ปิดขาย'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-gray-600">
                        เหลือ: {trade.amountLeft}G
                      </p>
                      <p className="text-gray-600">
                        ราคาต่อ 1G: {trade.pricePer100} บาท
                      </p>
                      <p className="text-gray-600">
                        ข้อความโฆษณา: {trade.advertisement}
                      </p>
                    </div>

                    {/* รายการรอยืนยัน */}
                    {Object.entries(trade.confirms).filter(([_, confirm]: [string, any]) => confirm.status === 'waiting').length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">รายการรอยืนยัน</h4>
                        {Object.entries(trade.confirms)
                          .filter(([_, confirm]: [string, any]) => confirm.status === 'waiting')
                          .map(([buyerId, confirm]: [string, any]) => (
                            <div key={buyerId} className="mb-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 shadow flex items-center gap-3">
                              <Clock className="w-6 h-6 text-yellow-400 mr-2" />
                              <div className="flex-1">
                                <p className="font-medium flex items-center gap-1"><UserPlus className="w-4 h-4 text-blue-400" /> @{confirm.buyerDiscord || confirm.buyerName}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-1"><Package className="w-4 h-4 text-pink-400" /> จำนวน: <span className="font-bold text-yellow-700">{confirm.amount}G</span></p>
                                <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" /> ยืนยันเมื่อ: {new Date(confirm.confirmedAt).toLocaleString()}</p>
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <button
                                  onClick={() => handleConfirmTrade(trade.id, buyerId)}
                                  className="px-3 py-1 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors flex items-center gap-1 shadow"
                                >
                                  <Check className="w-4 h-4" /> ยืนยัน
                                </button>
                                <button
                                  onClick={() => handleCancelConfirmTrade(trade.id, buyerId)}
                                  className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1 shadow"
                                >
                                  <X className="w-4 h-4" /> ยกเลิก
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* ประวัติการยืนยัน */}
                    {Object.entries(trade.confirms).filter(([_, confirm]: [string, any]) => confirm.status === 'done').length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">ประวัติการยืนยัน</h4>
                        {Object.entries(trade.confirms)
                          .filter(([_, confirm]: [string, any]) => confirm.status === 'done')
                          .map(([buyerId, confirm]: [string, any]) => (
                            <div key={buyerId} className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400 shadow flex items-center gap-3">
                              <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                              <div className="flex-1">
                                <p className="font-medium flex items-center gap-1"><User className="w-4 h-4 text-blue-400" /> @{confirm.buyerDiscord || confirm.buyerName}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-1"><Package className="w-4 h-4 text-pink-400" /> จำนวน: <span className="font-bold text-green-700">{confirm.amount}G</span></p>
                                <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" /> ยืนยันเมื่อ: {new Date(confirm.confirmedAt).toLocaleString()}</p>
                              </div>
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> ยืนยันแล้ว</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>

            {/* แจ้งเตือนคำขอกู้ยืม */}
            {pendingLoans.length > 0 && (
              <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-yellow-200">
                <h3 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2">
                  <PiggyBank className="w-6 h-6 text-yellow-500" />
                  แจ้งเตือนคำขอกู้ยืม
                </h3>
                <div className="space-y-4">
                  {pendingLoans.map((loan) => (
                    <div key={loan.id} className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-100 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-gray-800">@{loan.borrower?.name || 'ไม่พบชื่อ Discord'}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 mb-1">
                          <span className="inline-flex items-center gap-1 text-sm text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                            <DollarSign className="w-4 h-4 text-yellow-500" /> {loan.amount}G
                          </span>
                          {loan.dueDate && (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              <Clock className="w-4 h-4 text-gray-400" /> กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                            <Clock className="w-4 h-4 text-gray-300" /> ขอเมื่อ: {new Date(loan.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {loan.note && <div className="text-xs text-gray-500 mt-1">หมายเหตุ: {loan.note}</div>}
                        {loan.collateral && <div className="text-xs text-gray-500 mt-1">หลักประกัน: {loan.collateral}</div>}
                      </div>
                      <div className="flex gap-2 mt-4 md:mt-0">
                        <button
                          onClick={async () => {
                            try {
                              await update(ref(db, `merchantLoans/${loan.id}`), { status: 'active', updatedAt: Date.now() });
                              toast.success('อนุมัติคำขอกู้ยืมสำเร็จ');
                            } catch {
                              toast.error('เกิดข้อผิดพลาดในการอนุมัติ');
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-semibold"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await update(ref(db, `merchantLoans/${loan.id}`), { status: 'rejected', updatedAt: Date.now() });
                              toast.success('ปฏิเสธคำขอกู้ยืมสำเร็จ');
                            } catch {
                              toast.error('เกิดข้อผิดพลาดในการปฏิเสธ');
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* แจ้งเตือนคืนเงินกู้ */}
            {returnedLoans.length > 0 && (
              <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-green-200">
                <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2"><PiggyBank className="w-6 h-6 text-green-500" /> แจ้งเตือนคืนเงินกู้</h3>
                <div className="space-y-4">
                  {returnedLoans.map((loan) => (
                    <div key={loan.id} className="flex flex-col md:flex-row md:items-center md:justify-between bg-green-50 rounded-lg p-4 border border-green-100">
                      <div>
                        <p className="font-semibold text-gray-800">@{loan.borrower?.name || 'ไม่พบชื่อ Discord'}</p>
                        <p className="text-sm text-gray-600">จำนวน: {loan.amount}G</p>
                        {loan.dueDate && <p className="text-sm text-gray-500">กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}</p>}
                        <p className="text-xs text-gray-400">แจ้งคืนเมื่อ: {loan.returnedAt ? new Date(loan.returnedAt).toLocaleString() : '-'}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 md:mt-0">
                        <button
                          onClick={async () => {
                            // ยืนยันคืนเงิน
                            const loanRef = ref(db, `merchantLoans/${loan.id}`);
                            await update(loanRef, { status: 'completed', completedAt: Date.now() });
                            await FeedService.addLoanFeed({ ...loan, status: 'completed', completedAt: Date.now() }, 'complete', user.uid);
                            toast.success('ยืนยันการคืนเงินสำเร็จ');
                          }}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>ยืนยัน</span>
                        </button>
                        <button
                          onClick={async () => {
                            // ยกเลิกคืนเงิน (กลับไป active)
                            const loanRef = ref(db, `merchantLoans/${loan.id}`);
                            await update(loanRef, { status: 'active', returnedAt: null });
                            await FeedService.addLoanFeed({ ...loan, status: 'active', returnedAt: null }, 'active', user.uid);
                            toast.success('ยกเลิกการคืนเงินแล้ว');
                          }}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>ยกเลิก</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* เพิ่ม section แสดงรายการกู้ยืมที่ยังไม่ได้เงินคืน (active) ล่างสุด */}
            {activeLoans.length > 0 && (
              <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-blue-200">
                <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                  <PiggyBank className="w-6 h-6 text-blue-500" />
                  รายการกู้ยืมที่ยังไม่ได้เงินคืน
                </h3>
                <div className="space-y-4">
                  {activeLoans.map((loan) => (
                    <div key={loan.id} className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-100 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold text-gray-800">@{loan.borrower?.name || loan.borrowerDiscord || 'ไม่พบชื่อ Discord'}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 mb-1">
                          <span className="inline-flex items-center gap-1 text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            <DollarSign className="w-4 h-4 text-blue-400" /> {loan.amount}G
                          </span>
                          {loan.dueDate && (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              <Clock className="w-4 h-4 text-gray-400" /> กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                            <Clock className="w-4 h-4 text-gray-300" /> ขอเมื่อ: {new Date(loan.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {loan.note && <div className="text-xs text-gray-500 mt-1">หมายเหตุ: {loan.note}</div>}
                        {loan.collateral && <div className="text-xs text-gray-500 mt-1">หลักประกัน: {loan.collateral}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item Trade Section */}
          <div className="bg-white/80 rounded-2xl shadow-xl border border-purple-100 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-gray-800">สินค้าและบริการ</h2>
            </div>
            <div className="flex justify-between items-center mb-6">
              {!isCreatingItem && (
                <motion.button
                  onClick={() => setIsCreatingItem(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500 transition-all"
                >
                  <Plus className="w-5 h-5 inline-block mr-2" />
                  เพิ่มสินค้าและบริการ
                </motion.button>
              )}
            </div>

            {isCreatingItem ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-pink-100"
              >
                <h3 className="text-lg font-semibold mb-4">เพิ่มไอเทมใหม่</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อไอเทม
                    </label>
                    <input
                      type="text"
                      value={newItem.itemName}
                      onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      คำอธิบาย
                    </label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ราคา (G)
                    </label>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleCreateItem}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500 transition-all"
                    >
                      เพิ่มไอเทม
                    </button>
                    <button
                      onClick={() => setIsCreatingItem(false)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}

            <div className="space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "bg-white rounded-xl p-6 shadow-sm border",
                    item.status === 'sold' ? 'border-gray-200' : 'border-pink-100'
                  )}
                >
                  <div className="flex flex-row">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /> {item.itemName}</h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><DollarSign className="w-4 h-4 text-yellow-400" /> ราคา: <span className="font-bold text-yellow-700">{item.price}G</span></p>
                      <p className="text-gray-600 text-sm mb-4 flex items-center gap-1"><ClipboardList className="w-4 h-4 text-pink-400" /> {item.description}</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const message = `:tada: ขายไอเทม DN Classic sv.Geriant :tada:\n:label: ชื่อไอเทม: ${item.itemName}\n:moneybag: ราคา: ${item.price}G\n:bookmark_tabs: รายละเอียด: ${item.description}\n:shopping_cart: ร้านค้า: https://dnpartylist.vercel.app/trade/${user.uid}\n:envelope_with_arrow: สนใจทักแชทหรือกดลิงก์เพื่อซื้อได้เลย!`;
                            navigator.clipboard.writeText(message);
                            toast.success('คัดลอกข้อความสำเร็จ');
                          }}
                          className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors shadow"
                        >
                          <Copy className="w-5 h-5 text-purple-500" />
                          <span>คัดลอก</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end justify-start flex-shrink-0 ml-4">
                      {item.status === 'sold' ? (
                        <button
                          onClick={() => handleUpdateItemStatus(item.id, 'available')}
                          className="flex items-center gap-1 px-4 py-1 rounded-full bg-gray-200 text-gray-700 text-sm font-bold hover:bg-green-100 hover:text-green-700 transition-colors cursor-pointer"
                          title="กดเพื่อเปลี่ยนเป็นพร้อมขาย"
                        >
                          <XCircle className="w-4 h-4 text-gray-500" /> ติดจอง
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateItemStatus(item.id, 'sold')}
                          className="flex items-center gap-1 px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
                          title="กดเพื่อเปลี่ยนเป็นติดจอง"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> พร้อมขาย
                        </button>
                      )}
                      <button
                        onClick={() => { setItemToDelete(item); setShowDeleteItemModal(true); }}
                        className="h-10 min-h-0 px-4 py-0 rounded-full bg-red-100 text-red-700 text-sm hover:bg-red-200 transition-colors flex items-center gap-1 shadow"
                      >
                        <Trash2 className="w-4 h-4" />
                        ลบ
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Dialog popup สำหรับลบ trade */}
      <Dialog open={showDeleteTradeModal} onClose={() => setShowDeleteTradeModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-10">
            <Dialog.Title className="text-lg font-bold text-red-600 mb-2">ยืนยันการลบรายการขาย Gold</Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-4">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการขาย Gold นี้? <br />
              <span className="text-yellow-600 text-sm font-bold">⚠️ ข้อมูลจะถูกลบถาวร</span>
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDeleteTradeModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                disabled={isDeletingTrade}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  if (!openTrade) return;
                  setIsDeletingTrade(true);
                  try {
                    await remove(ref(db, `trade/${openTrade.id}`));
                    toast.success('ลบรายการขายสำเร็จ');
                    setShowDeleteTradeModal(false);
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาดในการลบรายการขาย');
                  } finally {
                    setIsDeletingTrade(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-bold"
                disabled={isDeletingTrade}
              >
                {isDeletingTrade ? 'กำลังลบ...' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
      {/* Dialog popup สำหรับลบ item */}
      <Dialog open={showDeleteItemModal} onClose={() => setShowDeleteItemModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-10">
            <Dialog.Title className="text-lg font-bold text-red-600 mb-2">ยืนยันการลบไอเทม</Dialog.Title>
            <Dialog.Description className="text-gray-700 mb-4">
              คุณแน่ใจหรือไม่ว่าต้องการลบไอเทมนี้? <br />
              <span className="text-yellow-600 text-sm font-bold">⚠️ ข้อมูลจะถูกลบถาวร</span>
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDeleteItemModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                disabled={isDeletingItem}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  if (!itemToDelete) return;
                  setIsDeletingItem(true);
                  try {
                    await remove(ref(db, `tradeItems/${itemToDelete.id}`));
                    toast.success('ลบไอเทมสำเร็จ');
                    setShowDeleteItemModal(false);
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาดในการลบไอเทม');
                  } finally {
                    setIsDeletingItem(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-bold"
                disabled={isDeletingItem}
              >
                {isDeletingItem ? 'กำลังลบ...' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 