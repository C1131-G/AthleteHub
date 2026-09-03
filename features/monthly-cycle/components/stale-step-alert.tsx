"use client";

import { WarningIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown above any step whose confirmed sources changed since the coach last
 * confirmed it — the confirmation no longer describes the live records.
 */
export const StaleStepAlert = ({ label }: { label: string }) => (
  <Alert variant="destructive">
    <WarningIcon aria-hidden />
    <AlertTitle>{label} changed since you confirmed it</AlertTitle>
    <AlertDescription>
      Review the current record and confirm this step again to keep the cycle
      accurate.
    </AlertDescription>
  </Alert>
);
