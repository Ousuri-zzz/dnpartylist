'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DonationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  donations: Array<{
    id: string;
    amount: number;
    status: 'waiting' | 'active' | 'rejected';
    createdAt: number;
    type: 'gold' | 'cash';
    characters?: Array<{
      id: string;
      name: string;
      class: string;
    }>;
  }>;
}

const isCurrentMonth = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export function DonationHistoryModal({ isOpen, onClose, donations }: DonationHistoryModalProps) {
  const [selectedDonation, setSelectedDonation] = useState<typeof donations[0] | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] md:-translate-y-1/2 w-[95vw] max-w-lg rounded-2xl border border-pink-200 dark:border-zinc-700"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-pink-700 dark:text-pink-200 flex items-center gap-2">
            <span className="text-2xl">💖</span>
            ประวัติการบริจาค
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {[...donations]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((donation) => (
            <button
              key={donation.id}
              onClick={() => setSelectedDonation(donation)}
              className={cn(
                "w-full text-left rounded-2xl p-4 flex flex-col gap-2 shadow border-2 bg-white dark:bg-zinc-900 dark:text-gray-200",
                donation.status === 'waiting' && 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700',
                donation.status === 'active' && 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700',
                donation.status === 'rejected' && 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'
              )}
              style={{ transition: 'none' }}
            >
              <div className="flex items-center justify-between">
                {donation.type === 'gold' ? (
                  <span className="font-bold text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                    <span className="text-lg">🎁</span> {donation.amount}G
                  </span>
                ) : (
                  <span className="font-bold text-green-700 dark:text-green-300 flex items-center gap-1">
                    <span className="text-lg">💵</span> {donation.amount} บาท
                  </span>
                )}
                <span className={cn(
                  'font-semibold flex items-center gap-1',
                  donation.status === 'waiting' && 'text-yellow-700 dark:text-yellow-300',
                  donation.status === 'active' && 'text-green-700 dark:text-green-300',
                  donation.status === 'rejected' && 'text-red-700 dark:text-red-300'
                )}>
                  {donation.status === 'waiting' ? <><span className="text-lg">⏳</span> รออนุมัติ</> : 
                   donation.status === 'active' ? <><span className="text-lg">✅</span> อนุมัติแล้ว</> : 
                   <><span className="text-lg">❌</span> ถูกยกเลิก</>}
                </span>
              </div>
              {donation.characters && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">ตัวละคร:</span>{' '}
                  {donation.characters.map(char => `${char.name} (${char.class})`).join(', ')}
                </div>
              )}
              <div className={cn(
                "text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg w-fit",
                isCurrentMonth(donation.createdAt)
                  ? "text-pink-700 bg-pink-50 dark:text-pink-300 dark:bg-pink-900/30"
                  : "text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-zinc-800"
              )}>
                <span className="text-lg">⏰</span> {new Date(donation.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>

        {/* Modal แสดงรายละเอียดเพิ่มเติม */}
        <Dialog open={!!selectedDonation} onOpenChange={() => setSelectedDonation(null)}>
          <DialogContent
            className="sm:max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] md:-translate-y-1/2 w-[95vw] max-w-md rounded-2xl border border-pink-200 dark:border-zinc-700"
          >
            {selectedDonation && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-pink-700 dark:text-pink-200 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    รายละเอียดการบริจาค
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-zinc-800">
                    <span className="font-medium">ประเภทการบริจาค:</span>
                    <span className="font-bold">
                      {selectedDonation.type === 'gold' ? 'Gold' : 'เงินสด'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-zinc-800">
                    <span className="font-medium">จำนวน:</span>
                    <span className="font-bold">
                      {selectedDonation.type === 'gold' ? `${selectedDonation.amount}G` : `${selectedDonation.amount} บาท`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-zinc-800">
                    <span className="font-medium">สถานะ:</span>
                    <span className={cn(
                      'font-bold',
                      selectedDonation.status === 'waiting' && 'text-yellow-700 dark:text-yellow-300',
                      selectedDonation.status === 'active' && 'text-green-700 dark:text-green-300',
                      selectedDonation.status === 'rejected' && 'text-red-700 dark:text-red-300'
                    )}>
                      {selectedDonation.status === 'waiting' ? 'รออนุมัติ' : 
                       selectedDonation.status === 'active' ? 'อนุมัติแล้ว' : 
                       'ถูกยกเลิก'}
                    </span>
                  </div>
                  {selectedDonation.characters && (
                    <div className="p-3 bg-gray-50 rounded-lg dark:bg-zinc-800">
                      <span className="font-medium block mb-2">ตัวละครที่ใช้บริจาค:</span>
                      <div className="space-y-2">
                        {selectedDonation.characters.map(char => (
                          <div key={char.id} className="flex items-center justify-between bg-white p-2 rounded dark:bg-zinc-900">
                            <span>{char.name}</span>
                            <span className="text-sm text-gray-500">{char.class}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-zinc-800">
                    <span className="font-medium">วันที่:</span>
                    <span className={cn(
                      "font-medium px-3 py-1.5 rounded-lg",
                      isCurrentMonth(selectedDonation.createdAt)
                        ? "text-pink-700 bg-pink-50 dark:text-pink-300 dark:bg-pink-900/30"
                        : "text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-zinc-800"
                    )}>
                      {new Date(selectedDonation.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 