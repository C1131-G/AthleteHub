import type { MonthlyCycleStep } from "./monthly-cycle-types";

export interface MonthlyCycleStepMeta {
  description: string;
  href: (cycleId: string) => `/monthly-cycles/${string}/${MonthlyCycleStep}`;
  label: string;
  step: MonthlyCycleStep;
}

const stepPath = (cycleId: string, step: MonthlyCycleStep) =>
  `/monthly-cycles/${cycleId}/${step}` as const;

/** Canonical order; the queue, header, and Save & Continue all follow it. */
export const monthlyCycleStepMeta: MonthlyCycleStepMeta[] = [
  {
    description: "Review and confirm the athlete's current record.",
    href: (cycleId) => stepPath(cycleId, "profile"),
    label: "Profile",
    step: "profile",
  },
  {
    description: "Confirm the equipment in use for the month.",
    href: (cycleId) => stepPath(cycleId, "equipment"),
    label: "Equipment",
    step: "equipment",
  },
  {
    description: "Complete every weekly report the month expects.",
    href: (cycleId) => stepPath(cycleId, "weekly"),
    label: "Weekly reports",
    step: "weekly",
  },
  {
    description: "Review the monthly average derived from weekly reports.",
    href: (cycleId) => stepPath(cycleId, "monthly-average"),
    label: "Monthly average",
    step: "monthly-average",
  },
  {
    description: "Plan or confirm next month's training load.",
    href: (cycleId) => stepPath(cycleId, "training-load"),
    label: "Training load",
    step: "training-load",
  },
  {
    description: "Confirm conditioning assessment and programme.",
    href: (cycleId) => stepPath(cycleId, "conditioning"),
    label: "Conditioning",
    step: "conditioning",
  },
  {
    description: "Review everything and complete the monthly report.",
    href: (cycleId) => stepPath(cycleId, "review"),
    label: "Review",
    step: "review",
  },
];

export const stepMeta = (step: MonthlyCycleStep): MonthlyCycleStepMeta => {
  const meta = monthlyCycleStepMeta.find((entry) => entry.step === step);
  if (!meta) {
    throw new Error(`Unknown monthly cycle step: ${step}`);
  }
  return meta;
};

export function cycleQueueHref(): "/monthly-cycles";
export function cycleQueueHref(month: string, summary?: boolean): string;
export function cycleQueueHref(month?: string, summary?: boolean): string {
  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }
  if (summary) {
    params.set("summary", "month-complete");
  }
  const query = params.toString();
  return query ? `/monthly-cycles?${query}` : "/monthly-cycles";
}

export const adjacentSteps = (step: MonthlyCycleStep) => {
  const index = monthlyCycleStepMeta.findIndex((entry) => entry.step === step);
  return {
    next: monthlyCycleStepMeta[index + 1]?.step,
    previous: monthlyCycleStepMeta[index - 1]?.step,
  };
};
