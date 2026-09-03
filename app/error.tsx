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

const ErrorPage = ({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => (
  <main className="flex min-h-svh items-center justify-center p-6">
    <Empty className="max-w-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ArrowClockwiseIcon />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          This page could not be displayed. Your saved data has not been
          changed.
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
  </main>
);

export default ErrorPage;
