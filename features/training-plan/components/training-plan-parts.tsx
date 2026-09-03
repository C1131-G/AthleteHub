"use client";

import { TargetIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { trainingPlanNewHref } from "../training-plan-routes";
import { statusLabel } from "../training-plan-types";
import type { TrainingPlanStatus } from "../training-plan-types";

const statusVariant = {
  active: "default",
  completed: "secondary",
  draft: "outline",
} satisfies Record<TrainingPlanStatus, "default" | "outline" | "secondary">;

export const PlanStatusBadge = ({ status }: { status: TrainingPlanStatus }) => (
  <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
);

export const PlanNotFound = () => (
  <Empty className="min-h-72 border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <TargetIcon />
      </EmptyMedia>
      <EmptyTitle>Training plan not found</EmptyTitle>
      <EmptyDescription>
        The plan may have been removed or the link is incorrect.
      </EmptyDescription>
      <Link className={buttonVariants()} href="/training-plans">
        Back to training plans
      </Link>
    </EmptyHeader>
  </Empty>
);

export const PlanListEmpty = ({ label }: { label: string }) => (
  <Empty className="border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <TargetIcon />
      </EmptyMedia>
      <EmptyTitle>No training plans</EmptyTitle>
      <EmptyDescription>{label}</EmptyDescription>
      <Link className={buttonVariants()} href={trainingPlanNewHref()}>
        Create a training plan
      </Link>
    </EmptyHeader>
  </Empty>
);

export const TrainingPlanSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-80" />
    <Skeleton className="h-32" />
    <Skeleton className="h-72" />
  </div>
);
