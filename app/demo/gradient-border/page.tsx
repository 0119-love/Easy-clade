"use client";

import { useEffect, useRef } from "react";

// Public demo page (see proxy.ts's PUBLIC_PREFIXES) -- no login required,
// just a standalone showcase of the cursor-tracked gradient border effect.
export default function GradientBorderDemoPage() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll<HTMLElement>("[data-card]"));

    function onMove(e: PointerEvent) {
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        card.classList.toggle("gbe-is-active", inside);
        if (inside) {
          card.style.setProperty("--mx", `${e.clientX - r.left}px`);
          card.style.setProperty("--my", `${e.clientY - r.top}px`);
        }
      }
    }
    function onLeave() {
      for (const card of cards) card.classList.remove("gbe-is-active");
    }

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="gbe-page">
      <style>{CSS}</style>
      <div className="gbe-content">
        <h1 className="gbe-h1">
          <span className="gbe-accent">Gradient</span> Border Effect
        </h1>
        <p className="gbe-subtitle">
          A ring of light that traces each card&apos;s edge as the pointer moves — one delegated listener on the
          container drives every card at once.
        </p>

        <div className="gbe-panel">
          <div className="gbe-stage" ref={stageRef}>
            <article className="gbe-card" data-card>
              <div className="gbe-card-top">
                <span className="gbe-tag">Pro</span>
                <div className="gbe-icon gbe-icon-radar" aria-hidden="true">
                  <span className="gbe-ring gbe-ring-3" />
                  <span className="gbe-ring gbe-ring-2" />
                  <span className="gbe-ring gbe-ring-1" />
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M4 3l15 6.2-6.1 2-2 6.1z" />
                  </svg>
                </div>
                <h2 className="gbe-card-heading">Wherever you go, the cursor follows</h2>
              </div>
              <button className="gbe-follow-btn" type="button">
                Follow
              </button>
            </article>

            <article className="gbe-card" data-card>
              <div className="gbe-card-top">
                <span className="gbe-tag">Pro</span>
                <div className="gbe-icon gbe-icon-code" aria-hidden="true">
                  <span className="gbe-glyph gbe-g3">&lt;/&gt;</span>
                  <span className="gbe-glyph gbe-g2">&lt;/&gt;</span>
                  <span className="gbe-glyph gbe-g1">&lt;/&gt;</span>
                </div>
                <h2 className="gbe-card-heading">One event listener powers it all</h2>
              </div>
              <button className="gbe-follow-btn" type="button">
                Follow
              </button>
            </article>
          </div>
        </div>

        <div className="gbe-codewin">
          <div className="gbe-codewin-header">
            <span className="gbe-dot gbe-dot-red" />
            <span className="gbe-dot gbe-dot-yellow" />
            <span className="gbe-dot gbe-dot-green" />
          </div>
          <pre>
            <span className="gbe-tok-sel">.card</span>
            <span className="gbe-tok-punct"> {"{"}</span>
            {"\n  "}
            <span className="gbe-tok-prop">position</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">relative</span>
            <span className="gbe-tok-punct">;</span>
            {"\n  "}
            <span className="gbe-tok-prop">aspect-ratio</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">3 / 4</span>
            <span className="gbe-tok-punct">;</span>
            {"\n  "}
            <span className="gbe-tok-prop">border-radius</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">20px</span>
            <span className="gbe-tok-punct">;</span>
            {"\n"}
            <span className="gbe-tok-punct">{"}"}</span>
            {"\n\n"}
            <span className="gbe-tok-com">{"/* the ring is a masked radial-gradient, positioned by the pointer */"}</span>
            {"\n"}
            <span className="gbe-tok-sel">.card</span>
            <span className="gbe-tok-punct">::before {"{"}</span>
            {"\n  "}
            <span className="gbe-tok-prop">position</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">absolute</span>
            <span className="gbe-tok-punct">;</span> <span className="gbe-tok-prop">inset</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">0</span>
            <span className="gbe-tok-punct">;</span> <span className="gbe-tok-prop">padding</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">1.5px</span>
            <span className="gbe-tok-punct">;</span>
            {"\n  "}
            <span className="gbe-tok-prop">background</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-func">radial-gradient</span>
            <span className="gbe-tok-punct">(</span>
            <span className="gbe-tok-val">220px circle at var(--mx) var(--my)</span>
            <span className="gbe-tok-punct">,</span>
            {"\n    "}
            <span className="gbe-tok-val">var(--accent)</span>
            <span className="gbe-tok-punct">,</span> <span className="gbe-tok-val">transparent 65%</span>
            <span className="gbe-tok-punct">);</span>
            {"\n  "}
            <span className="gbe-tok-prop">mask</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-func">linear-gradient</span>
            <span className="gbe-tok-punct">(#000 0 0) content-box,</span>
            {"\n        "}
            <span className="gbe-tok-func">linear-gradient</span>
            <span className="gbe-tok-punct">(#000 0 0);</span>
            {"\n  "}
            <span className="gbe-tok-prop">mask-composite</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">exclude</span>
            <span className="gbe-tok-punct">;</span>
            {"\n  "}
            <span className="gbe-tok-prop">opacity</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">0</span>
            <span className="gbe-tok-punct">;</span> <span className="gbe-tok-prop">transition</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">opacity .35s ease</span>
            <span className="gbe-tok-punct">;</span>
            {"\n"}
            <span className="gbe-tok-punct">{"}"}</span>
            {"\n"}
            <span className="gbe-tok-sel">.card.is-active</span>
            <span className="gbe-tok-punct">::before {"{"}</span> <span className="gbe-tok-prop">opacity</span>
            <span className="gbe-tok-punct">:</span> <span className="gbe-tok-val">1</span>
            <span className="gbe-tok-punct">;</span> <span className="gbe-tok-punct">{"}"}</span>
            {"\n\n"}
            <span className="gbe-tok-com">{"// one listener on the container, not one per card"}</span>
            {"\n"}
            <span className="gbe-tok-kw">stage</span>
            <span className="gbe-tok-punct">.</span>
            <span className="gbe-tok-func">addEventListener</span>
            <span className="gbe-tok-punct">(</span>
            <span className="gbe-tok-str">&quot;pointermove&quot;</span>
            <span className="gbe-tok-punct">, (e) =&gt; {"{"}</span>
            {"\n  "}
            <span className="gbe-tok-kw">for</span> <span className="gbe-tok-punct">(</span>
            <span className="gbe-tok-kw">const</span> card <span className="gbe-tok-kw">of</span> cards
            <span className="gbe-tok-punct">) {"{"}</span>
            {"\n    "}
            <span className="gbe-tok-kw">const</span> r <span className="gbe-tok-punct">=</span> card
            <span className="gbe-tok-punct">.</span>
            <span className="gbe-tok-func">getBoundingClientRect</span>
            <span className="gbe-tok-punct">();</span>
            {"\n    "}
            card<span className="gbe-tok-punct">.</span>style<span className="gbe-tok-punct">.</span>
            <span className="gbe-tok-func">setProperty</span>
            <span className="gbe-tok-punct">(</span>
            <span className="gbe-tok-str">&quot;--mx&quot;</span>
            <span className="gbe-tok-punct">, `${"{"}e.clientX - r.left{"}"}px`);</span>
            {"\n    "}
            card<span className="gbe-tok-punct">.</span>style<span className="gbe-tok-punct">.</span>
            <span className="gbe-tok-func">setProperty</span>
            <span className="gbe-tok-punct">(</span>
            <span className="gbe-tok-str">&quot;--my&quot;</span>
            <span className="gbe-tok-punct">, `${"{"}e.clientY - r.top{"}"}px`);</span>
            {"\n  "}
            <span className="gbe-tok-punct">{"}"}</span>
            {"\n"}
            <span className="gbe-tok-punct">{"});"}</span>
          </pre>
        </div>

        <p className="gbe-caption">Move the pointer over either card — try leaving through an edge and re-entering.</p>
      </div>
    </div>
  );
}

const CSS = `
.gbe-page {
  --bg: #060a09;
  --panel-bg: #0b1210;
  --panel-border: #1d2925;
  --card-bg: rgba(255, 255, 255, 0.035);
  --card-border: rgba(255, 255, 255, 0.09);
  --accent: #b6ff45;
  --accent-soft: rgba(182, 255, 69, 0.5);
  --text: #f2f6f0;
  --muted: #93a39a;
  --muted-2: #5c6b63;
  --code-bg: #0d1114;
  --code-header: #12171a;
  --font-display: ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", "Cascadia Code", Menlo, Consolas, monospace;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  display: flex;
  justify-content: center;
  padding: 4.5rem 1.5rem 5rem;
}

.gbe-content { width: 100%; max-width: 640px; display: flex; flex-direction: column; align-items: center; gap: 2.25rem; }

.gbe-h1 {
  margin: 0; text-align: center; font-family: var(--font-display); font-weight: 800;
  letter-spacing: -0.02em; font-size: clamp(2.1rem, 5vw, 2.75rem); text-wrap: balance;
}
.gbe-accent { color: var(--accent); }

.gbe-subtitle { margin: -1.25rem 0 0; max-width: 46ch; text-align: center; color: var(--muted); font-size: 0.9rem; line-height: 1.6; }

.gbe-panel { position: relative; width: 100%; border-radius: 18px; border: 1px solid var(--panel-border); background: var(--panel-bg); overflow: hidden; padding: 3.5rem 1.5rem; }
.gbe-panel::before {
  content: ""; position: absolute; left: 50%; bottom: -20%; width: 70%; aspect-ratio: 1; transform: translateX(-50%);
  background: radial-gradient(circle, rgba(182, 255, 69, 0.16), transparent 68%); filter: blur(10px); pointer-events: none;
}

.gbe-stage { position: relative; display: flex; gap: 2rem; flex-wrap: wrap; align-items: center; justify-content: center; }

.gbe-card {
  --mx: 50%; --my: 50%;
  position: relative; isolation: isolate; width: 240px; aspect-ratio: 3 / 4; border-radius: 20px;
  display: grid; grid-template-rows: 1fr auto; gap: 1rem; padding: 1.1rem;
  background: var(--card-bg); border: 1px solid var(--card-border);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}

.gbe-card::before {
  content: ""; position: absolute; inset: 0; padding: 1.5px; border-radius: inherit;
  background: radial-gradient(220px circle at var(--mx) var(--my), var(--accent), transparent 65%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity 0.35s ease; pointer-events: none; z-index: 2;
}
.gbe-card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(160px circle at var(--mx) var(--my), var(--accent-soft), transparent 70%);
  opacity: 0; mix-blend-mode: screen; transition: opacity 0.35s ease; pointer-events: none; z-index: 0;
}
.gbe-card.gbe-is-active::before, .gbe-card.gbe-is-active::after { opacity: 1; }

.gbe-card-top { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.9rem; }

.gbe-tag {
  align-self: flex-start; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.06em; color: var(--muted);
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--card-border); border-radius: 999px; padding: 0.2rem 0.55rem;
}

.gbe-icon { position: relative; width: 56px; height: 56px; margin: 0.4rem 0 0.2rem; display: flex; align-items: center; justify-content: center; }
.gbe-icon-radar .gbe-ring { position: absolute; border-radius: 50%; border: 1.5px solid var(--muted-2); }
.gbe-icon-radar .gbe-ring-1 { width: 20px; height: 20px; }
.gbe-icon-radar .gbe-ring-2 { width: 36px; height: 36px; opacity: 0.7; }
.gbe-icon-radar .gbe-ring-3 { width: 52px; height: 52px; opacity: 0.4; }
.gbe-card.gbe-is-active .gbe-icon-radar .gbe-ring { border-color: var(--accent); transition: border-color 0.35s ease; }
.gbe-icon-radar svg { position: relative; z-index: 1; fill: var(--text); }

.gbe-icon-code .gbe-glyph { position: absolute; font-family: var(--font-mono); font-weight: 600; font-size: 1.15rem; color: var(--text); }
.gbe-icon-code .gbe-g2 { opacity: 0.35; transform: translateX(7px); color: var(--muted); }
.gbe-icon-code .gbe-g3 { opacity: 0.18; transform: translateX(14px); color: var(--muted); }

.gbe-card-heading { margin: 0; font-size: 1.02rem; font-weight: 650; line-height: 1.3; letter-spacing: -0.01em; }

.gbe-follow-btn {
  position: relative; z-index: 1; width: 100%; padding: 0.65rem 0; border: none; border-radius: 12px;
  background: #05070a; color: var(--text); font-weight: 600; font-size: 0.85rem; cursor: pointer;
}

.gbe-codewin { width: 100%; border-radius: 14px; overflow: hidden; border: 1px solid var(--panel-border); background: var(--code-bg); }
.gbe-codewin-header { display: flex; gap: 0.4rem; padding: 0.7rem 0.85rem; background: var(--code-header); border-bottom: 1px solid var(--panel-border); }
.gbe-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.gbe-dot-red { background: #ff5f56; }
.gbe-dot-yellow { background: #ffbd2e; }
.gbe-dot-green { background: #27c93f; }

.gbe-codewin pre { margin: 0; padding: 1.1rem 1.25rem 1.35rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.78rem; line-height: 1.65; tab-size: 2; }

.gbe-tok-sel { color: var(--accent); }
.gbe-tok-prop { color: #d8dee6; }
.gbe-tok-func { color: #7ec4ff; }
.gbe-tok-val { color: #f5a8d0; }
.gbe-tok-str { color: #ffb86b; }
.gbe-tok-punct { color: var(--muted-2); }
.gbe-tok-kw { color: #f5a8d0; }
.gbe-tok-com { color: var(--muted-2); font-style: italic; }

.gbe-caption { margin: -0.75rem 0 0; text-align: center; font-size: 0.8rem; color: var(--muted-2); }

@media (prefers-reduced-motion: reduce) {
  .gbe-card::before, .gbe-card::after, .gbe-icon-radar .gbe-ring { transition: none; }
}
`;
