import { Suspense } from "react";

import { WorkspaceHeader } from "@/components/workspace-header";
import { EquipmentHeaderAction } from "@/features/equipment/components/equipment-header-action";
import { EquipmentSkeleton } from "@/features/equipment/components/equipment-skeleton";
import { EquipmentWorkspace } from "@/features/equipment/components/equipment-workspace";

export const metadata = {
  description: "Track athlete equipment setups and requirements.",
  title: "Equipment | AthleteHub",
};

const EquipmentPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <Suspense fallback={null}>
          <EquipmentHeaderAction />
        </Suspense>
      }
      description="Track current equipment, previous setups and recommended requirements."
      id="equipment-title"
      title="Equipment details"
    />
    <Suspense fallback={<EquipmentSkeleton />}>
      <EquipmentWorkspace />
    </Suspense>
  </>
);

export default EquipmentPage;
