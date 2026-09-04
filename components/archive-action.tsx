"use client";

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
import { Button } from "@/components/ui/button";
import type { MutationFailure } from "@/lib/service-result";

interface ArchiveActionProps {
  /** What is being archived, e.g. "Jatin Kumar" or "the March weekly entry". */
  label: string;
  onArchive: () => Promise<{ status: string } | MutationFailure>;
}

/**
 * Archiving is reversible and nothing is ever hard-deleted, but it still
 * removes a record from every list, so it asks first.
 */
export const ArchiveAction = ({ label, onArchive }: ArchiveActionProps) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await onArchive();
      if (result.status === "saved") {
        setOpen(false);
        return;
      }
      setError("That record could not be archived. Try again.");
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        Archive
      </Button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              It is hidden from the lists but kept, so you can restore it from
              the archived view at any time. Nothing is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirm}>
              {pending ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
