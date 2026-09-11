"use client";

import { useId, useState } from "react";

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

const MIN_PASSWORD_LENGTH = 8;

type Status =
  | { type: "idle" }
  | { type: "pending" }
  | { type: "error"; message: string }
  | { type: "success" };

/**
 * Lets the owner rotate their password from inside the app, separate from
 * the recovery-code flow on the local login screen. Only meaningful in the
 * desktop app, which is the only place `window.electronAPI` exists — there
 * is no cached query behind this, so a plain async handler (matching
 * WorkspaceLogout) fits better than useMutation.
 */
export const ChangePasswordPanel = () => {
  const bridge = globalThis.window?.electronAPI?.backend.auth;
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  if (!bridge) {
    return null;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setStatus({
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({
        message: "New password and confirmation don't match.",
        type: "error",
      });
      return;
    }
    setStatus({ type: "pending" });
    try {
      await bridge.changePassword({ currentPassword, newPassword });
      setStatus({ type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ? error.message : "Could not change password.",
        type: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change the password used to unlock SSAIT Athlete360 on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="max-w-sm space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor={currentId}>Current password</Label>
            <Input
              autoComplete="current-password"
              id={currentId}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={nextId}>New password</Label>
            <Input
              autoComplete="new-password"
              id={nextId}
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={confirmId}>Confirm new password</Label>
            <Input
              autoComplete="new-password"
              id={confirmId}
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </div>
          {status.type === "error" ? (
            <p className="text-destructive text-sm" role="alert">
              {status.message}
            </p>
          ) : null}
          {status.type === "success" ? (
            <output className="text-sm">Password changed.</output>
          ) : null}
          <Button
            disabled={
              status.type === "pending" ||
              currentPassword.length === 0 ||
              newPassword.length === 0 ||
              confirmPassword.length === 0
            }
            type="submit"
          >
            {status.type === "pending" ? "Changing…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
