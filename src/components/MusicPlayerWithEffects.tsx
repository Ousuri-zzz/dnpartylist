'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Volume1, Volume, ChevronLeft, ChevronRight, Sparkles, Music } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import CircularAudioVisualizer from './CircularAudioVisualizer';
import WaveformVisualizer from './WaveformVisualizer';
import MusicParticleEffect from './MusicParticleEffect';
import MusicWaveEffect from './MusicWaveEffect';
import BackgroundMusicEffect from './BackgroundMusicEffect';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const MAX_VOLUME = 1.0;
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showBackgroundEffect, setShowBackgroundEffect] = useState(false);
  const [visualizerType, setVisualizerType] = useState<'bars' | 'circular' | 'waveform' | 'particles' | 'waves'>('bars');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

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
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
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

  useEffect(() => {
    if (!audioRef.current) return;
    
    // ตรวจสอบว่าเป็น browser environment
    if (typeof window === 'undefined') return;
    
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(analyser);
        analyser.connect(audioContextRef.current.destination);
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    }
  }, []);

  const resumeAudioContext = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const toggleMute = async () => {
    await resumeAudioContext();
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
    await resumeAudioContext();
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

  const handleVisualizerChange = () => {
    if (visualizerType === 'bars') {
      setVisualizerType('circular');
    } else if (visualizerType === 'circular') {
      setVisualizerType('waveform');
    } else if (visualizerType === 'waveform') {
      setVisualizerType('particles');
    } else if (visualizerType === 'particles') {
      setVisualizerType('waves');
    } else {
      setVisualizerType('bars');
    }
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
    <div className="fixed top-0 right-0 z-[100001] flex flex-col items-end px-2 py-2">
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
      </div>

      {/* เอฟเฟคเพลงใต้แถบเครื่องมือ */}
      <div className="mt-2 w-[220px] h-[24px]">
        <AudioVisualizer analyser={analyserRef.current} isVisible={isPlaying && !isMuted} />
      </div>

      {/* เอฟเฟคที่แสดงในเครื่องมือเล่นเพลง */}
      <AnimatePresence>
        {showVisualizer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 right-4 z-[100002]"
          >
            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md border border-white/30 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden p-4">
              <div className="flex flex-col items-center gap-4">
                {visualizerType === 'bars' ? (
                  <AudioVisualizer 
                    analyser={analyserRef.current}
                    audioElement={audioRef.current}
                    isVisible={true}
                    className="w-full max-w-sm"
                  />
                ) : visualizerType === 'circular' ? (
                  <CircularAudioVisualizer 
                    audioElement={audioRef.current}
                    isVisible={true}
                    size={200}
                    className="mx-auto"
                  />
                ) : visualizerType === 'waveform' ? (
                  <WaveformVisualizer 
                    audioElement={audioRef.current}
                    isVisible={true}
                    width={300}
                    height={100}
                    className="w-full max-w-sm"
                  />
                ) : visualizerType === 'particles' ? (
                  <MusicParticleEffect 
                    audioElement={audioRef.current}
                    isVisible={true}
                    className="w-full max-w-sm"
                  />
                ) : (
                  <MusicWaveEffect 
                    audioElement={audioRef.current}
                    isVisible={true}
                    className="mx-auto"
                  />
                )}
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {visualizerType === 'bars' ? 'แถบความถี่' : 
                     visualizerType === 'circular' ? 'เอฟเฟควงกลม' : 
                     visualizerType === 'waveform' ? 'คลื่นเสียง' :
                     visualizerType === 'particles' ? 'อนุภาค' : 'คลื่นหลายชั้น'}
                  </p>
                  {!isPlaying && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      เริ่มเล่นเพลงเพื่อดูเอฟเฟค
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        loop={loop}
      />
      
      {/* เอฟเฟคพื้นหลังที่ขยับตามเพลง */}
      <BackgroundMusicEffect
        audioElement={audioRef.current}
        isVisible={isPlaying && !isMuted && showBackgroundEffect}
      />
    </div>
  );
}