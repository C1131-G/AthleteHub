import { Suspense } from "react";

import {
  AthleteProfile,
  AthleteProfileSkeleton,
} from "@/features/athlete/components/athlete-profile";

export const metadata = {
  description: "View an athlete profile in AthleteHub.",
  title: "Athlete profile | AthleteHub",
};

const AthletePage = ({ params }: PageProps<"/athletes/[athleteId]">) => {
  return (
    <Suspense fallback={<AthleteProfileSkeleton />}>
      {params.then(({ athleteId }) => (
        <AthleteProfile athleteId={athleteId} />
      ))}
    </Suspense>
  );
};

export default AthletePage;
