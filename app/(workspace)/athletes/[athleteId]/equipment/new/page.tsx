import { Suspense } from "react";

import { PageTitle } from "@/components/page-title";
import { EquipmentForm } from "@/features/equipment/components/equipment-form";
import { EquipmentSkeleton } from "@/features/equipment/components/equipment-skeleton";

export const metadata = {
  description: "Add an athlete equipment setup.",
  title: "Add equipment setup | AthleteHub",
};

const NewEquipmentPage = ({
  params,
}: PageProps<"/athletes/[athleteId]/equipment/new">) => {
  return (
    <>
      <PageTitle title="Add equipment setup" />
      <Suspense fallback={<EquipmentSkeleton />}>
        {params.then(({ athleteId }) => (
          <EquipmentForm athleteId={athleteId} />
        ))}
      </Suspense>
    </>
  );
};

export default NewEquipmentPage;
