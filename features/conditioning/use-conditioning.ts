"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useConditioning = (options?: ListOptions) => {
  const assessments = useCollection(
    "conditioningAssessments",
    collectionSchemas.conditioningAssessments,
    options
  );
  const programmes = useCollection(
    "conditioningProgrammes",
    collectionSchemas.conditioningProgrammes,
    options
  );

  return {
    archiveAssessment: assessments.archive,
    archiveProgramme: programmes.archive,
    assessments: assessments.records,
    createAssessment: assessments.create,
    createProgramme: programmes.create,
    getAssessment: (id: string) =>
      assessments.records.find((assessment) => assessment.id === id),
    getProgramme: (id: string) =>
      programmes.records.find((programme) => programme.id === id),
    programmes: programmes.records,
    ready: assessments.ready && programmes.ready,
    restoreAssessment: assessments.restore,
    restoreProgramme: programmes.restore,
    updateAssessment: assessments.update,
    updateProgramme: programmes.update,
  };
};
