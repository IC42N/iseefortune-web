"use client";

import React from "react";
import styles from "./ProgressRing.module.scss";

type Props = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  trailColor?: string;
  strokeColor?: string;
  linecap?: "round" | "butt" | "square";
  children?: React.ReactNode;
  className?: string;

  showMarker?: boolean;
  markerLength?: number;
  markerWidth?: number;
  markerColor?: string;
  pulseEnabled?: boolean;

  showMarkerLabel?: boolean;
  markerLabel?: string;
  markerLabelOffset?: number;
  markerLabelColor?: string;
  markerLabelFontSize?: number;
  markerLabelFontWeight?: number | string;
};

export function ProgressRing({
     size = 300,
     strokeWidth = 20,
     progress,
     trailColor = "#2A2F3A",
     strokeColor = "#7FB069",
     linecap = "butt",
     children,
     className,
     showMarker = true,
     markerLength = 22,
     markerWidth = 4,
     markerColor = "#E6EDF6",
    pulseEnabled = true,
     // showMarkerLabel = true,
     // markerLabel = `${Math.round(progress * 100)}%`,
     // markerLabelOffset = 14,
     // markerLabelColor = "#E6EDF6",
     // markerLabelFontSize = 14,
     // markerLabelFontWeight = 700,
 }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));

  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - clamped);

  const cx = size / 2;
  const cy = size / 2;

  const endDeg = clamped * 360;

  const markerInner = r - strokeWidth / 2;
  const markerOuter = markerInner + markerLength;
  //const labelRadius = markerOuter + markerLabelOffset;


  //const angle = endDeg; // 0..360
  //const onBottomHalf = angle > 90 && angle < 270;

  // we want the text to lean with the marker ~46%,
  // but keep it upright-ish when it goes to the bottom.
    //const lean = 0.46;

  // base label rotation (relative to the tangent)
    //let labelRot = angle * lean;

  // if on bottom half, flip 180 so it's readable
    //if (onBottomHalf) labelRot += 180;

  // Panic stages (tweak thresholds as you like)
  const panicMid = clamped >= 0.85;  // ~2.0s
  const panicEnd = clamped >= 0.97;  // ~0.5s

  const ringClasses = [
    styles.ring,
    !pulseEnabled && styles.noPulse,
    pulseEnabled && panicMid && styles.panicMid,
    pulseEnabled && panicEnd && styles.panicEnd,
    className,
  ].filter(Boolean).join(" ");



  return (
    <div
      className={ringClasses}
      style={{ position: "relative", width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.circleSVG}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={trailColor} strokeWidth={strokeWidth} />

          <circle
            className={styles.pulseStroke}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={linecap}
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={dashOffset}
          />

          {showMarker && clamped > 0 && (
            <line
              className={styles.pulseMarker}
              x1={cx + markerInner}
              y1={cy}
              x2={cx + markerOuter}
              y2={cy}
              stroke={markerColor}
              strokeWidth={markerWidth}
              strokeLinecap="round"
              transform={`rotate(${endDeg} ${cx} ${cy})`}
            />
          )}

          {/*{showMarkerLabel && clamped > 0 && (*/}
          {/*  <text*/}
          {/*    x={cx + labelRadius}*/}
          {/*    y={cy}*/}
          {/*    fill={markerLabelColor}*/}
          {/*    fontSize={markerLabelFontSize}*/}
          {/*    fontWeight={markerLabelFontWeight}*/}
          {/*    textAnchor="middle"*/}
          {/*    dominantBaseline="middle"*/}
          {/*    transform={`*/}
          {/*      rotate(${endDeg} ${cx} ${cy})*/}
          {/*      rotate(${labelRot} ${cx + labelRadius} ${cy})*/}
          {/*    `}*/}
          {/*  >*/}
          {/*    {markerLabel}*/}
          {/*  </text>*/}
          {/*)}*/}
        </g>
      </svg>

      {children ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}