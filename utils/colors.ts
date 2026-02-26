import { CSSProperties } from 'react';

export type CSSVars = CSSProperties & {
  ["--intensity"]?: string;
  ["--hue"]?: string;
};

export const HUE_BY_NUMBER: Record<number, number> = {
  0: 0,
  1: 195, // cyan
  2: 135, // green
  3: 55,  // amber
  4: 20,  // orange
  5: 330, // magenta
  6: 265, // purple
  7: 5,   // red-orange
  8: 285, // violet
  9: 210, // blue
};



export function numberToCSSVars(
  num: number,
  intensity: number = 0.9
): CSSVars {
  const hue = HUE_BY_NUMBER[num] ?? 0;

  return {
    "--hue": String(hue),
    "--intensity": String(intensity),
  };
}