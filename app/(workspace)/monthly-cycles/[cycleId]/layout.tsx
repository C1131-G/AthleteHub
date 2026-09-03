import { Suspense } from "react";

import { CycleGuardProvider } from "@/features/monthly-cycle/components/cycle-guard";
import {
  CycleShell,
  CycleShellFallback,
} from "@/features/monthly-cycle/components/cycle-shell";

/**
 * Mounted once per cycle, so the athlete header and step navigation persist
 * across every step route. Params are consumed inside a Suspense boundary so
 * a hard load prerenders the shell without blocking.
 */
const CycleWorkflowLayout = ({
  children,
  params,
}: LayoutProps<"/monthly-cycles/[cycleId]">) => (
  <CycleGuardProvider>
    <div className="space-y-6">
      <Suspense fallback={<CycleShellFallback />}>
        <CycleShell params={params} />
      </Suspense>
      {children}
    </div>
  </CycleGuardProvider>
);

export default CycleWorkflowLayout;
