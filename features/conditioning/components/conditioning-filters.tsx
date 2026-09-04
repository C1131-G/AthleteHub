"use client";

import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AthletePicker } from "@/features/athlete/athlete-picker";

interface ConditioningFiltersProps {
  assessmentStatus: string;
  athleteId: string;
  month: string;
  phase: string;
  programmeStatus: string;
  onFilter: (key: string, value: string) => void;
}

const labelClass = "mb-1.5";
const assessmentStatuses = [
  ["completed", "Completed"],
  ["partial", "Partial"],
  ["medical-exemption", "Medical exemption"],
  ["absent", "Absent"],
] as const;
const phases = [
  ["foundation", "Foundation"],
  ["development", "Development"],
  ["competition", "Competition"],
  ["recovery", "Recovery"],
  ["return-to-training", "Return to training"],
  ["custom", "Custom"],
] as const;
const programmeStatuses = [
  ["draft", "Draft"],
  ["active", "Active"],
  ["completed", "Completed"],
] as const;

export const ConditioningFilters = ({
  assessmentStatus,
  athleteId,
  month,
  onFilter,
  phase,
  programmeStatus,
}: ConditioningFiltersProps) => (
  <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <div>
      <Label className={labelClass} htmlFor="conditioning-athlete">
        Athlete
      </Label>
      <AthletePicker
        id="conditioning-athlete"
        value={athleteId}
        onChange={(value) => onFilter("athleteId", value)}
      />
    </div>
    <div>
      <Label className={labelClass} htmlFor="conditioning-month">
        Month
      </Label>
      <MonthPicker
        id="conditioning-month"
        onChange={(value) => onFilter("month", value)}
        value={month}
      />
    </div>
    <FilterSelect
      id="conditioning-assessment-status"
      label="Assessment status"
      onChange={(value) => onFilter("assessmentStatus", value)}
      options={assessmentStatuses}
      value={assessmentStatus}
    />
    <FilterSelect
      id="conditioning-phase"
      label="Programme phase"
      onChange={(value) => onFilter("phase", value)}
      options={phases}
      value={phase}
    />
    <FilterSelect
      id="conditioning-programme-status"
      label="Programme status"
      onChange={(value) => onFilter("programmeStatus", value)}
      options={programmeStatuses}
      value={programmeStatus}
    />
  </CardContent>
);

const FilterSelect = ({
  id,
  label,
  onChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}) => (
  <div>
    <Label className={labelClass} htmlFor={id}>
      {label}
    </Label>
    <Select
      onValueChange={(next) => onChange(next ?? "")}
      value={value || "all"}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
