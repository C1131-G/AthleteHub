"use client";

import { TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { EquipmentItem } from "../equipment-types";

/** One equipment row: its label (editable only when custom), value and requirement. */
export const EquipmentItemField = ({
  item,
  invalidLabel,
  invalidValue,
  onChange,
  onRemove,
}: {
  item: EquipmentItem;
  invalidLabel: boolean;
  invalidValue: boolean;
  onChange: (id: string, patch: Partial<EquipmentItem>) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] md:items-end">
    <Field>
      <FieldLabel htmlFor={`${item.id}-label`}>
        {item.custom ? "Custom item label" : "Equipment"}
      </FieldLabel>
      {item.custom ? (
        <Input
          id={`${item.id}-label`}
          value={item.label}
          onChange={(event) => onChange(item.id, { label: event.target.value })}
          aria-invalid={invalidLabel}
          aria-describedby={invalidLabel ? "labels-error" : undefined}
        />
      ) : (
        <p
          id={`${item.id}-label`}
          className="bg-muted/50 flex h-9 items-center rounded-md border px-3 text-sm"
        >
          {item.label}
        </p>
      )}
    </Field>
    <Field>
      <FieldLabel htmlFor={`${item.id}-value`}>Current value</FieldLabel>
      <Input
        id={`${item.id}-value`}
        value={item.value}
        onChange={(event) => onChange(item.id, { value: event.target.value })}
        aria-invalid={invalidValue}
      />
    </Field>
    <Field>
      <FieldLabel htmlFor={`${item.id}-requirement`}>Requirement</FieldLabel>
      <Input
        id={`${item.id}-requirement`}
        value={item.requirement}
        onChange={(event) =>
          onChange(item.id, { requirement: event.target.value })
        }
      />
    </Field>
    {item.custom ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.label || "custom item"}`}
      >
        <TrashIcon />
      </Button>
    ) : (
      <span aria-hidden="true" />
    )}
  </div>
);
