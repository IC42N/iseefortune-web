"use client";

import { Canvas } from "@react-three/fiber";
import { Scene } from "./SpaceWarp";

export default function SpaceWarpCanvas() {
  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}   // ✅ critical
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 14], fov: 75 }}
    >
      <Scene />
    </Canvas>
  );
}