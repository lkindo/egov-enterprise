
import React, { useState } from 'react';
import {
 History as HistoryIcon,
 User,
 Clock,
 ArrowRight,
 FileEdit,
 AlertCircle,
 ShieldCheck,
 RotateCcw,
 Search,
 Filter,
 ChevronDown,
 ChevronUp,
 Cpu,
 Monitor
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface AuditLog {
 id: string;
 action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
 entityName: string;
 performedBy: string;
 timestamp: string;
 ipAddress: string;
 changes?: {
 field: string;
 before: string;
 after: string;
 }[];
 severity: 'low' | 'medium' | 'high';
}

interface VisualAuditTimelineProps {
 logs: AuditLog[];
 className?: string;
 title?: string;
}

export function VisualAuditTimeline({ logs, className, title = "Security Audit Intelligence" }: VisualAuditTimelineProps) {
  const [expandedLog, setExpandedLog] = useState<string | null>(logs?.[0]?.id || null);
  const [filter, setFilter] = useState<string>('');

  const filteredLogs = (logs || []).filter(Boolean).filter(log =>
    String(log.entityName || '').toLowerCase().includes((filter || '').toLowerCase()) ||
    String(log.performedBy || '').toLowerCase().includes((filter || '').toLowerCase())
  );

 const getSeverityColor = (severity: string) => {
 switch (severity) {
 case 'high': return 'text-rose-700 bg-rose-50 border-rose-200';
 case 'medium': return 'text-amber-800 bg-amber-50 border-amber-200';
 default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
 }
 };

 const getActionIcon = (action: string) => {
 switch (action) {
 case 'CREATE': return <ShieldCheck size={16} className="text-emerald-500" />;
 case 'DELETE': return <AlertCircle size={16} className="text-rose-500" />;
 case 'RESTORE': return <RotateCcw size={16} className="text-blue-500" />;
 default: return <FileEdit size={16} className="text-amber-500" />;
 }
 };

 return (
 <div className={cn("flex flex-col gap-8 bg-card border-2 border-primary/5 rounded-lg p-10 shadow-2xl", className)}>
 {/* Header Intelligence */}
 <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-primary/5">
 <div className="flex items-center gap-5">
 <div className="p-4 bg-primary/10 rounded-lg text-primary shadow-inner">
 <HistoryIcon size={28} className="animate-spin-slow" />
 </div>
 <div>
 <h2 className="text-2xl font-bold tracking-tighter text-foreground ">{title}</h2>
 <div className="flex items-center gap-3 mt-1">
 <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 tracking-tight">
   <ShieldCheck size={12} /> 보안 거버넌스 엔진 활성
 </div>
 <div className="h-3 w-px bg-muted" />
   <span className="text-xs font-bold text-slate-700 tracking-tight leading-none opacity-100">실시간 데이터 무결성 모니터링</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 w-full md:w-auto">
 <div className="relative flex-1 md:w-64">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
 <input
 className="w-full bg-muted/40 border-none rounded-lg py-3 pl-12 pr-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all"
 placeholder="검색.."
 aria-label="감사 로그 검색"
 value={filter}
 onChange={(e) => setFilter(e.target.value)}
 />
 </div>
  <Button variant="outline" size="icon" className="rounded-lg border-2 h-11 w-11 hover:text-primary hover:bg-primary/5" aria-label="필터 설정"><Filter size={18} /></Button>
 </div>
 </div>

 {/* Timeline Stream */}
 <div className="relative space-y-8 pl-10 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-1 before:bg-gradient-to-b before:from-primary/20 before:via-primary/5 before:to-transparent before:rounded-lg">
 {filteredLogs.map((log, idx) => (
 <div
 key={log.id}
 className={cn(
 "relative transition-all duration-700 animate-in fade-in slide-in-from-left-4",
 expandedLog === log.id ? "scale-100" : "hover:scale-[1.02]"
 )}
 style={{ animationDelay: `${idx * 100}ms` }}
 >
 {/* Timeline Node Icon */}
 <div className={cn(
 "absolute -left-10 top-0 w-8 h-8 rounded-lg border-4 border-card flex items-center justify-center shadow-lg transition-transform duration-500",
 expandedLog === log.id ? "bg-primary text-white scale-125 ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
 )}>
 {getActionIcon(log.action)}
 </div>

 {/* Log Card */}
 <div
 onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
 onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setExpandedLog(expandedLog === log.id ? null : log.id);
    }
 }}
 role="button"
 tabIndex={0}
 aria-expanded={expandedLog === log.id}
 className={cn(
 "group cursor-pointer rounded-lg border-2 transition-all overflow-hidden outline-none focus:ring-2 focus:ring-primary",
 expandedLog === log.id
 ? "bg-card border-primary/20 shadow-xl"
 : "bg-white dark:bg-slate-800 border-transparent hover:bg-muted/40"
 )}
 >
 <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <User size={20} className="text-muted-foreground" />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <span className="text-sm font-bold text-foreground">{log.performedBy}</span>
 <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border", getSeverityColor(log.severity || 'low'))}>
 {(log.severity || 'low').toUpperCase()}
 </span>
 </div>
 <p className="text-sm font-bold text-slate-700 tracking-tight">
   <span className="text-primary font-bold">{log.action === 'CREATE' ? '생성' : log.action === 'UPDATE' ? '수정' : log.action === 'DELETE' ? '삭제' : '복구'}</span> {log.entityName}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-right hidden md:block">
 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
 <Clock size={12} /> {log.timestamp}
 </div>
 <p className="text-xs font-bold text-slate-700 font-mono mt-1 opacity-100">{log.ipAddress}</p>
 </div>
 {expandedLog === log.id ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-muted-foreground/40" />}
 </div>
 </div>

 {/* Expanded Detail: Side-by-Side Diff */}
 {expandedLog === log.id && log.changes && (
 <div className="px-8 pb-8 pt-4 border-t border-primary/5 bg-slate-100 dark:bg-slate-900 space-y-6 animate-in slide-in-from-top-4 duration-500">
 <h4 className="text-xs font-bold text-primary tracking-[0.3em] mb-4 flex items-center gap-2">
   <Cpu size={12} /> AI 기반 변경 감지 엔진
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {log.changes?.map((change, cIdx) => (
 <div key={cIdx} className="space-y-3 p-5 rounded-lg bg-white border border-primary/5 shadow-sm group/change">
 <label className="text-xs font-bold text-slate-700 tracking-tight">{change.field}</label>
 <div className="flex items-center gap-4">
 <div className="flex-1 p-3 rounded-lg bg-rose-50/80 border border-rose-100/50 text-sm font-medium text-rose-900 line-through decoration-rose-400 opacity-100">
 {change.before}
 </div>
 <ArrowRight size={14} className="text-muted-foreground/30 animate-pulse" />
 <div className="flex-1 p-3 rounded-lg bg-emerald-50 border border-emerald-100/50 text-sm font-bold text-emerald-800 transition-all group-hover/change:bg-emerald-100">
 {change.after}
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-primary/5">
 <Button variant="ghost" size="sm" className="rounded-lg font-bold h-10 px-6 gap-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700">
 분석 리포트 생성
 </Button>
  <Button variant="outline" size="sm" className="rounded-lg font-bold h-10 px-6 gap-2 border-2 hover:text-primary hover:bg-primary/5">
  <Monitor size={16} /> 시각화 검증 </Button>
 <Button size="sm" className="rounded-lg font-bold h-10 px-8 gap-2 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200">
 <RotateCcw size={16} /> 스냅샷 롤백
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Footer System Stats */}
 <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-primary/5">
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-lg bg-emerald-500" />
   <span className="text-xs font-bold text-slate-700 tracking-tight">마스터 저장소 동기화됨</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-lg bg-blue-500 animate-pulse" />
   <span className="text-xs font-bold text-slate-700 tracking-tight">암호화 알고리즘 AES-256 (NIST)</span>
 </div>
 </div>
 <p className="text-xs font-bold text-slate-700 tracking-tight opacity-100 mt-4 md:mt-0">
 Total Audit Records: {logs?.length || 0} 데이터 무결성 검증 완료
 </p>
 </div>
 </div>
 );
}
