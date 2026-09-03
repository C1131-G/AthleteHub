import type {
  ConditioningCategory,
  ConditioningUnit,
} from "./conditioning-types";

export interface TestPreset {
  category: ConditioningCategory;
  improvementDirection: "higher" | "lower";
  /** Stable key used to match results across assessments. */
  key: string;
  label: string;
  /** Junior squads test a reduced subset of the muscular-endurance battery. */
  juniorOnly?: boolean;
  protocol: string;
  unit: ConditioningUnit;
}

const MUSCULAR_ENDURANCE = "muscular-endurance";

/**
 * Test battery from the July strength & conditioning deck. Ratings stay
 * coach-selected because the deck defines no age- or sex-specific benchmarks.
 */
export const testPresets: TestPreset[] = [
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    key: "push-ups",
    label: "Push-ups",
    protocol: "Maximum repetitions in one minute, strict form.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    key: "sit-ups",
    label: "Sit-ups",
    protocol: "Maximum repetitions in one minute, feet anchored.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    key: "bench-press",
    label: "Bench press",
    protocol:
      "Load lifted for maximum repetitions at a set percentage of body weight.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    key: "shoulder-press",
    label: "Overhead press",
    protocol: "Load pressed overhead for maximum repetitions.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    juniorOnly: true,
    key: "lat-pulldown",
    label: "Lat pulldown",
    protocol: "Load pulled down for maximum repetitions.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    juniorOnly: true,
    key: "leg-extension",
    label: "Leg extension",
    protocol: "Load extended for maximum repetitions per leg.",
    unit: "repetitions",
  },
  {
    category: MUSCULAR_ENDURANCE,
    improvementDirection: "higher",
    juniorOnly: true,
    key: "leg-curl",
    label: "Leg curl",
    protocol: "Load curled for maximum repetitions per leg.",
    unit: "repetitions",
  },
  {
    category: "isometric",
    improvementDirection: "higher",
    key: "squat-hold",
    label: "Squat hold",
    protocol: "Hold a 90-degree squat for maximum time.",
    unit: "seconds",
  },
  {
    category: "isometric",
    improvementDirection: "higher",
    key: "plank",
    label: "Plank",
    protocol: "Hold a forearm plank for maximum time.",
    unit: "seconds",
  },
  {
    category: "isometric",
    improvementDirection: "higher",
    key: "side-plank-left",
    label: "Left side plank",
    protocol: "Hold a left side plank for maximum time.",
    unit: "seconds",
  },
  {
    category: "isometric",
    improvementDirection: "higher",
    key: "side-plank-right",
    label: "Right side plank",
    protocol: "Hold a right side plank for maximum time.",
    unit: "seconds",
  },
  {
    category: "aerobic",
    improvementDirection: "lower",
    key: "run-2km",
    label: "2 km run",
    protocol: "Timed 2 km run, fastest effort.",
    unit: "seconds",
  },
];

export const presetByKey = new Map(
  testPresets.map((preset) => [preset.key, preset])
);

export const presetsForCategory = (category: ConditioningCategory) =>
  testPresets.filter((preset) => preset.category === category);

export interface SessionTemplate {
  endsAt: string;
  exercises: string[];
  intensity: "recovery" | "low" | "moderate" | "high";
  notes: string;
  startsAt: string;
  title: string;
  type: string;
  weekday: number;
}

/**
 * Weekly structure from the deck: daily warm-ups and jogging, then the
 * strength, HIIT, core, cardio, coordination, and recovery rotation.
 */
export const deckWeeklyTemplate: SessionTemplate[] = [
  {
    endsAt: "07:30",
    exercises: ["Easy pace jogging"],
    intensity: "low",
    notes: "Morning jogging before breakfast.",
    startsAt: "07:00",
    title: "Morning jogging",
    type: "Cardio",
    weekday: 1,
  },
  {
    endsAt: "07:45",
    exercises: [
      "Joint rotations",
      "Dynamic stretching",
      "Light resistance band work",
    ],
    intensity: "low",
    notes: "General warm-up before every shooting session.",
    startsAt: "07:15",
    title: "General warm-up",
    type: "Warm-up",
    weekday: 1,
  },
  {
    endsAt: "08:00",
    exercises: [
      "Bow draw repetitions",
      "Shoulder stability band pulls",
      "Release-stance holds",
    ],
    intensity: "low",
    notes: "Archery-specific warm-up with the bow.",
    startsAt: "07:45",
    title: "Archery-specific warm-up",
    type: "Warm-up",
    weekday: 1,
  },
  {
    endsAt: "18:30",
    exercises: [
      "Sprint intervals 30s on / 60s off",
      "Burpees",
      "Mountain climbers",
      "Rowing intervals",
    ],
    intensity: "high",
    notes: "Full-body high-intensity interval circuit.",
    startsAt: "17:30",
    title: "HIIT circuit",
    type: "HIIT",
    weekday: 2,
  },
  {
    endsAt: "18:30",
    exercises: [
      "Squat",
      "Bench press",
      "Lat pulldown",
      "Overhead press",
      "Leg curl",
    ],
    intensity: "moderate",
    notes: "Full-body strength, 3 sets of 10 at moderate load.",
    startsAt: "17:30",
    title: "Full-body strength",
    type: "Strength",
    weekday: 3,
  },
  {
    endsAt: "18:15",
    exercises: ["Plank series", "Side plank", "Dead bug", "Bird dog"],
    intensity: "moderate",
    notes: "Core stability for shooting posture.",
    startsAt: "17:30",
    title: "Core stability",
    type: "Core",
    weekday: 4,
  },
  {
    endsAt: "18:30",
    exercises: ["Continuous 20-minute run", "Skipping rope"],
    intensity: "moderate",
    notes: "Aerobic base cardio session.",
    startsAt: "17:30",
    title: "Cardio",
    type: "Cardio",
    weekday: 5,
  },
  {
    endsAt: "18:15",
    exercises: [
      "Balance board holds",
      "Single-leg stand with draw",
      "Reaction drills",
    ],
    intensity: "low",
    notes: "Neuromuscular coordination and balance.",
    startsAt: "17:30",
    title: "Coordination",
    type: "Neuromuscular",
    weekday: 6,
  },
  {
    endsAt: "08:00",
    exercises: [],
    intensity: "recovery",
    notes: "Complete rest or light stretching only.",
    startsAt: "07:30",
    title: "Recovery day",
    type: "Recovery",
    weekday: 0,
  },
];
