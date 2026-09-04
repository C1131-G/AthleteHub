import type { Prisma, PrismaClient } from "./generated/client";

/**
 * Every migrated collection stores its complete Zod-validated record in a
 * snapshot column. The sibling columns are derived copies that exist only so
 * SQLite can order, filter, and enforce uniqueness, so readers take the
 * snapshot and ignore them — the two cannot drift if writers set both from one
 * parsed value.
 */
export interface CollectionRow {
  archivedAt: Date | null;
  createdAt: Date;
  id: string;
  snapshot: string;
  updatedAt: Date;
}

/** Rows belonging to an athlete; `Athlete` itself is the one that does not. */
export interface OwnedCollectionRow extends CollectionRow {
  athleteId: string;
}

export interface ListOptions {
  /** Only archived records, for the archive view. Wins over includeArchived. */
  archivedOnly?: boolean;
  /** Ignored by collections that are not owned by an athlete. */
  athleteId?: string;
  includeArchived?: boolean;
}

/**
 * Accepts the client and the transactional client alike, so each accessor is
 * written once and `runTransaction` reuses it rather than restating it.
 */
export type CollectionClient = Prisma.TransactionClient | PrismaClient;

const archivedFilter = (options: ListOptions | undefined) => {
  if (options?.archivedOnly) {
    return { archivedAt: { not: null } };
  }
  return options?.includeArchived ? {} : { archivedAt: null };
};

const ownerFilter = (options: ListOptions | undefined) =>
  options?.athleteId === undefined ? {} : { athleteId: options.athleteId };

export interface AthleteIndex {
  category: string;
  code: string;
  dateOfBirth: string;
  fullName: string;
  status: string;
}

export type AthleteSaveInput = AthleteIndex & {
  id: string;
  snapshot: string;
};

export interface AthleteCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<CollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<CollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: AthleteSaveInput) => Promise<CollectionRow>;
}

const toAthleteRow = (record: {
  archivedAt: Date | null;
  createdAt: Date;
  id: string;
  profileSnapshot: string;
  updatedAt: Date;
}): CollectionRow => ({
  archivedAt: record.archivedAt,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.profileSnapshot,
  updatedAt: record.updatedAt,
});

const athleteCollection = (client: CollectionClient): AthleteCollection => ({
  archive: async (id) => {
    await client.athlete.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.athlete.findUnique({ where: { id } });
    return record ? toAthleteRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.athlete.findMany({
      orderBy: [{ fullName: "asc" }],
      where: archivedFilter(options),
    });
    return records.map(toAthleteRow);
  },
  restore: async (id) => {
    await client.athlete.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.athlete.upsert({
      create: {
        archivedAt: null,
        category: input.category,
        code: input.code,
        createdAt: now,
        dateOfBirth: input.dateOfBirth,
        fullName: input.fullName,
        id: input.id,
        profileSnapshot: input.snapshot,
        status: input.status,
        updatedAt: now,
      },
      update: {
        category: input.category,
        code: input.code,
        dateOfBirth: input.dateOfBirth,
        fullName: input.fullName,
        profileSnapshot: input.snapshot,
        status: input.status,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toAthleteRow(record);
  },
});

export interface EquipmentSetupIndex {
  recordedAt: string;
}

export type EquipmentSetupSaveInput = EquipmentSetupIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface EquipmentSetupCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: EquipmentSetupSaveInput) => Promise<OwnedCollectionRow>;
}

const toEquipmentSetupRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  itemsSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.itemsSnapshot,
  updatedAt: record.updatedAt,
});

const equipmentSetupCollection = (
  client: CollectionClient
): EquipmentSetupCollection => ({
  archive: async (id) => {
    await client.equipmentSetup.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.equipmentSetup.findUnique({ where: { id } });
    return record ? toEquipmentSetupRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.equipmentSetup.findMany({
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toEquipmentSetupRow);
  },
  restore: async (id) => {
    await client.equipmentSetup.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.equipmentSetup.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        id: input.id,
        itemsSnapshot: input.snapshot,
        recordedAt: input.recordedAt,
        updatedAt: now,
      },
      update: {
        itemsSnapshot: input.snapshot,
        recordedAt: input.recordedAt,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toEquipmentSetupRow(record);
  },
});

export interface WeeklyReportIndex {
  status: string;
  weekStart: string;
}

export type WeeklyReportSaveInput = WeeklyReportIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface WeeklyReportCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: WeeklyReportSaveInput) => Promise<OwnedCollectionRow>;
}

const toWeeklyReportRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  reportSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.reportSnapshot,
  updatedAt: record.updatedAt,
});

const weeklyReportCollection = (
  client: CollectionClient
): WeeklyReportCollection => ({
  archive: async (id) => {
    await client.weeklyReport.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.weeklyReport.findUnique({ where: { id } });
    return record ? toWeeklyReportRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.weeklyReport.findMany({
      orderBy: [{ weekStart: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toWeeklyReportRow);
  },
  restore: async (id) => {
    await client.weeklyReport.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.weeklyReport.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        id: input.id,
        reportSnapshot: input.snapshot,
        status: input.status,
        updatedAt: now,
        weekStart: input.weekStart,
      },
      update: {
        reportSnapshot: input.snapshot,
        status: input.status,
        updatedAt: now,
        weekStart: input.weekStart,
      },
      where: { id: input.id },
    });
    return toWeeklyReportRow(record);
  },
});

export interface MonthlyReportIndex {
  month: string;
}

export type MonthlyReportSaveInput = MonthlyReportIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface MonthlyReportCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: MonthlyReportSaveInput) => Promise<OwnedCollectionRow>;
}

const toMonthlyReportRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  reportSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.reportSnapshot,
  updatedAt: record.updatedAt,
});

const monthlyReportCollection = (
  client: CollectionClient
): MonthlyReportCollection => ({
  archive: async (id) => {
    await client.monthlyReport.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.monthlyReport.findUnique({ where: { id } });
    return record ? toMonthlyReportRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.monthlyReport.findMany({
      orderBy: [{ month: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toMonthlyReportRow);
  },
  restore: async (id) => {
    await client.monthlyReport.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.monthlyReport.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        id: input.id,
        month: input.month,
        reportSnapshot: input.snapshot,
        updatedAt: now,
      },
      update: {
        month: input.month,
        reportSnapshot: input.snapshot,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toMonthlyReportRow(record);
  },
});

export interface AssessmentIndex {
  date: string;
  type: string;
  weeklyReportId: string | null;
}

export type AssessmentSaveInput = AssessmentIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface AssessmentCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: AssessmentSaveInput) => Promise<OwnedCollectionRow>;
}

const toAssessmentRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  payloadSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.payloadSnapshot,
  updatedAt: record.updatedAt,
});

const assessmentCollection = (
  client: CollectionClient
): AssessmentCollection => ({
  archive: async (id) => {
    await client.assessment.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.assessment.findUnique({ where: { id } });
    return record ? toAssessmentRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.assessment.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toAssessmentRow);
  },
  restore: async (id) => {
    await client.assessment.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.assessment.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        date: input.date,
        id: input.id,
        payloadSnapshot: input.snapshot,
        type: input.type,
        updatedAt: now,
        weeklyReportId: input.weeklyReportId,
      },
      update: {
        date: input.date,
        payloadSnapshot: input.snapshot,
        type: input.type,
        updatedAt: now,
        weeklyReportId: input.weeklyReportId,
      },
      where: { id: input.id },
    });
    return toAssessmentRow(record);
  },
});

export interface ConditioningAssessmentIndex {
  date: string;
}

export type ConditioningAssessmentSaveInput = ConditioningAssessmentIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface ConditioningAssessmentCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: ConditioningAssessmentSaveInput) => Promise<OwnedCollectionRow>;
}

const toConditioningAssessmentRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  resultsSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.resultsSnapshot,
  updatedAt: record.updatedAt,
});

const conditioningAssessmentCollection = (
  client: CollectionClient
): ConditioningAssessmentCollection => ({
  archive: async (id) => {
    await client.conditioningAssessment.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.conditioningAssessment.findUnique({
      where: { id },
    });
    return record ? toConditioningAssessmentRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.conditioningAssessment.findMany({
      orderBy: [{ date: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toConditioningAssessmentRow);
  },
  restore: async (id) => {
    await client.conditioningAssessment.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.conditioningAssessment.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        date: input.date,
        id: input.id,
        resultsSnapshot: input.snapshot,
        updatedAt: now,
      },
      update: {
        date: input.date,
        resultsSnapshot: input.snapshot,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toConditioningAssessmentRow(record);
  },
});

export interface ConditioningProgrammeIndex {
  endDate: string;
  startDate: string;
  status: string;
}

export type ConditioningProgrammeSaveInput = ConditioningProgrammeIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface ConditioningProgrammeCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: ConditioningProgrammeSaveInput) => Promise<OwnedCollectionRow>;
}

const toConditioningProgrammeRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  phasesSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.phasesSnapshot,
  updatedAt: record.updatedAt,
});

const conditioningProgrammeCollection = (
  client: CollectionClient
): ConditioningProgrammeCollection => ({
  archive: async (id) => {
    await client.conditioningProgramme.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.conditioningProgramme.findUnique({
      where: { id },
    });
    return record ? toConditioningProgrammeRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.conditioningProgramme.findMany({
      orderBy: [{ startDate: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toConditioningProgrammeRow);
  },
  restore: async (id) => {
    await client.conditioningProgramme.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.conditioningProgramme.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        endDate: input.endDate,
        id: input.id,
        phasesSnapshot: input.snapshot,
        startDate: input.startDate,
        status: input.status,
        updatedAt: now,
      },
      update: {
        endDate: input.endDate,
        phasesSnapshot: input.snapshot,
        startDate: input.startDate,
        status: input.status,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toConditioningProgrammeRow(record);
  },
});

export interface TrainingPlanIndex {
  seasonEnd: string;
  seasonStart: string;
  status: string;
}

export type TrainingPlanSaveInput = TrainingPlanIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface TrainingPlanCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: TrainingPlanSaveInput) => Promise<OwnedCollectionRow>;
}

const toTrainingPlanRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  planSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.planSnapshot,
  updatedAt: record.updatedAt,
});

const trainingPlanCollection = (
  client: CollectionClient
): TrainingPlanCollection => ({
  archive: async (id) => {
    await client.trainingPlan.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.trainingPlan.findUnique({ where: { id } });
    return record ? toTrainingPlanRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.trainingPlan.findMany({
      orderBy: [{ seasonStart: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toTrainingPlanRow);
  },
  restore: async (id) => {
    await client.trainingPlan.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.trainingPlan.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        createdAt: now,
        id: input.id,
        planSnapshot: input.snapshot,
        seasonEnd: input.seasonEnd,
        seasonStart: input.seasonStart,
        status: input.status,
        updatedAt: now,
      },
      update: {
        planSnapshot: input.snapshot,
        seasonEnd: input.seasonEnd,
        seasonStart: input.seasonStart,
        status: input.status,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toTrainingPlanRow(record);
  },
});

export interface MonthlyCycleIndex {
  completedAt: Date | null;
  month: string;
}

export type MonthlyCycleSaveInput = MonthlyCycleIndex & {
  athleteId: string;
  id: string;
  snapshot: string;
};

export interface MonthlyCycleCollection {
  archive: (id: string) => Promise<void>;
  get: (id: string) => Promise<OwnedCollectionRow | undefined>;
  list: (options?: ListOptions) => Promise<OwnedCollectionRow[]>;
  restore: (id: string) => Promise<void>;
  save: (input: MonthlyCycleSaveInput) => Promise<OwnedCollectionRow>;
}

const toMonthlyCycleRow = (record: {
  archivedAt: Date | null;
  athleteId: string;
  createdAt: Date;
  id: string;
  stepsSnapshot: string;
  updatedAt: Date;
}): OwnedCollectionRow => ({
  archivedAt: record.archivedAt,
  athleteId: record.athleteId,
  createdAt: record.createdAt,
  id: record.id,
  snapshot: record.stepsSnapshot,
  updatedAt: record.updatedAt,
});

const monthlyCycleCollection = (
  client: CollectionClient
): MonthlyCycleCollection => ({
  archive: async (id) => {
    await client.monthlyCycle.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  },
  get: async (id) => {
    const record = await client.monthlyCycle.findUnique({ where: { id } });
    return record ? toMonthlyCycleRow(record) : undefined;
  },
  list: async (options) => {
    const records = await client.monthlyCycle.findMany({
      orderBy: [{ month: "desc" }],
      where: { ...archivedFilter(options), ...ownerFilter(options) },
    });
    return records.map(toMonthlyCycleRow);
  },
  restore: async (id) => {
    await client.monthlyCycle.update({
      data: { archivedAt: null },
      where: { id },
    });
  },
  save: async (input) => {
    const now = new Date();
    const record = await client.monthlyCycle.upsert({
      create: {
        archivedAt: null,
        athleteId: input.athleteId,
        completedAt: input.completedAt,
        createdAt: now,
        id: input.id,
        month: input.month,
        stepsSnapshot: input.snapshot,
        updatedAt: now,
      },
      update: {
        completedAt: input.completedAt,
        month: input.month,
        stepsSnapshot: input.snapshot,
        updatedAt: now,
      },
      where: { id: input.id },
    });
    return toMonthlyCycleRow(record);
  },
});

export interface Collections {
  assessments: AssessmentCollection;
  athletes: AthleteCollection;
  conditioningAssessments: ConditioningAssessmentCollection;
  conditioningProgrammes: ConditioningProgrammeCollection;
  equipment: EquipmentSetupCollection;
  monthlyCycles: MonthlyCycleCollection;
  monthlyReports: MonthlyReportCollection;
  trainingPlans: TrainingPlanCollection;
  weeklyReports: WeeklyReportCollection;
}

export const createCollections = (client: CollectionClient): Collections => ({
  assessments: assessmentCollection(client),
  athletes: athleteCollection(client),
  conditioningAssessments: conditioningAssessmentCollection(client),
  conditioningProgrammes: conditioningProgrammeCollection(client),
  equipment: equipmentSetupCollection(client),
  monthlyCycles: monthlyCycleCollection(client),
  monthlyReports: monthlyReportCollection(client),
  trainingPlans: trainingPlanCollection(client),
  weeklyReports: weeklyReportCollection(client),
});
