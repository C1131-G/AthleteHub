import { Suspense } from "react";

import { EquipmentPreview } from "@/features/equipment/components/equipment-preview";
import { EquipmentSkeleton } from "@/features/equipment/components/equipment-skeleton";

export const metadata = {
  description: "Preview an athlete equipment setup.",
  title: "Equipment setup",
};

const EquipmentSetupPage = ({
  params,
}: PageProps<"/athletes/[athleteId]/equipment/[setupId]">) => {
  return (
    <Suspense fallback={<EquipmentSkeleton />}>
      {params.then(({ athleteId, setupId }) => (
        <EquipmentPreview athleteId={athleteId} setupId={setupId} />
      ))}
    </Suspense>
  );
};

export default EquipmentSetupPage;
