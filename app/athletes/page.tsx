import { Suspense } from "react";

import { AthleteList } from "@/features/athlete/components/athlete-list";
import { AthleteListHeader } from "@/features/athlete/components/athlete-list-header";

export const metadata = {
  description: "Manage athlete profiles and archery targets.",
  title: "Athletes | AthleteHub",
};

const AthletesPage = () => (
  <section className="space-y-6" aria-labelledby="athletes-title">
    <AthleteListHeader />
    <Suspense fallback={null}>
      <AthleteList />
    </Suspense>
  </section>
);

export default AthletesPage;
