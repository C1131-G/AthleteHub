"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { desktopAuth } from "@/lib/desktop-auth";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div">;

const LoginForm = ({ className, ...props }: LoginFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const loginMutation = useMutation({
    mutationFn: (input: { password: string; username: string }) => {
      const auth = desktopAuth();
      if (!auth) {
        throw new Error("Open the AthleteHub desktop app to log in.");
      }
      return auth.login(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      router.push("/dashboard");
    },
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-card ring-foreground/10 overflow-hidden rounded-2xl ring-1">
        <div className="grid md:grid-cols-2">
          <form
            className="flex flex-col gap-6 p-6 md:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              const formData = new FormData(event.currentTarget);
              loginMutation.mutate({
                password: String(formData.get("password") ?? ""),
                username: String(formData.get("username") ?? ""),
              });
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Log in to your AthleteHub account
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
                placeholder="your-username"
                required
                type="text"
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  className="text-sm underline-offset-2 hover:underline"
                  href={{ pathname: "/forgot-password" }}
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                autoComplete="current-password"
                id="password"
                name="password"
                required
                type="password"
              />
            </Field>

            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Logging in…" : "Log in"}
            </Button>
            {(error || loginMutation.error) && (
              <p role="alert" className="text-destructive text-sm">
                {error || loginMutation.error?.message}
              </p>
            )}

            <p className="text-muted-foreground text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href={{ pathname: "/signup" }}
                className="hover:text-primary underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </form>

          <div
            className="from-primary/20 via-muted to-primary/5 relative hidden min-h-96 bg-linear-to-br md:block"
            aria-hidden="true"
          >
            <div className="border-primary/20 bg-background/30 absolute inset-8 rounded-3xl border backdrop-blur-sm" />
            <div className="bg-primary/20 absolute right-10 bottom-10 left-10 h-32 rounded-2xl blur-2xl" />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground px-6 text-center text-sm">
        By continuing, you agree to our{" "}
        <Link
          href={{ pathname: "/terms" }}
          className="hover:text-primary underline underline-offset-4"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href={{ pathname: "/privacy" }}
          className="hover:text-primary underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
};

export { LoginForm };
