"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHydrated } from "@/hooks/use-hydrated";

import {
  hasLegacyDataToImport,
  markLegacyImportComplete,
  runLegacyImport,
} from "../legacy-import";
import type { LegacyImportSummary } from "../legacy-import";

/**
 * Offers the one-time move of data written before collections lived in SQLite.
 * The check reads localStorage, so it runs after mount rather than during
 * render, and it asks first: importing writes to the coach's database.
 */
export const LegacyImportPrompt = () => {
  const [dismissed, setDismissed] = useState(false);
  const [summary, setSummary] = useState<LegacyImportSummary | undefined>();
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  // localStorage does not exist while rendering on the server, so the check
  // waits for hydration rather than running in an effect after first paint.
  const hydrated = useHydrated();
  const open = hydrated && !dismissed && hasLegacyDataToImport();

  const dismiss = () => {
    // Recording it as done stops the prompt returning on every launch.
    markLegacyImportComplete();
    setDismissed(true);
  };

  const importNow = () => {
    startTransition(async () => {
      const result = await runLegacyImport();
      setDismissed(true);
      setSummary(result);
      await queryClient.invalidateQueries();
    });
  };

  if (summary) {
    return (
      <AlertDialog open onOpenChange={() => setSummary(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import finished</AlertDialogTitle>
            <AlertDialogDescription>
              {`Imported ${summary.imported} records. ${summary.skipped} were skipped because they no longer read correctly.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSummary(undefined)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={dismiss}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Import your existing data</AlertDialogTitle>
          <AlertDialogDescription>
            SSAIT Athlete360 now stores athletes, reports, assessments,
            conditioning and cycles in its own database instead of the browser.
            Import what is already on this device to carry it across. Your
            existing data is left untouched either way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>Not now</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={importNow}>
            {pending ? "Importing…" : "Import"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
