"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { errorId, fieldProps } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";

interface WeeklyAbsenceFieldProps {
  errors: ReportFormErrors;
  form: { absenceReason: string };
  update: (key: "absenceReason", value: string) => void;
}

export const WeeklyAbsenceField = ({
  errors,
  form,
  update,
}: WeeklyAbsenceFieldProps) => (
  <Card>
    <CardContent className="pt-6">
      <Field>
        <FieldLabel htmlFor="absence-reason">
          Leave or absence reason
        </FieldLabel>
        <Textarea
          {...fieldProps("absence-reason", errors)}
          id="absence-reason"
          onChange={(event) => update("absenceReason", event.target.value)}
          value={form.absenceReason}
        />
        <FieldError id={errorId("absence-reason")}>
          {errors["absence-reason"]}
        </FieldError>
      </Field>
    </CardContent>
  </Card>
);
