import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react";

export const AssessmentChangeIndicator = ({
  direction,
}: {
  direction: "better" | "worse" | "same";
}) => {
  if (direction === "better") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <ArrowUpRightIcon aria-hidden="true" className="size-4" /> Better
      </span>
    );
  }
  if (direction === "worse") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
        <ArrowDownRightIcon aria-hidden="true" className="size-4" /> Declined
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1">
      <ArrowRightIcon aria-hidden="true" className="size-4" /> No change
    </span>
  );
};
