import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const AthleteListHeader = () => (
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>
      <h1
        id="athletes-title"
        data-testid="athletes-shell-marker"
        className="text-3xl font-semibold tracking-tight"
      >
        Athletes
      </h1>
      <p className="text-muted-foreground mt-1">
        Manage athlete profiles and archery targets.
      </p>
    </div>
    <Link className={buttonVariants()} href="/athletes/new">
      Add athlete
    </Link>
  </div>
);
