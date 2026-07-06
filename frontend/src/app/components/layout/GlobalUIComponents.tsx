'use client';

import dynamic from 'next/dynamic';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const CommandMenu = dynamic(() => import('./command-menu').then(mod => mod.CommandMenu), { ssr: false });
const RouteProgress = dynamic(() => import('./route-progress').then(mod => mod.RouteProgress), { ssr: false });
const ScrollToTop = dynamic(() => import('./scroll-to-top').then(mod => mod.ScrollToTop), { ssr: false });

export function GlobalUIComponents() {
  return (
    <>
      <TooltipProvider>
        <RouteProgress />
        <CommandMenu />
        <Toaster position="top-center" richColors />
        <ScrollToTop />
      </TooltipProvider>
    </>
  );
}
