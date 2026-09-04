"use client";

import { PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { Athlete } from "@/features/athlete/athlete-types";
import { useAthletes } from "@/features/athlete/use-athletes";
import { formatDate } from "@/lib/format";

import { equipmentHref, equipmentSetupHref } from "../equipment-routes";
import { cloneEquipmentItems, createEquipmentItems } from "../equipment-types";
import type { EquipmentItem, EquipmentSetup } from "../equipment-types";
import { useEquipment } from "../use-equipment";
import { EquipmentItemField } from "./equipment-item-field";
import { EquipmentSkeleton } from "./equipment-skeleton";

interface EquipmentFormProps {
  athleteId: string;
  previousSetup?: EquipmentSetup | undefined;
  setup?: EquipmentSetup | undefined;
}

type FormErrors = Partial<
  Record<"recordedAt" | "items" | "labels" | "form", string>
>;

export const EquipmentForm = ({
  athleteId,
  previousSetup,
  setup,
}: EquipmentFormProps) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { listByAthlete, ready: equipmentReady } = useEquipment();

  if (!(athletesReady && equipmentReady)) {
    return <EquipmentSkeleton />;
  }

  const athlete = athletes.find((item) => item.id === athleteId);
  if (!athlete) {
    return (
      <p>
        That athlete could not be found.{" "}
        <Link className="underline" href={equipmentHref()}>
          Back to equipment
        </Link>
      </p>
    );
  }

  const carriedFrom = setup ? undefined : listByAthlete(athleteId)[0];
  return (
    <EquipmentFormFields
      athlete={athlete}
      carriedFrom={carriedFrom}
      previousSetup={previousSetup ?? carriedFrom}
      setup={setup}
    />
  );
};

const EquipmentFormFields = ({
  athlete,
  carriedFrom,
  previousSetup,
  setup,
}: {
  athlete: Athlete;
  carriedFrom: EquipmentSetup | undefined;
  previousSetup: EquipmentSetup | undefined;
  setup?: EquipmentSetup | undefined;
}) => {
  const athleteId = athlete.id;
  const router = useRouter();
  const { createSetup, updateSetup } = useEquipment();
  const [recordedAt, setRecordedAt] = useState(
    setup?.recordedAt ?? new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<EquipmentItem[]>(() =>
    setup
      ? cloneEquipmentItems(setup.items)
      : createEquipmentItems(carriedFrom?.items)
  );
  const [coachNotes, setCoachNotes] = useState(setup?.coachNotes ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const updateItem = (id: string, patch: Partial<EquipmentItem>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  const addCustomItem = () =>
    setItems((current) => [
      ...current,
      {
        custom: true,
        id: crypto.randomUUID(),
        key: `custom-${crypto.randomUUID()}`,
        label: "",
        requirement: "",
        value: "",
      },
    ]);
  const removeCustomItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  const validate = () => {
    const next: FormErrors = {};
    if (!recordedAt) {
      next.recordedAt = "Choose a setup date.";
    }
    if (recordedAt > new Date().toISOString().slice(0, 10)) {
      next.recordedAt = "Setup date cannot be in the future.";
    }
    const labels = new Set<string>();
    let hasValue = false;
    for (const item of items) {
      const normalizedLabel = item.label.trim().toLowerCase();
      if (item.value.trim()) {
        hasValue = true;
      }
      if (
        item.custom &&
        (item.value.trim() || item.requirement.trim()) &&
        !normalizedLabel
      ) {
        next.labels = "Every custom item with a value needs a label.";
      }
      if (normalizedLabel && labels.has(normalizedLabel)) {
        next.labels = "Equipment labels must be unique.";
      }
      if (normalizedLabel) {
        labels.add(normalizedLabel);
      }
    }
    if (!hasValue) {
      next.items = "Enter at least one equipment value.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    const input = { athleteId, coachNotes, items, recordedAt };
    const saved = setup
      ? await updateSetup(setup.id, input)
      : await createSetup(input);
    if (saved.status === "saved") {
      router.push(equipmentSetupHref(athleteId, saved.record.id));
      return;
    }
    setErrors(saved.fieldErrors);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6">
      {errors.form && <FieldError>{errors.form}</FieldError>}
      <Card>
        <CardHeader>
          <CardTitle>
            {athlete.fullName} · {athlete.athleteId}
          </CardTitle>
          <CardDescription>
            {carriedFrom
              ? `Values carried forward from the setup recorded ${formatDate(carriedFrom.recordedAt)}. Edit anything that has changed.`
              : "Record the setup date, then the equipment below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="recordedAt">Setup date</FieldLabel>
            <DatePicker
              id="recordedAt"
              value={recordedAt}
              onChange={setRecordedAt}
              invalid={Boolean(errors.recordedAt)}
              describedBy={errors.recordedAt ? "recordedAt-error" : undefined}
            />
            {errors.recordedAt && (
              <FieldError id="recordedAt-error">{errors.recordedAt}</FieldError>
            )}
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>
            Record specifications exactly as supplied by the athlete or coach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div
              className="space-y-4"
              aria-describedby={errors.items ? "items-error" : undefined}
            >
              {items.map((item) => (
                <EquipmentItemField
                  key={item.id}
                  item={item}
                  invalidLabel={Boolean(errors.labels)}
                  invalidValue={Boolean(errors.items)}
                  previousValue={
                    previousSetup?.items.find(
                      (previousItem) => previousItem.key === item.key
                    )?.value
                  }
                  onChange={updateItem}
                  onRemove={removeCustomItem}
                />
              ))}
            </div>
            {errors.items && (
              <FieldError id="items-error">{errors.items}</FieldError>
            )}
            {errors.labels && (
              <FieldError id="labels-error">{errors.labels}</FieldError>
            )}
            <Button type="button" variant="outline" onClick={addCustomItem}>
              <PlusIcon /> Add custom item
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coach notes</CardTitle>
          <CardDescription>
            Optional context for the next equipment review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="coachNotes">Notes</FieldLabel>
            <Textarea
              id="coachNotes"
              value={coachNotes}
              onChange={(event) => setCoachNotes(event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>
      <ButtonGroup className="ml-auto">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={
            setup
              ? equipmentSetupHref(athleteId, setup.id)
              : equipmentHref(athleteId)
          }
        >
          Cancel
        </Link>
        <Button type="submit">{setup ? "Save changes" : "Create setup"}</Button>
      </ButtonGroup>
    </form>
  );
};
