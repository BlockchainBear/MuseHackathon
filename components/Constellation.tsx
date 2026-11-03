"use client";

import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAP_HEIGHT, MAP_WIDTH, type WorldDoc } from "@/lib/schema";
import {
  CATEGORY_COLORS,
  disposeScene,
  fitRenderer,
  getGlowTexture,
  usePrefersReducedMotion,
} from "@/lib/scene-utils";

interface ConstellationProps {
  doc: WorldDoc;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const WORLD_W = 20;
const WORLD_D = 14;
const NODE_Y = 1.4;

function toWorld(x: number, y: number): [number, number] {
  return [(x / MAP_WIDTH - 0.5) * WORLD_W, (y / MAP_HEIGHT - 0.5) * WORLD_D];
}

function makeBadgeTexture(label: string, color: string): THREE.CanvasTexture {
  const s = 128;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 54, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,12,18,0.92)";
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 62px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, s / 2, s / 2 + 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface NodeEntry {
  group: THREE.Group;
  core: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  glow: THREE.Sprite;
  badge: THREE.Sprite;
  selectRing: THREE.Mesh;
  phase: number;
  baseColor: THREE.Color;
}

interface ConnEntry {
  line: THREE.Line;
  from: string;
  to: string;
}

/**
 * 3D mirror of the location map: five glowing nodes on a holo-grid,
 * beamed to the floor, linked by light paths. Click a node to select
 * (synced with the 2D map); drag to orbit, scroll to zoom.
 */
export function Constellation({ doc, selectedId, onSelect, className = "" }: ConstellationProps) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = React.useState(false);
  const apiRef = React.useRef<{ rebuild: (d: WorldDoc) => void; highlight: (id: string | null) => void } | null>(null);
  const selectRef = React.useRef(onSelect);
  selectRef.current = onSelect;

  // Build the scene shell once (per reduced-motion setting).
  React.useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      if (!renderer.getContext()) throw new Error("no gl context");
    } catch {
      setFailed(true);
      return;
    }
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0c12, 26, 60);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    camera.position.set(0, 13, 17);
    const stopFit = fitRenderer(renderer, container, camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 34;
    controls.maxPolarAngle = 1.38;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.7;
    controls.target.set(0, 1, 0);

    // Ground: polar holo-grid + soft disc.
    const grid = new THREE.PolarGridHelper(13, 12, 7, 64, 0x2b3550, 0x1a2135);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    scene.add(grid);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(13, 64),
      new THREE.MeshBasicMaterial({ color: 0x0d1220, transparent: true, opacity: 0.85 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.02;
    scene.add(disc);

    const nodeLayer = new THREE.Group();
    const connLayer = new THREE.Group();
    scene.add(nodeLayer, connLayer);
    const nodes = new Map<string, NodeEntry>();
    const conns: ConnEntry[] = [];
    let selected: string | null = null;

    const clearLayer = (layer: THREE.Group) => {
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        layer.remove(child);
        child.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | undefined;
          if (mat && mat !== undefined) {
            const withMap = mat as THREE.MeshBasicMaterial;
            if (withMap.map && withMap.map !== getGlowTexture()) withMap.map.dispose();
            mat.dispose();
          }
        });
      }
    };

    const rebuild = (d: WorldDoc) => {
      clearLayer(nodeLayer);
      clearLayer(connLayer);
      nodes.clear();
      conns.length = 0;
      const glowTex = getGlowTexture();

      d.world.locations.forEach((loc, i) => {
        const p = d.positions[loc.id];
        if (!p) return;
        const [wx, wz] = toWorld(p.x, p.y);
        const colorHex = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        const color = new THREE.Color(colorHex);
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);

        // Light beam floor → node.
        const beamGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, NODE_Y, 0),
        ]);
        group.add(new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })));

        // Ground ring.
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.72, 0.88, 48),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        // Core crystal.
        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.52, 1),
          new THREE.MeshBasicMaterial({ color }),
        ) as THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
        core.position.y = NODE_Y;
        core.userData.locationId = loc.id;
        group.add(core);

        // Halo sprite.
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        glow.scale.setScalar(3.4);
        glow.position.y = NODE_Y;
        group.add(glow);

        // Number badge.
        const badge = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: makeBadgeTexture(String(i + 1), colorHex), transparent: true, depthWrite: false }),
        );
        badge.scale.set(1.15, 1.15, 1);
        badge.position.y = NODE_Y + 1.35;
        group.add(badge);

        // Selection ring (hidden until selected).
        const selectRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.05, 12, 64),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
        );
        selectRing.rotation.x = Math.PI / 2;
        selectRing.position.y = NODE_Y;
        selectRing.visible = false;
        group.add(selectRing);

        nodeLayer.add(group);
        nodes.set(loc.id, { group, core, glow, badge, selectRing, phase: i * 1.37, baseColor: color });
      });

      // Light paths between nodes.
      for (const c of d.world.connections) {
        const a = d.positions[c.from];
        const b = d.positions[c.to];
        if (!a || !b) continue;
        const [ax, az] = toWorld(a.x, a.y);
        const [bx, bz] = toWorld(b.x, b.y);
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ax, NODE_Y, az),
          new THREE.Vector3(bx, NODE_Y, bz),
        ]);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45 }),
        );
        connLayer.add(line);
        conns.push({ line, from: c.from, to: c.to });
      }
      applyHighlight();
    };

    const applyHighlight = () => {
      for (const [id, n] of nodes) {
        const on = id === selected;
        n.selectRing.visible = on;
        n.core.scale.setScalar(on ? 1.3 : 1);
        (n.glow.material as THREE.SpriteMaterial).opacity = on ? 0.85 : 0.5;
      }
      for (const c of conns) {
        const on = c.from === selected || c.to === selected;
        const mat = c.line.material as THREE.LineBasicMaterial;
        mat.color.set(on ? 0xffffff : 0x22d3ee);
        mat.opacity = on ? 1 : 0.45;
      }
    };

    const highlight = (id: string | null) => {
      selected = id;
      applyHighlight();
    };

    apiRef.current = { rebuild, highlight };

    // Click (not drag) → raycast select.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const cores = [...nodes.values()].map((n) => n.core);
      const hits = raycaster.intersectObjects(cores, false);
      if (hits.length > 0) {
        const id = (hits[0].object.userData as { locationId?: string }).locationId;
        if (id) selectRef.current(id);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // Loop.
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(container);

    const render = () => {
      const t = clock.getElapsedTime();
      for (const n of nodes.values()) {
        const bob = reduced ? 0 : Math.sin(t * 1.1 + n.phase) * 0.12;
        n.core.position.y = NODE_Y + bob;
        n.glow.position.y = NODE_Y + bob;
        n.badge.position.y = NODE_Y + 1.35 + bob;
        if (!reduced) {
          n.core.rotation.y = t * 0.4 + n.phase;
          if (n.selectRing.visible) {
            n.selectRing.rotation.z = t * 1.2;
            const s = 1 + Math.sin(t * 3) * 0.06;
            n.selectRing.scale.set(s, s, 1);
          }
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };

    if (reduced) {
      render();
    } else {
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (visible) render();
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      stopFit();
      clearLayer(nodeLayer);
      clearLayer(connLayer);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Live data sync without rebuilding the scene shell.
  React.useEffect(() => {
    apiRef.current?.rebuild(doc);
  }, [doc]);
  React.useEffect(() => {
    apiRef.current?.highlight(selectedId);
  }, [selectedId]);

  if (failed) {
    return (
      <div
        className={className}
        role="img"
        aria-label="3D preview unavailable in this browser"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, #1b2340 0%, #0a0c12 70%)" }}
      >
        <p className="p-4 text-center text-sm text-forge-dim">
          3D preview needs WebGL — the 2D map below works fully.
        </p>
      </div>
    );
  }
  return (
    <div
      ref={mountRef}
      className={className}
      role="application"
      aria-label="3D constellation of the five locations. Drag to orbit, scroll to zoom, click a crystal to select."
    />
  );
}
