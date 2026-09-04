"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useAssessments = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "assessments",
    collectionSchemas.assessments,
    options
  );

  return {
    archiveAssessment: rest.archive,
    assessments: records,
    createAssessment: create,
    getAssessment: (id: string) => records.find((item) => item.id === id),
    ready,
    restoreAssessment: rest.restore,
    updateAssessment: rest.update,
  };
};
