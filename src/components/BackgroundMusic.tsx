'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Volume1, Volume, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import MusicVisualizerPanel from './MusicVisualizerPanel';
import BackgroundMusicEffect from './BackgroundMusicEffect';

interface BackgroundMusicProps {
  audioSrc: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export default function BackgroundMusic({ 
  audioSrc, 
  autoPlay = false, 
  loop = true 
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const MAX_VOLUME = 1.0; // จำกัดความดังสูงสุดที่ 100%
  const [volume, setVolume] = useState(50); // ตั้งต้นที่ 50%
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showBackgroundEffect, setShowBackgroundEffect] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // ตรวจสอบว่าเป็น browser environment
    if (typeof window === 'undefined') return;

    // Load muted state from localStorage
    try {
      const savedMuted = localStorage.getItem('bgMusicMuted');
      if (savedMuted === 'true') {
        setIsMuted(true);
        audio.muted = true;
      }

      // Load volume from localStorage หรือใช้ค่าเริ่มต้น 50%
      const savedVolume = localStorage.getItem('bgMusicVolume');
      const initialVolume = savedVolume ? parseInt(savedVolume) : 50;
      setVolume(initialVolume);
      audio.volume = (initialVolume / 100) * MAX_VOLUME;
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    // Trigger play on first user interaction (click/touch)
    const tryPlay = () => {
      const audioEl = audioRef.current;
      if (audioEl && !audioEl.muted) {
        audioEl.play().catch(() => {});
        setIsPlaying(true);
      }
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
    };
    window.addEventListener('click', tryPlay);
    window.addEventListener('touchstart', tryPlay);

    try {
      const savedPlaying = localStorage.getItem('bgMusicPlaying');
      if (savedPlaying === 'true' && !isMuted) {
        setIsPlaying(true);
        if (autoPlay) {
          handleAutoPlay();
        }
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    // Event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      if (loop) {
        audio.play().catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Cleanup event listeners
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
    };
  }, [autoPlay, loop, isMuted]);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !isMuted;
    audio.muted = newMuted;
    setIsMuted(newMuted);
    
    // Save to localStorage
    try {
      localStorage.setItem('bgMusicMuted', newMuted.toString());
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    if (newMuted) {
      setIsPlaying(false);
    } else {
      // สั่งเล่นเพลงทันทีหลัง unmute
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setVolume(newVolume);
    audio.volume = (newVolume / 100) * MAX_VOLUME;
    try {
      localStorage.setItem('bgMusicVolume', newVolume.toString());
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    if (isMuted && newVolume > 0) {
      setIsMuted(false);
      audio.muted = false;
      try {
        localStorage.setItem('bgMusicMuted', 'false');
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    }
    if (newVolume > 0) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleAutoPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isMuted) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
      try {
        localStorage.setItem('bgMusicPlaying', 'true');
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    }
  };

  // ฟังก์ชันรีเซ็ต timer และขยายแถบ
  const handleUserInteract = () => {
    setIsExpanded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isHovering && !isMobile) {
      timerRef.current = setTimeout(() => setIsExpanded(false), 3000); // 3 วินาที
    }
  };

  // สำหรับ mobile: ขยายแล้วเริ่ม timer 3 วิ
  const handleExpandMobile = () => {
    setIsExpanded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsExpanded(false), 3000);
  };

  const handleCollapseMobile = () => {
    setIsExpanded(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleSliderStart = () => {
    setIsDragging(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  
  const handleSliderEnd = () => {
    setIsDragging(false);
    if (isMobile) {
      timerRef.current = setTimeout(() => setIsExpanded(false), 3000);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isMobile) setIsExpanded(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsExpanded(true);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    // ตรวจสอบว่าเป็น browser environment
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="fixed top-0 right-0 z-[100001] flex items-center px-2 py-2">
      <div
        className="flex items-center bg-[#F6F7FB] dark:bg-[#23243a] rounded-full shadow-sm border border-[#E3F2FD] dark:border-[#35365a] max-w-[90vw] md:max-w-none transition-all duration-300 px-2"
        onMouseEnter={!isMobile ? handleMouseEnter : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        onTouchStart={isMobile ? handleExpandMobile : handleUserInteract}
      >
        {/* slider + % */}
        <div className={`flex items-center transition-all duration-300 overflow-hidden ${isExpanded ? 'w-28 sm:w-36 opacity-100 mr-2' : 'w-0 opacity-0 mr-0'}`} style={{minWidth:0}}>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-2 bgm-slider bg-[#B2F2BB] dark:bg-[#35365a] rounded-full appearance-none focus:outline-none"
            style={{
              background: `linear-gradient(to right, #A7C7E7 0%, #A7C7E7 ${volume}%, #F6F7FB ${volume}%, #F6F7FB 100%)`,
            }}
            onMouseDown={isMobile ? handleSliderStart : undefined}
            onMouseUp={isMobile ? handleSliderEnd : undefined}
            onTouchStart={isMobile ? handleSliderStart : undefined}
            onTouchEnd={isMobile ? handleSliderEnd : undefined}
          />
          <span className="text-xs text-[#A7C7E7] dark:text-[#B2F2BB] font-medium select-none w-8 text-right ml-1">{volume}%</span>
        </div>
        {/* ปุ่มลูกศร */}
        { !isExpanded && (
          <button
            className="p-1 rounded-full bg-[#E3E6F3] dark:bg-[#35365a] hover:bg-[#C3B1E1] dark:hover:bg-[#44446a] border border-[#E3F2FD] dark:border-[#44446a] transition flex items-center justify-center"
            onClick={isMobile ? handleExpandMobile : () => setIsExpanded(true)}
            aria-label="ขยายแถบควบคุม"
            tabIndex={0}
          >
            <ChevronLeft size={20} className="text-[#35365a] dark:text-[#B2F2BB]" />
          </button>
        )}
        {/* ปุ่ม mute/unmute */}
        <button
          onClick={toggleMute}
          className="ml-2 p-2 rounded-full bg-[#A7C7E7] dark:bg-[#35365a] hover:bg-[#C3B1E1] dark:hover:bg-[#23243a] transition-colors duration-200 focus:outline-none border border-[#E3F2FD] dark:border-[#35365a]"
          aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : volume > 50 ? (
            <Volume2 className="h-5 w-5 text-white" />
          ) : volume > 20 ? (
            <Volume1 className="h-5 w-5 text-white" />
          ) : (
            <Volume className="h-5 w-5 text-white" />
          )}
        </button>
        
        {/* ปุ่มเปิด/ปิดเอฟเฟคพื้นหลัง */}
        <button
          onClick={() => setShowBackgroundEffect(!showBackgroundEffect)}
          className={`ml-2 p-2 rounded-full transition-colors duration-200 focus:outline-none border ${
            showBackgroundEffect 
              ? 'bg-[#C3B1E1] dark:bg-[#44446a] border-[#A7C7E7] dark:border-[#B2F2BB]' 
              : 'bg-[#A7C7E7] dark:bg-[#35365a] hover:bg-[#C3B1E1] dark:hover:bg-[#23243a] border-[#E3F2FD] dark:border-[#35365a]'
          }`}
          aria-label={showBackgroundEffect ? "ปิดเอฟเฟคพื้นหลัง" : "เปิดเอฟเฟคพื้นหลัง"}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </button>
        
      </div>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        loop={loop}
      />
      

    </div>
  );
} 