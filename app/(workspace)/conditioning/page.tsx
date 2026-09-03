import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";
import {
  ConditioningWorkspace,
  ConditioningWorkspaceSkeleton,
} from "@/features/conditioning/components/conditioning-workspace";

export const metadata = {
  description:
    "Track strength and conditioning assessments and dated training programmes.",
  title: "Conditioning | AthleteHub",
};

const ConditioningPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/conditioning/programmes/new"
          >
            <PlusIcon /> Programme
          </Link>
          <Link
            className={buttonVariants()}
            href="/conditioning/assessments/new"
          >
            <PlusIcon /> Assessment
          </Link>
        </>
      }
      description="Record muscular-endurance, isometric, and 2 km running assessments, and manage dated weekly training programmes."
      id="conditioning-title"
      title="Strength & conditioning"
    />
    <Suspense fallback={<ConditioningWorkspaceSkeleton />}>
      <ConditioningWorkspace />
    </Suspense>
  </>
);

export default ConditioningPage;
