'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MasterDetailLayoutProps {
 master: ReactNode;
 detail: ReactNode;
 masterWidth?: string;
 className?: string;
 showDetail?: boolean;
}

/**
 * Precision Workspace - Master-Detail Layout
 * 분할 정복 기반 정보 레이아웃 컴포넌트
 */
export const MasterDetailLayout = ({
 master,
 detail,
 masterWidth = 'w-1/3',
 className,
 showDetail = true
}: MasterDetailLayoutProps) => {
 return (
 <div className={cn("flex h-full w-full bg-background overflow-hidden", className)}>
 {/* Master Side (List) */}
 <aside className={cn(
 "h-full overflow-y-auto bg-card/30 precision-border-r transition-all duration-300",
 masterWidth
 )}>
 <div className="h-full w-full">
 {master}
 </div>
 </aside>

 {/* Detail Side (Content) */}
 <main className="flex-1 h-full overflow-hidden bg-background relative">
 <AnimatePresence mode="wait">
 {showDetail ? (
 <motion.div
 key="detail-content"
 initial={{ opacity: 0, x: 10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -10 }}
 transition={{ duration: 0.3, ease: 'easeOut' }}
 className="h-full w-full overflow-y-auto p-8"
 >
 {detail}
 </motion.div>
 ) : (
 <motion.div
 key="empty-state"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="h-full w-full flex items-center justify-center text-muted-foreground p-8"
 >
 <p className="text-sm tracking-tight ">목록을 선택하여 상세정보를 확인하세요</p>
 </motion.div>
 )}
 </AnimatePresence>
 </main>
 </div>
 );
};
