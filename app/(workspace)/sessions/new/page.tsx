import { Suspense } from "react";

import { SessionForm } from "@/features/session/components/session-form";

export const metadata = { title: "Record archery session" };

const SessionFormSkeleton = () => (
  <div aria-busy="true" aria-label="Loading session form" className="space-y-4">
    <div className="bg-muted h-24 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
  </div>
);

export default function NewSessionPage() {
  const athleteId = "unassigned";
  return (
    <section aria-labelledby="new-session-title" className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Training record</p>
        <h1
          className="text-3xl font-semibold tracking-tight"
          id="new-session-title"
        >
          Record archery session
        </h1>
        <p className="text-muted-foreground mt-2">
          Save a draft and return to it from the desktop app.
        </p>
      </div>
      <Suspense fallback={<SessionFormSkeleton />}>
        <SessionForm athleteId={athleteId} />
      </Suspense>
    </section>
  );
}
