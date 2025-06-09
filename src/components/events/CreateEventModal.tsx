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
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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
    maxGroupSize: number;
  }) => void;
  defaultValues?: {
    name: string;
    description: string;
    startAt: Date;
    endAt: Date;
    rewardInfo: string;
    notifyMessage: string;
    color: string;
    maxGroupSize: number;
  };
  isEdit?: boolean;
}

export function CreateEventModal({ isOpen, onClose, onSubmit, defaultValues, isEdit }: CreateEventModalProps) {
  const [name, setName] = useState(defaultValues?.name || '');
  const [description, setDescription] = useState(defaultValues?.description || '');
  const [startAt, setStartAt] = useState<Date | undefined>(defaultValues?.startAt || new Date());
  const [endAt, setEndAt] = useState<Date | undefined>(
    defaultValues?.endAt ||
    (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return d;
    })()
  );
  const [rewardInfo, setRewardInfo] = useState(defaultValues?.rewardInfo || '');
  const [notifyMessage, setNotifyMessage] = useState(defaultValues?.notifyMessage || '');
  const [color, setColor] = useState(defaultValues?.color || '#FFB5E8');
  const [maxGroupSize, setMaxGroupSize] = useState(defaultValues?.maxGroupSize && (defaultValues?.maxGroupSize > 0) ? defaultValues?.maxGroupSize : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [time, setTime] = useState<string>(
    defaultValues?.startAt
      ? new Date(defaultValues.startAt).toTimeString().slice(0, 5)
      : new Date().toTimeString().slice(0, 5)
  );
  const [endTime, setEndTime] = useState<string>(
    defaultValues?.endAt
      ? new Date(defaultValues.endAt).toTimeString().slice(0, 5)
      : (() => {
          const d = new Date();
          d.setHours(d.getHours() + 1, 0, 0, 0);
          return d.toTimeString().slice(0, 5);
        })()
  );
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);
  const router = useRouter();
  const [groupEnabled, setGroupEnabled] = useState((defaultValues?.maxGroupSize ?? 0) > 0);

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
      setMaxGroupSize(defaultValues.maxGroupSize && (defaultValues.maxGroupSize > 0) ? defaultValues.maxGroupSize : 0);
      setGroupEnabled((defaultValues.maxGroupSize ?? 0) > 0);
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
    } else if (isOpen && !defaultValues) {
      setStartAt(new Date());
      setTime(new Date().toTimeString().slice(0, 5));
      setGroupEnabled(false);
      setMaxGroupSize(0);
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      setEndAt(d);
      setEndTime(d.toTimeString().slice(0, 5));
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
      onSubmit({
        name,
        description,
        startAt,
        endAt,
        rewardInfo,
        notifyMessage,
        color,
        maxGroupSize: groupEnabled ? maxGroupSize : 0,
      });
      handleClose();
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
    setMaxGroupSize(0);
    setGroupEnabled(false);
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
      <DialogContent className="w-full max-w-full sm:max-w-4xl px-4 max-h-[90vh] overflow-y-auto !bg-pink-100/70 !backdrop-blur-sm !border-pink-200 !shadow-xl !rounded-2xl mt-8">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-pink-700"><span className="text-lg">📝</span>ชื่อกิจกรรม</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              className="w-full rounded-lg border-pink-200 focus:ring-2 focus:ring-pink-300 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-purple-700"><span className="text-lg">📄</span>รายละเอียด</Label>
            <div className="w-full min-w-0 overflow-x-hidden" style={{ width: '100%' }}>
              <ReactQuill
                theme="snow"
                value={description}
                onChange={setDescription}
                className="bg-white rounded-lg"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                  ]
                }}
                formats={['header', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'list', 'bullet']}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-green-700">
              <span className="text-lg">👥</span>ระบบกลุ่ม
            </Label>
            <div className="flex items-center gap-2 mb-1">
              <Checkbox 
                id="groupEnabled" 
                checked={groupEnabled} 
                onCheckedChange={v => {
                  setGroupEnabled(!!v);
                  setMaxGroupSize(!!v ? 4 : 0);
                }} 
              />
              <Label htmlFor="groupEnabled" className="text-green-700 cursor-pointer select-none">เปิดใช้งานระบบกลุ่ม</Label>
            </div>
            {groupEnabled && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="2"
                  max="8"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(Math.min(8, Math.max(2, parseInt(e.target.value) || 4)))}
                  className="w-24 rounded-lg border-green-200 focus:ring-2 focus:ring-green-300 bg-white"
                />
                <span className="text-green-500 text-sm">คน (2-8 คน)</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-blue-700">
              <span className="text-lg">📅</span>
              วันเวลาเริ่ม
            </Label>
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
                  className="w-[100px] rounded-lg border-blue-200 focus:ring-2 focus:ring-blue-300 bg-white"
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
                  className="w-[100px] rounded-lg border-red-200 focus:ring-2 focus:ring-red-300 bg-white"
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
              className="w-full rounded-lg border-yellow-200 focus:ring-2 focus:ring-yellow-300 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color" className="flex items-center gap-2 text-purple-700"><span className="text-lg">🎨</span>สีกิจกรรม</Label>
            <div className="flex flex-row flex-wrap gap-3">
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
                    width: '60px',
                    height: '60px'
                  }}
                >
                  {color === pastelColor.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sticky bottom-0 pt-2 z-10">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (isEdit ? 'กำลังบันทึก...' : 'กำลังสร้าง...') : (isEdit ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม')}
            </Button>
          </div>
        </form>
      </DialogContent>
      <style jsx global>{`
        :global(.react-quill),
        :global(.react-quill .ql-container),
        :global(.react-quill .ql-editor),
        :global(.react-quill .ql-editor *),
        :global(.ql-container),
        :global(.ql-editor),
        :global(.ql-editor *) {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
        }
        @media (max-width: 640px) {
          .DialogContent {
            max-width: 425px !important;
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
        }
      `}</style>
    </Dialog>
  );
} 