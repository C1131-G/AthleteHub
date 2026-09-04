import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AthleteList } from "@/features/athlete/components/athlete-list";
import { AthleteListHeader } from "@/features/athlete/components/athlete-list-header";

export const metadata = {
  description: "Manage athlete profiles and archery targets.",
  title: "Athletes",
};

const AthletesPage = () => (
  <section className="space-y-6" aria-labelledby="athletes-title">
    <AthleteListHeader />
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
      <AthleteList />
    </Suspense>
  </section>
);

export default AthletesPage;
