"use client";

import {
  CheckCircleIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { monthLabel } from "@/features/report/report-calculations";
import { initials } from "@/lib/format";
import { pushRoute } from "@/lib/push-route";

import type { CycleStepView } from "../monthly-cycle-lifecycle";
import { cycleQueueHref, monthlyCycleStepMeta } from "../monthly-cycle-steps";
import type { MonthlyCycleStep } from "../monthly-cycle-types";
import { useCycleContext } from "../use-cycle-context";
import { useCycleGuard } from "./cycle-guard";

type CycleStepHref = `/monthly-cycles/${string}/${MonthlyCycleStep}`;

const StepStatusIcon = ({ status }: { status: CycleStepView["status"] }) => {
  if (status === "complete") {
    return (
      <CheckCircleIcon
        aria-hidden
        className="text-primary size-4"
        weight="fill"
      />
    );
  }
  if (status === "exception") {
    return (
      <WarningCircleIcon aria-hidden className="text-muted-foreground size-4" />
    );
  }
  if (status === "stale") {
    return <WarningIcon aria-hidden className="text-destructive size-4" />;
  }
  return null;
};

const stepAriaSuffix = (status: CycleStepView["status"]): string => {
  if (status === "complete") {
    return " (complete)";
  }
  if (status === "exception") {
    return " (exception recorded)";
  }
  if (status === "stale") {
    return " (needs reconfirmation)";
  }
  return " (not started)";
};

const CycleSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <div className="bg-muted h-28 animate-pulse rounded-2xl" />
    <div className="bg-muted h-96 animate-pulse rounded-2xl" />
  </div>
);

/**
 * Mounted once per cycle by the [cycleId] layout, so the header and step
 * navigation never remount while the coach moves between steps.
 */
export const CycleShell = ({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) => {
  const { cycleId } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const { confirmNavigation } = useCycleGuard();
  const { athlete, cycle, ready, view } = useCycleContext(cycleId);

  if (!ready) {
    return <CycleSkeleton />;
  }

  if (!cycle) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Monthly cycle not found</EmptyTitle>
          <EmptyDescription>
            This cycle may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href={cycleQueueHref()}>
            Back to monthly cycles
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!athlete) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Athlete not found</EmptyTitle>
          <EmptyDescription>
            The athlete for this cycle no longer exists in the roster.
          </EmptyDescription>
          <Link className={buttonVariants()} href={cycleQueueHref()}>
            Back to monthly cycles
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }

  const currentStep = monthlyCycleStepMeta.find((meta) =>
    pathname.startsWith(meta.href(cycleId))
  )?.step;
  const guard = (
    href: CycleStepHref,
    transitionType: "step-forward" | "step-back"
  ) => ({
    onNavigate: (event: { preventDefault: () => void }) => {
      if (href === pathname) {
        return;
      }
      event.preventDefault();
      confirmNavigation(() => {
        pushRoute(router, href, {
          transitionTypes: [transitionType],
        });
      });
    },
  });

  return (
    <div className="space-y-6">
      <header className="bg-card rounded-2xl border p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage alt="" src={athlete.photoUrl} />
              <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg leading-tight font-semibold">
                {athlete.fullName}
              </p>
              <p className="text-muted-foreground text-sm">
                {athlete.athleteId} · {monthLabel(cycle.month)}
              </p>
            </div>
          </div>
          <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
            <Progress
              aria-label={`Cycle progress ${view?.percent ?? 0} percent`}
              value={view?.percent ?? 0}
            />
            <span className="text-muted-foreground text-sm tabular-nums">
              {view?.percent ?? 0}%
            </span>
          </div>
        </div>
        <StepNavigation
          cycleId={cycleId}
          currentStep={currentStep}
          guard={guard}
          steps={view?.steps}
        />
      </header>
    </div>
  );
};

const StepNavigation = ({
  cycleId,
  currentStep,
  guard,
  steps,
}: {
  cycleId: string;
  currentStep: MonthlyCycleStep | undefined;
  guard: (
    href: CycleStepHref,
    transitionType: "step-forward" | "step-back"
  ) => {
    onNavigate: (event: { preventDefault: () => void }) => void;
  };
  steps: Record<MonthlyCycleStep, CycleStepView> | undefined;
}) => (
  <nav aria-label="Monthly cycle steps" className="mt-4">
    <ol className="flex flex-wrap gap-2">
      {monthlyCycleStepMeta.map((meta, index) => {
        const status = steps?.[meta.step]?.status ?? "pending";
        const href = meta.href(cycleId);
        const isCurrent = currentStep === meta.step;
        const currentIndex = monthlyCycleStepMeta.findIndex(
          (entry) => entry.step === currentStep
        );
        const targetIndex = monthlyCycleStepMeta.findIndex(
          (entry) => entry.step === meta.step
        );
        const transitionType =
          targetIndex < currentIndex ? "step-back" : "step-forward";
        return (
          <li key={meta.step}>
            <Link
              aria-current={isCurrent ? "step" : undefined}
              className={buttonVariants({
                size: "sm",
                variant: isCurrent ? "default" : "outline",
              })}
              href={href}
              transitionTypes={[transitionType]}
              {...guard(href, transitionType)}
            >
              <span className="tabular-nums">{index + 1}.</span>
              {meta.label}
              <StepStatusIcon status={status} />
              <span className="sr-only">{stepAriaSuffix(status)}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  </nav>
);

export const CycleStateBadge = ({
  state,
}: {
  state: "not-started" | "in-progress" | "needs-attention" | "complete";
}) => {
  const label =
    state === "needs-attention"
      ? "Needs attention"
      : state.charAt(0).toUpperCase() + state.slice(1);
  let variant: "default" | "destructive" | "secondary" = "secondary";
  if (state === "complete") {
    variant = "default";
  } else if (state === "needs-attention") {
    variant = "destructive";
  }
  return <Badge variant={variant}>{label}</Badge>;
};

export const CycleShellFallback = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <div className="bg-muted h-28 animate-pulse rounded-2xl" />
  </div>
);
