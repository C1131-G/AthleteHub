import { Suspense } from "react";

import {
  ProgrammeForm,
  ProgrammeFormSkeleton,
} from "@/features/conditioning/components/programme-form";

export const metadata = { title: "New programme" };

const NewProgrammePage = () => (
  <Suspense fallback={<ProgrammeFormSkeleton />}>
    <ProgrammeForm />
  </Suspense>
);

export default NewProgrammePage;
