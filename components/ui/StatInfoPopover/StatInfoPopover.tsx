"use client";

import React from "react";
import { Popover } from "@base-ui/react/popover";
import styles from "./StatInfoPopover.module.scss";

type Props = {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode; // your stat content
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
};

export function StatInfoPopover({
  title,
  description,
  children,
  side = "top",
  sideOffset = 10,
}: Props) {
  return (
    <Popover.Root>
      {/* Entire row is clickable */}
      <Popover.Trigger className={styles.trigger} aria-label={`${title} info`}>
        {children}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side={side} sideOffset={sideOffset} align="center">
          <Popover.Popup className={styles.popup}>
            <div className={styles.header}>
              <div className={styles.title}>{title}</div>
              {/* optional close button */}
              <Popover.Close className={styles.close} aria-label="Close">
                ✕
              </Popover.Close>
            </div>

            <div className={styles.desc}>{description}</div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}