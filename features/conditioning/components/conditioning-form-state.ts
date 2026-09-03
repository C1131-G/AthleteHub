import { formatDuration } from "../conditioning-calculations";
import { deckWeeklyTemplate, testPresets } from "../conditioning-presets";
import type {
  ConditioningAssessment,
  ConditioningAssessmentInput,
  ConditioningExercise,
  ConditioningProgramme,
  ConditioningProgrammeInput,
  ConditioningSession,
} from "../conditioning-types";

export interface ResultDraft {
  category: ConditioningAssessment["results"][number]["category"];
  customUnit: string;
  id: string;
  improvementDirection: "higher" | "lower";
  key: string;
  label: string;
  notes: string;
  protocol: string;
  rating: ConditioningAssessment["results"][number]["rating"];
  unit: ConditioningAssessment["results"][number]["unit"];
  /** Seconds units are entered as m:ss; every other unit is a plain number. */
  valueText: string;
}

export interface AssessmentFormState {
  assessedOn: string;
  athleteId: string;
  coachSummary: string;
  developmentText: string;
  recommendationsText: string;
  restrictionNotes: string;
  results: ResultDraft[];
  status: ConditioningAssessment["status"];
  strengthsText: string;
}

export const emptyResultDraft = (): ResultDraft => ({
  category: "custom",
  customUnit: "",
  id: crypto.randomUUID(),
  improvementDirection: "higher",
  key: `custom-${crypto.randomUUID()}`,
  label: "",
  notes: "",
  protocol: "",
  rating: "average",
  unit: "custom",
  valueText: "",
});

export const presetResultDraft = (
  presetKey: string
): ResultDraft | undefined => {
  const preset = testPresets.find((candidate) => candidate.key === presetKey);
  if (!preset) {
    return undefined;
  }
  return {
    category: preset.category,
    customUnit: "",
    id: crypto.randomUUID(),
    improvementDirection: preset.improvementDirection,
    key: preset.key,
    label: preset.label,
    notes: "",
    protocol: preset.protocol,
    rating: "average",
    unit: preset.unit,
    valueText: "",
  };
};

export const createAssessmentDraft = (
  athleteId: string,
  source?: ConditioningAssessment
): AssessmentFormState => ({
  assessedOn: source?.assessedOn ?? "",
  athleteId: source?.athleteId ?? athleteId,
  coachSummary: source?.coachSummary ?? "",
  developmentText: source?.developmentAreas.join("\n") ?? "",
  recommendationsText: source?.recommendations.join("\n") ?? "",
  restrictionNotes: source?.restrictionNotes ?? "",
  results:
    source?.results.map((result) => ({
      ...result,
      customUnit: result.customUnit ?? "",
      valueText:
        result.unit === "seconds"
          ? formatDuration(result.value)
          : String(result.value),
    })) ?? [],
  status: source?.status ?? "completed",
  strengthsText: source?.strengths.join("\n") ?? "",
});

const parseValue = (draft: ResultDraft) => {
  if (draft.unit === "seconds") {
    const seconds = draft.valueText.includes(":")
      ? (() => {
          const [minutes, rest] = draft.valueText.split(":");
          return Number(minutes) * 60 + Number(rest);
        })()
      : Number(draft.valueText);
    return Number.isFinite(seconds) ? seconds : Number.NaN;
  }
  const value = Number(draft.valueText);
  return Number.isFinite(value) ? value : Number.NaN;
};

export const toAssessmentInput = (
  form: AssessmentFormState
): ConditioningAssessmentInput => ({
  assessedOn: form.assessedOn,
  athleteId: form.athleteId,
  coachSummary: form.coachSummary,
  developmentAreas: form.developmentText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
  recommendations: form.recommendationsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
  restrictionNotes: form.restrictionNotes,
  results: form.results.flatMap((draft) => {
    const value = parseValue(draft);
    if (Number.isNaN(value)) {
      return [];
    }
    return [
      {
        category: draft.category,
        customUnit: draft.unit === "custom" ? draft.customUnit : undefined,
        id: draft.id,
        improvementDirection: draft.improvementDirection,
        key: draft.key,
        label: draft.label,
        notes: draft.notes,
        protocol: draft.protocol,
        rating: draft.rating,
        unit: draft.unit,
        value,
      },
    ];
  }),
  status: form.status,
  strengths: form.strengthsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
});

export interface SessionDraft {
  endsAt: string;
  exercises: {
    distanceText: string;
    durationText: string;
    id: string;
    loadText: string;
    name: string;
    notes: string;
    repsText: string;
    restText: string;
    rpeText: string;
    setTexts: string;
  }[];
  id: string;
  intensity: ConditioningSession["intensity"];
  notes: string;
  startsAt: string;
  title: string;
  type: string;
  weekday: number;
}

export interface ProgrammeFormState {
  athleteId: string;
  customPhase: string;
  endsOn: string;
  objectivesText: string;
  phase: ConditioningProgramme["phase"];
  restrictionNotes: string;
  sessions: SessionDraft[];
  startsOn: string;
  status: ConditioningProgramme["status"];
  title: string;
  trainingPlanId: string;
}

const numberOrUndefined = (text: string) => {
  const value = Number(text);
  return text.trim() && Number.isFinite(value) ? value : undefined;
};

const durationOrUndefined = (text: string) => {
  if (!text.trim()) {
    return;
  }
  if (text.includes(":")) {
    const match = /^(?<minutes>\d+):(?<seconds>[0-5]?\d)$/.exec(text);
    return match
      ? Number(match.groups?.minutes) * 60 + Number(match.groups?.seconds)
      : undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

export const toProgrammeInput = (
  form: ProgrammeFormState
): ConditioningProgrammeInput => ({
  athleteId: form.athleteId,
  customPhase: form.phase === "custom" ? form.customPhase : undefined,
  endsOn: form.endsOn,
  objectives: form.objectivesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
  phase: form.phase,
  restrictionNotes: form.restrictionNotes,
  sessions: form.sessions.map((session) => ({
    endsAt: session.endsAt,
    exercises: session.exercises.flatMap((exercise) => {
      if (!exercise.name.trim()) {
        return [];
      }
      const prescription: ConditioningExercise = {
        id: exercise.id,
        name: exercise.name,
        notes: exercise.notes,
      };
      const sets = numberOrUndefined(exercise.setTexts);
      const reps = numberOrUndefined(exercise.repsText);
      const durationSeconds = durationOrUndefined(exercise.durationText);
      const distanceM = numberOrUndefined(exercise.distanceText);
      const loadKg = numberOrUndefined(exercise.loadText);
      const restSeconds = numberOrUndefined(exercise.restText);
      const rpe = numberOrUndefined(exercise.rpeText);
      return [
        {
          ...prescription,
          distanceM,
          durationSeconds,
          loadKg,
          reps: reps === undefined ? undefined : Math.round(reps),
          restSeconds,
          rpe,
          sets: sets === undefined ? undefined : Math.round(sets),
        },
      ];
    }),
    id: session.id,
    intensity: session.intensity,
    notes: session.notes,
    startsAt: session.startsAt,
    title: session.title,
    type: session.type,
    weekday: session.weekday,
  })),
  startsOn: form.startsOn,
  status: form.status,
  title: form.title,
  trainingPlanId: form.trainingPlanId || undefined,
});

const optionalText = (
  value: number | undefined,
  format?: (n: number) => string
) => {
  if (value === undefined) {
    return "";
  }
  return format ? format(value) : String(value);
};

const exerciseToDraft = (exercise: ConditioningExercise) => ({
  distanceText: optionalText(exercise.distanceM),
  durationText: optionalText(exercise.durationSeconds, formatDuration),
  id: exercise.id,
  loadText: optionalText(exercise.loadKg),
  name: exercise.name,
  notes: exercise.notes,
  repsText: optionalText(exercise.reps),
  restText: optionalText(exercise.restSeconds),
  rpeText: optionalText(exercise.rpe),
  setTexts: optionalText(exercise.sets),
});

const sessionToDraft = (session: ConditioningSession): SessionDraft => ({
  ...session,
  exercises: session.exercises.map(exerciseToDraft),
});

const templateToDraft = (
  template: (typeof deckWeeklyTemplate)[number]
): SessionDraft => ({
  ...template,
  exercises: template.exercises.map((name) => ({
    distanceText: "",
    durationText: "",
    id: crypto.randomUUID(),
    loadText: "",
    name,
    notes: "",
    repsText: "",
    restText: "",
    rpeText: "",
    setTexts: "",
  })),
  id: crypto.randomUUID(),
});

const sourceToState = (
  athleteId: string,
  source: ConditioningProgramme | undefined,
  sessions: SessionDraft[]
): ProgrammeFormState => {
  const empty: ProgrammeFormState = {
    athleteId,
    customPhase: "",
    endsOn: "",
    objectivesText: "",
    phase: "foundation",
    restrictionNotes: "",
    sessions,
    startsOn: "",
    status: "draft",
    title: "",
    trainingPlanId: "",
  };
  if (!source) {
    return empty;
  }
  return {
    ...empty,
    athleteId: source.athleteId,
    customPhase: source.customPhase ?? "",
    endsOn: source.endsOn,
    objectivesText: source.objectives.join("\n"),
    phase: source.phase,
    restrictionNotes: source.restrictionNotes,
    startsOn: source.startsOn,
    status: source.status,
    title: source.title,
    trainingPlanId: source.trainingPlanId ?? "",
  };
};

/** Seeds a new programme with the deck's recommended weekly structure. */
export const createProgrammeDraft = (
  athleteId: string,
  source?: ConditioningProgramme
): ProgrammeFormState =>
  sourceToState(
    athleteId,
    source,
    source
      ? source.sessions.map(sessionToDraft)
      : deckWeeklyTemplate.map(templateToDraft)
  );
