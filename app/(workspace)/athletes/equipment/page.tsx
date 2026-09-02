import { Suspense } from "react";

import { EquipmentSkeleton } from "@/features/equipment/components/equipment-skeleton";
import { EquipmentWorkspace } from "@/features/equipment/components/equipment-workspace";

export const metadata = {
  description: "Track athlete equipment setups and requirements.",
  title: "Equipment | AthleteHub",
};

const EquipmentPage = () => (
  <Suspense fallback={<EquipmentSkeleton />}>
    <EquipmentWorkspace />
  </Suspense>
);

export default EquipmentPage;
