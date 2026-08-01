"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { BRAIN_REGIONS, type BrainRegionId } from "@/lib/brain/regions";
import type { BrainGraphSnapshot } from "@/lib/brain/client";
import { cn } from "@/lib/utils";

const REGION_COLOR = new Map(BRAIN_REGIONS.map((r) => [r.id, r.color]));
const REGION_LABEL = new Map(BRAIN_REGIONS.map((r) => [r.id, r.label]));

interface SimNode extends SimulationNodeDatum {
  id: string;
  kind: "hub" | "leaf";
  region: BrainRegionId;
  label: string;
  degree: number;
}
type SimLink = SimulationLinkDatum<SimNode>;

/**
 * Obsidian-style force-directed graph of this user's actual entities (see
 * lib/brain/graph.ts for the aggregation). Plain canvas 2D + d3-force --
 * d3-force only computes positions, it never touches the DOM, so rendering
 * stays in our hands the same way BrainPulseView does. Always dark, same
 * "monitoring console" exception as the Pulse view.
 */
export function BrainGraphView({ graph, isLoading }: { graph: BrainGraphSnapshot | undefined; isLoading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<SimNode | null>(null);

  const stateRef = useRef({
    sim: null as Simulation<SimNode, SimLink> | null,
    nodes: [] as SimNode[],
    links: [] as SimLink[],
    pan: { x: 0, y: 0 },
    zoom: 1,
    panning: false,
    panStart: { x: 0, y: 0, panX: 0, panY: 0 },
    draggingNode: null as SimNode | null,
  });

  // (Re)build the simulation whenever fresh graph data arrives.
  useEffect(() => {
    if (!graph) return;
    const degree = new Map<string, number>();
    for (const e of graph.edges) {
      const s = typeof e.source === "string" ? e.source : (e.source as SimNode).id;
      const t = typeof e.target === "string" ? e.target : (e.target as SimNode).id;
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 }));
    const links: SimLink[] = graph.edges.map((e) => ({ source: e.source, target: e.target }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => (((l.source as SimNode).kind ?? "leaf") === "hub" ? 70 : 26))
          .strength(0.5),
      )
      .force("charge", forceManyBody().strength(-90))
      .force("collide", forceCollide<SimNode>((d) => (d.kind === "hub" ? 10 + Math.sqrt(d.degree) * 2 : 6)))
      .force("center", forceCenter(0, 0))
      .alpha(1);

    stateRef.current.sim?.stop();
    stateRef.current.sim = sim;
    stateRef.current.nodes = nodes;
    stateRef.current.links = links;
  }, [graph]);

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

    const toWorld = (px: number, py: number) => {
      const s = stateRef.current;
      return { x: (px - width / 2 - s.pan.x) / s.zoom, y: (py - height / 2 - s.pan.y) / s.zoom };
    };
    const toScreen = (x: number, y: number) => {
      const s = stateRef.current;
      return { x: width / 2 + s.pan.x + x * s.zoom, y: height / 2 + s.pan.y + y * s.zoom };
    };

    const hitTest = (px: number, py: number): SimNode | null => {
      const world = toWorld(px, py);
      let closest: SimNode | null = null;
      let closestDist = Infinity;
      for (const n of stateRef.current.nodes) {
        if (n.x == null || n.y == null) continue;
        const r = n.kind === "hub" ? 10 + Math.sqrt(n.degree) * 2 : 6;
        const d = Math.hypot(world.x - n.x, world.y - n.y);
        if (d <= r + 4 && d < closestDist) {
          closest = n;
          closestDist = d;
        }
      }
      return closest;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const s = stateRef.current;
      const hit = hitTest(px, py);
      if (hit) {
        s.draggingNode = hit;
        hit.fx = hit.x;
        hit.fy = hit.y;
        s.sim?.alphaTarget(0.3).restart();
      } else {
        s.panning = true;
        s.panStart = { x: e.clientX, y: e.clientY, panX: s.pan.x, panY: s.pan.y };
      }
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const s = stateRef.current;
      if (s.draggingNode) {
        const world = toWorld(px, py);
        s.draggingNode.fx = world.x;
        s.draggingNode.fy = world.y;
      } else if (s.panning) {
        s.pan.x = s.panStart.panX + (e.clientX - s.panStart.x);
        s.pan.y = s.panStart.panY + (e.clientY - s.panStart.y);
      } else {
        setHovered(hitTest(px, py));
      }
    };
    const onPointerUp = () => {
      const s = stateRef.current;
      if (s.draggingNode) {
        s.draggingNode.fx = null;
        s.draggingNode.fy = null;
        s.sim?.alphaTarget(0);
      }
      s.draggingNode = null;
      s.panning = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      s.zoom = Math.min(3, Math.max(0.25, s.zoom - e.deltaY * 0.0012));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(0, 0, width, height);

      for (const link of s.links) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (source.x == null || target.x == null) continue;
        const a = toScreen(source.x, source.y!);
        const b = toScreen(target.x, target.y!);
        const color = REGION_COLOR.get(target.region) ?? "#6b7280";
        ctx.strokeStyle = `${color}2e`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const n of s.nodes) {
        if (n.x == null || n.y == null) continue;
        const { x, y } = toScreen(n.x, n.y);
        const color = REGION_COLOR.get(n.region) ?? "#9ca3af";
        const r = (n.kind === "hub" ? 10 + Math.sqrt(n.degree) * 2 : 6) * s.zoom;
        const isHovered = hovered?.id === n.id;

        ctx.save();
        if (n.kind === "hub" || isHovered) {
          ctx.shadowColor = color;
          ctx.shadowBlur = n.kind === "hub" ? 10 : 14;
        }
        ctx.globalAlpha = n.kind === "hub" ? 0.95 : isHovered ? 1 : 0.75;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (n.kind === "hub" || isHovered) {
          ctx.font = n.kind === "hub" ? "600 11px system-ui, -apple-system, sans-serif" : "500 10px system-ui, sans-serif";
          ctx.fillStyle = "#f9fafb";
          ctx.textAlign = "center";
          ctx.fillText(n.kind === "hub" ? (REGION_LABEL.get(n.region) ?? n.label) : n.label, x, y + r + 12);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [hovered]);

  return (
    <div
      ref={containerRef}
      className="relative h-[560px] w-full overflow-hidden rounded-xl border border-[#26262b] bg-[#0a0a0b]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute left-4 top-4 text-[11px] text-[#9ca3af]">
        드래그: 이동/노드 재배치 · 스크롤: 확대/축소
      </div>

      {hovered && (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-[#26262b] bg-[#131316] px-3 py-2 text-xs">
          <div className="font-semibold" style={{ color: REGION_COLOR.get(hovered.region) }}>
            {REGION_LABEL.get(hovered.region) ?? hovered.region}
          </div>
          <div className="text-[#f9fafb]">{hovered.label}</div>
        </div>
      )}

      {isLoading && (
        <div className={cn("absolute inset-0 flex items-center justify-center bg-[#0a0a0b]/70 text-sm text-[#9ca3af]")}>
          그래프 데이터 불러오는 중…
        </div>
      )}
    </div>
  );
}
