'use client';

import React, { useRef, useState } from 'react';

import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';



interface MusicPlayerWithEffectsProps {
  audioSrc: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export default function MusicPlayerWithEffects({ 
  audioSrc, 
  autoPlay = false, 
  loop = true 
}: MusicPlayerWithEffectsProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const MAX_VOLUME = 1.0;
  const [volume, setVolume] = React.useState(50);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);



  React.useEffect(() => {
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

      // Load volume from localStorage
      const savedVolume = localStorage.getItem('bgMusicVolume');
      const initialVolume = savedVolume ? parseInt(savedVolume) : 50;
      setVolume(initialVolume);
      audio.volume = (initialVolume / 100) * MAX_VOLUME;
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    // Trigger play on first user interaction
    const tryPlay = async () => {
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

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
    };
  }, [autoPlay, loop, isMuted]);





  const toggleMute = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !isMuted;
    audio.muted = newMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem('bgMusicMuted', newMuted.toString());
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    if (newMuted) {
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
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

  const handleUserInteract = () => {
    setIsExpanded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isHovering && !isMobile) {
      timerRef.current = setTimeout(() => setIsExpanded(false), 3000);
    }
  };

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



  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  React.useEffect(() => {
    // ตรวจสอบว่าเป็น browser environment
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="fixed top-0 right-0 z-[100001] flex flex-col items-end px-2 py-2">
      <div
        className={`flex items-center transition-all duration-300 relative ${isExpanded ? 'bg-[#F6F7FB] dark:bg-[#23243a] border border-[#E3F2FD] dark:border-[#35365a] shadow-sm px-2' : 'bg-transparent border-0 shadow-none px-0'} rounded-full max-w-[90vw] md:max-w-none h-12`}
        style={{ minWidth: isExpanded ? 140 : 48, width: isExpanded ? 180 : 48 }}
        onMouseEnter={!isMobile ? handleMouseEnter : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        onTouchStart={isMobile ? handleExpandMobile : handleUserInteract}
      >
        {/* slider + % */}
        <div className={`flex items-center transition-all duration-300 overflow-hidden ${isExpanded ? 'w-28 sm:w-36 opacity-100 mr-2' : 'w-0 opacity-0 mr-0'}`} style={{ minWidth: 0 }}>
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
        {/* ปุ่ม mute/unmute */}
        <div className="relative flex items-center justify-center">
          {/* Glow effect */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500
              ${isPlaying ? 'opacity-90 scale-125' : 'opacity-0 scale-100'}`}
            style={{
              filter: 'blur(12px)',
              background: 'radial-gradient(circle, #A7C7E7 0%, #A7C7E7 60%, transparent 90%)',
              zIndex: 1,
              borderRadius: '9999px',
            }}
          />
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full bg-[#A7C7E7] dark:bg-[#35365a] hover:bg-[#C3B1E1] dark:hover:bg-[#23243a] transition-colors duration-200 focus:outline-none border border-[#E3F2FD] dark:border-[#35365a] ${isPlaying ? 'ring-2 ring-[#A7C7E7]/60 dark:ring-white/10 ring-offset-2' : ''} flex-shrink-0`}
            aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
            style={{ zIndex: 2 }}
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
        </div>
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