import { BarbellIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const AssessmentNotFound = () => (
  <Empty className="min-h-96 border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <BarbellIcon />
      </EmptyMedia>
      <EmptyTitle>Assessment not found</EmptyTitle>
      <EmptyDescription>
        The assessment may have been removed or the link is incorrect.
      </EmptyDescription>
      <Link className={buttonVariants()} href="/conditioning">
        Back to conditioning
      </Link>
    </EmptyHeader>
  </Empty>
);
