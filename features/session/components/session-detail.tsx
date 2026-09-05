"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { estimateHandicap, roundArrowsFor } from "@/lib/handicap";

import { useSession } from "../use-sessions";

export const SessionDetail = ({ sessionId }: { sessionId: string }) => {
  const query = useSession(sessionId);
  if (query.data) {
    const { data: session } = query;
    const score = session.ends.reduce((total, end) => total + end.score, 0);
    // Handicaps are only meaningful for a recognised round; freehand practice
    // has no round score to estimate against.
    const roundArrows = session.format.roundId
      ? roundArrowsFor(session.format.roundId)
      : undefined;
    const handicap = roundArrows
      ? estimateHandicap(
          {
            distanceM: session.format.distanceM,
            faceCm: session.format.targetFaceCm,
            roundArrows,
          },
          score
        )
      : null;
    return (
      <section aria-labelledby="session-detail-title" className="space-y-4">
        <h1 className="text-2xl font-semibold" id="session-detail-title">
          Session on {session.date}
        </h1>
        <p>
          {session.status === "draft" ? "Draft" : "Complete"} · {session.kind}
        </p>
        <p>Score: {score}</p>
        {handicap === null ? null : (
          <p aria-label="Estimated handicap">
            Estimated handicap: <strong>{handicap}</strong> (approximate Archery
            GB scheme)
          </p>
        )}
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/sessions"
        >
          Back to sessions
        </Link>
      </section>
    );
  }
  if (query.isError) {
    return <p role="alert">This session could not be loaded.</p>;
  }
  return <p aria-live="polite">Loading session…</p>;
};
