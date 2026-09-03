"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { desktopAuth } from "@/lib/desktop-auth";

export const SetupForm = () => {
  const [recoveryCode, setRecoveryCode] = useState("");
  const queryClient = useQueryClient();
  const setupMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => {
      const auth = desktopAuth();
      if (!auth) {
        throw new Error(
          "Open the AthleteHub desktop app to set up the owner account."
        );
      }
      return auth.setup(input);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      setRecoveryCode(result.recoveryCode);
    },
  });

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <form
        className="bg-card ring-foreground/10 flex w-full max-w-md flex-col gap-5 rounded-2xl p-8 ring-1"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setupMutation.mutate({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          });
        }}
      >
        <div>
          <h1 className="text-2xl font-bold">Set up AthleteHub</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create the single owner account for this installation.
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
          htmlFor="password"
        >
          Password
          <input
            className="border-input bg-input/30 h-9 rounded-4xl border px-3"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <Button
          disabled={setupMutation.isPending || Boolean(recoveryCode)}
          type="submit"
        >
          {setupMutation.isPending ? "Setting up…" : "Create owner account"}
        </Button>
        {recoveryCode ? (
          <div className="border-primary/30 bg-primary/10 rounded-xl border p-4 text-sm">
            <p className="font-medium">
              Save this recovery code somewhere safe:
            </p>
            <code className="mt-2 block text-lg font-semibold tracking-widest">
              {recoveryCode}
            </code>
            <Link
              className="mt-3 inline-block underline underline-offset-4"
              href="/dashboard"
            >
              Continue to AthleteHub
            </Link>
          </div>
        ) : null}
        {setupMutation.error ? (
          <p className="text-destructive text-sm" role="alert">
            {setupMutation.error.message}
          </p>
        ) : null}
      </form>
    </main>
  );
};
