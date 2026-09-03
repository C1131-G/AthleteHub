"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type { RadioGroupProps } from "@base-ui/react/radio-group";
import type * as React from "react";

import { cn } from "@/lib/utils";

/** Generic in `Value` so callers keep their union instead of widening to unknown. */
function RadioGroup<Value>({ className, ...props }: RadioGroupProps<Value>) {
  return (
    <RadioGroupPrimitive
      className={cn("grid gap-3", className)}
      data-slot="radio-group"
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return (
    <RadioPrimitive.Root
      className={cn(
        "border-input text-primary dark:bg-input/30 data-[checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[3px]",
        className
      )}
      data-slot="radio-group-item"
      {...props}
    >
      <RadioPrimitive.Indicator
        className="relative flex items-center justify-center"
        data-slot="radio-group-indicator"
        render={<span />}
      >
        <span className="bg-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
