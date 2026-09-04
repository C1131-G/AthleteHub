import type { Collections } from "../../electron/collections";
import { createAssessmentService } from "../assessment/assessment-service";
import { assessmentSchema } from "../assessment/assessment-types";
import type { Assessment } from "../assessment/assessment-types";
import { createAthleteService } from "../athlete/athlete-service";
import { athleteSchema } from "../athlete/athlete-types";
import type { Athlete } from "../athlete/athlete-types";
import { createConditioningAssessmentService } from "../conditioning/conditioning-assessment-service";
import { createConditioningProgrammeService } from "../conditioning/conditioning-programme-service";
import {
  conditioningAssessmentSchema,
  conditioningProgrammeSchema,
} from "../conditioning/conditioning-types";
import type {
  ConditioningAssessment,
  ConditioningProgramme,
} from "../conditioning/conditioning-types";
import { createEquipmentSetupService } from "../equipment/equipment-service";
import { equipmentSetupSchema } from "../equipment/equipment-types";
import type { EquipmentSetup } from "../equipment/equipment-types";
import { createMonthlyCycleService } from "../monthly-cycle/monthly-cycle-service";
import { monthlyCycleSchema } from "../monthly-cycle/monthly-cycle-types";
import type { MonthlyAthleteCycle } from "../monthly-cycle/monthly-cycle-types";
import { createMonthlyReportService } from "../report/monthly-report-service";
import {
  monthlyReportSchema,
  weeklyReportSchema,
} from "../report/report-types";
import type {
  MonthlyPerformanceReport,
  WeeklyPerformanceReport,
} from "../report/report-types";
import { createWeeklyReportService } from "../report/weekly-report-service";
import { createTrainingPlanService } from "../training-plan/training-plan-service";
import { seasonTrainingPlanSchema } from "../training-plan/training-plan-types";
import type { SeasonTrainingPlan } from "../training-plan/training-plan-types";

/**
 * Browser-safe on purpose: it names no database driver, only the accessor
 * interface. The Electron main process passes the SQLite collections; the
 * browser dev server passes the localStorage ones, and both run this same
 * service code rather than parallel implementations that could drift.
 */
export const createCollectionServices = (collections: Collections) => ({
  assessments: createAssessmentService(collections),
  athletes: createAthleteService(collections),
  conditioningAssessments: createConditioningAssessmentService(collections),
  conditioningProgrammes: createConditioningProgrammeService(collections),
  equipment: createEquipmentSetupService(collections),
  monthlyCycles: createMonthlyCycleService(collections),
  monthlyReports: createMonthlyReportService(collections),
  trainingPlans: createTrainingPlanService(collections),
  weeklyReports: createWeeklyReportService(collections),
});

export type CollectionServices = ReturnType<typeof createCollectionServices>;
export type CollectionName = keyof CollectionServices;

export const collectionNames = [
  "assessments",
  "athletes",
  "conditioningAssessments",
  "conditioningProgrammes",
  "equipment",
  "monthlyCycles",
  "monthlyReports",
  "trainingPlans",
  "weeklyReports",
] as const satisfies readonly CollectionName[];

export const collectionMethods = [
  "archive",
  "create",
  "get",
  "importRecord",
  "list",
  "restore",
  "update",
] as const;

/**
 * The record each collection holds. Both transports — the Electron bridge and
 * the local services — are typed from this one map, so a hook resolves to the
 * same record type whichever one it gets.
 */
export interface CollectionRecordMap {
  assessments: Assessment;
  athletes: Athlete;
  conditioningAssessments: ConditioningAssessment;
  conditioningProgrammes: ConditioningProgramme;
  equipment: EquipmentSetup;
  monthlyCycles: MonthlyAthleteCycle;
  monthlyReports: MonthlyPerformanceReport;
  trainingPlans: SeasonTrainingPlan;
  weeklyReports: WeeklyPerformanceReport;
}

/** Parses records coming back across the process boundary. */
export const collectionSchemas = {
  assessments: assessmentSchema,
  athletes: athleteSchema,
  conditioningAssessments: conditioningAssessmentSchema,
  conditioningProgrammes: conditioningProgrammeSchema,
  equipment: equipmentSetupSchema,
  monthlyCycles: monthlyCycleSchema,
  monthlyReports: monthlyReportSchema,
  trainingPlans: seasonTrainingPlanSchema,
  weeklyReports: weeklyReportSchema,
} as const;
