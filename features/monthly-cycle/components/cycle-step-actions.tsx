"use client";

import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

import {
  adjacentSteps,
  cycleQueueHref,
  stepMeta,
} from "../monthly-cycle-steps";
import type { MonthlyCycleStep } from "../monthly-cycle-types";
import { useCycleGuard } from "./cycle-guard";

/**
 * Every step ends with the same three actions. The save callbacks persist the
 * domain record and the lifecycle confirmation, then navigate; Back never
 * saves and asks before discarding unsaved changes.
 */
export const CycleStepActions = ({
  cycleId,
  saveContinueDisabled = false,
  saveContinueLabel = "Save & continue",
  onSaveContinue,
  onSaveExit,
  saving = false,
  step,
}: {
  cycleId: string;
  saveContinueDisabled?: boolean;
  saveContinueLabel?: string;
  onSaveContinue: () => void;
  onSaveExit: () => void;
  saving?: boolean;
  step: MonthlyCycleStep;
}) => {
  const router = useRouter();
  const { confirmNavigation } = useCycleGuard();
  const { previous } = adjacentSteps(step);

  const goBack = () => {
    const target = previous
      ? stepMeta(previous).href(cycleId)
      : cycleQueueHref();
    // SAFETY: this helper only returns the registered monthly-cycle queue URL.
    confirmNavigation(() =>
      router.push(target as Parameters<typeof router.push>[0])
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button onClick={goBack} type="button" variant="ghost">
        <ArrowLeftIcon aria-hidden /> Back
      </Button>
      <ButtonGroup>
        <Button onClick={onSaveExit} type="button" variant="outline">
          <SignOutIcon aria-hidden /> Save &amp; exit
        </Button>
        <Button
          disabled={saveContinueDisabled || saving}
          onClick={onSaveContinue}
          type="button"
        >
          <FloppyDiskIcon aria-hidden />{" "}
          {saving ? "Saving…" : saveContinueLabel}
        </Button>
      </ButtonGroup>
    </div>
  );
};
