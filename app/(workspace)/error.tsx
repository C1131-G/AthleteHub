"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const WorkspaceError = ({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => (
  <Empty className="min-h-96 border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ArrowClockwiseIcon />
      </EmptyMedia>
      <EmptyTitle>Something went wrong</EmptyTitle>
      <EmptyDescription>
        This view could not be displayed. Your saved data has not been changed.
      </EmptyDescription>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retry} type="button">
          Try again
        </Button>
        <Link
          className="border-input rounded-md border px-4 py-2"
          href="/dashboard"
        >
          Return to dashboard
        </Link>
      </div>
    </EmptyHeader>
  </Empty>
);

export default WorkspaceError;
