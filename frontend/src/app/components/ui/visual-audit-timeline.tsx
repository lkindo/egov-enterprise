
import { useState } from 'react';
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
 ChevronDown,
 ChevronUp,
 Cpu
} from 'lucide-react';
import { cn } from "@/lib/utils";

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

export function VisualAuditTimeline({ logs, className, title = "보안 감사 이력" }: VisualAuditTimelineProps) {
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
 case 'RESTORE': return <RotateCcw size={16} className="text-hub-blue" />;
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
 {/*
   [2026-08-29] 헤더의 상태 배지 두 줄을 걷었다. '보안 거버넌스 엔진' 이라는 구성요소도,
   '실시간 데이터 무결성 모니터링' 이라는 동작도 저장소에 없다. 방패 아이콘과 초록색까지
   붙어 보안 장치가 돌고 있다는 뜻으로 읽혔지만, 이 컴포넌트가 하는 일은 tb_sys_log
   조회 결과를 시간순으로 그리는 것뿐이다.
 */}
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
  {/*
    [2026-08-29] '필터 설정' 아이콘 버튼을 걷었다. onClick 도, 감싸는 Popover/DropdownMenu
    트리거도 없어 눌러도 아무 일이 없었다. 이 컴포넌트가 가진 조건은 위 검색 입력이 쓰는
    filter 하나뿐이라 "더 좁힐 조건" 자체가 없다. 조건이 생기면 그때 되살린다.
  */}
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
 : "bg-card border-transparent hover:bg-muted/40"
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
 <p className="text-sm font-bold text-foreground tracking-tight">
   <span className="text-primary font-bold">{log.action === 'CREATE' ? '생성' : log.action === 'UPDATE' ? '수정' : log.action === 'DELETE' ? '삭제' : '복구'}</span> {log.entityName}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-right hidden md:block">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <Clock size={12} /> {log.timestamp}
 </div>
 <p className="text-xs font-bold text-foreground font-mono mt-1 opacity-100">{log.ipAddress}</p>
 </div>
 {expandedLog === log.id ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-muted-foreground/40" />}
 </div>
 </div>

 {/* Expanded Detail: Side-by-Side Diff */}
 {expandedLog === log.id && log.changes && (
 <div className="px-8 pb-8 pt-4 border-t border-primary/5 bg-muted space-y-6 animate-in slide-in-from-top-4 duration-500">
 <h4 className="text-xs font-bold text-primary tracking-[0.3em] mb-4 flex items-center gap-2">
   <Cpu size={12} /> AI 기반 변경 감지 엔진
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {log.changes?.map((change, cIdx) => (
 <div key={cIdx} className="space-y-3 p-5 rounded-lg bg-card border border-primary/5 shadow-sm group/change">
 <label className="text-xs font-bold text-foreground tracking-tight">{change.field}</label>
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

 {/*
   [2026-08-29] 펼친 로그 아래의 액션 3개('분석 리포트 생성'·'시각화 검증'·'스냅샷 롤백')를
   걷었다. 셋 다 onClick 이 전혀 없어 눌러도 아무 일이 없었다.

   특히 '스냅샷 롤백' 은 빨간 강조로 파괴적 동작을 예고했다. 감사 이력을 되돌리는 API 는
   저장소에 없다 — 이 화면이 읽는 것은 tb_sys_log 조회 결과이고 롤백 개념 자체가 없다.
   관리자가 눌러 보고 "롤백이 됐나?" 를 판단할 수 없는 버튼이 가장 위험하다.
   되살리려면 대상 기능이 먼저 있어야 하고, 롤백은 파괴적이라 사용자 승인 경계다.
 */}
 </div>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Footer System Stats */}
 <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-primary/5">
 {/*
   [2026-08-29] 하단의 '시스템 상태' 두 줄을 걷었다.
   - '마스터 저장소 동기화됨': 그런 저장소도 동기화 상태를 계측하는 곳도 저장소에 없다.
     초록 점까지 붙어 정상 상태를 알리는 표시로 읽혔다.
   - '암호화 알고리즘 AES-256 (NIST)': **사실과 다르다.** 이 제품의 양방향 암호화는 ARIA 다
     (ProjectCryptoConfig 가 EgovARIACryptoServiceImpl 을 빈으로 등록하고 CryptoUtil 이
     그것으로 암복호화한다). 관리자가 규제 대응 근거로 읽을 수 있는 문구라 특히 위험하다.
     알고리즘을 화면에 적으려면 설정에서 파생해야 하고, 고정 문자열로 둘 값이 아니다.
 */}
 <div />
 <p className="text-xs font-bold text-foreground tracking-tight opacity-100 mt-4 md:mt-0">
 {/*
   'Total Audit Records' 도 총계가 아니었다 — 이 컴포넌트가 받는 logs 는 대시보드가
   slice(0, 5) 한 최근 5건이다. '데이터 무결성 검증 완료' 역시 그런 검증을 수행하는 코드가
   없다. 세는 대상을 그대로 말한다.
 */}
 최근 감사 이력 {logs?.length || 0}건
 </p>
 </div>
 </div>
 );
}
