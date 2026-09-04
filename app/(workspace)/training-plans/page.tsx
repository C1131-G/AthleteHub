import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";
import {
  TrainingPlansWorkspace,
  TrainingPlansWorkspaceSkeleton,
} from "@/features/training-plan/components/training-plans-workspace";

export const metadata = {
  description:
    "Plan weekly arrow targets, season goals, and competition events.",
  title: "Training plans",
};

const TrainingPlansPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <Link className={buttonVariants()} href="/training-plans/new">
          <PlusIcon /> New plan
        </Link>
      }
      description="Set the weekly training load and season calendar for each athlete."
      id="training-plans-title"
      title="Training load"
    />
    <Suspense fallback={<TrainingPlansWorkspaceSkeleton />}>
      <TrainingPlansWorkspace />
    </Suspense>
  </>
);

export default TrainingPlansPage;
