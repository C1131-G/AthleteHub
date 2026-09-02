"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {
  // Hydration is a one-way transition; there is nothing to subscribe to.
};

/**
 * False on the server and during the client's first render, true afterwards.
 *
 * A module-level store can already hold data by the time a suspended boundary
 * hydrates, which would make that boundary's first client render disagree with
 * the server HTML. Gating on this keeps the two identical.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
