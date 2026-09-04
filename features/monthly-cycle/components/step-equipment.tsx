"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { EquipmentItemField } from "@/features/equipment/equipment-item-field";
import { createEquipmentItems } from "@/features/equipment/equipment-types";
import type { EquipmentItem } from "@/features/equipment/equipment-types";
import { useEquipment } from "@/features/equipment/use-equipment";
import { formatDate } from "@/lib/format";

import { useConfirmCycleStep } from "../cycle-step-actions";
import type {
  CycleDomainContext,
  CycleStepView,
} from "../monthly-cycle-lifecycle";
import { monthEndDate, setupEffectiveBy } from "../monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { useCycleGuard } from "./cycle-guard";
import { CycleStepActions } from "./cycle-step-actions";
import { StaleStepAlert } from "./stale-step-alert";

type Choice = "confirm" | "new" | "no-change";

interface FormErrors {
  items?: string;
  labels?: string;
  recordedAt?: string;
}

export const EquipmentStep = ({
  context,
  cycle,
  stepView,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  stepView: CycleStepView;
}) => {
  const router = useRouter();
  const confirmCycleStep = useConfirmCycleStep();
  const { createSetup } = useEquipment();
  const monthEnd = monthEndDate(cycle.month);
  const effective = setupEffectiveBy(context.equipmentSetups, monthEnd);
  const hasPreviousSetup = Boolean(effective);
  const [choice, setChoice] = useState<Choice>("confirm");
  /** One radio group now owns the choice, so the per-row side effects merge. */
  const chooseOption = (next: Choice) => {
    setChoice(next);
    if (next === "new") {
      setItems((current) =>
        current.some((item) => item.value.trim())
          ? current
          : createEquipmentItems(effective?.items)
      );
    }
    setErrors({});
  };
  const [recordedAt, setRecordedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<EquipmentItem[]>(() =>
    createEquipmentItems(effective?.items)
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const { setDirty: markDirty } = useCycleGuard();

  const updateItem = (id: string, patch: Partial<EquipmentItem>) => {
    markDirty(true);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const validateNewSetup = (): boolean => {
    const next: FormErrors = {};
    if (!recordedAt) {
      next.recordedAt = "Choose a setup date.";
    } else if (recordedAt > new Date().toISOString().slice(0, 10)) {
      next.recordedAt = "Setup date cannot be in the future.";
    } else if (recordedAt > monthEnd) {
      next.recordedAt = "The setup must be recorded within the cycle month.";
    }
    const labels = new Set<string>();
    let hasValue = false;
    for (const item of items) {
      const normalized = item.label.trim().toLowerCase();
      if (item.value.trim()) {
        hasValue = true;
      }
      if (
        item.custom &&
        (item.value.trim() || item.requirement.trim()) &&
        !normalized
      ) {
        next.labels = "Every custom item with a value needs a label.";
      }
      if (normalized && labels.has(normalized)) {
        next.labels = "Equipment labels must be unique.";
      }
      if (normalized) {
        labels.add(normalized);
      }
    }
    if (!hasValue) {
      next.items = "Enter at least one equipment value.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (): Promise<boolean> => {
    if (choice === "no-change") {
      if (!hasPreviousSetup) {
        return false;
      }
      const confirmed = await confirmCycleStep(cycle, "equipment", {
        reason:
          notes.trim() ||
          "No equipment change this month; the existing setup remains in use.",
        sources: effective
          ? [{ id: effective.id, updatedAt: effective.updatedAt }]
          : [],
        status: "exception",
      });
      if (confirmed.status !== "saved") {
        setErrors({ items: "Could not save this confirmation on the device." });
        return false;
      }
      markDirty(false);
      return true;
    }
    if (choice === "confirm") {
      if (!effective) {
        setErrors({ items: "No setup is on record for this month yet." });
        return false;
      }
      const confirmed = await confirmCycleStep(cycle, "equipment", {
        sources: [{ id: effective.id, updatedAt: effective.updatedAt }],
        status: "complete",
      });
      if (confirmed.status !== "saved") {
        setErrors({ items: "Could not save this confirmation on the device." });
        return false;
      }
      markDirty(false);
      return true;
    }
    if (!validateNewSetup()) {
      return false;
    }
    const saved = await createSetup({
      athleteId: cycle.athleteId,
      coachNotes: notes,
      items,
      recordedAt,
    });
    if (saved.status === "saved") {
      const confirmed = await confirmCycleStep(cycle, "equipment", {
        sources: [{ id: saved.record.id, updatedAt: saved.record.updatedAt }],
        status: "complete",
      });
      if (confirmed.status !== "saved") {
        setErrors({
          items: "Could not save the cycle confirmation on the device.",
        });
        return false;
      }
      markDirty(false);
    }
    return saved.status === "saved";
  };

  const navigateAfterSave = () => {
    router.push(`/monthly-cycles/${cycle.id}/weekly`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-2">
          Confirm the equipment in use for {formatDate(`${cycle.month}-01`)} —
          the latest setup recorded by {formatDate(monthEnd)}.
        </p>
      </div>
      {stepView.status === "stale" ? (
        <StaleStepAlert label="The equipment setup" />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Current setup</CardTitle>
          <CardDescription>
            {effective
              ? `Recorded ${formatDate(effective.recordedAt)}.`
              : "No setup is on record by the end of this month."}
          </CardDescription>
        </CardHeader>
        {effective ? (
          <CardContent>
            <EquipmentItemsTable items={effective.items} />
          </CardContent>
        ) : null}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Decision for this month</CardTitle>
          <CardDescription>
            Confirm the setup above, record a new one, or document that nothing
            changed. &ldquo;No equipment change&rdquo; is only available when a
            previous setup exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldSet>
            <FieldLegend>What applies to this month?</FieldLegend>
            <RadioGroup
              className="mt-2"
              name="equipment-choice"
              onValueChange={chooseOption}
              value={choice}
            >
              <RadioRow
                description={
                  effective
                    ? `Use the setup recorded ${formatDate(effective.recordedAt)}.`
                    : "Nothing to confirm yet — record a setup instead."
                }
                disabled={!effective}
                label="Use this setup"
                value="confirm"
              />
              <RadioRow
                description="Record a new setup with this month's values."
                label="Record a new setup"
                value="new"
              />
              <RadioRow
                description={
                  hasPreviousSetup
                    ? "Document that the equipment did not change this month."
                    : "Available only when a previous setup exists."
                }
                disabled={!hasPreviousSetup}
                label="No equipment change"
                value="no-change"
              />
            </RadioGroup>
          </FieldSet>
          {choice === "new" ? (
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="equipment-recorded-at">
                  Setup date
                </FieldLabel>
                <DatePicker
                  id="equipment-recorded-at"
                  onChange={(value) => {
                    setRecordedAt(value);
                    markDirty(true);
                  }}
                  value={recordedAt}
                />
                {errors.recordedAt ? (
                  <FieldError id="equipment-recorded-at-error">
                    {errors.recordedAt}
                  </FieldError>
                ) : null}
              </Field>
              <div className="space-y-3">
                {items.map((item) => (
                  <EquipmentItemField
                    key={item.id}
                    invalidLabel={Boolean(errors.labels)}
                    invalidValue={Boolean(errors.items)}
                    item={item}
                    previousValue={
                      effective?.items.find((entry) => entry.key === item.key)
                        ?.value
                    }
                    onChange={updateItem}
                    onRemove={(id) => {
                      markDirty(true);
                      setItems((current) =>
                        current.filter((entry) => entry.id !== id)
                      );
                    }}
                  />
                ))}
              </div>
              {errors.items ? <FieldError>{errors.items}</FieldError> : null}
              {errors.labels ? <FieldError>{errors.labels}</FieldError> : null}
              <Button
                onClick={() => {
                  markDirty(true);
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
                }}
                type="button"
                variant="outline"
              >
                Add custom item
              </Button>
            </div>
          ) : null}
          {choice === "confirm" ? null : (
            <Field>
              <FieldLabel htmlFor="equipment-notes">
                {choice === "no-change" ? "Reason (optional)" : "Coach notes"}
              </FieldLabel>
              <Textarea
                id="equipment-notes"
                onChange={(event) => {
                  setNotes(event.target.value);
                  markDirty(true);
                }}
                value={notes}
              />
            </Field>
          )}
        </CardContent>
      </Card>
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={async () => {
          if (await save()) {
            navigateAfterSave();
          }
        }}
        onSaveExit={async () => {
          if (await save()) {
            router.push("/monthly-cycles");
          }
        }}
        saveContinueDisabled={choice === "confirm" && !effective}
        step="equipment"
      />
    </div>
  );
};

const RadioRow = ({
  description,
  disabled,
  label,
  value,
}: {
  description: string;
  disabled?: boolean;
  label: string;
  value: Choice;
}) => (
  <FieldLabel htmlFor={`equipment-choice-${value}`}>
    <Field orientation="horizontal">
      <RadioGroupItem
        disabled={disabled}
        id={`equipment-choice-${value}`}
        value={value}
      />
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
    </Field>
  </FieldLabel>
);

const EquipmentItemsTable = ({ items }: { items: EquipmentItem[] }) => {
  const rows = items.filter(
    (item) => item.value.trim() || item.requirement.trim()
  );
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((item) => (
        <div key={item.id} className="min-w-0">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="truncate font-medium">
            {item.value || "—"}
            {item.requirement ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                ({item.requirement})
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
};
