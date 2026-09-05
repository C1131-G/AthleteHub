"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { exportBackup, restoreBackup } from "../backup";

export const BackupPanel = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const runExport = () => {
    startTransition(async () => {
      setError("");
      const bundle = await exportBackup();
      const total = Object.values(bundle.collections).reduce(
        (sum, records) => sum + records.length,
        0
      );
      setMessage(`Exported ${total} records.`);
    });
  };

  const runRestore = (file: File) => {
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await restoreBackup(await file.text());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await queryClient.invalidateQueries();
      setMessage(
        `Restored ${result.restored} records. ${result.skipped} were skipped.`
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>
          Your data lives only on this device. Export a copy before reinstalling
          or moving to another machine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={runExport}>
            Export a backup
          </Button>
          <Button
            disabled={pending}
            onClick={() => fileInput.current?.click()}
            variant="outline"
          >
            Restore from a backup
          </Button>
          <input
            accept="application/json"
            aria-label="Backup file to restore"
            className="sr-only"
            onChange={(event) => {
              const [file] = event.target.files ?? [];
              if (file) {
                runRestore(file);
              }
              // Allow choosing the same file twice in a row.
              event.target.value = "";
            }}
            ref={fileInput}
            type="file"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          Restoring writes records back under their original ids, so importing a
          backup over existing data updates it rather than duplicating it.
        </p>
        {message ? <output className="block text-sm">{message}</output> : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
