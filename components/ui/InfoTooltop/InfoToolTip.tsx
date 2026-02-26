"use client";

import { Popover } from "@base-ui/react/popover";
import React from "react";
import styles from "./InfoTooltip.module.scss";

type InfoTooltipProps = {
  title?: string;
  description: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  trigger?: React.ReactNode;
  hideOnMobile?: boolean;

  // optional
  sideOffset?: number;
};

export function InfoTooltip({
  title,
  description,
  side = "top",
  sideOffset = 8,
  trigger,
  hideOnMobile = false,
}: InfoTooltipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger className={[
        styles.trigger,
        hideOnMobile ? styles.hideOnMobile : null,
      ]
        .filter(Boolean)
        .join(" ")}>
        {trigger ?? (
          <span className={styles.icon} aria-label="Info">
            ?
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        {/* Backdrop is optional. For “TIP” I’d personally remove it. */}
        <Popover.Positioner side={side} sideOffset={sideOffset} align="center">
          <Popover.Popup className={styles.popup}>
            <Popover.Arrow className={styles.Arrow}>
              <ArrowSvg />
            </Popover.Arrow>

            <Popover.Viewport>
              {title ? <Popover.Title className={styles.Title}>{title}</Popover.Title> : null}
              <Popover.Description className={styles.Description}>
                {description}
              </Popover.Description>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ArrowSvg(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className={styles.ArrowFill}
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className={styles.ArrowOuterStroke}
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className={styles.ArrowInnerStroke}
      />
    </svg>
  );
}