import { Suspense } from "react";

import { ProgrammePreview } from "@/features/conditioning/components/programme-preview";
import { ProgrammePreviewSkeleton } from "@/features/conditioning/components/programme-preview-skeleton";

export const metadata = { title: "Programme | AthleteHub" };

const ProgrammePage = ({
  params,
}: PageProps<"/conditioning/programmes/[programmeId]">) => (
  <Suspense fallback={<ProgrammePreviewSkeleton />}>
    {params.then(({ programmeId }) => (
      <ProgrammePreview programmeId={programmeId} />
    ))}
  </Suspense>
);

export default ProgrammePage;
