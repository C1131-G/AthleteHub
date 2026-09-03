"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { categoryLabel, statusLabel } from "@/features/athlete/athlete-labels";
import { formatDate } from "@/lib/format";

import { confirmCycleStep } from "../cycle-step-actions";
import type { CycleDomainContext } from "../monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { CycleStepActions } from "./cycle-step-actions";
import { StaleStepAlert } from "./stale-step-alert";

const summaryRows = (context: CycleDomainContext): [string, string][] => {
  const { athlete } = context;
  if (!athlete) {
    return [];
  }
  return [
    ["Bow category", categoryLabel[athlete.category]],
    ["Status", statusLabel[athlete.status]],
    ["Date of birth", formatDate(athlete.dateOfBirth)],
    [
      "Height / weight",
      `${athlete.heightCm ?? "—"} cm · ${athlete.weightKg ?? "—"} kg`,
    ],
    ["Arm span", athlete.armSpanCm ? `${athlete.armSpanCm} cm` : "—"],
    [
      "Target distance",
      athlete.targetDistanceM ? `${athlete.targetDistanceM} m` : "—",
    ],
    ["Target score", athlete.targetScore ? String(athlete.targetScore) : "—"],
    ["Equipment notes", athlete.equipmentNotes || "—"],
    ["Technical focus", athlete.technicalFocus || "—"],
  ];
};

export const ProfileStep = ({
  context,
  cycle,
  status,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  status: "pending" | "complete" | "exception" | "stale";
}) => {
  const router = useRouter();
  const rows = summaryRows(context);
  const { athlete } = context;

  const confirm = () => {
    if (!athlete) {
      return;
    }
    const result = confirmCycleStep(cycle, "profile", {
      sources: [{ id: athlete.id, updatedAt: athlete.updatedAt }],
      status: "complete",
    });
    if (result.status === "saved") {
      router.push(`/monthly-cycles/${cycle.id}/equipment`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Review the athlete&apos;s record and confirm it is current for{" "}
          {formatDate(`${cycle.month}-01`)}.
        </p>
      </div>
      {status === "stale" ? (
        <StaleStepAlert label="The athlete record" />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {athlete?.fullName}
            {athlete ? (
              <Badge variant="secondary">{athlete.athleteId}</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Details are managed on the athlete profile; confirm here that they
            are up to date. An exception is not allowed for this step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {status === "complete" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <CheckCircleIcon aria-hidden className="text-primary size-4" />{" "}
          Profile confirmed. Use Save &amp; continue to reconfirm and move on.
        </p>
      ) : null}
      {status === "complete" ? null : (
        <Button
          disabled={!athlete}
          onClick={confirm}
          type="button"
          variant="outline"
        >
          <CheckCircleIcon aria-hidden /> Confirm profile is current
        </Button>
      )}
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={confirm}
        onSaveExit={() => {
          if (athlete) {
            confirmCycleStep(cycle, "profile", {
              sources: [{ id: athlete.id, updatedAt: athlete.updatedAt }],
              status: "complete",
            });
          }
          router.push(`/monthly-cycles?month=${cycle.month}`);
        }}
        saveContinueDisabled={!athlete}
        step="profile"
      />
    </div>
  );
};
