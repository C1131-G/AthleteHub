import { Suspense } from "react";

import { PageTitle } from "@/components/page-title";
import { EquipmentEditor } from "@/features/equipment/components/equipment-editor";
import { EquipmentSkeleton } from "@/features/equipment/components/equipment-skeleton";

export const metadata = {
  description: "Edit an athlete equipment setup.",
  title: "Edit equipment setup | AthleteHub",
};

const EditEquipmentPage = ({
  params,
}: PageProps<"/athletes/[athleteId]/equipment/[setupId]/edit">) => {
  return (
    <>
      <PageTitle title="Edit equipment setup" />
      <Suspense fallback={<EquipmentSkeleton />}>
        {params.then(({ athleteId, setupId }) => (
          <EquipmentEditor athleteId={athleteId} setupId={setupId} />
        ))}
      </Suspense>
    </>
  );
};

export default EditEquipmentPage;
