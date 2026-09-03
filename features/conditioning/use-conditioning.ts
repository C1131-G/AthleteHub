"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  conditioningStore,
  createAssessment as createAssessmentAction,
  createProgramme as createProgrammeAction,
  updateAssessment as updateAssessmentAction,
  updateProgramme as updateProgrammeAction,
} from "./conditioning-store";

export { hydrateConditioning } from "./conditioning-store";

export const useConditioning = () => {
  const state = useStore(conditioningStore);
  const hydrated = useHydrated();
  const ready = state.ready && hydrated;
  const assessments = ready ? state.assessments : [];
  const programmes = ready ? state.programmes : [];

  return {
    assessments,
    createAssessment: createAssessmentAction,
    createProgramme: createProgrammeAction,
    getAssessment: (id: string) =>
      assessments.find((assessment) => assessment.id === id),
    getProgramme: (id: string) =>
      programmes.find((programme) => programme.id === id),
    programmes,
    ready,
    updateAssessment: updateAssessmentAction,
    updateProgramme: updateProgrammeAction,
  };
};
