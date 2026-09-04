import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionsWorkspace } from "@/features/session/components/sessions-workspace";

export const metadata = {
  description: "Record and review archery sessions.",
  title: "Sessions | AthleteHub",
};

const SessionsPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <Link className={buttonVariants()} href="/sessions/new">
          <PlusIcon /> New session
        </Link>
      }
      description="Review completed and draft archery sessions."
      id="sessions-title"
      title="Sessions"
    />
    <SessionsWorkspace />
  </>
);

export default SessionsPage;
