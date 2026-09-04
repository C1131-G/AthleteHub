import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { weeklyReportInputSchema, weeklyReportSchema } from "./report-types";
import type { WeeklyPerformanceReport } from "./report-types";

export type WeeklyReportService = CollectionService<WeeklyPerformanceReport>;

export const createWeeklyReportService = (
  collections: Collections
): WeeklyReportService => {
  const collection = collections.weeklyReports;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      weekStart: "A weekly report already exists for this athlete and week.",
    },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: weeklyReportInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      absenceReason: input.absenceReason.trim(),
      actionItems: input.actionItems.flatMap((item) =>
        item.trim() ? [item.trim()] : []
      ),
      performanceNotes: input.performanceNotes.trim(),
    }),
    notFoundMessage: "Weekly report not found.",
    recordSchema: weeklyReportSchema,
    restore: collection.restore,
    save: (report) =>
      collection.save({
        athleteId: report.athleteId,
        id: report.id,
        snapshot: JSON.stringify(report),
        status: report.status,
        weekStart: report.weekStart,
      }),
  });
};
