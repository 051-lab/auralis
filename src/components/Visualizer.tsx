'use client';

import React, { useEffect, useRef } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';

interface VisualizerProps {
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAudioEngine().getAnalyser();
    let hue = 0;

    const draw = () => {
      if (!isActive) {
        // Draw idle state
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.size;
      const buffer = analyser.getValue() as Float32Array;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 80;

      // Calculate amplitude for breathing effect
      let amplitude = 0;
      for (let i = 0; i < bufferLength; i++) {
        amplitude += Math.abs(buffer[i]);
      }
      amplitude = amplitude / bufferLength;
      const breathRadius = radius + amplitude * 50;

      // Draw glowing orb
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, breathRadius * 1.5);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.4)`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, breathRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 30;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw waveform ring
      ctx.beginPath();
      const points = 360;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const bufferIndex = Math.floor((i / points) * bufferLength);
        const value = buffer[bufferIndex] || 0;
        const r = breathRadius + value * 60;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.9)`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.6)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      hue = (hue + 0.5) % 360;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="w-full h-full"
      />
      <div className="absolute top-4 left-4 text-xs text-slate-400 font-mono">
        {isActive ? '● LIVE' : '○ STANDBY'}
      </div>
    </div>
  );
};
