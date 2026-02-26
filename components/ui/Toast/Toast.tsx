"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Toast.module.scss";

export function Toaster() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className={styles.viewport}>
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.9 }}
              className={styles.motionWrap}
            >
              <Toast.Root
                toast={toast}
                data-type={toast.type ?? "info"}
                className={styles.toast}
              >
                <Toast.Content className={styles.content}>
                  <div className={styles.text}>
                    <Toast.Title className={styles.title} />
                    <Toast.Description className={styles.description} />
                  </div>
                  <Toast.Close className={styles.close} aria-label="Close">
                    ×
                  </Toast.Close>
                </Toast.Content>
              </Toast.Root>
            </motion.div>
          ))}
        </AnimatePresence>
      </Toast.Viewport>
    </Toast.Portal>
  );
}


