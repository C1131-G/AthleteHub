import type { ReactNode } from "react";

import { AthleteShell } from "@/features/athlete/components/athlete-shell";

const WorkspaceLayout = ({ children }: { children: ReactNode }) => (
  <AthleteShell>{children}</AthleteShell>
);

export default WorkspaceLayout;
