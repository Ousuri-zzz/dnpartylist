'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MusicWaveEffectProps {
  audioElement: HTMLAudioElement | null;
  isVisible?: boolean;
  className?: string;
}

export default function MusicWaveEffect({ 
  audioElement, 
  isVisible = true,
  className = "" 
}: MusicWaveEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioElement || !isVisible) return;

    // ตรวจสอบว่าเป็น browser environment
    if (typeof window === 'undefined') return;

    let audioContext: AudioContext;
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audioElement);

      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch (error) {
      console.warn('AudioContext not supported:', error);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !ctx || !canvas) return;

      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) - 20;

      // วาดคลื่นหลายชั้น
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const angle = (i / dataArrayRef.current.length) * Math.PI * 2;
          const value = dataArrayRef.current[i] / 255;
          const radius = maxRadius * (0.3 + layer * 0.2) + value * 50;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // สร้าง gradient สำหรับแต่ละชั้น
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        const colors = [
          ['rgba(255, 107, 107, 0.8)', 'rgba(255, 107, 107, 0.2)'],
          ['rgba(78, 205, 196, 0.8)', 'rgba(78, 205, 196, 0.2)'],
          ['rgba(69, 183, 209, 0.8)', 'rgba(69, 183, 209, 0.2)']
        ];
        
        gradient.addColorStop(0, colors[layer][0]);
        gradient.addColorStop(1, colors[layer][1]);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // วาดเส้นขอบ
        ctx.strokeStyle = colors[layer][0];
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // วาดจุดกลางที่ขยับตามความดัง
      const averageValue = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
      const pulseRadius = (averageValue / 255) * 30 + 10;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, pulseRadius
      );
      centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      
      ctx.fillStyle = centerGradient;
      ctx.fill();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioElement, isVisible]);

  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isPlaying ? 1 : 0.3, scale: isPlaying ? 1 : 0.9 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-full border border-white/20 backdrop-blur-sm"
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
          <span className="text-white/60 text-sm">ไม่มีการเล่นเพลง</span>
        </div>
      )}
    </motion.div>
  );
} 