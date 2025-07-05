'use client';

import { useEffect, useRef, useState } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  animationDelay: number;
  liftHeight: number; // ความสูงที่ฟองลอยได้
  originalY: number; // ตำแหน่ง Y เริ่มต้น
}

export default function BubbleEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const animationRef = useRef<number>();
  
  // ตรวจสอบโหมดธีม
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // ฟังการเปลี่ยนแปลงธีม
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ตั้งค่าขนาด canvas ให้เต็มหน้าจอ
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // สร้างฟองสบู่เริ่มต้น
    const createBubbles = () => {
      const bubbles: Bubble[] = [];
      const bubbleCount = 60; // เพิ่มจำนวนฟอง

      for (let i = 0; i < bubbleCount; i++) {
        // สร้างฟองทั่วความกว้างจอ 100%
        let x, y;
        
        x = Math.random() * canvas.width; // 100% ของความกว้างจอ
        y = canvas.height + Math.random() * 15;

        // คำนวณระยะห่างจากขอบจอ (แนวนอน)
        const distanceFromEdge = Math.min(
          x, // ระยะจากขอบซ้าย
          canvas.width - x // ระยะจากขอบขวา
        );

        // คำนวณขนาดฟองตามระยะห่างจากขอบ (ยิ่งไกลจากขอบ ยิ่งใหญ่)
        const maxDistance = canvas.width / 2;
        const sizeMultiplier = 1 + (distanceFromEdge / maxDistance) * 1.2; // 1-2.2 เท่า
        const baseSize = Math.random() * 6 + 5; // ขนาดพื้นฐาน 5-11px
        const size = baseSize * sizeMultiplier;

        // ฟองลอยขึ้นแบบสุ่มจนถึงบนจอ
        const maxLiftHeight = canvas.height; // 100% ของความสูงจอ
        const liftHeight = maxLiftHeight * (0.2 + Math.random() * 0.8); // สุ่มความสูง 20%-100%

        // ปรับความเข้มตามโหมดธีม
        const baseOpacity = isDarkMode ? 0.12 : 0.25; // โหมดสว่างจะเข้มกว่า
        const opacityRange = isDarkMode ? 0.3 : 0.4; // โหมดสว่างจะมีช่วงความเข้มกว้างกว่า

        bubbles.push({
          id: i,
          x,
          y,
          size: size,
          speed: Math.random() * 0.3 + 0.1, // ความเร็วช้าลง
          opacity: Math.random() * opacityRange + baseOpacity, // ปรับความเข้มตามธีม
          animationDelay: Math.random() * 1000, // ดีเลย์การเคลื่อนไหว
          liftHeight: liftHeight,
          originalY: y,
        });
      }

      return bubbles;
    };

    bubblesRef.current = createBubbles();

    // ฟังก์ชันวาดฟองสบู่
    const drawBubble = (bubble: Bubble) => {
      ctx.save();
      
      // สร้าง gradient สำหรับฟองสบู่
      const gradient = ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.size
      );
      
      // สีชมพูพาสเทล
      gradient.addColorStop(0, `rgba(255, 182, 193, ${bubble.opacity})`); // Light pink
      gradient.addColorStop(0.3, `rgba(255, 192, 203, ${bubble.opacity * 0.8})`); // Pink
      gradient.addColorStop(0.7, `rgba(255, 182, 193, ${bubble.opacity * 0.4})`); // Light pink
      gradient.addColorStop(1, `rgba(255, 182, 193, 0)`); // Transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fill();

      // เพิ่ม highlight effect
      const highlightGradient = ctx.createRadialGradient(
        bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, 0,
        bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.5
      );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity * 0.6})`);
      highlightGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // ฟังก์ชันอัพเดทและวาด
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bubblesRef.current.forEach((bubble) => {
        // คำนวณระยะห่างจากขอบจอปัจจุบัน (แนวนอน)
        const currentDistanceFromEdge = Math.min(
          bubble.x, // ระยะจากขอบซ้าย
          canvas.width - bubble.x // ระยะจากขอบขวา
        );

        // คำนวณความสูงที่ฟองลอยได้ (ใช้ค่าที่กำหนดไว้ตอนสร้างฟอง)
        const currentLiftHeight = bubble.liftHeight;
        const maxDistance = canvas.width / 2;

        // เคลื่อนที่ฟองขึ้นด้านบน
        bubble.y -= bubble.speed;

        // ตรวจสอบว่าฟองลอยเกินความสูงที่กำหนดหรือไม่
        const maxY = -currentLiftHeight; // ฟองจะลอยขึ้นไปถึง -liftHeight (ด้านบนจอ)
        
        // สุ่มให้ฟองหายไปก่อนถึงขอบจอ (20% โอกาส)
        const shouldDisappear = Math.random() < 0.2 && bubble.y < -currentLiftHeight * 0.7;
        
        if (bubble.y < maxY || shouldDisappear) {
          // สร้างฟองใหม่ทั่วความกว้างจอ 100%
          let newX, newY;
          
          newX = Math.random() * canvas.width; // 100% ของความกว้างจอ
          newY = canvas.height + Math.random() * 15;

          // คำนวณขนาดใหม่ตามตำแหน่งใหม่
          const newDistanceFromEdge = Math.min(
            newX,
            canvas.width - newX
          );
          const newSizeMultiplier = 1 + (newDistanceFromEdge / maxDistance) * 1.2;
          const newBaseSize = Math.random() * 6 + 5;
          const newSize = newBaseSize * newSizeMultiplier;

          // คำนวณความสูงการลอยใหม่ (สุ่ม)
          const newMaxLiftHeight = canvas.height;
          const newLiftHeight = newMaxLiftHeight * (0.2 + Math.random() * 0.8);

          // อัพเดทฟอง
          bubble.x = newX;
          bubble.y = newY;
          bubble.size = newSize;
          bubble.originalY = newY;
          bubble.liftHeight = newLiftHeight;
          
          // ปรับความเข้มตามโหมดธีม
          const baseOpacity = isDarkMode ? 0.12 : 0.25;
          const opacityRange = isDarkMode ? 0.3 : 0.4;
          bubble.opacity = Math.random() * opacityRange + baseOpacity;
        }

        // เพิ่มการเคลื่อนไหวแบบแกว่งเล็กน้อย
        bubble.x += Math.sin(Date.now() * 0.0008 + bubble.id) * 0.15;

        drawBubble(bubble);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // เริ่มการเคลื่อนไหวหลังจากดีเลย์
    setTimeout(() => {
      animate();
    }, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        background: 'transparent',
      }}
    />
  );
} 