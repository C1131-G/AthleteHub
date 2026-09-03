"use client";

import { useAssessments } from "../use-assessments";
import { AssessmentForm, AssessmentFormSkeleton } from "./assessment-form";
import { AssessmentPreview } from "./assessment-preview";

export const AssessmentEditContent = ({
  assessmentId,
  returnTo,
}: {
  assessmentId: string;
  returnTo?: string | undefined;
}) => {
  const { getAssessment, ready } = useAssessments();

  if (!ready) {
    return <AssessmentFormSkeleton />;
  }

  const record = getAssessment(assessmentId);
  return record ? (
    <AssessmentForm key={record.id} record={record} returnTo={returnTo} />
  ) : (
    <AssessmentPreview assessmentId={assessmentId} />
  );
};
