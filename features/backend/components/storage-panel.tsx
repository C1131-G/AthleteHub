"use client";

import { useState } from "react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStorageLocation } from "@/lib/use-location";

type Field = "backupPath" | "storagePath";
type PendingChange = { field: Field; path: string } | null;

const FIELD_LABEL = {
  backupPath: "backup",
  storagePath: "data",
} satisfies Record<Field, string>;

/**
 * Shows where the database and rolling backups live and lets the owner
 * relocate either one. Changing a location re-checks the account password
 * (electron/auth.ts's verifyPassword) before moving anything, since this is
 * the only password AthleteHub asks for.
 */
export const StoragePanel = () => {
  const { available, chooseFolder, location, ready, update, updating } =
    useStorageLocation();
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const [password, setPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  if (!available) {
    return null;
  }

  const startChange = async (field: Field) => {
    const path = await chooseFolder();
    if (!path) {
      return;
    }
    setPassword("");
    setConfirmError("");
    setPendingChange({ field, path });
  };

  const confirmChange = async () => {
    if (!pendingChange) {
      return;
    }
    setConfirmError("");
    try {
      await update({
        password,
        ...(pendingChange.field === "storagePath"
          ? { storagePath: pendingChange.path }
          : { backupPath: pendingChange.path }),
      });
      setPendingChange(null);
    } catch (error) {
      setConfirmError(
        error instanceof Error
          ? error.message
          : "Could not change the location."
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Where AthleteHub keeps your data and rolling backups on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Data folder</p>
              <p className="text-muted-foreground text-sm break-all">
                {ready
                  ? (location.storagePath ?? "Not configured")
                  : "Loading…"}
              </p>
            </div>
            <Button
              disabled={updating}
              onClick={() => startChange("storagePath")}
              variant="outline"
            >
              Change…
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Backup folder</p>
              <p className="text-muted-foreground text-sm break-all">
                {ready ? (location.backupPath ?? "Not configured") : "Loading…"}
              </p>
            </div>
            <Button
              disabled={updating}
              onClick={() => startChange("backupPath")}
              variant="outline"
            >
              Change…
            </Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingChange(null);
          }
        }}
        open={pendingChange !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your password</AlertDialogTitle>
            <AlertDialogDescription>
              AthleteHub will move your{" "}
              {pendingChange && FIELD_LABEL[pendingChange.field]} to{" "}
              <span className="break-all">{pendingChange?.path}</span> and
              restart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="storage-change-password">Password</Label>
            <Input
              autoComplete="current-password"
              id="storage-change-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            {confirmError ? (
              <p className="text-destructive text-sm" role="alert">
                {confirmError}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updating || password.length === 0}
              onClick={(event) => {
                event.preventDefault();
                confirmChange();
              }}
            >
              {updating ? "Moving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
