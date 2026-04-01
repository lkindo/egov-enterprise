'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 BarChart3, 
 PieChart, 
 LineChart, 
 Activity, 
 Users, 
 Monitor, 
 Database, 
 FileText, 
 TrendingUp, 
 Filter, 
 Download, 
 ChevronRight,
 Search,
 RefreshCcw,
 Zap,
 Box,
 LayoutDashboard,
 ClipboardList,
 Vote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';

// --- Types ---
type StatsTab = 'DASHBOARD' | 'USER_STATS' | 'CONTENT_STATS' | 'SYSTEM_STATS' | 'SURVEYS' | 'REPORTS';

export default function IntelligenceHubClient({ defaultTab = 'DASHBOARD' }: { defaultTab?: StatsTab }) {
 const [activeTab, setActiveTab] = useState<StatsTab>(defaultTab);

 // --- Data Fetching ---
 const { data: userStats, isLoading: isUserLoading } = useQuery({
 queryKey: ['admin-stats-user'],
 queryFn: () => statsAdminService.getUserStats(),
 enabled: activeTab === 'USER_STATS' || activeTab === 'DASHBOARD'
 });

 const { data: bbsStats, isLoading: isBbsLoading } = useQuery({
 queryKey: ['admin-stats-bbs'],
 queryFn: () => statsAdminService.getBbsStats(),
 enabled: activeTab === 'CONTENT_STATS' || activeTab === 'DASHBOARD'
 });

 const { data: screenStats, isLoading: isScreenLoading } = useQuery({
 queryKey: ['admin-stats-screen'],
 queryFn: () => statsAdminService.getScreenStats(),
 enabled: activeTab === 'SYSTEM_STATS' || activeTab === 'DASHBOARD'
 });

 const { data: dataUsage, isLoading: isDataLoading } = useQuery({
 queryKey: ['admin-stats-data-usage'],
 queryFn: () => statsAdminService.getDataUsageStats(),
 enabled: activeTab === 'SYSTEM_STATS' || activeTab === 'DASHBOARD'
 });

 const { data: surveys, isLoading: isSurveyLoading } = useQuery({
 queryKey: ['admin-surveys'],
 queryFn: () => surveyAdminService.getSurveyList({}),
 enabled: activeTab === 'SURVEYS'
 });

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl skew-x-2">
 <BarChart3 size={28} className="text-white" />
 </div>
 <div>
  <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
  Intelligence <span className="text-primary">?덈툕</span>
  </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 ">
 ?명뀛由ъ쟾님?덈툕 님嫄곕쾭?뚯뒪 인사이트 諛님곗씠님분석
 </p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
 <Download size={18} /> ?곗씠?곗뀑 ?대낫?닿린
 </Button>
 <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all gap-2">
 <RefreshCcw size={20} /> 媛뺤젣 ?덈줈怨좎묠
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2">
 
 {/* --- Left Column: Navigation (20%) --- */}
 <div className="col-span-12 lg:col-span-3 space-y-6">
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100">
 <NavButton icon={<LayoutDashboard size={20} />} label="湲濡쒕쾶 媛쒖슂" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
 <NavButton icon={<Users size={20} />} label="?ъ슜님" active={activeTab === 'USER_STATS'} onClick={() => setActiveTab('USER_STATS')} />
 <NavButton icon={<Box size={20} />} label="肄섑뀗痢?吏님 active={activeTab === 'CONTENT_STATS'} onClick={() => setActiveTab('CONTENT_STATS')} />
 <NavButton icon={<Database size={20} />} label="?쒖뒪님" active={activeTab === 'SYSTEM_STATS'} onClick={() => setActiveTab('SYSTEM_STATS')} />
 <NavButton icon={<Vote size={20} />} label="설문조사 " active={activeTab === 'SURVEYS'} onClick={() => setActiveTab('SURVEYS')} />
 <NavButton icon={<FileText size={20} />} label="?댁쁺 蹂닿퀬님 active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} />
 </Card>

 <Card className="rounded-[3rem] border-0 bg-slate-900 text-white shadow-2xl p-10 space-y-8 relative overflow-hidden group">
 <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
 <div className="relative z-10 space-y-6">
 <h4 className="text-[10px] font-black text-white/40 tracking-tight leading-tight">?덉긽 ?⑥쑉님/h4>
 <div className="flex items-center gap-4">
 <span className="text-3xl font-black tracking-tighter tabular-nums">+{userStats?.length || 24}%</span>
 <Zap size={32} className="text-primary fill-primary" />
 </div>
 <p className="text-[11px] text-white/30 font-bold tracking-tight">?명뀛由ъ쟾님?붿쭊 v4.2 理쒖쟻님/p>
 </div>
 </Card>
 </div>

 {/* --- Center/Right Columns: Interactive Data (80%) --- */}
 <div className="col-span-12 lg:col-span-9 space-y-8">
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <StatSummaryCard icon={<Activity size={24} />} label="활성 " value={`${userStats?.length || 0}`} trend="+12%" />
 <StatSummaryCard icon={<Monitor size={24} />} label="?붾㈃ 요청" value={`${screenStats?.length || 0}k`} trend="+5.4k" color="primary" />
 <StatSummaryCard icon={<Database size={24} />} label="?곗씠님?ъ슜님 value={`${dataUsage?.length || 0}GB`} trend="-2.1%" />
 </div>

 <Card className="rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100 min-h-[500px] flex flex-col">
 <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
 <div className="space-y-1">
 <h3 className="text-[10px] font-black text-slate-400 tracking-[0.4em] ">?ъ링 분석 酉고룷님/h3>
 <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter ">
 {activeTab === 'DASHBOARD' ? '湲濡쒕쾶 媛쒖슂' : 
 activeTab === 'USER_STATS' ? '?ъ슜님통계' :
 activeTab === 'CONTENT_STATS' ? '肄섑뀗痢?吏님분석' :
 activeTab === 'SYSTEM_STATS' ? '?쒖뒪님활성 吏님 :
 activeTab === 'SURVEYS' ? '설문조사 분석' :
 activeTab === 'REPORTS' ? '?댁쁺 蹂닿퀬님분석' : activeTab}
 </CardTitle>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="rounded-xl h-10 px-4 text-[9px] font-black tracking-tight">최근 30님/Button>
 <Button size="icon" variant="ghost" className="rounded-xl"><Filter size={18} /> ?꾪꽣</Button>
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-12">
 <AnimatePresence mode="wait">
 <motion.div 
 key={activeTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="h-full"
 >
 {activeTab === 'SURVEYS' ? (
 <div className="space-y-6">
 {isSurveyLoading && <div className="p-10 text-center opacity-40 ">설문 ??μ냼 ?숆린님以?..</div>}
 {surveys?.list?.map((s: any) => (
 <div key={s.qestnrId} className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
 <div className="flex items-center gap-6">
 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
 <Vote className="text-primary" />
 </div>
 <div className="space-y-1">
 <h4 className="text-base font-black text-slate-900 tracking-tighter ">
 {s.qestnrSj}
 </h4>
 <p className="text-[10px] font-bold text-slate-400 tracking-tight">
 Status: {s.qestnrEndde > new Date().toISOString() ? '활성' : '蹂닿님?} 님{s.qestnrEndde}
 </p>
 </div>
 </div>
 <Button variant="ghost" className="rounded-xl h-10 text-[9px] font-black tracking-tight gap-2">분석 蹂닿린 <ChevronRight size={14} /></Button>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center p-20 text-center space-y-10">
 <div className="w-64 h-64 mx-auto bg-slate-50 rounded-full flex items-center justify-center relative shadow-inner">
 <TrendingUp size={120} className="text-slate-100" />
 <div className="absolute inset-0 flex items-center justify-center">
 <LineChart size={64} className="text-primary" />
 </div>
 </div>
 <div className="space-y-4">
 <h4 className="text-3xl font-black tracking-tighter text-slate-900">
 {isUserLoading || isBbsLoading || isScreenLoading ? '?명뀛由ъ쟾님泥섎━ 以?..' : '?곗씠?곗뀑 ?숆린님?꾨즺'}
 </h4>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.5em]">
 嫄곕쾭?뚯뒪 ?곗씠님寃利?諛?理쒖쟻님?꾨즺
 </p>
 </div>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </CardContent>
 </Card>
 </div>

 </div>
 </div>
 );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={cn(
 "w-full group p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 mb-2",
 active 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-500 hover:text-slate-900"
 )}
 >
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
 active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
 )}>
 {icon}
 </div>
 <span className="text-[11px] font-black tracking-tight ">{label}</span>
 </button>
 );
}

function StatSummaryCard({ icon, label, value, trend, color = 'slate' }: { icon: React.ReactNode, label: string, value: string, trend: string, color?: string }) {
 return (
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-10 ring-1 ring-slate-100 hover:scale-[1.05] transition-all">
 <div className="space-y-6">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-12",
 color === 'primary' ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-400"
 )}>
 {icon}
 </div>
 <div className="space-y-2">
 <h5 className="text-[10px] font-black text-slate-400 tracking-tight leading-tight">{label}</h5>
 <div className="flex items-end justify-between">
 <span className="text-3xl font-black tracking-tighter text-slate-900 tabular-nums">{value}</span>
 <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
 </div>
 </div>
 </div>
 </Card>
 );
}

