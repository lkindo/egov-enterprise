import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function HubListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-5 rounded-lg bg-card border border-border flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-4 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function HubMetricSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-white/60 backdrop-blur-xl border-white/5 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-start">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-4 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}
