'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, X, Maximize2, Minimize2 } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import CircularAudioVisualizer from './CircularAudioVisualizer';
import WaveformVisualizer from './WaveformVisualizer';
import MusicParticleEffect from './MusicParticleEffect';
import MusicWaveEffect from './MusicWaveEffect';

interface MusicVisualizerPanelProps {
  audioElement: HTMLAudioElement | null;
  isVisible?: boolean;
  onClose?: () => void;
}

export default function MusicVisualizerPanel({ 
  audioElement, 
  isVisible = true,
  onClose 
}: MusicVisualizerPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [visualizerType, setVisualizerType] = useState<'bars' | 'circular' | 'waveform' | 'particles' | 'waves'>('bars');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
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

  // ตรวจสอบสถานะการเล่นเพลง
  if (audioElement) {
    audioElement.addEventListener('play', () => setIsPlaying(true));
    audioElement.addEventListener('pause', () => setIsPlaying(false));
    audioElement.addEventListener('ended', () => setIsPlaying(false));
  }

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 z-[100002]"
      >
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md border border-white/30 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/20 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-gray-800 dark:text-white">
                เอฟเฟคเพลง
              </span>
              {isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                />
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleVisualizerChange}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="เปลี่ยนรูปแบบเอฟเฟค"
              >
                <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <button
                onClick={handleToggleMinimize}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isMinimized ? "ขยาย" : "ย่อ"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="ปิด"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div className="flex flex-col items-center gap-4">
                  {visualizerType === 'bars' ? (
                    <AudioVisualizer 
                      audioElement={audioElement}
                      isVisible={true}
                      className="w-full max-w-sm"
                    />
                  ) : visualizerType === 'circular' ? (
                    <CircularAudioVisualizer 
                      audioElement={audioElement}
                      isVisible={true}
                      size={200}
                      className="mx-auto"
                    />
                  ) : visualizerType === 'waveform' ? (
                    <WaveformVisualizer 
                      audioElement={audioElement}
                      isVisible={true}
                      width={300}
                      height={100}
                      className="w-full max-w-sm"
                    />
                  ) : visualizerType === 'particles' ? (
                    <MusicParticleEffect 
                      audioElement={audioElement}
                      isVisible={true}
                      className="w-full max-w-sm"
                    />
                  ) : (
                    <MusicWaveEffect 
                      audioElement={audioElement}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 