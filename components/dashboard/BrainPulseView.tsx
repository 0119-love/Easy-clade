"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Pause, Play, Crosshair } from "lucide-react";
import { BRAIN_REGIONS, STATUS_COLOR, type BrainNodeStatus, type BrainRegionMeta } from "@/lib/brain/regions";
import type { BrainRegionStatus, BrainStatusResponse } from "@/lib/brain/queries";
import { BrainNodeInspector } from "./BrainNodeInspector";
import { cn } from "@/lib/utils";

interface RegionNode extends BrainRegionMeta {
  angle: number;
  status: BrainNodeStatus;
  size: number;
  todayCount: number;
  pulseUntil: number;
  raw: BrainRegionStatus;
}

interface Particle {
  regionIndex: number;
  progress: number;
  speed: number;
}

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PACKET_PROFILE: Record<BrainNodeStatus, { speedMin: number; speedMax: number; spawnProb: number }> = {
  running: { speedMin: 0.018, speedMax: 0.03, spawnProb: 0.1 },
  error: { speedMin: 0.014, speedMax: 0.022, spawnProb: 0.06 },
  idle: { speedMin: 0.004, speedMax: 0.007, spawnProb: 0.006 },
};

function buildNodes(status: BrainStatusResponse | undefined, prev: RegionNode[]): RegionNode[] {
  const byId = new Map((status?.regions ?? []).map((r) => [r.id, r]));
  const prevById = new Map(prev.map((n) => [n.id, n]));
  const maxToday = Math.max(1, ...(status?.regions ?? []).map((r) => r.todayCount));

  return BRAIN_REGIONS.map((meta, i) => {
    const raw = byId.get(meta.id);
    const todayCount = raw?.todayCount ?? 0;
    const previous = prevById.get(meta.id);
    // Real state delta drives the "activity pulse", not a timer -- a node only
    // pulses when its own today-count actually moved since the last poll.
    const grew = previous && todayCount > previous.todayCount;
    return {
      ...meta,
      angle: (i / BRAIN_REGIONS.length) * Math.PI * 2 - Math.PI / 2,
      status: raw?.status ?? "idle",
      size: 15 + Math.sqrt(todayCount / maxToday) * 19,
      todayCount,
      pulseUntil: grew ? Date.now() + 700 : (previous?.pulseUntil ?? 0),
      raw: raw ?? {
        id: meta.id,
        status: "idle",
        recentCount: 0,
        todayCount: 0,
        errorCountToday: 0,
        avgLatencyMs: null,
        costUsdToday: null,
        metrics: [],
      },
    };
  });
}

/**
 * Real-time monitor of this app's own subsystems -- an ops console, not a
 * decorative graph. Plain canvas 2D (no WebGL/three.js); the "orbit" is a 2D
 * rotation offset, not a real camera. Always dark regardless of the site
 * theme toggle -- a deliberate "monitoring console" exception.
 */
export function BrainPulseView({ status, isLoading }: { status: BrainStatusResponse | undefined; isLoading: boolean }) {
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
    nodes: [] as RegionNode[],
    kpis: undefined as BrainStatusResponse["kpis"] | undefined,
  });

  // The RAF loop below reads stateRef (not the `status` prop directly) so it
  // never has to restart on every 4s poll -- restarting would re-attach
  // pointer/wheel listeners and jump the rotation/zoom the user was mid-drag on.
  useEffect(() => {
    stateRef.current.nodes = buildNodes(status, stateRef.current.nodes);
    stateRef.current.kpis = status?.kpis;
  }, [status]);

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

    const nodeScreenPos = (node: RegionNode, s: typeof stateRef.current, cx: number, cy: number, baseRadius: number) => {
      const a = node.angle + s.rotation;
      const breathe = Math.sin(Date.now() / 1400 + node.angle * 3) * 1.4;
      return {
        x: cx + Math.cos(a) * (baseRadius + breathe),
        y: cy + Math.sin(a) * (baseRadius + breathe) * 0.62,
      };
    };

    const findHover = (px: number, py: number): RegionNode | null => {
      const s = stateRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.32 * s.zoom;
      for (const node of s.nodes) {
        const { x: nx, y: ny } = nodeScreenPos(node, s, cx, cy, baseRadius);
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

    const drawBackground = () => {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      grad.addColorStop(0, "#111114");
      grad.addColorStop(1, "#08080a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      const step = 44;
      for (let x = (width / 2) % step; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (height / 2) % step; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const tick = () => {
      const s = stateRef.current;
      const now = Date.now();
      if (!s.paused) {
        s.rotation += 0.0006;

        for (let i = 0; i < s.nodes.length; i++) {
          const node = s.nodes[i];
          const profile = PACKET_PROFILE[node.status];
          if (Math.random() < profile.spawnProb) {
            s.particles.push({
              regionIndex: i,
              progress: 0,
              speed: profile.speedMin + Math.random() * (profile.speedMax - profile.speedMin),
            });
          }
        }
        s.particles = s.particles.map((p) => ({ ...p, progress: p.progress + p.speed })).filter((p) => p.progress < 1);
      }

      drawBackground();

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.32 * s.zoom;

      for (const node of s.nodes) {
        const { x: nx, y: ny } = nodeScreenPos(node, s, cx, cy, baseRadius);
        ctx.strokeStyle = `${node.color}30`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }

      for (const p of s.particles) {
        const node = s.nodes[p.regionIndex];
        if (!node) continue;
        const { x: nx, y: ny } = nodeScreenPos(node, s, cx, cy, baseRadius);
        const px = cx + (nx - cx) * p.progress;
        const py = cy + (ny - cy) * p.progress;
        const color = STATUS_COLOR[node.status];
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const node of s.nodes) {
        const { x: nx, y: ny } = nodeScreenPos(node, s, cx, cy, baseRadius);
        const pulseT = Math.max(0, node.pulseUntil - now) / 700;
        const scale = 1 + Math.sin(now / 1100 + node.angle * 5) * 0.03 + pulseT * 0.4;
        const r = node.size * scale;
        const statusColor = STATUS_COLOR[node.status];

        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 6 + pulseT * 16;
        ctx.globalAlpha = node.status === "idle" ? 0.55 : 0.9;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(nx, ny, r + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.font = "600 10px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#f9fafb";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.92;
        ctx.fillText(node.label, nx, ny + r + 15);
        ctx.font = "400 9px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(`오늘 ${node.todayCount}건`, nx, ny + r + 27);
        ctx.globalAlpha = 1;
      }

      // AI Kernel core
      const breathe = 1 + Math.sin(now / 900) * 0.045;
      const kpis = s.kpis;
      ctx.save();
      ctx.shadowColor = "#f9fafb";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#f9fafb";
      ctx.beginPath();
      ctx.arc(cx, cy, 30 * breathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#0a0a0b";
      ctx.textAlign = "center";
      ctx.font = "700 9px system-ui, -apple-system, sans-serif";
      ctx.fillText("PULSE", cx, cy - 8);
      ctx.font = "600 10px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${kpis?.eventsPerSec.toFixed(1) ?? "0.0"}/s`, cx, cy + 4);
      ctx.font = "500 8px system-ui, -apple-system, sans-serif";
      ctx.fillText(kpis?.avgLatencyMs != null ? `${Math.round(kpis.avgLatencyMs)}ms` : "-", cx, cy + 15);

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
      className="relative h-[520px] w-full overflow-hidden rounded-xl border border-[#26262b] bg-[#0a0a0b]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: NOISE_BG }} />

      <div className="pointer-events-none absolute left-4 top-4 text-[11px] text-[#6b7280]">
        드래그: 회전 · 스크롤: 확대/축소
      </div>

      <div className="absolute right-4 bottom-4 flex gap-2">
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

      <AnimatePresence>{hovered && <BrainNodeInspector key={hovered.id} region={hovered.raw} />}</AnimatePresence>

      {isLoading && (
        <div className={cn("absolute inset-0 flex items-center justify-center bg-[#0a0a0b]/70 text-sm text-[#9ca3af]")}>
          시스템 상태 불러오는 중…
        </div>
      )}
    </div>
  );
}
