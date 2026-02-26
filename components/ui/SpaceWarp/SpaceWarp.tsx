"use client";

import { useFrame } from "@react-three/fiber";
import { ChromaticAberration, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, ChromaticAberrationEffect } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Warp constants
const COUNT = 150;
const XY_BOUNDS = 50;
const Z_BOUNDS = 60;
const BASE_SPEED = 1.45;              // ✅ slow continuous fly
const TWINKLE = 0.02;                // optional subtle twinkle
const CHROMATIC_ABERRATION_OFFSET = 0.0015;

// Space constants
const BG_COUNT = 650;
const BG_XY_BOUNDS = 220;
const BG_Z_BOUNDS = 180;


export const Scene = () => {

  const bgState = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array; s: Float32Array } | null>(null);
  const warpState = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array; s: Float32Array } | null>(null);

  const bgObj = useMemo(() => new THREE.Object3D(), []);
  const warpObj = useMemo(() => new THREE.Object3D(), []);

  // Warp section
  const meshRef = useRef<THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material> | null>(null);
  const effectsRef = useRef<ChromaticAberrationEffect | null>(null);
  const caOffset = useMemo(
    () => new THREE.Vector2(CHROMATIC_ABERRATION_OFFSET, CHROMATIC_ABERRATION_OFFSET), []
  );

  //Space section
  const bgRef = useRef<THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material> | null>(null);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;

    const x = new Float32Array(BG_COUNT);
    const y = new Float32Array(BG_COUNT);
    const z = new Float32Array(BG_COUNT);
    const s = new Float32Array(BG_COUNT);

    for (let i = 0; i < BG_COUNT; i++) {
      x[i] = (Math.random() - 0.5) * BG_XY_BOUNDS;
      y[i] = (Math.random() - 0.5) * BG_XY_BOUNDS;
      z[i] = (Math.random() - 0.5) * BG_Z_BOUNDS;
      s[i] = 0.25 + Math.random() * 0.65;

      bgObj.position.set(x[i], y[i], z[i]);
      bgObj.scale.setScalar(s[i]);
      bgObj.updateMatrix();
      bg.setMatrixAt(i, bgObj.matrix);
    }

    bg.instanceMatrix.needsUpdate = true;
    bgState.current = { x, y, z, s };
  }, [bgObj]);


  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const x = new Float32Array(COUNT);
    const y = new Float32Array(COUNT);
    const z = new Float32Array(COUNT);
    const s = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      x[i] = generatePos();
      y[i] = generatePos();
      z[i] = (Math.random() - 0.5) * Z_BOUNDS;
      s[i] = 0.6 + Math.random() * 0.9;

      warpObj.position.set(x[i], y[i], z[i]);
      warpObj.scale.setScalar(s[i]);
      warpObj.updateMatrix();
      mesh.setMatrixAt(i, warpObj.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    warpState.current = { x, y, z, s };
  }, [warpObj]);


  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Warp update
    const mesh = meshRef.current;
    const ws = warpState.current;
    if (!mesh || !ws) return;

    const dz = BASE_SPEED * delta * 6;
    const driftX = Math.sin(t * 0.06) * 0.0015;
    const driftY = Math.cos(t * 0.05) * 0.0015;

    for (let i = 0; i < COUNT; i++) {
      ws.z[i] += dz;
      if (ws.z[i] > Z_BOUNDS / 2) ws.z[i] -= Z_BOUNDS;

      ws.x[i] += driftX;
      ws.y[i] += driftY;

      if (ws.x[i] > XY_BOUNDS / 2) ws.x[i] -= XY_BOUNDS;
      if (ws.x[i] < -XY_BOUNDS / 2) ws.x[i] += XY_BOUNDS;
      if (ws.y[i] > XY_BOUNDS / 2) ws.y[i] -= XY_BOUNDS;
      if (ws.y[i] < -XY_BOUNDS / 2) ws.y[i] += XY_BOUNDS;

      const tw = 1 + TWINKLE * Math.sin(t * 1.6 + i * 0.03);

      warpObj.position.set(ws.x[i], ws.y[i], ws.z[i]);
      warpObj.scale.setScalar(ws.s[i] * tw); // keep your base size + twinkle
      warpObj.updateMatrix();
      mesh.setMatrixAt(i, warpObj.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    const eff = effectsRef.current;
    if (eff) {
      const k = CHROMATIC_ABERRATION_OFFSET * (0.7 + 0.3 * Math.sin(t * 0.35));
      eff.offset.set(k, k);
    }
  });

  return (
    <>
      <instancedMesh
        ref={bgRef}
        args={[undefined, undefined, BG_COUNT]}
        frustumCulled={false}
        matrixAutoUpdate={false}
      >
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false} matrixAutoUpdate={false}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={"white"} toneMapped={false} />
      </instancedMesh>

      <EffectComposer>
        <ChromaticAberration
          ref={(e: unknown) => {
            effectsRef.current = e as ChromaticAberrationEffect | null;
          }}
          blendFunction={BlendFunction.NORMAL}
          offset={caOffset}
        />
      </EffectComposer>
    </>
  );
};

function generatePos() {
  return (Math.random() - 0.5) * XY_BOUNDS;
}