"use client";

import React from "react";
import * as THREE from "three";
import { disposeScene, fitRenderer, getGlowTexture, usePrefersReducedMotion } from "@/lib/scene-utils";

/**
 * Decorative hero scene: neon wireframe terrain, drifting particles,
 * orbit rings, and a floating core. Pure ambience — the app works
 * identically if WebGL is unavailable (CSS fallback).
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = React.useState(false);

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
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0c12, 18, 46);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 6.5, 16);
    camera.lookAt(0, 1, 0);
    const stopFit = fitRenderer(renderer, container, camera);

    // --- terrain: displaced plane, cyan wireframe ---
    const terrainGeo = new THREE.PlaneGeometry(64, 42, 56, 36);
    const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.32) * Math.cos(y * 0.28) * 1.4 + Math.sin(x * 0.11 + y * 0.19) * 1.8);
    }
    pos.needsUpdate = true;
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.22 }),
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -1.5;
    scene.add(terrain);

    // --- particle field: soft additive sprites, cyan/violet ---
    const COUNT = 420;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(COUNT * 3);
    const pCol = new Float32Array(COUNT * 3);
    const cyan = new THREE.Color(0x22d3ee);
    const violet = new THREE.Color(0xa78bfa);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 44;
      pPos[i * 3 + 1] = Math.random() * 14 - 1;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;
      const c = Math.random() < 0.55 ? cyan : violet;
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
      speeds[i] = 0.25 + Math.random() * 0.8;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.55,
        map: getGlowTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    scene.add(particles);

    // --- orbit rings ---
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.05, 12, 128),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.8 }),
    );
    ring1.position.y = 3.4;
    ring1.rotation.x = Math.PI / 2.4;
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.035, 12, 128),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 }),
    );
    ring2.position.y = 3.4;
    ring2.rotation.x = Math.PI / 1.9;
    ring2.rotation.y = 0.5;
    scene.add(ring1, ring2);

    // --- floating core + halo ---
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.9 }),
    );
    core.position.y = 3.4;
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.scale.setScalar(7);
    halo.position.y = 3.4;
    scene.add(core, halo);

    // --- loop (skipped when reduced motion: single frame) ---
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(container);

    const render = () => {
      const t = clock.getElapsedTime();
      const arr = (pGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] += speeds[i] * 0.016;
        arr[i * 3] += Math.sin(t * 0.6 + i) * 0.004;
        if (arr[i * 3 + 1] > 13) arr[i * 3 + 1] = -1;
      }
      pGeo.attributes.position.needsUpdate = true;
      ring1.rotation.z = t * 0.12;
      ring2.rotation.z = -t * 0.08;
      core.rotation.y = t * 0.25;
      core.rotation.x = t * 0.11;
      core.position.y = 3.4 + Math.sin(t * 0.7) * 0.25;
      halo.position.y = core.position.y;
      camera.position.x = Math.sin(t * 0.08) * 2.2;
      camera.lookAt(0, 2.2, 0);
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
      stopFit();
      scene.remove(particles);
      pGeo.dispose();
      (particles.material as THREE.Material).dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduced]);

  if (failed) {
    return (
      <div
        className={className}
        role="img"
        aria-label="Stylized neon world map illustration"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, #1b2340 0%, #0a0c12 70%)" }}
      />
    );
  }
  return (
    <div
      ref={mountRef}
      className={className}
      role="img"
      aria-label="Animated 3D neon landscape with floating particles and orbit rings"
    />
  );
}
