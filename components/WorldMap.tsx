"use client";

import React from "react";
import { MAP_HEIGHT, MAP_WIDTH, type MapPos, type WorldDoc } from "@/lib/schema";

interface WorldMapProps {
  doc: WorldDoc;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: MapPos) => void;
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
export function WorldMap({ doc, selectedId, onSelect, onMove }: WorldMapProps) {
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
    // Prevent accidental selection after a drag; plain clicks still select.
    if (drag && !drag.moved) onSelect(id);
    e.preventDefault();
  };

  const { world, positions } = doc;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full touch-none select-none rounded-xl border border-forge-line bg-forge-bg"
        role="application"
        aria-label={`Location map for ${world.name}. Drag nodes to rearrange, or use the location list below.`}
      >
        {/* subtle grid */}
        <defs>
          <pattern id="wf-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a1f2e" strokeWidth="1" />
          </pattern>
        </defs>
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
              stroke={active ? "#22d3ee" : "#3b4358"}
              strokeWidth={active ? 3 : 2}
              opacity={active ? 0.9 : 0.7}
            />
          );
        })}

        {/* nodes */}
        {world.locations.map((loc) => {
          const p = positions[loc.id];
          if (!p) return null;
          const selected = loc.id === selectedId;
          const lines = wrapLabel(loc.name);
          return (
            <g
              key={loc.id}
              transform={`translate(${p.x}, ${p.y})`}
              className="cursor-grab active:cursor-grabbing"
              opacity={1}
              onPointerDown={(e) => onNodePointerDown(e, loc.id)}
              onPointerMove={onNodePointerMove}
              onPointerUp={(e) => endDrag(e, loc.id)}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            >
              {selected && <circle r="34" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.8" />}
              <circle r="24" fill="#171b27" stroke={selected ? "#22d3ee" : "#3b4358"} strokeWidth={selected ? 3 : 2} />
              <text y="6" textAnchor="middle" fill={selected ? "#22d3ee" : "#9aa3b2"} fontSize="15" fontWeight="700">
                {loc.id.replace("loc-", "")}
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
              <text y={44 + lines.length * 17} textAnchor="middle" fill="#7c8598" fontSize="11">
                {loc.category}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Keyboard-accessible alternative location list */}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Select a location">
        {world.locations.map((loc, i) => (
          <button
            key={loc.id}
            onClick={() => onSelect(loc.id)}
            aria-pressed={loc.id === selectedId}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              loc.id === selectedId
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                : "border-forge-line text-forge-dim hover:border-forge-purple/60 hover:text-slate-200"
            }`}
          >
            {i + 1}. {loc.name}
          </button>
        ))}
      </div>
    </div>
  );
}
