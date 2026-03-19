'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { 
 Layers, 
 Globe, 
 Building2, 
 LayoutGrid, 
 Search, 
 RefreshCcw, 
 ArrowRightCircle, 
 Activity, 
 CheckCircle, 
 Clock, 
 MapPin, 
 Database, 
 FileCode,
 ChevronRight,
 SearchCode,
 Network
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CommonCodeClient from './CommonCodeClient';
import AdministCodeClient from '../codes/administ/AdministCodeClient';
import InstitutionCodeClient from '../codes/institution/InstitutionCodeClient';

// --- Types ---
type CodeHubTab = 'STANDARD' | 'ADMINIST' | 'INSTITUTION';

export default function CommonCodeHubClient({ 
 clCodes, 
 groups, 
 details, 
 selectedGroupId 
}: { 
 clCodes: any[]; 
 groups: any[]; 
 details: any[]; 
 selectedGroupId: string | null 
}) {
 const [activeTab, setActiveTab] = useState<CodeHubTab>('STANDARD');

 return (
 <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
 {/* --- Premium Hub Header --- */}
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 gap-8">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl skew-y-1 hover:rotate-6 transition-transform duration-500">
 <Database size={32} className="text-white" />
 </div>
 <div className="space-y-1">
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 코드 <span className="text-primary italic">통합 관리</span> Hub
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.4em] italic mt-2">
 글로벌 메타데이터 및 행정 표준 관리
 </p>
 </div>
 </div>

 {/* --- Hub Tabs --- */}
 <div className="bg-slate-100 p-2 rounded-[2.5rem] flex gap-2 border shadow-inner">
 <HubTabButton 
 icon={<FileCode size={18} />} 
 label="표준코드" 
 active={activeTab === 'STANDARD'} 
 onClick={() => setActiveTab('STANDARD')} 
 />
 <HubTabButton 
 icon={<MapPin size={18} />} 
 label="행정코드" 
 active={activeTab === 'ADMINIST'} 
 onClick={() => setActiveTab('ADMINIST')} 
 />
 <HubTabButton 
 icon={<Building2 size={18} />} 
 label="기관코드" 
 active={activeTab === 'INSTITUTION'} 
 onClick={() => setActiveTab('INSTITUTION')} 
 />
 </div>
 </div>

 {/* --- Viewport Content --- */}
 <div className="px-2">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4 }}
 >
 {activeTab === 'STANDARD' && (
 <CommonCodeClient 
 clCodes={clCodes} 
 groups={groups} 
 details={details} 
 selectedGroupId={selectedGroupId} 
 />
 )}
 {activeTab === 'ADMINIST' && (
 <div className="bg-white rounded-[3.5rem] p-4 lg:p-12 border shadow-2xl relative overflow-hidden group/administ ring-1 ring-slate-100">
 <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-40" />
 <AdministCodeClient initialData={{ list: [], total: 0 }} />
 </div>
 )}
 {activeTab === 'INSTITUTION' && (
 <div className="bg-white rounded-[3.5rem] p-4 lg:p-12 border shadow-2xl relative overflow-hidden group/institution ring-1 ring-slate-100">
 <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -ml-32 -mt-32 opacity-40" />
 <InstitutionCodeClient initialData={{ list: [], total: 0 }} />
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>
 </div>
 );
}

// --- Sub-components ---

function HubTabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={cn(
 "relative flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[11px] font-black tracking-tight italic transition-all active:scale-95 overflow-hidden",
 active 
 ? "bg-white text-slate-900 shadow-xl" 
 : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
 )}
 >
 <div className={cn(
 "transition-transform duration-300",
 active ? "scale-110 rotate-3" : "opacity-40"
 )}>
 {icon}
 </div>
 <span>{label}</span>
 {active && (
 <motion.div 
 layoutId="activeHubIndicator"
 className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full mb-1"
 />
 )}
 </button>
 );
}
