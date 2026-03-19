'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 Calendar, 
 Briefcase, 
 FileText, 
 BarChart3, 
 Plus, 
 Clock, 
 Filter, 
 MoreHorizontal,
 ChevronRight,
 Zap,
 LayoutDashboard,
 ClipboardList,
 TrendingUp,
 Users,
 RefreshCcw,
 Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { scheduleService } from '@/services/user/ScheduleService';
import { getDeptJobList } from '@/services/deptJob/deptJobService';
import { reportService } from '@/services/user/ReportService';
import { Input } from '@/components/ui/input';

// --- Types ---
type WorkTab = 'SCHEDULE' | 'JOBS' | 'REPORTS' | 'METRICS';

export default function WorkHubClient({ defaultTab = 'SCHEDULE' }: { defaultTab?: WorkTab }) {
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState<WorkTab>(defaultTab);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

 // --- Queries ---

 // 1. Daily Schedule
 const { data: scheduleData, isLoading: isScheduleLoading } = useQuery({
 queryKey: ['work-schedule', searchKeyword],
 queryFn: () => scheduleService.getScheduleList({ page번호: 1 }),
 enabled: activeTab === 'SCHEDULE'
 });
 const schedules = scheduleData?.list || [];

 // 2. Department Jobs
 const { data: jobData, isLoading: isJobLoading } = useQuery({
 queryKey: ['work-jobs', searchKeyword],
 queryFn: () => getDeptJobList({ searchKeyword }),
 enabled: activeTab === 'JOBS'
 });
 const jobs = jobData?.list || [];

 // 3. Work Reports
 const { data: reportData, isLoading: isReportLoading } = useQuery({
 queryKey: ['work-reports', searchKeyword],
 queryFn: () => reportService.getReports({ page: 0, size: 50, searchWrd: searchKeyword }),
 enabled: activeTab === 'REPORTS'
 });
 const reports = reportData?.list || [];

 // --- Selection Logic ---
 const selectedItem = useMemo(() => {
 if (!selectedItemId) return null;
 if (activeTab === 'SCHEDULE') return schedules.find(s => s.schdulId === selectedItemId);
 if (activeTab === 'JOBS') return jobs.find(j => j.deptJobBxId === selectedItemId);
 if (activeTab === 'REPORTS') return reports.find(r => r.reprtId === selectedItemId);
 return null;
 }, [selectedItemId, activeTab, schedules, jobs, reports]);

 // --- Renderers ---

 const renderScheduleList = () => (
 <div className="space-y-3">
 {schedules.map((item) => (
 <WorkListItem 
 key={item.schdulId}
 id={item.schdulId}
 title={item.schdulNm}
 subtitle={`${item.schdulBgnde} ~ ${item.schdulEndde}`}
 icon={<Calendar size={20} />}
 selected={selectedItemId === item.schdulId}
 onClick={() => setSelectedItemId(item.schdulId)}
 />
 ))}
 </div>
 );

 const renderJobList = () => (
 <div className="space-y-3">
 {jobs.map((item) => (
 <WorkListItem 
 key={item.deptJobBxId}
 id={item.deptJobBxId}
 title={item.deptJobBxNm}
 subtitle={`Dept: ${item.deptId || 'Global'}`}
 icon={<ClipboardList size={20} />}
 selected={selectedItemId === item.deptJobBxId}
 onClick={() => setSelectedItemId(item.deptJobBxId)}
 />
 ))}
 </div>
 );

 const renderReportList = () => (
 <div className="space-y-3">
 {reports.map((item) => (
 <WorkListItem 
 key={item.reprtId}
 id={item.reprtId}
 title={item.reprtSj}
 subtitle={`By: ${item.wrterNm} • ${item.reprtDe}`}
 icon={<FileText size={20} />}
 selected={selectedItemId === item.reprtId}
 onClick={() => setSelectedItemId(item.reprtId)}
 />
 ))}
 </div>
 );

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl -rotate-2">
 <Briefcase size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 Work & Project <span className="text-primary italic">Workspace</span>
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 Integrated Productivity & Intelligence
 </p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
 <Filter size={18} /> Viewport Options
 </Button>
 <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-2">
 <Plus size={20} /> Create New Task
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2">
 
 {/* --- Left Column: Navigation (25%) --- */}
 <div className="col-span-12 lg:col-span-3 space-y-6">
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100">
 <NavButton icon={<Calendar size={20} />} label="Daily Schedule" active={activeTab === 'SCHEDULE'} onClick={() => { setActiveTab('SCHEDULE'); setSelectedItemId(null); }} />
 <NavButton icon={<ClipboardList size={20} />} label="Department Jobs" active={activeTab === 'JOBS'} onClick={() => { setActiveTab('JOBS'); setSelectedItemId(null); }} />
 <NavButton icon={<FileText size={20} />} label="Work Reports" active={activeTab === 'REPORTS'} onClick={() => { setActiveTab('REPORTS'); setSelectedItemId(null); }} />
 <NavButton icon={<BarChart3 size={20} />} label="Work Metrics" active={activeTab === 'METRICS'} onClick={() => { setActiveTab('METRICS'); setSelectedItemId(null); }} />
 </Card>

 <Card className="rounded-[3rem] border-0 bg-slate-900 text-white shadow-2xl p-10 space-y-8 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
 <TrendingUp size={120} />
 </div>
 <div className="relative z-10">
 <h4 className="text-[10px] font-black text-primary tracking-[0.3em] mb-4 italic">Productivity Score</h4>
 <div className="flex items-end gap-2">
 <span className="text-6xl font-black italic tracking-tighter tabular-nums leading-none">84</span>
 <span className="text-xl font-black text-white/40 mb-1">/100</span>
 </div>
 <p className="text-[10px] text-white/40 font-bold tracking-tight mt-6 leading-relaxed">System performance is 12% higher than previous iteration.</p>
 </div>
 </Card>
 </div>

 {/* --- Center Column: Data List (40%) --- */}
 <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-6">
 <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 border-b p-10 space-y-6">
 <div className="flex items-center justify-between">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] italic leading-tight">
 Active Workspace Registry
 </CardTitle>
 <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries()} className="rounded-xl"><RefreshCcw size={16} /></Button>
 </div>
 <div className="relative group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-hover:text-primary" size={16} />
 <Input 
 className="pl-12 h-12 bg-white border-slate-100 rounded-xl text-[11px] font-bold shadow-sm" 
 placeholder="검색..." 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {activeTab === 'SCHEDULE' && renderScheduleList()}
 {activeTab === 'JOBS' && renderJobList()}
 {activeTab === 'REPORTS' && renderReportList()}
 {activeTab === 'METRICS' && (
 <div className="p-20 text-center opacity-30 italic font-black tracking-[0.3em]">
 Connect Metric Edge Node
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </CardContent>
 </Card>
 </div>

 {/* --- Right Column: Detail/Analysis (35%) --- */}
 <div className="col-span-12 lg:col-span-5 h-full">
 <AnimatePresence mode="wait">
 {selectedItemId ? (
 <motion.div 
 key={selectedItemId}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="h-full flex flex-col gap-6"
 >
 <Card className="flex-1 rounded-[4rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden relative">
 <CardHeader className="bg-slate-50/50 p-12 border-b">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-[10px] font-black text-slate-400 tracking-[0.4em] flex items-center gap-2 italic">
 <LayoutDashboard size={14} className="text-primary" /> Workspace Intelligence 
 </h3>
 <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full tracking-tighter italic border border-emerald-100">Live Sync</span>
 </div>
 <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none truncate pr-10">
 Entry Details
 </h2>
 </div>
 </CardHeader>
 
 <CardContent className="flex-1 p-12 space-y-10 overflow-y-auto">
 <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
 <pre className="text-[10px] font-mono whitespace-pre-wrap">
 {JSON.stringify(selectedItem, null, 2)}
 </pre>
 </div>

 <div className="grid grid-cols-2 gap-6 pt-10 border-t">
 <div className="space-y-2">
 <h6 className="text-[9px] font-black text-slate-400 tracking-tight">Team Assigned</h6>
 <div className="flex -space-x-3 overflow-hidden">
 {[1, 2, 3].map(i => (
 <div key={i} className="inline-block h-10 w-10 rounded-full ring-4 ring-white bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">U{i}</div>
 ))}
 <div className="inline-block h-10 w-10 rounded-full ring-4 ring-white bg-slate-900 flex items-center justify-center font-black text-[10px] text-white">+2</div>
 </div>
 </div>
 <div className="space-y-2">
 <h6 className="text-[9px] font-black text-slate-400 tracking-tight">Resource Allocation</h6>
 <div className="w-full bg-slate-100 rounded-full h-2">
 <div className="bg-slate-900 h-2 rounded-full" style={{ width: '65%' }} />
 </div>
 <p className="text-[9px] font-bold text-slate-400 tracking-tight text-right">65% Utilized</p>
 </div>
 </div>

 <div className="flex gap-4 mt-auto">
 <Button className="flex-1 h-16 bg-slate-900 text-white rounded-[2rem] font-black tracking-[0.3em] text-[10px] shadow-2xl shadow-slate-900/30">
 Open Worklog
 </Button>
 <Button variant="outline" size="icon" className="h-16 w-16 rounded-[2rem] border-2"><Users size={20} /></Button>
 </div>
 </CardContent>
 </Card>
 </motion.div>
 ) : (
 <Card className="h-full rounded-[4rem] border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center p-20 text-center grayscale opacity-30">
 <Briefcase size={64} className="mb-8" />
 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-tight">
 Selection Required
 </h3>
 <p className="text-[10px] mt-4 font-black tracking-tight">Awaiting interaction node...</p>
 </Card>
 )}
 </AnimatePresence>
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
 "w-full group p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5",
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
 <span className="text-[11px] font-black tracking-tight italic">{label}</span>
 </button>
 );
}

function WorkListItem({ id, title, subtitle, icon, selected, onClick }: { id: string | number, title: string, subtitle: string, icon: React.ReactNode, selected: boolean, onClick: () => void }) {
 return (
 <div 
 onClick={onClick}
 className={cn(
 "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
 selected 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
 )}
 >
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
 selected ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
 )}>
 {icon}
 </div>
 <div className="space-y-1">
 <h4 className={cn("text-sm font-black italic", selected ? "text-white" : "text-slate-900 tracking-tighter truncate max-w-[200px]")}>
 {title}
 </h4>
 <p className={cn("text-[9px] font-black tracking-tight opacity-40")}>{subtitle}</p>
 </div>
 </div>
 <ChevronRight size={18} className={cn("transition-transform", selected ? "rotate-90 text-primary" : "text-slate-200")} />
 </div>
 );
}
