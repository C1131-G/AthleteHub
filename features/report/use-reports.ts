"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  createMonthlyReport,
  createWeeklyReport,
  reportStore,
  updateMonthlyReport,
  updateWeeklyReport,
} from "./report-store";

export const useReports = () => {
  const state = useStore(reportStore);
  const hydrated = useHydrated();
  const ready = state.ready && hydrated;
  const weekly = ready ? state.weekly : [];
  const monthly = ready ? state.monthly : [];

  return {
    createMonthly: createMonthlyReport,
    createWeekly: createWeeklyReport,
    getMonthly: (id: string) => monthly.find((report) => report.id === id),
    getWeekly: (id: string) => weekly.find((report) => report.id === id),
    listMonthly: monthly,
    listWeekly: weekly,
    ready,
    updateMonthly: updateMonthlyReport,
    updateWeekly: updateWeeklyReport,
  };
};
