"use client";

import { Button } from "@/components/ui/button";

/**
 * Switches a list between its live records and the archived ones. Archiving is
 * reversible, so the archived view is a place to restore from rather than a
 * hidden corner.
 */
export const ArchivedToggle = ({
  onChange,
  showArchived,
}: {
  onChange: (showArchived: boolean) => void;
  showArchived: boolean;
}) => (
  <Button
    aria-pressed={showArchived}
    onClick={() => onChange(!showArchived)}
    size="sm"
    variant={showArchived ? "default" : "outline"}
  >
    {showArchived ? "Back to list" : "Archived"}
  </Button>
);
