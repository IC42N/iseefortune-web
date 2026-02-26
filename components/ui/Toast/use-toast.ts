"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";

export function usePhaseToast() {
  const toastManager = Toast.useToastManager();
  const activeIdRef = React.useRef<string | number | null>(null);

  const replace = React.useCallback(
    (args: { title: string; description?: string, type?: string }) => {
      if (activeIdRef.current) {
        toastManager.update(activeIdRef.current.toString(), {
          title: args.title,
          description: args.description ?? "",
          type: args.type ?? "info",
        });
        return activeIdRef.current;
      }

      const id = toastManager.add({
        title: args.title,
        description: args.description ?? "",
        type: args.type ?? "info",
      });

      activeIdRef.current = id;
      return id;
    },
    [toastManager]
  );

  const clear = React.useCallback(() => {
    activeIdRef.current = null;
  }, []);

  return { toastReplace: replace, toastClear: clear };
}