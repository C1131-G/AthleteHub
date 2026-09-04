"use client";

import { useAllSessions } from "@/features/session/use-sessions";

import { sessionSummaryForWeek } from "../report-calculations";
import type { SessionWeekSummary } from "../report-calculations";

/**
 * Reactive session totals for an athlete-week. Explicit fill only: undefined
 * while loading, so a caller never seeds a form with zeros from a half-loaded
 * query.
 */
export const useSessionSummary = (
  athleteId: string,
  weekStart: string
): SessionWeekSummary | undefined => {
  const { data: sessions, isPending } = useAllSessions();
  if (isPending) {
    return undefined;
  }
  return sessionSummaryForWeek(sessions ?? [], athleteId, weekStart);
};
