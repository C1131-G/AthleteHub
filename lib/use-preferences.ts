"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppPreferences } from "@/types/electron";

const PREFERENCES_KEY = ["preferences"] as const;

const DEFAULT_PREFERENCES: AppPreferences = {
  backupCount: 7,
  rankingDistance: 70,
  weekStartsOn: 1,
};

const localStorageKey = "athletehub.preferences";

/** Browser-dev fallback: the same schema, persisted to localStorage. */
const readLocal = (): AppPreferences => {
  try {
    const raw = globalThis.localStorage?.getItem(localStorageKey);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }
    // SAFETY: the stored value was written by this module from a validated
    // object; the defaults spread also repairs any missing field.
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as AppPreferences) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const writeLocal = (partial: Partial<AppPreferences>): AppPreferences => {
  const merged = { ...readLocal(), ...partial };
  globalThis.localStorage?.setItem(localStorageKey, JSON.stringify(merged));
  return merged;
};

/**
 * App preferences (ranking distance, week start, backup count). Reads through
 * the desktop bridge when present; the browser dev loop falls back to
 * localStorage so the Settings page still works there.
 */
export const usePreferences = () => {
  const queryClient = useQueryClient();
  const bridge = globalThis.window?.electronAPI?.backend.preferences;

  const query = useQuery({
    queryFn: () => bridge?.read() ?? Promise.resolve(readLocal()),
    queryKey: PREFERENCES_KEY,
    staleTime: 30_000,
  });

  const write = useMutation({
    mutationFn: (partial: Partial<AppPreferences>) =>
      Promise.resolve(bridge?.write(partial) ?? writeLocal(partial)),
    onSuccess: (updated) => {
      queryClient.setQueryData(PREFERENCES_KEY, updated);
    },
  });

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES,
    ready: query.isSuccess,
    update: (partial: Partial<AppPreferences>) => write.mutate(partial),
    updating: write.isPending,
  };
};
