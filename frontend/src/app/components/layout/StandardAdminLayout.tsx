'use client';

import { useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Footer } from './footer';
import { DynamicBreadcrumb } from './DynamicBreadcrumb';
import { RouteProgress } from './route-progress';
import { ScrollToTop } from './scroll-to-top';
import { GlobalUIComponents } from './GlobalUIComponents';
import { motion, AnimatePresence } from 'framer-motion';

export function StandardAdminLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useLayout();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans selection:bg-primary/10 selection:text-primary">
      {/* 🚀 Global Core Utility Layer */}
      <RouteProgress />
      <ScrollToTop />
      <GlobalUIComponents />

      {/* 🏗️ Core Architecture Shell */}
      <Header />

      <div className="flex pt-16 h-screen overflow-hidden">
        {/* 🧭 Navigation Layer */}
        <Sidebar />

        {/* 🎬 Scene Stage Area */}
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out relative overflow-hidden",
            "lg:ml-72" // Sidebar width constant
          )}
        >
          {/* 🏔️ Contextual Navigation & Scene Header */}
          <div className="sticky top-0 z-30 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
            <DynamicBreadcrumb />
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 animate-pulse" />
                  ))}
               </div>
               <span className="text-[10px] font-black text-slate-400 tracking-tight uppercase">Current Session Active</span>
            </div>
          </div>

          {/* 🌌 Main Viewport Context */}
          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            <AnimatePresence mode="wait">
              <motion.div
                key="admin-content-stage"
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto pb-24"
              >
                {/* Hub 2.0 Standard Container Wrapper */}
                <div className="relative">
                   {/* Background Decorative Mesh (Subtle) */}
                   <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                   <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                   
                   {/* Actual Page Content */}
                   {children}
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* 🏁 System Terminal Layer (Footer) */}
            <Footer />
          </div>
        </main>
      </div>

      {/* 🎭 Visual Overlay Effects */}
      <div className="fixed inset-0 pointer-events-none z-[9999] border-[12px] border-white/5 opacity-50 dark:border-slate-900/5" />
    </div>
  );
}
