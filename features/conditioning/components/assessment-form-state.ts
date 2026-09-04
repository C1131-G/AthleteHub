import { formatDuration } from "../conditioning-calculations";
import { testPresets } from "../conditioning-presets";
import type {
  ConditioningAssessment,
  ConditioningAssessmentInput,
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
