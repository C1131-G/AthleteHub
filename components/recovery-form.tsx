"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { desktopAuth } from "@/lib/desktop-auth";

export const RecoveryForm = () => {
  const [complete, setComplete] = useState(false);
  const queryClient = useQueryClient();
  const recoveryMutation = useMutation({
    mutationFn: (input: {
      email: string;
      newPassword: string;
      recoveryCode: string;
    }) => {
      const auth = desktopAuth();
      if (!auth) {
        throw new Error("Open the AthleteHub desktop app to recover access.");
      }
      return auth.recover(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
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
            email: String(formData.get("email") ?? ""),
            newPassword: String(formData.get("password") ?? ""),
            recoveryCode: String(formData.get("recoveryCode") ?? ""),
          });
        }}
      >
        <div>
          <h1 className="text-2xl font-bold">Recover AthleteHub</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Use the recovery code saved during setup.
          </p>
        </div>
        <label
          className="flex flex-col gap-2 text-sm font-medium"
          htmlFor="email"
        >
          Email
          <input
            className="border-input bg-input/30 h-9 rounded-4xl border px-3"
            id="email"
            name="email"
            required
            type="email"
          />
        </label>
        <label
          className="flex flex-col gap-2 text-sm font-medium"
          htmlFor="recoveryCode"
        >
          Recovery code
          <input
            className="border-input bg-input/30 h-9 rounded-4xl border px-3 uppercase"
            id="recoveryCode"
            name="recoveryCode"
            required
          />
        </label>
        <label
          className="flex flex-col gap-2 text-sm font-medium"
          htmlFor="password"
        >
          New password
          <input
            className="border-input bg-input/30 h-9 rounded-4xl border px-3"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <Button disabled={recoveryMutation.isPending || complete} type="submit">
          {recoveryMutation.isPending ? "Recovering…" : "Reset password"}
        </Button>
        {complete ? (
          <output className="text-sm">
            Access restored.{" "}
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
