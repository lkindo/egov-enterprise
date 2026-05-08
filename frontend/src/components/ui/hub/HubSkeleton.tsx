'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function HubListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-5 rounded-lg bg-white border border-slate-50 flex items-center justify-between">
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

export function HubDetailSkeleton() {
  return (
    <Card className="h-full rounded-[2.5rem] border-none bg-white shadow-xl overflow-hidden flex flex-col">
      <CardHeader className="p-10 lg:p-14 border-b border-slate-50 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-10 w-3/4" />
        </div>
        <div className="bg-slate-50/50 rounded-lg p-10 h-32 flex items-center justify-center">
            <Skeleton className="w-full h-4" />
        </div>
      </CardHeader>
      <CardContent className="p-10 lg:p-14 space-y-12 flex-1">
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-3 w-20" />
          <div className="p-10 bg-slate-50/50 rounded-lg h-48">
            <Skeleton className="h-full w-full opacity-50" />
          </div>
        </div>
      </CardContent>
    </Card>
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
