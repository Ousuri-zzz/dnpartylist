'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BackgroundMusicEffectProps {
  audioElement: HTMLAudioElement | null;
  isVisible?: boolean;
}

export default function BackgroundMusicEffect({ 
  audioElement, 
  isVisible = true
}: BackgroundMusicEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioElement || !isVisible) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ตั้งค่าขนาด canvas ให้เต็มหน้าจอ
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !ctx || !canvas) return;

      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY);

      // วาดวงกลมหลายชั้นที่ขยับตามเพลง
      for (let layer = 0; layer < 5; layer++) {
        const averageValue = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        const intensity = averageValue / 255;
        
        const radius = maxRadius * (0.1 + layer * 0.15) + intensity * 100;
        const alpha = (1 - layer * 0.15) * intensity * 0.3;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        const colors = [
          ['rgba(255, 107, 107, 0.1)', 'rgba(255, 107, 107, 0.05)'],
          ['rgba(78, 205, 196, 0.1)', 'rgba(78, 205, 196, 0.05)'],
          ['rgba(69, 183, 209, 0.1)', 'rgba(69, 183, 209, 0.05)'],
          ['rgba(150, 206, 180, 0.1)', 'rgba(150, 206, 180, 0.05)'],
          ['rgba(254, 202, 87, 0.1)', 'rgba(254, 202, 87, 0.05)']
        ];
        
        gradient.addColorStop(0, colors[layer][0]);
        gradient.addColorStop(1, colors[layer][1]);
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // วาดอนุภาคที่กระจายออกจากศูนย์กลาง
      for (let i = 0; i < dataArrayRef.current.length; i += 8) {
        const value = dataArrayRef.current[i] / 255;
        if (value > 0.2) {
          const angle = (i / dataArrayRef.current.length) * Math.PI * 2;
          const distance = value * 200;
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;
          
          ctx.beginPath();
          ctx.arc(x, y, value * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(i / dataArrayRef.current.length) * 360}, 70%, 60%, ${value * 0.3})`;
          ctx.fill();
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
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
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlaying ? 0.3 : 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 pointer-events-none z-0"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </motion.div>
  );
} 