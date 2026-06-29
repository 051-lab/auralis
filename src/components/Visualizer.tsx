'use client';

import React, { useEffect, useRef } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';

interface VisualizerProps {
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const sizeRef = useRef({ width: 800, height: 450, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAudioEngine().getAnalyser();
    let hue = 0;

    const prepareCanvas = () => {
      const { width, height, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };

    const draw = () => {
      const { width, height } = prepareCanvas();

      if (!isActive) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.18, 0, Math.PI * 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.size;
      const buffer = analyser.getValue() as Float32Array;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.18;

      let amplitude = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        amplitude += Math.abs(buffer[i]);
      }
      amplitude /= bufferLength;
      const breathRadius = radius + amplitude * Math.min(width, height) * 0.11;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        breathRadius * 1.5
      );
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

      ctx.beginPath();
      const points = 360;
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * Math.PI * 2;
        const bufferIndex = Math.floor((i / points) * bufferLength);
        const value = buffer[bufferIndex] || 0;
        const r = breathRadius + value * Math.min(width, height) * 0.13;
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
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Audio visualizer" />
      <div className="absolute top-4 left-4 text-xs text-slate-400 font-mono" aria-live="polite">
        {isActive ? '● LIVE' : '○ STANDBY'}
      </div>
    </div>
  );
};
