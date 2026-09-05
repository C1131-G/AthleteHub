"use client";

import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
} from "@phosphor-icons/react";
import { format, parse } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const monthValue = "yyyy-MM";
const monthNames = Array.from({ length: 12 }, (_, month) =>
  format(new Date(2000, month), "MMM")
);

const parseMonth = (value: string) => {
  if (!value) {
    return;
  }
  const parsed = parse(value, monthValue, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * A month is a first-class value in this app, so it gets a picker rather than
 * the native `type="month"` widget, which renders differently per platform.
 */
export const MonthPicker = ({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
  errorMessageId,
  placeholder = "Pick a month",
  displayFormat = "MMMM yyyy",
  minYear = new Date().getFullYear() - 10,
  maxYear = new Date().getFullYear() + 5,
  clearable = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string | undefined;
  errorMessageId?: string | undefined;
  placeholder?: string;
  displayFormat?: string;
  minYear?: number;
  maxYear?: number;
  clearable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = parseMonth(value);
  const [year, setYear] = useState(
    selected?.getFullYear() ?? new Date().getFullYear()
  );

  const select = (month: number) => {
    onChange(format(new Date(year, month), monthValue));
    setOpen(false);
  };

  return (
    <div className="flex w-full items-center gap-1">
      <Popover
        onOpenChange={(next) => {
          if (next) {
            setYear(selected?.getFullYear() ?? new Date().getFullYear());
          }
          setOpen(next);
        }}
        open={open}
      >
        <PopoverTrigger
          render={
            <Button
              aria-describedby={describedBy}
              aria-errormessage={invalid ? errorMessageId : undefined}
              aria-invalid={invalid || undefined}
              className={cn(
                "border-input w-full justify-start text-left font-normal",
                !selected && "text-muted-foreground"
              )}
              id={id}
              type="button"
              variant="outline"
            />
          }
        >
          <CalendarBlankIcon aria-hidden="true" />
          {selected ? format(selected, displayFormat) : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="flex items-center justify-between gap-2 pb-3">
            <Button
              aria-label="Previous year"
              disabled={year <= minYear}
              onClick={() => setYear((current) => current - 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <CaretLeftIcon aria-hidden="true" />
            </Button>
            <span aria-live="polite" className="text-sm font-medium">
              {year}
            </span>
            <Button
              aria-label="Next year"
              disabled={year >= maxYear}
              onClick={() => setYear((current) => current + 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <CaretRightIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {monthNames.map((name, month) => {
              const isSelected =
                selected?.getFullYear() === year &&
                selected.getMonth() === month;
              return (
                <Button
                  aria-pressed={isSelected}
                  className="w-full"
                  key={name}
                  onClick={() => select(month)}
                  size="sm"
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                >
                  {name}
                </Button>
              );
            })}
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              onChange(format(new Date(), monthValue));
              setOpen(false);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            This month
          </Button>
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <Button
          aria-label="Clear month"
          onClick={() => onChange("")}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
};
