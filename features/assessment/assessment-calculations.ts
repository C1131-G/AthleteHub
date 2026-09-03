import { addDays, format, parseISO } from "date-fns";

import type { Assessment, AssessmentType } from "./assessment-types";

export const assessmentsForMonth = (
  records: Assessment[],
  athleteId: string,
  month: string
) =>
  records.filter(
    (record) =>
      record.athleteId === athleteId && record.assessedOn.startsWith(month)
  );
export const assessmentsForWeek = (
  records: Assessment[],
  athleteId: string,
  weekStart: string
) => {
  const endDate = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");
  return records.filter(
    (record) =>
      record.athleteId === athleteId &&
      record.assessedOn >= weekStart &&
      record.assessedOn <= endDate
  );
};
export const latestByType = (records: Assessment[], month: string) => {
  const result = new Map<AssessmentType, Assessment>();
  for (const record of records.filter((item) =>
    item.assessedOn.startsWith(month)
  )) {
    const current = result.get(record.assessmentType);
    if (
      !current ||
      `${record.assessedOn}${record.createdAt}${record.id}` >
        `${current.assessedOn}${current.createdAt}${current.id}`
    ) {
      result.set(record.assessmentType, record);
    }
  }
  return result;
};
