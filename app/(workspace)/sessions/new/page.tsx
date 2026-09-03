import { SessionForm } from "@/features/session/components/session-form";

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
          Enter each end once. The saved record becomes available to reports and
          comparisons.
        </p>
      </div>
      <SessionForm athleteId={athleteId} />
    </section>
  );
}
