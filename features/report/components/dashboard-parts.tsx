import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Metric = ({
  title,
  value,
  progress,
}: {
  title: string;
  value: string;
  progress?: number;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold">{value}</p>
      {progress !== undefined && (
        <Progress
          aria-label={`${title} progress`}
          className="mt-3"
          value={progress}
        />
      )}
    </CardContent>
  </Card>
);

export const DashboardWorkspaceSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-96" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="bg-muted h-28 animate-pulse rounded-xl" key={index} />
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="bg-muted h-80 animate-pulse rounded-xl" />
      <div className="bg-muted h-80 animate-pulse rounded-xl" />
    </div>
  </div>
);
