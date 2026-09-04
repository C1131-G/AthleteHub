"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { useSession } from "../use-sessions";

export const SessionDetail = ({ sessionId }: { sessionId: string }) => {
  const query = useSession(sessionId);
  if (query.isPending) {
    return <p aria-live="polite">Loading session…</p>;
  }
  if (query.isError || !query.data) {
    return <p role="alert">This session could not be loaded.</p>;
  }
  const { data: session } = query;
  return (
    <section aria-labelledby="session-detail-title" className="space-y-4">
      <h1 className="text-2xl font-semibold" id="session-detail-title">
        Session on {session.date}
      </h1>
      <p>
        {session.status === "draft" ? "Draft" : "Complete"} · {session.kind}
      </p>
      <p>Score: {session.ends.reduce((total, end) => total + end.score, 0)}</p>
      <Link className={buttonVariants({ variant: "outline" })} href="/sessions">
        Back to sessions
      </Link>
    </section>
  );
};
