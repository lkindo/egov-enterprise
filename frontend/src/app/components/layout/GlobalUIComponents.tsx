'use client';

import dynamic from 'next/dynamic';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const RouteProgress = dynamic(() => import('./route-progress').then(mod => mod.RouteProgress), { ssr: false });

export function GlobalUIComponents() {
  return (
    <>
      <TooltipProvider>
        <RouteProgress />
        <Toaster position="top-center" richColors />
      </TooltipProvider>
    </>
  );
}
