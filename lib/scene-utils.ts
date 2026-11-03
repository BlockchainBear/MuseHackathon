"use client";

import React from "react";
import * as THREE from "three";

/** Shared palette: category colors used by the 2D map and 3D scenes. */
export const CATEGORY_COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];

export function colorForCategory(category: string, index: number): string {
  void category;
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** Soft round sprite for particles/glow (avoids hard PointsMaterial squares). */
let glowTexture: THREE.CanvasTexture | null = null;
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Size a renderer to its container with capped pixel ratio. Returns cleanup. */
export function fitRenderer(
  renderer: THREE.WebGLRenderer,
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
): () => void {
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  return () => observer.disconnect();
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}
