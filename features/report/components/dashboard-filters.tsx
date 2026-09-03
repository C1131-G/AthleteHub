"use client";

import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoryLabel, statusLabel } from "@/features/athlete/athlete-labels";
import type { Athlete } from "@/features/athlete/athlete-types";

/** The dashboard's filter row: month, athlete, bow category and athlete status. */
export const DashboardFilters = ({
  athleteFilter,
  athletes,
  categoryFilter,
  month,
  onMonthChange,
  statusFilter,
  updateFilter,
}: {
  athleteFilter: string;
  athletes: Athlete[];
  categoryFilter: string;
  month: string;
  onMonthChange: (value: string) => void;
  statusFilter: string;
  updateFilter: (param: string, value: string) => void;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="min-w-44">
      <Label className="mb-1" htmlFor="dashboard-month">
        Month
      </Label>
      <MonthPicker
        id="dashboard-month"
        onChange={onMonthChange}
        value={month}
      />
    </div>
    <DashboardFilter
      label="Athlete"
      value={athleteFilter}
      options={athletes.map((athlete) => ({
        label: athlete.fullName,
        value: athlete.id,
      }))}
      onChange={(value) => updateFilter("athleteId", value)}
    />
    <DashboardFilter
      label="Bow category"
      value={categoryFilter}
      options={Object.entries(categoryLabel).map(([value, label]) => ({
        label,
        value,
      }))}
      onChange={(value) => updateFilter("category", value)}
    />
    <DashboardFilter
      label="Athlete status"
      value={statusFilter}
      options={Object.entries(statusLabel).map(([value, label]) => ({
        label,
        value,
      }))}
      onChange={(value) => updateFilter("status", value)}
    />
  </div>
);

const DashboardFilter = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) => (
  <div>
    <Label className="mb-1" htmlFor={`dashboard-${label}`}>
      {label}
    </Label>
    <Select value={value} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger id={`dashboard-${label}`} className="w-full">
        <SelectValue placeholder={`All ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
