'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { th } from 'date-fns/locale/th';
import { ThaiEventCalendar } from './ThaiEventCalendar';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const thMonday = { ...th, options: { ...th.options, weekStartsOn: 1 as 1 } };

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    startAt: Date;
    endAt: Date;
    rewardInfo: string;
    notifyMessage: string;
    color: string;
  }) => void;
  defaultValues?: {
    name: string;
    description: string;
    startAt: Date;
    endAt: Date;
    rewardInfo: string;
    notifyMessage: string;
    color: string;
  };
  isEdit?: boolean;
}

export function CreateEventModal({ isOpen, onClose, onSubmit, defaultValues, isEdit }: CreateEventModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState<Date | undefined>(new Date());
  const [endAt, setEndAt] = useState<Date | undefined>(new Date());
  const [rewardInfo, setRewardInfo] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [color, setColor] = useState('#FFB5E8');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [time, setTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('00:00');
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);
  const router = useRouter();

  const pastelColors = [
    { name: 'พาสเทลพิ้ง', value: '#FFB5E8' },
    { name: 'พาสเทลม่วง', value: '#B5B9FF' },
    { name: 'พาสเทลฟ้า', value: '#B5EAD7' },
    { name: 'พาสเทลรุ้ง', value: 'linear-gradient(to right, #FFB5E8, #B5B9FF, #B5EAD7, #FFE5B4, #FFB7B2, #FF9B9B, #B5D8FF)' },
    { name: 'พาสเทลเหลือง', value: '#FFE5B4' },
    { name: 'พาสเทลส้ม', value: '#FFB7B2' },
    { name: 'พาสเทลแดง', value: '#FF9B9B' },
    { name: 'พาสเทลน้ำเงิน', value: '#B5D8FF' },
  ];

  useEffect(() => {
    if (isOpen && defaultValues) {
      setName(defaultValues.name || '');
      setDescription(defaultValues.description || '');
      setStartAt(defaultValues.startAt ? new Date(defaultValues.startAt) : new Date());
      setEndAt(defaultValues.endAt ? new Date(defaultValues.endAt) : new Date());
      setRewardInfo(defaultValues.rewardInfo || '');
      setNotifyMessage(defaultValues.notifyMessage || '');
      setColor(defaultValues.color || '#FFB5E8');
      if (defaultValues.startAt) {
        const d = new Date(defaultValues.startAt);
        setTime(d.toTimeString().slice(0,5));
      } else {
        setTime('00:00');
      }
      if (defaultValues.endAt) {
        const d = new Date(defaultValues.endAt);
        setEndTime(d.toTimeString().slice(0,5));
      } else {
        setEndTime('00:00');
      }
    }
  }, [isOpen, defaultValues]);

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (startAt) {
      const [h, m] = newTime.split(':');
      const newDate = new Date(startAt);
      newDate.setHours(Number(h));
      newDate.setMinutes(Number(m));
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setStartAt(newDate);
    }
  };

  const handleEndTimeChange = (newTime: string) => {
    setEndTime(newTime);
    if (endAt) {
      const [h, m] = newTime.split(':');
      const newDate = new Date(endAt);
      newDate.setHours(Number(h));
      newDate.setMinutes(Number(m));
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setEndAt(newDate);
    }
  };

  const handleDateChange = (date: Date) => {
    setStartAt(date);
    setTime(date.toTimeString().slice(0, 5));
  };

  const handleEndDateChange = (date: Date) => {
    setEndAt(date);
    setEndTime(date.toTimeString().slice(0, 5));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!startAt || !endAt) return;
    setLoading(true);
    setError(null);
    try {
      const eventRef = await addDoc(collection(firestore, 'events'), {
        name,
        description,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        rewardInfo,
        notifyMessage,
        color,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        ownerUid: user?.uid,
      });

      onSubmit({
        name,
        description,
        startAt,
        endAt,
        rewardInfo,
        notifyMessage,
        color,
      });

      handleClose();
      router.push('/events');
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการสร้างกิจกรรม');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStartAt(new Date());
    setEndAt(new Date());
    setRewardInfo('');
    setNotifyMessage('');
    setColor('#FFB5E8');
    onClose();
  };

  const getAnnounceMessage = () => {
    const dateStr = startAt
      ? startAt.toLocaleString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : '[วันเวลาเริ่มกิจกรรม]';
    return (
      `🎉 **${name || '[ชื่อกิจกรรม]'}**\n` +
      `รายละเอียด: ${description || '[รายละเอียดกิจกรรม]'}\n\n` +
      `🗓️ วันเวลา: ${dateStr}\n` +
      `🎁 ของรางวัล: ${rewardInfo || '-'}\n\n` +
      (notifyMessage ? notifyMessage + '\n' : '')
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-pink-700"><span className="text-lg">📝</span>ชื่อกิจกรรม</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              className="rounded-lg border-pink-200 focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-purple-700"><span className="text-lg">📄</span>รายละเอียด</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              required
              className="rounded-lg border-purple-200 focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-blue-700"><span className="text-lg">📅</span>วันเวลาเริ่ม</Label>
            <div className="flex gap-2 items-center">
              <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 shadow-sm rounded-xl transition-all duration-200",
                      !startAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                    {startAt ? startAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : <span>เลือกวันที่</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl border-blue-200">
                  <ThaiEventCalendar
                    selected={startAt}
                    onSelect={date => { handleDateChange(date as Date); setOpenCalendar(false); }}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-1">
                <span className="text-blue-500 text-lg">⏰</span>
                <Input
                  type="time"
                  value={time}
                  onChange={e => handleTimeChange(e.target.value)}
                  className="w-[100px] rounded-lg border-blue-200 focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-red-700"><span className="text-lg">⏰</span>วันเวลาสิ้นสุด</Label>
            <div className="flex gap-2 items-center">
              <Popover open={openEndCalendar} onOpenChange={setOpenEndCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-red-200 bg-gradient-to-r from-red-50 to-purple-50 hover:from-red-100 hover:to-purple-100 shadow-sm rounded-xl transition-all duration-200",
                      !endAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />
                    {endAt ? endAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : <span>เลือกวันที่</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gradient-to-br from-red-50 to-purple-50 rounded-2xl shadow-xl border-red-200">
                  <ThaiEventCalendar
                    selected={endAt}
                    onSelect={date => { handleEndDateChange(date as Date); setOpenEndCalendar(false); }}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-1">
                <span className="text-red-500 text-lg">⏰</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => handleEndTimeChange(e.target.value)}
                  className="w-[100px] rounded-lg border-red-200 focus:ring-2 focus:ring-red-300"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewardInfo" className="flex items-center gap-2 text-yellow-700"><span className="text-lg">🎁</span>ของรางวัล</Label>
            <Input
              id="rewardInfo"
              value={rewardInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRewardInfo(e.target.value)}
              className="rounded-lg border-yellow-200 focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color" className="flex items-center gap-2 text-purple-700"><span className="text-lg">🎨</span>สีกิจกรรม</Label>
            <div className="grid grid-cols-4 gap-2">
              {pastelColors.map((pastelColor) => (
                <button
                  key={pastelColor.value}
                  type="button"
                  onClick={() => setColor(pastelColor.value)}
                  className={cn(
                    "relative p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                    color === pastelColor.value ? "ring-2 ring-offset-2 ring-purple-300" : "border-transparent"
                  )}
                  style={{ 
                    background: pastelColor.value.includes('linear-gradient') 
                      ? pastelColor.value 
                      : pastelColor.value,
                    backgroundSize: pastelColor.value.includes('linear-gradient') ? '200% 100%' : 'auto'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {color === pastelColor.value && (
                      <span className="text-white drop-shadow-lg">✓</span>
                    )}
                  </div>
                  <div className="h-8 w-full rounded-md" />
                  <div className="mt-1 text-xs text-center font-medium text-gray-700">
                    {pastelColor.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>{loading ? (isEdit ? 'กำลังบันทึก...' : 'กำลังสร้าง...') : (isEdit ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 