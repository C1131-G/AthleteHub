"use client";

import { CalendarDotsIcon, XIcon } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The dropdown caption needs a bounded range or it has nothing to enumerate.
 * A century back covers dates of birth; a decade forward covers planning.
 */
const defaultStartMonth = new Date(new Date().getFullYear() - 100, 0);
const defaultEndMonth = new Date(new Date().getFullYear() + 10, 11);

export const DatePicker = ({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
  errorMessageId,
  placeholder = "Pick a date",
  displayFormat = "PPP",
  disabled,
  startMonth = defaultStartMonth,
  endMonth = defaultEndMonth,
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
  disabled?: Matcher | Matcher[] | undefined;
  startMonth?: Date;
  endMonth?: Date;
  clearable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <div className="flex w-full items-center gap-1">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              aria-describedby={describedBy}
              aria-errormessage={invalid ? errorMessageId : undefined}
              aria-invalid={invalid || undefined}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
              id={id}
              type="button"
              variant="outline"
            />
          }
        >
          <CalendarDotsIcon aria-hidden="true" />
          {selected ? format(selected, displayFormat) : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            autoFocus
            captionLayout="dropdown"
            endMonth={endMonth}
            mode="single"
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
            selected={selected}
            startMonth={startMonth}
            {...(selected ? { defaultMonth: selected } : {})}
            {...(disabled ? { disabled } : {})}
          />
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <Button
          aria-label="Clear date"
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
