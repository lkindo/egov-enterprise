import { Skeleton } from '@/app/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-12 pb-20 animate-pulse">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg opacity-40" />
          <Skeleton className="h-11 w-96 rounded-lg opacity-50" />
          <Skeleton className="h-6 w-[500px] rounded-lg opacity-30" />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <Skeleton className="h-11 w-full lg:w-40 rounded-lg opacity-30" />
          <Skeleton className="h-11 w-full lg:w-40 rounded-lg opacity-40" />
        </div>
      </div>
      <Skeleton className="h-[250px] w-full rounded-lg opacity-20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={`dash-skeleton-item-${i}`} className="h-[320px] rounded-lg opacity-20" />
        ))}
      </div>
    </div>
  );
}
