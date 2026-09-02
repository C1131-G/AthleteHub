"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Without this, one throw inside a workspace route replaces the whole app with
 * the root error page and loses the shell.
 */
const WorkspaceError = ({ reset }: { error: Error; reset: () => void }) => (
  <Empty className="min-h-96 border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ArrowClockwiseIcon />
      </EmptyMedia>
      <EmptyTitle>Something went wrong</EmptyTitle>
      <EmptyDescription>
        This view could not be displayed. Your saved data has not been changed.
      </EmptyDescription>
      <Button onClick={reset} type="button">
        Try again
      </Button>
    </EmptyHeader>
  </Empty>
);

export default WorkspaceError;
