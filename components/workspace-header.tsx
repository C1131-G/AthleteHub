import type { ReactNode } from "react";

/**
 * Rendered by the page itself, outside any data boundary, so a hard load names
 * its destination and offers its primary action before the data arrives.
 */
export const WorkspaceHeader = ({
  actions,
  description,
  id,
  title,
}: {
  actions?: ReactNode;
  description: string;
  id: string;
  title: string;
}) => (
  <header
    className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    data-slot="workspace-header"
  >
    <div>
      <h1
        className="text-3xl font-semibold tracking-tight text-balance"
        id={id}
      >
        {title}
      </h1>
      <p className="text-muted-foreground mt-2">{description}</p>
    </div>
    {actions ? <div className="flex gap-2">{actions}</div> : null}
  </header>
);
