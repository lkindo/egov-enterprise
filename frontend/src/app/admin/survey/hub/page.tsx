import { Suspense } from 'react';
import { SurveyHubClient } from './SurveyHubClient';
import { Skeleton } from '@/components/ui/skeleton';

function SurveyHubFallback() {
  return <div className="space-y-6"><h1 className="text-2xl font-bold">설문 관리</h1><div aria-hidden="true" className="space-y-4"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-96 w-full" /></div></div>;
}

export default function SurveyHubPage() {
  return <Suspense fallback={<SurveyHubFallback />}><SurveyHubClient /></Suspense>;
}
