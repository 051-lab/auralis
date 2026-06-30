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

    let idlePhase = 0;
    const baseHue = 205;
    const secondaryHue = 265;
    const accentHue = 185;

    const prepareCanvas = () => {
      const { width, height, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };

    const draw = () => {
      const { width, height } = prepareCanvas();
      const centerX = width / 2;
      const centerY = height / 2;
      const minSize = Math.min(width, height);
      const radius = minSize * 0.225;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(3, 7, 18, 0.32)';
      ctx.fillRect(0, 0, width, height);

      let liveBuffer: Float32Array | null = null;

      if (isActive) {
        try {
          liveBuffer = getAudioEngine().getAnalyser().getValue() as Float32Array;
        } catch (err) {
          liveBuffer = null;
        }
      }

      const analyserSize = liveBuffer?.length || 2048;
      const bufferLength = liveBuffer?.length || analyserSize;
      const buffer = liveBuffer && liveBuffer.length > 0 ? liveBuffer : new Float32Array(bufferLength);

      if (!isActive) {
        for (let i = 0; i < bufferLength; i += 1) {
          buffer[i] = Math.sin(i * 0.035 + idlePhase) * 0.08;
        }
      }

      let amplitude = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        amplitude += Math.abs(buffer[i]);
      }
      amplitude = bufferLength > 0 ? amplitude / bufferLength : 0;
      const idleBreath = isActive ? 0 : (Math.sin(idlePhase) + 1) * 0.018;
      const breathRadius = radius + amplitude * minSize * 0.14 + idleBreath * minSize;

      ctx.globalCompositeOperation = 'lighter';

      for (let ribbon = 0; ribbon < 5; ribbon += 1) {
        const yOffset = (ribbon - 2) * minSize * 0.032;
        const alpha = isActive ? 0.17 - ribbon * 0.016 : 0.105 - ribbon * 0.01;
        const phase = idlePhase * (0.45 + ribbon * 0.08) + ribbon * 1.3;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const progress = x / width;
          const bufferIndex = Math.floor(progress * (bufferLength - 1));
          const signal = buffer[bufferIndex] || 0;
          const wave =
            Math.sin(progress * Math.PI * (5 + ribbon * 0.8) + phase) * minSize * 0.036 +
            signal * minSize * 0.15;
          const y = centerY + yOffset + wave;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        const ribbonHue = ribbon % 2 === 0 ? baseHue + ribbon * 5 : secondaryHue - ribbon * 4;
        ctx.strokeStyle = `hsla(${ribbonHue}, 100%, ${62 + ribbon * 4}%, ${alpha})`;
        ctx.lineWidth = 1 + ribbon * 0.36;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${ribbonHue}, 100%, 62%, 0.5)`;
        ctx.stroke();
      }

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        breathRadius * 1.5
      );
      gradient.addColorStop(0, 'rgba(1, 4, 13, 0.9)');
      gradient.addColorStop(0.2, `hsla(${baseHue}, 100%, 58%, ${isActive ? 0.42 : 0.24})`);
      gradient.addColorStop(0.48, `hsla(${secondaryHue}, 100%, 62%, ${isActive ? 0.32 : 0.17})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, breathRadius * 2.05, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 54;
      ctx.shadowColor = `hsla(${baseHue}, 100%, 62%, 0.9)`;
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let ring = 0; ring < 4; ring += 1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, breathRadius + ring * minSize * 0.027, 0, Math.PI * 2);
        const ringHue = ring % 2 === 0 ? accentHue : secondaryHue;
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 66%, ${0.38 - ring * 0.055})`;
        ctx.lineWidth = ring === 0 ? 1.6 : 1.05;
        ctx.stroke();
      }

      ctx.beginPath();
      const points = 360;
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * Math.PI * 2;
        const bufferIndex = Math.floor((i / points) * bufferLength);
        const value = buffer[bufferIndex] || 0;
        const r = breathRadius + value * minSize * 0.15;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${baseHue + Math.sin(idlePhase * 0.8) * 8}, 100%, 70%, 0.9)`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 28;
      ctx.shadowColor = `hsla(${baseHue}, 100%, 62%, 0.72)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const particleCount = isActive ? 90 : 54;
      for (let i = 0; i < particleCount; i += 1) {
        const angle = (i / particleCount) * Math.PI * 2 + idlePhase * (0.08 + (i % 5) * 0.008);
        const orbit = breathRadius * (1.16 + ((i * 17) % 42) / 100);
        const sparkle = 0.35 + Math.sin(idlePhase * 1.8 + i) * 0.25;
        const x = centerX + Math.cos(angle) * orbit;
        const y = centerY + Math.sin(angle) * orbit;

        ctx.beginPath();
        ctx.arc(x, y, 0.8 + sparkle * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${[accentHue, baseHue, secondaryHue, 222][i % 4]}, 100%, 70%, ${isActive ? 0.5 : 0.24})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      idlePhase += 0.018;
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
    <div className="relative aspect-[2.7/1] min-h-[300px] max-h-[360px] w-full overflow-hidden rounded-xl bg-[#020612] shadow-[inset_0_0_80px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.24),transparent_28%),radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.2),transparent_43%),linear-gradient(90deg,rgba(34,211,238,0.04),rgba(139,92,246,0.1),rgba(34,211,238,0.04))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,18,0.34),transparent_36%,rgba(2,6,18,0.48))]" />
      <div className="absolute left-0 right-0 top-1/2 h-40 -translate-y-1/2 opacity-90">
        <div className="absolute left-0 top-8 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent shadow-[0_0_28px_rgba(34,211,238,0.32)]" />
        <div className="absolute left-0 top-14 h-px w-full bg-gradient-to-r from-transparent via-violet-300/35 to-transparent shadow-[0_0_30px_rgba(139,92,246,0.34)]" />
        <div className="absolute left-0 top-20 h-px w-full bg-gradient-to-r from-transparent via-cyan-200/24 to-transparent shadow-[0_0_22px_rgba(34,211,238,0.26)]" />
        <div className="absolute left-0 top-[6.5rem] h-px w-full bg-gradient-to-r from-transparent via-violet-200/20 to-transparent shadow-[0_0_20px_rgba(139,92,246,0.24)]" />
        <div className="absolute left-0 top-32 h-px w-full bg-gradient-to-r from-transparent via-cyan-200/16 to-transparent" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/65 bg-slate-950/80 shadow-[0_0_74px_rgba(34,211,238,0.48),0_0_110px_rgba(139,92,246,0.22),inset_0_0_52px_rgba(139,92,246,0.32)]" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/25 bg-[#01030b]/90 shadow-[inset_0_0_34px_rgba(0,0,0,0.78)]" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/22 shadow-[0_0_58px_rgba(139,92,246,0.12)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-screen" aria-label="Audio visualizer" />
      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-300 backdrop-blur" aria-live="polite">
        <span className={isActive ? 'text-emerald-300' : 'text-cyan-300'}>{isActive ? '● LIVE' : '○ STANDBY'}</span>
        <span className="text-slate-500">Signal Flow</span>
      </div>
    </div>
  );
};
