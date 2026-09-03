import { Store } from "@tanstack/store";

import { assessmentRepository } from "./assessment-repository";
import type { Assessment, AssessmentInput } from "./assessment-types";

const emptyAssessments: Assessment[] = [];
export const assessmentStore = new Store({
  assessments: emptyAssessments,
  ready: false,
});
export const hydrateAssessments = () =>
  assessmentStore.setState(() => ({
    assessments: assessmentRepository.list(),
    ready: true,
  }));
const refresh = () =>
  assessmentStore.setState((state) => ({
    ...state,
    assessments: assessmentRepository.list(),
  }));
export const createAssessment = (input: AssessmentInput) => {
  const result = assessmentRepository.create(input);
  if (result.status === "saved") {
    refresh();
  }
  return result;
};
export const updateAssessment = (id: string, input: AssessmentInput) => {
  const result = assessmentRepository.update(id, input);
  if (result.status === "saved") {
    refresh();
  }
  return result;
};
