"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import type { Athlete } from "./athlete-types";
import { useAthletes } from "./use-athletes";

interface AthletePickerProps {
  id: string;
  value: string;
  onChange: (athleteId: string) => void;
  invalid?: boolean;
  errorMessageId?: string;
  disabled?: boolean;
}

export const AthletePicker = ({
  id,
  value,
  onChange,
  invalid = false,
  errorMessageId,
  disabled = false,
}: AthletePickerProps) => {
  const { athletes } = useAthletes();
  const selectedAthlete = athletes.find((athlete) => athlete.id === value);
  return (
    <Combobox<Athlete>
      items={athletes}
      value={selectedAthlete ?? null}
      onValueChange={(athlete) => onChange(athlete?.id ?? "")}
      itemToStringLabel={(athlete) => athlete?.fullName ?? ""}
      itemToStringValue={(athlete) =>
        athlete ? `${athlete.fullName} ${athlete.athleteId}` : ""
      }
    >
      <ComboboxInput
        id={id}
        aria-errormessage={invalid ? errorMessageId : undefined}
        aria-invalid={invalid || undefined}
        aria-label="Select athlete"
        disabled={disabled}
        placeholder="Search by athlete name or ID"
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No athletes found.</ComboboxEmpty>
        <ComboboxList>
          {(athlete) => (
            <ComboboxItem key={athlete.id} value={athlete}>
              <span className="flex flex-col text-left">
                <span className="font-medium">{athlete.fullName}</span>
                <span className="text-muted-foreground text-xs">
                  {athlete.athleteId}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
