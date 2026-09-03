"use client";
import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  assessmentStore,
  createAssessment,
  updateAssessment,
} from "./assessment-store";

export { hydrateAssessments } from "./assessment-store";
export const useAssessments = () => {
  const state = useStore(assessmentStore);
  const hydrated = useHydrated();
  const ready = state.ready && hydrated;
  const assessments = ready ? state.assessments : [];
  return {
    assessments,
    createAssessment,
    getAssessment: (id: string) => assessments.find((item) => item.id === id),
    ready,
    updateAssessment,
  };
};
