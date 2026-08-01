"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Crosshair } from "lucide-react";
import { BRAIN_REGIONS, type BrainRegionMeta } from "@/lib/brain/regions";
import type { BrainRegionSnapshot } from "@/lib/brain/client";
import { cn } from "@/lib/utils";

interface RegionNode extends BrainRegionMeta {
  angle: number;
  radius: number;
  size: number;
  firingPct: number;
  todayCount: number;
}

interface Particle {
  regionIndex: number;
  progress: number;
  speed: number;
  outbound: boolean;
}

const CORE_LABEL = "PULSE";

function buildNodes(regions: BrainRegionSnapshot[] | undefined): RegionNode[] {
  const byId = new Map((regions ?? []).map((r) => [r.id, r]));
  const maxToday = Math.max(1, ...(regions ?? []).map((r) => r.todayCount));
  return BRAIN_REGIONS.map((meta, i) => {
    const snap = byId.get(meta.id);
    const todayCount = snap?.todayCount ?? 0;
    const recentCount = snap?.recentCount ?? 0;
    return {
      ...meta,
      angle: (i / BRAIN_REGIONS.length) * Math.PI * 2 - Math.PI / 2,
      radius: 1,
      size: 14 + Math.sqrt(todayCount / maxToday) * 20,
      firingPct: Math.min(100, recentCount * 25),
      todayCount,
    };
  });
}

/**
 * Real-time "neural" monitor of this app's own subsystems (see lib/brain/regions.ts
 * for what each node actually measures). Plain canvas 2D, no WebGL/three.js --
 * the orbit-drag effect is a 2D rotation offset, not a real camera. Always dark
 * regardless of the site theme toggle: this is a deliberate exception, a
 * "monitoring console" rather than a themed dashboard page.
 */
export function BrainPulseView({ regions, isLoading }: { regions: BrainRegionSnapshot[] | undefined; isLoading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<RegionNode | null>(null);

  const stateRef = useRef({
    rotation: 0,
    zoom: 1,
    dragging: false,
    dragStartX: 0,
    dragStartRotation: 0,
    particles: [] as Particle[],
    paused: false,
    nodes: buildNodes(regions),
  });

  useEffect(() => {
    stateRef.current.nodes = buildNodes(regions);
  }, [regions]);

  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const findHover = (px: number, py: number): RegionNode | null => {
      const s = stateRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.32 * s.zoom;
      for (const node of s.nodes) {
        const a = node.angle + s.rotation;
        const nx = cx + Math.cos(a) * baseRadius;
        const ny = cy + Math.sin(a) * baseRadius * 0.62;
        if (Math.hypot(px - nx, py - ny) <= node.size + 6) return node;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const s = stateRef.current;
      s.dragging = true;
      s.dragStartX = e.clientX;
      s.dragStartRotation = s.rotation;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.dragging) {
        const dx = e.clientX - s.dragStartX;
        s.rotation = s.dragStartRotation + dx * 0.006;
      } else {
        const rect = canvas.getBoundingClientRect();
        setHovered(findHover(e.clientX - rect.left, e.clientY - rect.top));
      }
    };
    const onPointerUp = () => {
      stateRef.current.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      s.zoom = Math.min(1.6, Math.max(0.6, s.zoom - e.deltaY * 0.001));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const tick = () => {
      const s = stateRef.current;
      if (!s.paused) {
        s.rotation += 0.0009;

        for (const node of s.nodes) {
          if (node.firingPct <= 0) continue;
          if (Math.random() < (node.firingPct / 100) * 0.06) {
            s.particles.push({
              regionIndex: s.nodes.indexOf(node),
              progress: 0,
              speed: 0.012 + Math.random() * 0.01,
              outbound: true,
            });
          }
        }
        s.particles = s.particles
          .map((p) => ({ ...p, progress: p.progress + p.speed }))
          .filter((p) => p.progress < 1);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.32 * s.zoom;

      // connective lines: core -> each region
      for (const node of s.nodes) {
        const a = node.angle + s.rotation;
        const nx = cx + Math.cos(a) * baseRadius;
        const ny = cy + Math.sin(a) * baseRadius * 0.62;
        ctx.strokeStyle = `${node.color}33`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }

      // particles (neural impulses)
      for (const p of s.particles) {
        const node = s.nodes[p.regionIndex];
        if (!node) continue;
        const a = node.angle + s.rotation;
        const nx = cx + Math.cos(a) * baseRadius;
        const ny = cy + Math.sin(a) * baseRadius * 0.62;
        const t = p.outbound ? p.progress : 1 - p.progress;
        const px = cx + (nx - cx) * t;
        const py = cy + (ny - cy) * t;
        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // region nodes
      for (const node of s.nodes) {
        const a = node.angle + s.rotation;
        const nx = cx + Math.cos(a) * baseRadius;
        const ny = cy + Math.sin(a) * baseRadius * 0.62;
        const glow = 0.35 + (node.firingPct / 100) * 0.65;

        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 6 + node.firingPct / 4;
        ctx.globalAlpha = glow;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(nx, ny, node.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.font = "600 10px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#f9fafb";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.9;
        ctx.fillText(node.label, nx, ny + node.size + 14);
        ctx.font = "400 9px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(`${node.todayCount} · firing ${node.firingPct.toFixed(0)}%`, nx, ny + node.size + 26);
        ctx.globalAlpha = 1;
      }

      // core
      const breathe = 1 + Math.sin(Date.now() / 900) * 0.05;
      ctx.save();
      ctx.shadowColor = "#f9fafb";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#f9fafb";
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * breathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.font = "700 10px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#0a0a0b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(CORE_LABEL, cx, cy);
      ctx.textBaseline = "alphabetic";

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[560px] w-full overflow-hidden rounded-xl border border-[#26262b] bg-[#0a0a0b]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute left-4 top-4 text-[11px] text-[#9ca3af]">
        드래그: 회전 · 스크롤: 확대/축소
      </div>

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1.5 rounded-md border border-[#26262b] bg-[#131316] px-2.5 py-1.5 text-[11px] font-medium text-[#f9fafb] transition-colors hover:bg-[#1c1c1f]"
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          {paused ? "재생" : "일시정지"}
        </button>
        <button
          type="button"
          onClick={() => {
            stateRef.current.rotation = 0;
            stateRef.current.zoom = 1;
          }}
          className="flex items-center gap-1.5 rounded-md border border-[#26262b] bg-[#131316] px-2.5 py-1.5 text-[11px] font-medium text-[#f9fafb] transition-colors hover:bg-[#1c1c1f]"
        >
          <Crosshair className="size-3" />
          중앙 정렬
        </button>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: `${hovered.color}55`, background: "#131316" }}
        >
          <div className="font-semibold" style={{ color: hovered.color }}>
            {hovered.label}
          </div>
          <div className="text-[#9ca3af]">{hovered.description}</div>
          <div className="mt-1 text-[#f9fafb]">
            오늘 {hovered.todayCount}건 · 발화율 {hovered.firingPct.toFixed(0)}%
          </div>
        </div>
      )}

      {isLoading && (
        <div className={cn("absolute inset-0 flex items-center justify-center bg-[#0a0a0b]/70 text-sm text-[#9ca3af]")}>
          시스템 상태 불러오는 중…
        </div>
      )}
    </div>
  );
}
