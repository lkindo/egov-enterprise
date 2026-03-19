'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 Activity, 
 ShieldAlert, 
 Terminal, 
 MessageSquare, 
 Search, 
 Filter, 
 RefreshCcw, 
 History, 
 Download, 
 AlertTriangle, 
 CheckCircle2, 
 Eye, 
 ArrowUpRight, 
 Clock, 
 Server, 
 Cpu, 
 HardDrive, 
 Trash2,
 Lock,
 Settings,
 Bell,
 Share2,
 Zap,
 LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { auditAdminService } from '@/services/admin/system/AuditAdminService';
import { commentAdminService, CommentDetail } from '@/services/admin/system/CommentAdminService';
import { systemLogAdminService } from '@/services/admin/system/SystemLogAdminService';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS';

export default function MonitoringHubClient({ defaultTab = 'SECURITY' }: { defaultTab?: MonitoringTab }) {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [activeTab, setActiveTab] = useState<MonitoringTab>(defaultTab);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

 // --- Queries ---

 // 1. Audit Logs (Security Context)
 const { data: auditData, isLoading: isAuditLoading } = useQuery({
 queryKey: ['admin-audit-logs', searchKeyword],
 queryFn: () => auditAdminService.getAuditLogs({ page: 0, size: 50, keyword: searchKeyword }),
 enabled: activeTab === 'SECURITY'
 });
 const auditLogs = auditData?.list || [];

 // 2. System Logs (Transaction Context)
 const { data: systemLogData, isLoading: isSysLogLoading } = useQuery({
 queryKey: ['admin-system-logs', searchKeyword],
 queryFn: () => systemLogAdminService.getSystemLogs({ page: 0, size: 50, searchWrd: searchKeyword }),
 enabled: activeTab === 'SYSTEM'
 });
 const systemLogs = systemLogData?.list || [];

 // 3. Login Logs (Authentication Context)
 const { data: loginLogData, isLoading: isLoginLogLoading } = useQuery({
 queryKey: ['admin-login-logs', searchKeyword],
 queryFn: () => systemLogAdminService.getLoginLogs({ page: 0, size: 50, searchWrd: searchKeyword }),
 enabled: activeTab === 'LOGIN'
 });
 const loginLogs = loginLogData?.list || [];

 // 4. Comments
 const { data: commentData, isLoading: isCommentLoading } = useQuery({
 queryKey: ['admin-comments', searchKeyword],
 queryFn: () => commentAdminService.getComments({ page: 0, size: 50, searchWrd: searchKeyword }),
 enabled: activeTab === 'COMMENTS'
 });
 const comments = commentData?.list || [];

 // --- Mutations ---
 const deleteCommentMutation = useMutation({
 mutationFn: (id: number) => commentAdminService.deleteComment(id),
 onSuccess: () => {
 toast('댓글이 성공적으로 삭제되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
 if (selectedItemId) setSelectedItemId(null);
 }
 });

 // --- Detail View Logic ---
 const selectedItem = useMemo(() => {
 if (!selectedItemId) return null;
 if (activeTab === 'COMMENTS') return comments.find(c => c.commentNo === selectedItemId);
 if (activeTab === 'SECURITY') return auditLogs.find(l => l.histId === selectedItemId);
 if (activeTab === 'SYSTEM') return systemLogs.find(l => l.requstId === selectedItemId);
 if (activeTab === 'LOGIN') return loginLogs.find(l => l.logId === selectedItemId);
 return null;
 }, [selectedItemId, activeTab, auditLogs, systemLogs, loginLogs, comments]);

 // --- Renderers ---

 const renderList = () => {
 if (activeTab === 'SECURITY') return renderGenericList(auditLogs, 'histId', 'sysNm', 'histCn', 'frstRegisterPnttm', <ShieldAlert size={20} />);
 if (activeTab === 'SYSTEM') return renderGenericList(systemLogs, 'requstId', 'srvcNm', 'methodNm', 'occcrrncDe', <Terminal size={20} />);
 if (activeTab === 'LOGIN') return renderGenericList(loginLogs, 'logId', 'loginId', 'loginMthd', 'creatDt', <LogIn size={20} />);
 if (activeTab === 'COMMENTS') return renderCommentList();
 return null;
 };

 const renderGenericList = (items: any[], idKey: string, titleKey: string, subKey: string, dateKey: string, icon: React.ReactNode) => (
 <div className="space-y-3">
 {items.map((item) => (
 <div 
 key={item[idKey]}
 onClick={() => setSelectedItemId(item[idKey])}
 className={cn(
 "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedItemId === item[idKey] 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
 )}
 >
 <div className="flex items-start gap-6">
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
 selectedItemId === item[idKey] ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
 )}>
 {icon}
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <span className={cn("text-[8px] font-black tracking-tight", selectedItemId === item[idKey] ? "text-primary/100" : "text-slate-400")}>
 {item[titleKey]}
 </span>
 <span className="text-[8px] font-bold opacity-40">{item[dateKey]}</span>
 </div>
 <h4 className={cn("text-sm font-black italic", selectedItemId === item[idKey] ? "text-white" : "text-slate-900 tracking-tight truncate max-w-[200px]")}>
 {item[subKey]}
 </h4>
 </div>
 </div>
 </div>
 ))}
 </div>
 );

 const renderCommentList = () => (
 <div className="space-y-3">
 {comments.map((c) => (
 <div 
 key={c.commentNo}
 onClick={() => setSelectedItemId(c.commentNo)}
 className={cn(
 "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedItemId === c.commentNo 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
 )}
 >
 <div className="flex items-start gap-6">
 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
 <MessageSquare size={20} />
 </div>
 <div className="space-y-1">
 <h4 className={cn("text-sm font-black italic", selectedItemId === c.commentNo ? "text-white" : "text-slate-900 tracking-tight")}>{c.commentCn}</h4>
 <p className="text-[8px] font-black tracking-tight opacity-40">작성자: {c.wrterNm}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 );

 const renderObservability = () => (
 <div className="p-10 space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <MetricCard icon={<Cpu className="text-emerald-500" />} label="CPU 사용률" value="12.4%" subtitle="최적" />
 <MetricCard icon={<HardDrive className="text-blue-500" />} label="메모리" value="54.8%" subtitle="보통" />
 <MetricCard icon={<Activity className="text-rose-500" />} label="HTTP 트래픽" value="240 req/s" subtitle="최고: 450" />
 <MetricCard icon={<Server className="text-amber-500" />} label="DB 지연 시간" value="15.2ms" subtitle="안정" />
 </div>

 <Card className="rounded-[3rem] border-0 bg-slate-900 text-white p-12 relative overflow-hidden group shadow-2xl">
 <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-all rotate-12">
 <Zap size={240} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-8">
 <div className="flex items-center gap-4">
 <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
 <h3 className="text-2xl font-black italic tracking-tighter italic">시스템 코어 상태: 가동 중</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
 <StatusIndicator label="API 서비스" status="정상" />
 <StatusIndicator label="DB 클러스터" status="정상" />
 <StatusIndicator label="Redis 캐시" status="정상" />
 </div>
 </div>
 </Card>
 </div>
 );

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl skew-x-2">
 <Activity size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 모니터링 통합 허브
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 통합 거버넌스 및 관찰 센터
 </p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
 <Download size={18} /> 스냅샷
 </Button>
 <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all gap-2">
 <Bell size={20} /> 알림 규칙
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2 min-h-[800px]">
 
 {/* --- Left Column: Navigation (20%) --- */}
 <div className="col-span-12 lg:col-span-3 space-y-6">
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100 overflow-hidden">
 <NavButton icon={<ShieldAlert size={20} />} label="보안 감사" active={activeTab === 'SECURITY'} onClick={() => { setActiveTab('SECURITY'); setSelectedItemId(null); }} />
 <NavButton icon={<Terminal size={20} />} label="시스템 로그" active={activeTab === 'SYSTEM'} onClick={() => { setActiveTab('SYSTEM'); setSelectedItemId(null); }} />
 <NavButton icon={<LogIn size={20} />} label="로그인 기록" active={activeTab === 'LOGIN'} onClick={() => { setActiveTab('LOGIN'); setSelectedItemId(null); }} />
 <NavButton icon={<Activity size={20} />} label="시스템 가동성" active={activeTab === 'OBSERVABILITY'} onClick={() => { setActiveTab('OBSERVABILITY'); setSelectedItemId(null); }} />
 <NavButton icon={<MessageSquare size={20} />} label="댓글 관리" active={activeTab === 'COMMENTS'} onClick={() => { setActiveTab('COMMENTS'); setSelectedItemId(null); }} />
 </Card>
 </div>

 {/* --- Center Column: Data List (40%) --- */}
 <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-6">
 <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 border-b p-10 space-y-8">
 <div className="flex items-center justify-between">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] italic leading-tight">
 센티넬 로그 스트림 (통합)
 </CardTitle>
 <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-8 text-[9px] font-black tracking-tight gap-2">
 <RefreshCcw size={12} /> 동기화
 </Button>
 </div>
 {activeTab !== 'OBSERVABILITY' && (
 <div className="flex gap-4">
 <div className="relative flex-1 group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
 <Input 
 className="pl-12 h-14 bg-white border-slate-100 rounded-2xl text-sm font-bold shadow-sm" 
 placeholder="로그 검색..." 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </div>
 <Button className="h-14 w-14 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors"><Filter size={20} /></Button>
 </div>
 )}
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-6">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {activeTab === 'OBSERVABILITY' ? renderObservability() : renderList()}
 </motion.div>
 </AnimatePresence>
 </CardContent>
 </Card>
 </div>

 {/* --- Right Column: Details/Control (40%) --- */}
 <div className="col-span-12 lg:col-span-4 h-full">
 <AnimatePresence mode="wait">
 {selectedItemId ? (
 <motion.div 
 key={selectedItemId}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="h-full flex flex-col gap-8"
 >
 <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden relative">
 <CardHeader className="bg-slate-50/50 p-10 border-b">
 <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-tight">
 로그 상세 정보 #{selectedItemId}
 </h2>
 </CardHeader>
 
 <CardContent className="flex-1 p-10 space-y-12 overflow-y-auto">
 <pre className="text-[10px] font-mono p-6 bg-slate-50 rounded-2xl border overflow-x-auto">
 {JSON.stringify(selectedItem, null, 2)}
 </pre>
 <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black tracking-tight text-[9px] shadow-xl">
 관리 작업 실행
 </Button>
 </CardContent>
 </Card>
 </motion.div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200">
 <Activity size={64} className="mb-8" />
 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">모니터링 대기 중</h3>
 </div>
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
 "w-full group p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5",
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

function MetricCard({ icon, label, value, subtitle }: { icon: React.ReactNode, label: string, value: string, subtitle: string }) {
 return (
 <Card className="p-8 rounded-[2rem] bg-white border-2 border-slate-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all space-y-6">
 <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg border">
 {icon}
 </div>
 <div>
 <p className="text-[9px] font-black text-slate-400 tracking-tight flex items-center gap-2 mb-1">{label}</p>
 <p className="text-3xl font-black text-slate-900 tracking-tighter italic ">{value}</p>
 </div>
 </Card>
 );
}

function StatusIndicator({ label, status }: { label: string, status: string }) {
 return (
 <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-3">
 <p className="text-[10px] font-black text-white/30 tracking-[0.2em]">{label}</p>
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
 <span className="text-xl font-black italic italic tracking-tighter">{status}</span>
 </div>
 </div>
 );
}
