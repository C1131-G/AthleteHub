import { Suspense } from "react";

import {
  ProgrammeForm,
  ProgrammeFormSkeleton,
} from "@/features/conditioning/components/programme-form";

export const metadata = { title: "Edit programme | AthleteHub" };

const EditProgrammePage = ({
  params,
}: PageProps<"/conditioning/programmes/[programmeId]/edit">) => (
  <Suspense fallback={<ProgrammeFormSkeleton />}>
    {params.then(({ programmeId }) => (
      <ProgrammeForm programmeId={programmeId} />
    ))}
  </Suspense>
);

export default EditProgrammePage;
