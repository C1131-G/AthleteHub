import { Skeleton } from "@/components/ui/skeleton";

/** Shaped to the setup table it replaces, so the page does not jump on load. */
export const EquipmentSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-[26rem] w-full" />
  </div>
);
