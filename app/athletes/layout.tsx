import type { ReactNode } from "react";

import { AthleteShell } from "@/features/athlete/components/athlete-shell";

const AthletesLayout = ({ children }: { children: ReactNode }) => {
  return <AthleteShell>{children}</AthleteShell>;
};

export default AthletesLayout;
