import Link from "next/link";

import { AthleteShell } from "@/features/athlete/components/athlete-shell";

const NotFound = () => (
  <AthleteShell>
    <section
      aria-labelledby="not-found-title"
      className="flex min-h-96 flex-col items-center justify-center gap-4 text-center"
    >
      <title>Page not found | SSAIT Athlete360</title>
      <h1 className="text-2xl font-semibold" id="not-found-title">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link
        className="bg-primary text-primary-foreground rounded-md px-4 py-2"
        href="/dashboard"
      >
        Return to dashboard
      </Link>
    </section>
  </AthleteShell>
);

export default NotFound;
