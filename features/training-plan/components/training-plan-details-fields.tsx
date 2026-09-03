"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athlete/athlete-picker";

import { statusLabel, trainingPlanStatuses } from "../training-plan-types";
import { errorId, fieldProps } from "./training-plan-form-errors";
import type { PlanFormErrors } from "./training-plan-form-errors";
import type {
  TrainingPlanFormState,
  UpdatePlanField,
} from "./training-plan-form-state";

interface DetailsFieldsProps {
  errors: PlanFormErrors;
  form: TrainingPlanFormState;
  update: UpdatePlanField;
}

export const TrainingPlanDetailsFields = ({
  errors,
  form,
  update,
}: DetailsFieldsProps) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle>Season details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="plan-athlete">Athlete</FieldLabel>
          <AthletePicker
            id="plan-athlete"
            onChange={(value) => update("athleteId", value)}
            value={form.athleteId}
          />
          <FieldError id={errorId("plan-athlete")}>
            {errors["plan-athlete"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-name">Plan name</FieldLabel>
          <Input
            id="plan-name"
            onChange={(event) => update("name", event.target.value)}
            placeholder="Season 2026–27"
            value={form.name}
            {...fieldProps("plan-name", errors)}
          />
          <FieldError id={errorId("plan-name")}>
            {errors["plan-name"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-starts-on">Season starts</FieldLabel>
          <DatePicker
            errorMessageId={errorId("plan-starts-on")}
            id="plan-starts-on"
            invalid={Boolean(errors["plan-starts-on"])}
            onChange={(value) => update("startsOn", value)}
            value={form.startsOn}
          />
          <FieldError id={errorId("plan-starts-on")}>
            {errors["plan-starts-on"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-ends-on">Season ends</FieldLabel>
          <DatePicker
            errorMessageId={errorId("plan-ends-on")}
            id="plan-ends-on"
            invalid={Boolean(errors["plan-ends-on"])}
            onChange={(value) => update("endsOn", value)}
            value={form.endsOn}
          />
          <FieldError id={errorId("plan-ends-on")}>
            {errors["plan-ends-on"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="plan-status">Status</FieldLabel>
          <Select
            onValueChange={(value) => {
              const status = trainingPlanStatuses.find(
                (item) => item === value
              );
              update("status", status ?? "draft");
            }}
            value={form.status}
          >
            <SelectTrigger
              className="w-full"
              id="plan-status"
              {...fieldProps("plan-status", errors)}
            >
              <SelectValue>{statusLabel[form.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {trainingPlanStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={errorId("plan-status")}>
            {errors["plan-status"]}
          </FieldError>
        </Field>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Season target and strategy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="plan-target-distance">
              Target distance (m)
            </FieldLabel>
            <Input
              id="plan-target-distance"
              inputMode="numeric"
              onChange={(event) =>
                update("targetDistanceM", event.target.value)
              }
              value={form.targetDistanceM}
              {...fieldProps("plan-target-distance", errors)}
            />
            <FieldError id={errorId("plan-target-distance")}>
              {errors["plan-target-distance"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="plan-target-score">Target score</FieldLabel>
            <Input
              id="plan-target-score"
              inputMode="numeric"
              onChange={(event) => update("targetScore", event.target.value)}
              value={form.targetScore}
              {...fieldProps("plan-target-score", errors)}
            />
            <FieldError id={errorId("plan-target-score")}>
              {errors["plan-target-score"]}
            </FieldError>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="plan-strategy">Coach strategy</FieldLabel>
          <Textarea
            id="plan-strategy"
            onChange={(event) => update("strategyNotes", event.target.value)}
            placeholder="How the season builds towards the primary events."
            rows={5}
            value={form.strategyNotes}
          />
        </Field>
      </CardContent>
    </Card>
  </>
);
