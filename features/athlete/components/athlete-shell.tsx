import { Suspense } from "react";
import type { ReactNode } from "react";

import { AthleteBackLink } from "./athlete-back-link";
import { AthleteShellClient } from "./athlete-shell-client";

export const AthleteShell = ({ children }: { children: ReactNode }) => {
  // The back link intentionally renders nothing until route params resolve.
  return (
    <AthleteShellClient
      backLink={
        <Suspense fallback={null}>
          <AthleteBackLink />
        </Suspense>
      }
    >
      {children}
    </AthleteShellClient>
  );
};
