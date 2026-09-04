"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useReports = (options?: ListOptions) => {
  const weekly = useCollection(
    "weeklyReports",
    collectionSchemas.weeklyReports
  );
  const monthly = useCollection(
    "monthlyReports",
    collectionSchemas.monthlyReports,
    options
  );

  return {
    archiveMonthly: monthly.archive,
    archiveWeekly: weekly.archive,
    createMonthly: monthly.create,
    createWeekly: weekly.create,
    getMonthly: (id: string) =>
      monthly.records.find((report) => report.id === id),
    getWeekly: (id: string) =>
      weekly.records.find((report) => report.id === id),
    listMonthly: monthly.records,
    listWeekly: weekly.records,
    ready: weekly.ready && monthly.ready,
    restoreMonthly: monthly.restore,
    restoreWeekly: weekly.restore,
    updateMonthly: monthly.update,
    updateWeekly: weekly.update,
  };
};
