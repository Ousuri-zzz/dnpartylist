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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function DiscordDropdown({ inMobileMenu = false, className }: { inMobileMenu?: boolean, className?: string }) {
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
      setIsOpen(true);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ Discord');
    } finally {
      setIsChanging(false);
    }
  };

  if (!user) return null;

  if (inMobileMenu) {
    const headerClass = "flex items-center gap-2 px-5 py-4 border-b border-pink-100 bg-white/90 cursor-pointer select-none min-h-[64px]";
    return (
      <>
        <div
          className={headerClass + " fixed left-0 right-0"}
          style={{ top: 0, width: '100vw', zIndex: 20000 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-pink-200">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || user.email || 'User'} />
            <AvatarFallback>{user.displayName?.[0] || discordName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-base font-bold flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis text-blue-600 tracking-wide drop-shadow-sm transition-all duration-200">
            {discordName || user.displayName || 'กรุณาตั้งชื่อ'}
          </span>
          <ChevronDown className={cn("w-5 h-5 text-pink-400 transition-transform duration-200", isOpen && "rotate-180")}/>
        </div>
        <div style={{ height: 64 }} />
        {isOpen && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed left-0 right-0 bottom-0 z-[20000] flex flex-col items-stretch"
            style={{ top: 73, background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(2px)', position: 'fixed' }}
            onClick={() => setIsOpen(false)}
          >
            <div
              className={headerClass}
              onClick={e => { e.stopPropagation(); setIsOpen(false); }}
            >
              <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-pink-200">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || user.email || 'User'} />
                <AvatarFallback>{user.displayName?.[0] || discordName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-base font-bold flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis text-blue-600 tracking-wide drop-shadow-sm transition-all duration-200">
                {discordName || user.displayName || 'กรุณาตั้งชื่อ'}
              </span>
              <ChevronDown className="w-5 h-5 text-pink-400 rotate-180" />
            </div>
            <div
              className="bg-white dark:bg-white/80 border-b border-pink-200 shadow-2xl shadow-pink-200/40 py-3 animate-fade-in w-full"
              onClick={e => e.stopPropagation()}
            >
              {discordName && (
                <button
                  className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-pink-600 hover:bg-pink-100/60 hover:text-pink-700 transition-all duration-200 rounded-2xl font-bold"
                  onClick={() => {
                    setShowChangeName(true);
                    setNewDiscordName(discordName);
                  }}
                >
                  <FaDiscord className="w-5 h-5 text-pink-400" />
                  เปลี่ยนชื่อ Discord
                </button>
              )}
              <a
                href="https://discord.com/users/1163943838826631258"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-purple-400 hover:bg-purple-100/60 hover:text-purple-700 transition-all duration-200 rounded-2xl font-bold"
                style={{ textDecoration: 'none' }}
              >
                <FaDiscord className="w-5 h-5 text-purple-300" />
                ติดต่อหัวกิลด์
              </a>
              <button
                className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-red-400 hover:bg-red-100/60 hover:text-red-600 transition-all duration-200 rounded-2xl font-bold"
                onClick={handleLogout}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                ออกจากระบบ
              </button>
            </div>
          </div>,
          document.body
        )}
        {showChangeName && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-[999999] bg-black/30">
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
                <Button onClick={() => { setShowChangeName(false); setIsOpen(true); }} variant="outline" className="rounded-lg">ยกเลิก</Button>
                <Button onClick={async () => { await handleChangeName(); setIsOpen(true); }} disabled={isChanging} className="rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold hover:from-pink-500 hover:to-purple-500">
                  {isChanging ? 'กำลังเปลี่ยน...' : 'ยืนยัน'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-2xl transition-all duration-200 font-bold text-base",
          inMobileMenu
            ? "justify-between text-gray-700 hover:bg-gray-100 px-2 py-1"
            : "bg-gradient-to-r from-blue-50 via-pink-50 to-purple-50 border border-pink-100 shadow hover:bg-pink-100/40 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-pink-200 px-5 py-2",
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-pink-200">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || user.email || 'User'} />
            <AvatarFallback>{user.displayName?.[0] || discordName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-base font-bold flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis text-blue-600 tracking-wide drop-shadow-sm transition-all duration-200 max-w-[56px] lg:max-w-[72px]">
            {discordName || user.displayName || 'กรุณาตั้งชื่อ'}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 transition-transform duration-200 flex-shrink-0 text-pink-400",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute right-0 w-64 rounded-2xl shadow-2xl shadow-pink-200/40 py-3 z-[100000] border border-pink-200 backdrop-blur-md max-h-80 overflow-y-auto animate-fade-in bg-white dark:bg-white/80",
          openUpwards ? 'bottom-12 mb-2' : 'mt-2 top-full'
        )}>
          {discordName && (
            <button
              className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-pink-600 hover:bg-pink-100/60 hover:text-pink-700 transition-all duration-200 rounded-2xl font-bold"
              onClick={() => {
                setShowChangeName(true);
                setNewDiscordName(discordName);
              }}
            >
              <FaDiscord className="w-5 h-5 text-pink-400" />
              เปลี่ยนชื่อ Discord
            </button>
          )}
          <a
            href="https://discord.com/users/1163943838826631258"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-purple-400 hover:bg-purple-100/60 hover:text-purple-700 transition-all duration-200 rounded-2xl font-bold"
            style={{ textDecoration: 'none' }}
          >
            <FaDiscord className="w-5 h-5 text-purple-300" />
            ติดต่อหัวกิลด์
          </a>
          <button
            className="w-full flex items-center gap-2 px-5 py-3 text-left text-base text-red-400 hover:bg-red-100/60 hover:text-red-600 transition-all duration-200 rounded-2xl font-bold"
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ออกจากระบบ
          </button>
        </div>
      )}

      {showChangeName && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[999999] bg-black/30">
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
              <Button onClick={() => { setShowChangeName(false); setIsOpen(true); }} variant="outline" className="rounded-lg">ยกเลิก</Button>
              <Button onClick={async () => { await handleChangeName(); setIsOpen(true); }} disabled={isChanging} className="rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold hover:from-pink-500 hover:to-purple-500">
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