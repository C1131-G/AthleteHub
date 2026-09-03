import { Suspense } from "react";

import {
  ProgrammePreview,
  ProgrammePreviewSkeleton,
} from "@/features/conditioning/components/programme-preview";

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
