"use client";

import Link from "next/link";

const GlobalError = ({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => (
  <html lang="en">
    <head>
      <title>AthleteHub error</title>
    </head>
    <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
      <main
        style={{
          display: "grid",
          minHeight: "100vh",
          padding: "1.5rem",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p>AthleteHub could not load this page.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              style={{
                borderRadius: "0.5rem",
                cursor: "pointer",
                margin: "0.5rem",
                padding: "0.75rem 1rem",
              }}
              onClick={retry}
              type="button"
            >
              Try again
            </button>
            <Link
              style={{
                border: "1px solid currentColor",
                borderRadius: "0.5rem",
                display: "inline-block",
                margin: "0.5rem",
                padding: "0.75rem 1rem",
              }}
              href="/dashboard"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </main>
    </body>
  </html>
);

export default GlobalError;
