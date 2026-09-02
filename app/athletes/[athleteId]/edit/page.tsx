import { Suspense } from "react";

import { AthletePageTitle } from "@/features/athlete/components/athlete-page-title";
import { AthleteProfileSkeleton } from "@/features/athlete/components/athlete-profile";
import { EditAthlete } from "@/features/athlete/components/edit-athlete";

export const metadata = {
  description: "Edit an athlete profile in AthleteHub.",
  title: "Edit athlete | AthleteHub",
};

const EditAthletePage = ({
  params,
}: PageProps<"/athletes/[athleteId]/edit">) => {
  return (
    <>
      <AthletePageTitle marker="edit-athlete-title" title="Edit athlete" />
      <Suspense fallback={<AthleteProfileSkeleton />}>
        {params.then(({ athleteId }) => (
          <EditAthlete athleteId={athleteId} />
        ))}
      </Suspense>
    </>
  );
};

export default EditAthletePage;
