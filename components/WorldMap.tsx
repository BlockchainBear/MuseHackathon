"use client";

import React from "react";
import { MAP_HEIGHT, MAP_WIDTH, type MapPos, type WorldDoc } from "@/lib/schema";
import { CATEGORY_COLORS } from "@/lib/scene-utils";

interface WorldMapProps {
  doc: WorldDoc;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: MapPos) => void;
  /** When set, tapping a node links it to this location instead of selecting it. */
  linkFromId?: string | null;
  onConnect?: (from: string, to: string) => void;
  imageUrls?: Record<string, string>;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function wrapLabel(name: string, maxChars = 16): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
    if (lines.length >= 2) break;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Interactive SVG location map (1000 × 700 coordinate system).
 * Drag nodes with pointer events; a keyboard-accessible list below
 * provides the same selection for non-pointer users.
 */
export function WorldMap({ doc, selectedId, onSelect, onMove, linkFromId = null, onConnect, imageUrls }: WorldMapProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragRef = React.useRef<{
    id: string;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  const toSvg = React.useCallback((clientX: number, clientY: number): MapPos | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return {
      x: Math.round(clamp(pt.x, 40, MAP_WIDTH - 40)),
      y: Math.round(clamp(pt.y, 70, MAP_HEIGHT - 60)),
    };
  }, []);

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { id, moved: false, startX: e.clientX, startY: e.clientY };
  };

  const onNodePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return; // click-vs-drag threshold
    drag.moved = true;
    const pos = toSvg(e.clientX, e.clientY);
    if (pos) onMove(drag.id, pos);
  };

  const endDrag = (e: React.PointerEvent, id: string) => {
    const drag = dragRef.current;
    dragRef.current = null;
    // Prevent accidental taps after a drag; plain taps select — or link in link mode.
    if (drag && !drag.moved) {
      if (linkFromId) onConnect?.(linkFromId, id);
      else onSelect(id);
    }
    e.preventDefault();
  };

  const { world, positions } = doc;
  const categories = React.useMemo(() => {
    const seen: string[] = [];
    for (const l of world.locations) {
      if (!seen.includes(l.category)) seen.push(l.category);
    }
    return seen;
  }, [world.locations]);
  const colorFor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full touch-none select-none rounded-xl border border-forge-line bg-forge-bg"
        role="application"
        aria-label={`Location map for ${world.name}. Drag nodes to rearrange, or use the location list below.`}
      >
        <defs>
          <pattern id="wf-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a1f2e" strokeWidth="1" />
          </pattern>
          <radialGradient id="wf-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1b2340" />
            <stop offset="100%" stopColor="#0a0c12" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#wf-glow)" rx="12" />
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#wf-grid)" rx="12" />

        {/* paths behind nodes */}
        {world.connections.map((c, i) => {
          const a = positions[c.from];
          const b = positions[c.to];
          if (!a || !b) return null;
          const active = c.from === selectedId || c.to === selectedId;
          return (
            <line
              key={`${c.from}-${c.to}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "#ffffff" : "#3b4358"}
              strokeWidth={active ? 3 : 2}
              opacity={active ? 0.95 : 0.7}
            />
          );
        })}

        {/* nodes */}
        {world.locations.map((loc, li) => {
          const p = positions[loc.id];
          if (!p) return null;
          const selected = loc.id === selectedId;
          const color = colorFor(li);
          const lines = wrapLabel(loc.name);
          return (
            <g
              key={loc.id}
              transform={`translate(${p.x}, ${p.y})`}
              className={linkFromId ? (loc.id === linkFromId ? "cursor-default" : "cursor-copy") : "cursor-grab active:cursor-grabbing"}
              onPointerDown={(e) => onNodePointerDown(e, loc.id)}
              onPointerMove={onNodePointerMove}
              onPointerUp={(e) => endDrag(e, loc.id)}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            >
              <circle r="30" fill={color} opacity="0.14" />
              {selected && !linkFromId && <circle r="35" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.9" />}
              {linkFromId && loc.id !== linkFromId && (
                <circle r="35" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5 4" opacity="0.85" />
              )}
              {linkFromId && loc.id === linkFromId && (
                <circle r="35" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
              )}
              <circle r="24" fill="#141828" stroke={color} strokeWidth={selected ? 3.5 : 2.5} />
              <text y="6" textAnchor="middle" fill={color} fontSize="15" fontWeight="700">
                {li + 1}
              </text>
              {lines.map((ln, i) => (
                <text
                  key={i}
                  y={44 + i * 17}
                  textAnchor="middle"
                  fill={selected ? "#ffffff" : "#c9d1de"}
                  fontSize="14"
                  fontWeight={selected ? 700 : 600}
                  style={{ paintOrder: "stroke", stroke: "#0a0c12", strokeWidth: 3 }}
                >
                  {ln}
                </text>
              ))}
              <text y={44 + lines.length * 17} textAnchor="middle" fill={color} fontSize="11" opacity="0.9">
                {loc.category}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Map legend">
        {categories.map((cat) => {
          const idx = world.locations.findIndex((l) => l.category === cat);
          return (
            <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-forge-dim">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: colorFor(idx < 0 ? 0 : idx) }}
              />
              {cat}
            </span>
          );
        })}
      </div>

      {/* Tap-friendly location picker (also the keyboard path) */}
      <div
        className="mt-2 flex flex-wrap gap-2"
        role="group"
        aria-label={linkFromId ? "Tap a location to link it" : "Select a location"}
      >
        {world.locations.map((loc, i) => {
          const thumb = imageUrls?.[loc.id];
          const isActive = linkFromId ? loc.id === linkFromId : loc.id === selectedId;
          return (
            <button
              key={loc.id}
              onClick={() => (linkFromId ? onConnect?.(linkFromId, loc.id) : onSelect(loc.id))}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-forge-line text-forge-dim hover:border-cyan-400/50 hover:text-slate-200"
              }`}
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" aria-hidden className="h-5 w-5 rounded-full object-cover" loading="lazy" />
              ) : (
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-slate-950"
                  style={{ background: colorFor(i) }}
                >
                  {i + 1}
                </span>
              )}
              {loc.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
