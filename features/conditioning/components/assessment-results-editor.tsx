"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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

import { testPresets } from "../conditioning-presets";
import type { TestPreset } from "../conditioning-presets";
import {
  categoryLabel,
  conditioningRatings,
  ratingLabel,
  toConditioningRating,
  toConditioningUnit,
  unitLabel,
} from "../conditioning-types";
import type {
  ConditioningRating,
  ConditioningUnit,
} from "../conditioning-types";
import type { AssessmentFormState, ResultDraft } from "./assessment-form-state";
import { errorId } from "./conditioning-form-errors";
import type { ConditioningFormErrors } from "./conditioning-form-errors";

const ratingOptions = conditioningRatings.map((rating) => ({
  label: ratingLabel[rating],
  value: rating satisfies ConditioningRating,
}));

const unitOptions: { label: string; value: ConditioningUnit }[] = [
  { label: "Repetitions", value: "repetitions" },
  { label: "Seconds (entered as m:ss)", value: "seconds" },
  { label: "Kilograms", value: "kilograms" },
  { label: "Centimeters", value: "centimeters" },
  { label: "Score", value: "score" },
  { label: "Custom", value: "custom" },
];

export interface AssessmentResultHandlers {
  addPreset: (presetKey: string) => void;
  addCustom: () => void;
  updateResult: (resultId: string, patch: Partial<ResultDraft>) => void;
  removeResult: (resultId: string) => void;
}

export const AssessmentResultsEditor = ({
  errors,
  form,
  handlers,
}: {
  errors: ConditioningFormErrors;
  form: AssessmentFormState;
  handlers: AssessmentResultHandlers;
}) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <FieldLabel htmlFor="assessment-add-test">
          Add a standard test
        </FieldLabel>
        <Combobox<TestPreset>
          items={testPresets}
          itemToStringLabel={(preset) => preset?.label ?? ""}
          itemToStringValue={(preset) => preset?.key ?? ""}
          onValueChange={(preset) => {
            if (preset) {
              handlers.addPreset(preset.key);
            }
          }}
          value={null}
        >
          <ComboboxInput
            id="assessment-add-test"
            aria-label="Search standard tests"
            placeholder="Search tests…"
          />
          <ComboboxContent>
            <ComboboxEmpty>No test matches that search.</ComboboxEmpty>
            <ComboboxList>
              {(preset: TestPreset) => (
                <ComboboxItem key={preset.key} value={preset}>
                  <span className="flex flex-col text-left">
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {categoryLabel[preset.category]} · {preset.unit}
                    </span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      <Button
        onClick={() => handlers.addCustom()}
        type="button"
        variant="outline"
      >
        <PlusIcon aria-hidden="true" /> Add custom test
      </Button>
    </div>
    <FieldError id={errorId("assessment-results")}>
      {errors["assessment-results"]}
    </FieldError>
    {form.results.length === 0 ? (
      <p className="text-muted-foreground text-sm">
        No test results yet. A completed assessment needs at least one.
      </p>
    ) : null}
    <ul className="space-y-4">
      {form.results.map((result, index) => (
        <li className="rounded-xl border p-4" key={result.id}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-medium">{result.label || `Test ${index + 1}`}</p>
            <Button
              aria-label={`Remove ${result.label || "test"}`}
              onClick={() => handlers.removeResult(result.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel htmlFor={`result-${result.id}-label`}>
                Test name
              </FieldLabel>
              <Input
                id={`result-${result.id}-label`}
                onChange={(event) =>
                  handlers.updateResult(result.id, {
                    label: event.target.value,
                  })
                }
                readOnly={result.category !== "custom"}
                value={result.label}
              />
              <FieldError id={errorId(`result-${result.id}-label`)}>
                {errors[`result-${result.id}-label`]}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor={`result-${result.id}-value`}>
                Value{result.unit === "seconds" ? " (m:ss)" : ""}
              </FieldLabel>
              <Input
                id={`result-${result.id}-value`}
                inputMode={result.unit === "seconds" ? "text" : "decimal"}
                onChange={(event) =>
                  handlers.updateResult(result.id, {
                    valueText: event.target.value,
                  })
                }
                placeholder={result.unit === "seconds" ? "1:32" : "0"}
                value={result.valueText}
              />
              <FieldError id={errorId(`result-${result.id}-value`)}>
                {errors[`result-${result.id}-value`]}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor={`result-${result.id}-unit`}>Unit</FieldLabel>
              <Select
                onValueChange={(value) =>
                  handlers.updateResult(result.id, {
                    unit: toConditioningUnit(value ?? "repetitions"),
                  })
                }
                value={result.unit}
              >
                <SelectTrigger
                  className="w-full"
                  id={`result-${result.id}-unit`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {result.unit === "custom" ? (
              <Field>
                <FieldLabel htmlFor={`result-${result.id}-unit-label`}>
                  Custom unit label
                </FieldLabel>
                <Input
                  id={`result-${result.id}-unit-label`}
                  onChange={(event) =>
                    handlers.updateResult(result.id, {
                      customUnit: event.target.value,
                    })
                  }
                  value={result.customUnit}
                />
                <FieldError id={errorId(`result-${result.id}-unit-label`)}>
                  {errors[`result-${result.id}-unit-label`]}
                </FieldError>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`result-${result.id}-rating`}>
                Coach rating
              </FieldLabel>
              <Select
                onValueChange={(value) =>
                  handlers.updateResult(result.id, {
                    rating: toConditioningRating(value ?? "average"),
                  })
                }
                value={result.rating}
              >
                <SelectTrigger
                  className="w-full"
                  id={`result-${result.id}-rating`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`result-${result.id}-direction`}>
                Improvement direction
              </FieldLabel>
              <Select
                onValueChange={(value) =>
                  handlers.updateResult(result.id, {
                    improvementDirection:
                      value === "lower" ? "lower" : "higher",
                  })
                }
                value={result.improvementDirection}
              >
                <SelectTrigger
                  className="w-full"
                  id={`result-${result.id}-direction`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher">Higher is better</SelectItem>
                  <SelectItem value="lower">Lower is better</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`result-${result.id}-protocol`}>
                Protocol
              </FieldLabel>
              <Input
                id={`result-${result.id}-protocol`}
                onChange={(event) =>
                  handlers.updateResult(result.id, {
                    protocol: event.target.value,
                  })
                }
                value={result.protocol}
              />
              <FieldError id={errorId(`result-${result.id}-protocol`)}>
                {errors[`result-${result.id}-protocol`]}
              </FieldError>
            </Field>
            <Field className="sm:col-span-2 xl:col-span-4">
              <FieldLabel htmlFor={`result-${result.id}-notes`}>
                Notes
              </FieldLabel>
              <Textarea
                id={`result-${result.id}-notes`}
                onChange={(event) =>
                  handlers.updateResult(result.id, {
                    notes: event.target.value,
                  })
                }
                value={result.notes}
              />
            </Field>
          </div>
        </li>
      ))}
    </ul>
    <p className="text-muted-foreground text-xs">
      Standard units: {unitLabel.repetitions}, seconds (m:ss), kilograms,
      centimeters, or a custom unit label.
    </p>
  </div>
);
