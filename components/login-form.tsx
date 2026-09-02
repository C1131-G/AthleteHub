"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div">;

const LoginForm = ({ className, ...props }: LoginFormProps) => {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="bg-card ring-foreground/10 overflow-hidden rounded-2xl ring-1">
        <div className="grid md:grid-cols-2">
          <form
            className="flex flex-col gap-6 p-6 md:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              router.push("/dashboard");
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Log in to your AthleteHub account
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                required
                className="border-input bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-4xl border px-3 text-base transition-colors outline-none focus-visible:ring-[3px] md:text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href={{ pathname: "/forgot-password" }}
                  className="text-sm underline-offset-2 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border-input bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-4xl border px-3 text-base transition-colors outline-none focus-visible:ring-[3px] md:text-sm"
              />
            </div>

            <Button type="submit">Log in</Button>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <div className="text-muted-foreground before:bg-border after:bg-border flex items-center gap-3 text-sm before:h-px before:flex-1 after:h-px after:flex-1">
              Or continue with
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                type="button"
                aria-label="Log in with Apple"
              >
                Apple
              </Button>
              <Button
                variant="outline"
                type="button"
                aria-label="Log in with Google"
              >
                Google
              </Button>
              <Button
                variant="outline"
                type="button"
                aria-label="Log in with Meta"
              >
                Meta
              </Button>
            </div>

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
