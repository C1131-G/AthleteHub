import Link from "next/link";

import { AthleteShell } from "@/features/athlete/components/athlete-shell";

const NotFound = () => (
  <AthleteShell>
    <main className="flex min-h-96 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link
        className="bg-primary text-primary-foreground rounded-md px-4 py-2"
        href="/dashboard"
      >
        Return to dashboard
      </Link>
    </main>
  </AthleteShell>
);

export default NotFound;
