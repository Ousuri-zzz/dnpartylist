'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  audioElement?: HTMLAudioElement | null;
  isVisible?: boolean;
  className?: string;
}

export default function AudioVisualizer({ 
  analyser, 
  audioElement,
  isVisible = true,
  className = "" 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!analyser || !isVisible) return;

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyser || !dataArrayRef.current || !ctx || !canvas) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArrayRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArrayRef.current.length) * 4.2;
      let barHeight;
      let x = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const hue = (360 * i) / dataArrayRef.current.length;
        ctx.fillStyle = `hsl(${hue}, 100%, 68%)`;
        barHeight = ((dataArrayRef.current[i] / 255) ** 1.2) * canvas.height * 1.7;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        const radius = Math.min(barWidth, barHeight) / 2.5;
        if (ctx.roundRect) {
          ctx.roundRect(
            x,
            canvas.height - barHeight,
            barWidth,
            barHeight,
            [radius, radius, 0, 0]
          );
        } else {
          ctx.rect(x, canvas.height - barHeight, barWidth, barHeight);
        }
        ctx.fill();
        x += barWidth;
      }
      ctx.globalAlpha = 1;
    };
    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isVisible]);

  if (!isVisible || !analyser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isPlaying ? 1 : 0.3, scale: isPlaying ? 1 : 0.9 }}
      transition={{ duration: 0.3 }}
      className={`relative hidden sm:block ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={220}
        height={32}
        className="rounded-lg border border-white/20 backdrop-blur-sm bg-transparent"
      />
    </motion.div>
  );
} 