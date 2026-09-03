"use client";

import Link from "next/link";

const GlobalError = ({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => (
  <html lang="en">
    <body className="bg-background text-foreground flex min-h-svh items-center justify-center p-6 font-sans">
      <main className="flex max-w-lg flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          AthleteHub could not load this page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            className="bg-primary text-primary-foreground rounded-md px-4 py-2"
            onClick={retry}
            type="button"
          >
            Try again
          </button>
          <Link
            className="border-input rounded-md border px-4 py-2"
            href="/dashboard"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    </body>
  </html>
);

export default GlobalError;
