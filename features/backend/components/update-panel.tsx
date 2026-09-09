"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppUpdate } from "@/lib/use-app-update";
import type { UpdateStatus } from "@/types/electron";

const STATUS_LABEL = {
  checking: "Checking for updates…",
  downloading: "Downloading update…",
  error: "Could not check for updates.",
  idle: "You're on the latest version.",
  ready: "Update downloaded — ready to install.",
} satisfies Record<UpdateStatus["state"], string>;

/**
 * Manual counterpart to the background check in electron/ipc/updates.cjs
 * (which runs on a timer and silently auto-downloads). This just lets the
 * owner trigger that same check on demand and see its result, without
 * waiting for the next scheduled run.
 */
export const UpdatePanel = () => {
  const { available, check, install, status } = useAppUpdate();

  if (!available) {
    return null;
  }

  const busy = status.state === "checking" || status.state === "downloading";
  const message =
    status.state === "error" ? status.message : STATUS_LABEL[status.state];
  const version =
    status.state === "downloading" || status.state === "ready"
      ? status.version
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates</CardTitle>
        <CardDescription>
          AthleteHub checks for new releases in the background. Check now to
          look immediately instead of waiting.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm">
            {message}
            {version ? ` (${version})` : ""}
          </p>
          {status.state === "downloading" && status.percent !== undefined ? (
            <p className="text-muted-foreground text-sm">{status.percent}%</p>
          ) : null}
        </div>
        {status.state === "ready" ? (
          <Button onClick={() => install()}>Restart and install</Button>
        ) : (
          <Button disabled={busy} onClick={() => check()} variant="outline">
            {busy ? "Checking…" : "Check for updates"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
