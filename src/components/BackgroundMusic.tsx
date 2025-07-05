'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';

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
  const MAX_VOLUME = 0.15; // จำกัดความดังสูงสุดที่ 15%
  const [volume, setVolume] = useState(20); // ตั้งต้นที่ 20%
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Load muted state from localStorage
    const savedMuted = localStorage.getItem('bgMusicMuted');
    if (savedMuted === 'true') {
      setIsMuted(true);
      audio.muted = true;
    }

    // ตั้ง volume เป็น 20% ทุกครั้งที่เข้า (แต่จริงๆ คือ 20% ของ MAX_VOLUME)
    setVolume(20);
    audio.volume = (20 / 100) * MAX_VOLUME;

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

    const savedPlaying = localStorage.getItem('bgMusicPlaying');
    if (savedPlaying === 'true' && !isMuted) {
      setIsPlaying(true);
      if (autoPlay) {
        handleAutoPlay();
      }
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
    localStorage.setItem('bgMusicMuted', newMuted.toString());
    
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
    localStorage.setItem('bgMusicVolume', newVolume.toString());

    if (!isMuted && newVolume > 0) {
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
      localStorage.setItem('bgMusicPlaying', 'true');
    }
  };

  return (
    <div className="fixed top-0 right-0 h-14 flex items-center gap-1 px-3 z-[100001]">
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        loop={loop}
      />
      
      {/* Modern Music Controls */}
      <div className="flex items-center gap-2">
        {/* Music Visualizer Container */}
        <div className="relative flex items-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-sm"></div>
          
          {/* Main Control Container */}
          <div className="relative flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
            
            {/* Combined Volume/Mute Control */}
            <div
              className="relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => {
                setTimeout(() => {
                  if (!isHoveringSlider) setShowVolumeSlider(false);
                }, 100);
              }}
            >
              <button
                onClick={toggleMute}
                className="group relative p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-110 active:scale-95 border border-cyan-400/30"
                aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
              >
                <div className="relative">
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-white drop-shadow-sm" />
                  ) : volume > 50 ? (
                    <Volume2 className="h-5 w-5 text-white drop-shadow-sm" />
                  ) : volume > 20 ? (
                    <Volume1 className="h-5 w-5 text-white drop-shadow-sm" />
                  ) : (
                    <Volume className="h-5 w-5 text-white drop-shadow-sm" />
                  )}
                  {/* Animated Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/30 scale-0 group-hover:scale-110 transition-transform duration-500"></div>
                </div>
              </button>
              {/* Volume Slider */}
              {showVolumeSlider && (
                <div 
                  className="absolute top-1/2 right-full mr-0 transform -translate-y-1/2 z-50"
                  onMouseEnter={() => {
                    setIsHoveringSlider(true);
                    setShowVolumeSlider(true);
                  }}
                  onMouseLeave={() => {
                    setIsHoveringSlider(false);
                    setShowVolumeSlider(false);
                  }}
                >
                  <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-xl border border-cyan-200/50 p-2 flex items-center">
                    <div className="relative flex items-center w-32 max-w-[8rem] sm:w-40 sm:max-w-xs">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                        className="slider w-full h-4 bg-gray-300/50 rounded-full appearance-none cursor-pointer backdrop-blur-sm"
                        style={{
                          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${volume}%, rgba(229, 231, 235, 0.5) ${volume}%, rgba(229, 231, 235, 0.5) 100%)`
                        }}
                      />
                      {/* Custom Slider Thumb */}
                      <div 
                        className="absolute top-1/2 w-5 h-5 bg-cyan-500 rounded-full shadow-md border border-white/50 transform -translate-y-1/2 pointer-events-none"
                        style={{ left: `calc(${volume}% - 0.625rem)` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>


          </div>
          
          {/* Floating Music Notes */}
          {isPlaying && !isMuted && (
            <div className="absolute -top-1 -right-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 