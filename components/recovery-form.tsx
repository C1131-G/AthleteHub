"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { desktopAuth } from "@/lib/desktop-auth";

export const RecoveryForm = () => {
  const [complete, setComplete] = useState(false);
  const [replacementCode, setReplacementCode] = useState<string>();
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- no query reads the auth status, so there is no cache entry to update.
  const recoveryMutation = useMutation({
    mutationFn: (input: {
      newPassword: string;
      recoveryCode: string;
      username: string;
    }) => {
      const auth = desktopAuth();
      if (!auth) {
        throw new Error("Open the AthleteHub desktop app to recover access.");
      }
      return auth.recover(input);
    },
    onSuccess: (result) => {
      setReplacementCode(result.recoveryCode);
      setComplete(true);
    },
  });

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <form
        className="bg-card ring-foreground/10 flex w-full max-w-md flex-col gap-5 rounded-2xl p-8 ring-1"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          recoveryMutation.mutate({
            newPassword: String(formData.get("password") ?? ""),
            recoveryCode: String(formData.get("recoveryCode") ?? ""),
            username: String(formData.get("username") ?? ""),
          });
        }}
      >
        <div>
          <h1 className="text-2xl font-bold">Recover AthleteHub</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Use the recovery code saved during setup.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            autoComplete="username"
            id="username"
            maxLength={32}
            minLength={3}
            name="username"
            required
            type="text"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="recoveryCode">Recovery code</FieldLabel>
          <Input
            className="uppercase"
            id="recoveryCode"
            name="recoveryCode"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </Field>
        <Button disabled={recoveryMutation.isPending || complete} type="submit">
          {recoveryMutation.isPending ? "Recovering…" : "Reset password"}
        </Button>
        {complete ? (
          <output className="text-sm">
            Access restored. Your new recovery code is{" "}
            <strong>{replacementCode}</strong>.{" "}
            <Link className="underline underline-offset-4" href="/dashboard">
              Continue
            </Link>
          </output>
        ) : null}
        {recoveryMutation.error ? (
          <p className="text-destructive text-sm" role="alert">
            {recoveryMutation.error.message}
          </p>
        ) : null}
        <Link
          className="text-center text-sm underline underline-offset-4"
          href="/login"
        >
          Return to log in
        </Link>
      </form>
    </main>
  );
};
