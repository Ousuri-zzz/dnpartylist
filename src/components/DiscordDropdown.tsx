import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog } from './ui/dialog';
import { FaDiscord } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

export function DiscordDropdown({ inMobileMenu = false }: { inMobileMenu?: boolean }) {
  const { user, discordName, logout, approved, updateDiscordName } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);
  const [newDiscordName, setNewDiscordName] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const rect = dropdownRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 250);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleChangeName = async () => {
    if (!newDiscordName.trim()) return;
    setIsChanging(true);
    try {
      await updateDiscordName(newDiscordName.trim());
      toast.success('เปลี่ยนชื่อ Discord สำเร็จ!');
      setShowChangeName(false);
      setIsOpen(false);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ Discord');
    } finally {
      setIsChanging(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          inMobileMenu
            ? "w-full justify-between text-gray-700 hover:bg-gray-100"
            : "bg-white/60 border border-pink-100 shadow-sm hover:bg-pink-50/50 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-300 hover:border-pink-400 hover:text-pink-600"
        )}
      >
        <div className="flex items-center gap-2">
          <FaDiscord className="w-4 h-4 text-[#5865F2]" />
          <span className="text-sm font-medium">{discordName || 'กรุณาตั้งชื่อ Discord'}</span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 ${openUpwards ? 'bottom-12 mb-2' : 'mt-2 top-full'} w-60 bg-[#23272A] rounded-2xl shadow-2xl py-2 z-[10000] border border-[#5865F2]/30 backdrop-blur-sm max-h-72 overflow-y-auto animate-fade-in`}>
          {discordName && (
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-white hover:bg-[#5865F2]/30 hover:text-[#5865F2] transition-all duration-200 rounded-xl"
              onClick={() => {
                setShowChangeName(true);
                setNewDiscordName(discordName);
                setIsOpen(false);
              }}
            >
              <FaDiscord className="w-4 h-4 text-[#5865F2]" />
              เปลี่ยนชื่อ Discord
            </button>
          )}
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-500 hover:bg-red-100/10 hover:text-red-600 transition-all duration-200 rounded-xl"
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ออกจากระบบ
          </button>
        </div>
      )}

      {/* Modal เปลี่ยนชื่อ Discord */}
      {showChangeName && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] bg-black/30">
          <div className="bg-white rounded-xl p-6 w-full max-w-xs text-center shadow-xl">
            <h2 className="text-lg font-bold mb-2 text-purple-600">เปลี่ยนชื่อ Discord</h2>
            <input
              type="text"
              value={newDiscordName}
              onChange={(e) => setNewDiscordName(e.target.value)}
              placeholder="ใส่ชื่อ Discord ของคุณ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowChangeName(false)} variant="outline" className="rounded-lg">ยกเลิก</Button>
              <Button onClick={handleChangeName} disabled={isChanging} className="rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold hover:from-pink-500 hover:to-purple-500">
                {isChanging ? 'กำลังเปลี่ยน...' : 'ยืนยัน'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 