import { Store } from "@tanstack/store";

import { conditioningRepository } from "./conditioning-repository";
import type {
  ConditioningAssessmentInput,
  ConditioningProgrammeInput,
} from "./conditioning-types";

interface ConditioningState {
  assessments: ReturnType<typeof conditioningRepository.listAssessments>;
  programmes: ReturnType<typeof conditioningRepository.listProgrammes>;
  ready: boolean;
}

export const conditioningStore = new Store<ConditioningState>({
  assessments: [],
  programmes: [],
  ready: false,
});

export const hydrateConditioning = () => {
  conditioningStore.setState(() => ({
    assessments: conditioningRepository.listAssessments(),
    programmes: conditioningRepository.listProgrammes(),
    ready: true,
  }));
};

const refresh = () => {
  conditioningStore.setState((state) => ({
    ...state,
    assessments: conditioningRepository.listAssessments(),
    programmes: conditioningRepository.listProgrammes(),
  }));
};

export const createAssessment = (input: ConditioningAssessmentInput) => {
  const result = conditioningRepository.createAssessment(input);
  refresh();
  return result;
};

export const updateAssessment = (
  id: string,
  input: ConditioningAssessmentInput
) => {
  const result = conditioningRepository.updateAssessment(id, input);
  refresh();
  return result;
};

export const createProgramme = (input: ConditioningProgrammeInput) => {
  const result = conditioningRepository.createProgramme(input);
  refresh();
  return result;
};

export const updateProgramme = (
  id: string,
  input: ConditioningProgrammeInput
) => {
  const result = conditioningRepository.updateProgramme(id, input);
  refresh();
  return result;
};
