"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LocationStatus } from "@/types/electron";

const LOCATION_KEY = ["storage-location"] as const;

const DEFAULT_STATUS: LocationStatus = {
  backupPath: null,
  storagePath: null,
};

export interface LocationUpdateInput {
  backupPath?: string;
  password: string;
  storagePath?: string;
}

/**
 * Where the database and rolling backups live on disk. Only meaningful in
 * the desktop app — the browser dev loop has no filesystem to point at, so
 * `available` is false there and the panel that uses this hook renders
 * nothing.
 */
export const useStorageLocation = () => {
  const queryClient = useQueryClient();
  const bridge = globalThis.window?.electronAPI?.backend.location;

  const query = useQuery({
    queryFn: () => bridge?.status() ?? Promise.resolve(DEFAULT_STATUS),
    queryKey: LOCATION_KEY,
  });

  const update = useMutation({
    mutationFn: (input: LocationUpdateInput) => {
      if (!bridge) {
        throw new Error(
          "Changing the storage location requires the desktop app."
        );
      }
      return bridge.update(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCATION_KEY });
    },
  });

  return {
    available: Boolean(bridge),
    chooseFolder: () => bridge?.choose() ?? Promise.resolve(null),
    location: query.data ?? DEFAULT_STATUS,
    ready: query.isSuccess,
    update: (input: LocationUpdateInput) => update.mutateAsync(input),
    updating: update.isPending,
  };
};
