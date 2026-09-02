"use client";

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
    <div>
      <label className="text-sm font-medium" htmlFor="dashboard-month">
        Month
      </label>
      <input
        id="dashboard-month"
        type="month"
        className="border-input bg-input/30 h-9 rounded-4xl border px-3 text-sm"
        value={month}
        onChange={(event) => onMonthChange(event.target.value)}
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
    <label className="text-sm font-medium" htmlFor={`dashboard-${label}`}>
      {label}
    </label>
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
