"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { eventPriorities, priorityLabel } from "../training-plan-types";
import type { EventDateStatus } from "../training-plan-types";
import { errorId, fieldProps } from "./training-plan-form-errors";
import type { PlanFormErrors } from "./training-plan-form-errors";
import { blankEvent } from "./training-plan-form-state";
import type {
  PlanEventFormState,
  TrainingPlanFormState,
  UpdatePlanField,
} from "./training-plan-form-state";

interface EventFieldsProps {
  errors: PlanFormErrors;
  form: TrainingPlanFormState;
  update: UpdatePlanField;
}

const dateStatusLabel = {
  scheduled: "Dates confirmed",
  tbd: "Dates to be decided",
} satisfies Record<EventDateStatus, string>;

export const TrainingPlanEventFields = ({
  errors,
  form,
  update,
}: EventFieldsProps) => {
  const updateEvent = <K extends keyof PlanEventFormState>(
    id: string,
    key: K,
    value: PlanEventFormState[K]
  ) =>
    update(
      "events",
      form.events.map((event) =>
        event.id === id ? { ...event, [key]: value } : event
      )
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition events</CardTitle>
        <CardDescription>
          Events without confirmed dates can be recorded as to be decided.
        </CardDescription>
        <CardAction>
          <Button
            onClick={() => update("events", [...form.events, blankEvent()])}
            size="sm"
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" /> Add event
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No events recorded for this season yet.
          </p>
        ) : null}
        {form.events.map((event, index) => {
          const nameId = `event-${event.id}-name`;
          const startId = `event-${event.id}-start`;
          const endId = `event-${event.id}-end`;
          const scheduled = event.dateStatus === "scheduled";
          return (
            <fieldset
              className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"
              key={event.id}
            >
              <legend className="px-1 text-sm font-medium">
                Event {index + 1}
              </legend>
              <Field>
                <FieldLabel htmlFor={nameId}>Event name</FieldLabel>
                <Input
                  id={nameId}
                  onChange={(value) =>
                    updateEvent(event.id, "name", value.target.value)
                  }
                  value={event.name}
                  {...fieldProps(nameId, errors)}
                />
                <FieldError id={errorId(nameId)}>{errors[nameId]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`event-${event.id}-dates`}>
                  Date status
                </FieldLabel>
                <Select
                  onValueChange={(value) =>
                    updateEvent(
                      event.id,
                      "dateStatus",
                      value === "tbd" ? "tbd" : "scheduled"
                    )
                  }
                  value={event.dateStatus}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`event-${event.id}-dates`}
                  >
                    <SelectValue>
                      {dateStatusLabel[event.dateStatus]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Dates confirmed</SelectItem>
                    <SelectItem value="tbd">Dates to be decided</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={startId}>Starts on</FieldLabel>
                <DatePicker
                  errorMessageId={errorId(startId)}
                  id={startId}
                  invalid={Boolean(errors[startId])}
                  onChange={(value) => updateEvent(event.id, "startsOn", value)}
                  value={scheduled ? event.startsOn : ""}
                />
                <FieldError id={errorId(startId)}>{errors[startId]}</FieldError>
                {scheduled ? null : (
                  <p className="text-muted-foreground text-xs">
                    Not required while the dates are to be decided.
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor={endId}>Ends on</FieldLabel>
                <DatePicker
                  errorMessageId={errorId(endId)}
                  id={endId}
                  invalid={Boolean(errors[endId])}
                  onChange={(value) => updateEvent(event.id, "endsOn", value)}
                  value={scheduled ? event.endsOn : ""}
                />
                <FieldError id={errorId(endId)}>{errors[endId]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`event-${event.id}-location`}>
                  Location
                </FieldLabel>
                <Input
                  id={`event-${event.id}-location`}
                  onChange={(value) =>
                    updateEvent(event.id, "location", value.target.value)
                  }
                  value={event.location}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`event-${event.id}-priority`}>
                  Priority
                </FieldLabel>
                <Select
                  onValueChange={(value) =>
                    updateEvent(
                      event.id,
                      "priority",
                      eventPriorities.find((item) => item === value) ??
                        "primary"
                    )
                  }
                  value={event.priority}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`event-${event.id}-priority`}
                  >
                    <SelectValue>{priorityLabel[event.priority]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventPriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priorityLabel[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end gap-2 sm:col-span-2">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`event-${event.id}-notes`}>
                    Notes
                  </FieldLabel>
                  <Textarea
                    id={`event-${event.id}-notes`}
                    onChange={(value) =>
                      updateEvent(event.id, "notes", value.target.value)
                    }
                    value={event.notes}
                  />
                </Field>
                <Button
                  aria-label={`Remove event ${index + 1}`}
                  onClick={() =>
                    update(
                      "events",
                      form.events.filter((item) => item.id !== event.id)
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <TrashIcon aria-hidden="true" />
                </Button>
              </div>
            </fieldset>
          );
        })}
        <div id="plan-events" tabIndex={-1}>
          <FieldError id={errorId("plan-events")}>
            {errors["plan-events"]}
          </FieldError>
        </div>
      </CardContent>
    </Card>
  );
};
