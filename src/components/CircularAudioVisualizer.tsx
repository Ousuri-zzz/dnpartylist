'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface CircularAudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isVisible?: boolean;
  className?: string;
  size?: number;
}

export default function CircularAudioVisualizer({ 
  audioElement, 
  isVisible = true,
  className = "",
  size = 200
}: CircularAudioVisualizerProps) {
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

      analyser.fftSize = 256;
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
      const radius = Math.min(centerX, centerY) - 20;

      // วาดวงกลมพื้นหลัง
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // วาดแถบที่ขยับตามเพลง
      const barCount = 64;
      const angleStep = (2 * Math.PI) / barCount;

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep;
        const dataIndex = Math.floor((i / barCount) * dataArrayRef.current.length);
        const value = dataArrayRef.current[dataIndex] || 0;
        
        const barHeight = (value / 255) * radius * 0.8;
        const barWidth = 3;
        
        const x1 = centerX + Math.cos(angle) * (radius - barHeight);
        const y1 = centerY + Math.sin(angle) * (radius - barHeight);
        const x2 = centerX + Math.cos(angle) * radius;
        const y2 = centerY + Math.sin(angle) * radius;

        // สร้าง gradient สีตามความถี่
        const hue = (i / barCount) * 360;
        const alpha = value / 255;
        
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // วาดจุดกลางที่ขยับตามความดัง
      const averageValue = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
      const pulseRadius = (averageValue / 255) * 20 + 5;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = `hsla(${averageValue}, 70%, 60%, ${averageValue / 255})`;
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
        width={size}
        height={size}
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