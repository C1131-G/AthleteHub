"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { UpdateStatus } from "@/types/electron";

const UPDATE_KEY = ["app-update"] as const;
const IDLE_STATUS: UpdateStatus = { state: "idle" };

/**
 * Tracks the desktop auto-updater. `available` is false in the browser dev
 * loop, which has no updater — the sidebar indicator that uses this hook
 * renders nothing there. Status pushed from the main process (electron/ipc/
 * updates.cjs) is written straight into the query cache instead of
 * refetching, so the indicator reacts the instant a download finishes.
 */
export const useAppUpdate = () => {
  const queryClient = useQueryClient();
  const bridge = globalThis.window?.electronAPI?.backend.update;

  const query = useQuery({
    queryFn: () => bridge?.status() ?? Promise.resolve(IDLE_STATUS),
    queryKey: UPDATE_KEY,
  });

  useEffect(() => {
    if (!bridge) {
      return;
    }
    return bridge.onChange((status) => {
      queryClient.setQueryData(UPDATE_KEY, status);
    });
  }, [bridge, queryClient]);

  return {
    available: Boolean(bridge),
    check: () => bridge?.check(),
    install: () => bridge?.install(),
    status: query.data ?? IDLE_STATUS,
  };
};
