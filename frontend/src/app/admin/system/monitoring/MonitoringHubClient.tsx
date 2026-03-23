'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { 
  Activity, 
  ShieldAlert, 
  Terminal, 
  MessageSquare, 
  Search, 
  Filter, 
  RefreshCcw, 
  Bell,
  Zap,
  LogIn,
  Cpu,
  HardDrive,
  Server,
  Download,
  Trash2,
  Clock,
  ShieldCheck,
  ChevronRight,
  MonitorCheck,
  Globe,
  Database,
  SearchCode,
  Network,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { auditAdminService } from '@/services/admin/system/AuditAdminService';
import { commentAdminService } from '@/services/admin/system/CommentAdminService';
import { systemLogAdminService } from '@/services/admin/system/SystemLogAdminService';
import { motion, AnimatePresence } from 'framer-motion';

import { useRouter, useSearchParams } from 'next/navigation';

type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS';

export default function MonitoringHubClient({ defaultTab = 'SECURITY' }: { defaultTab?: MonitoringTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL 쿼리 파라미터에서 탭 정보를 가져오거나 기본값을 사용합니다. (매핑 보강)
  const rawTab = searchParams.get('tab')?.toUpperCase();
  const queryTab = (rawTab === 'HEALTH' ? 'OBSERVABILITY' : rawTab === 'POLICY' ? 'LOGIN' : rawTab) as MonitoringTab;
  
  const activeTab = (queryTab && ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY', 'COMMENTS'].includes(queryTab)) 
    ? queryTab 
    : defaultTab;

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  const setActiveTab = (tab: MonitoringTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab.toLowerCase());
    router.push(`/admin/system/monitoring/hub?${params.toString()}`, { scroll: false });
    setSelectedItemId(null);
  };

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit-logs', searchKeyword],
    queryFn: () => auditAdminService.getAuditLogs({ page: 0, size: 50, keyword: searchKeyword }),
    enabled: activeTab === 'SECURITY'
  });
  const auditLogs = auditData?.list || [];

  const { data: systemLogData } = useQuery({
    queryKey: ['admin-system-logs', searchKeyword],
    queryFn: () => systemLogAdminService.getSystemLogs({ page: 0, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'SYSTEM'
  });
  const systemLogs = systemLogData?.list || [];

  const { data: loginLogData } = useQuery({
    queryKey: ['admin-login-logs', searchKeyword],
    queryFn: () => systemLogAdminService.getLoginLogs({ page: 0, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'LOGIN'
  });
  const loginLogs = loginLogData?.list || [];

  const { data: commentData } = useQuery({
    queryKey: ['admin-comments', searchKeyword],
    queryFn: () => commentAdminService.getComments({ page: 0, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'COMMENTS'
  });
  const comments = commentData?.list || [];

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => commentAdminService.deleteComment(id),
    onSuccess: () => {
      toast('댓글이 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      if (selectedItemId) setSelectedItemId(null);
    }
  });

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'COMMENTS') return comments.find(c => c.commentNo === selectedItemId);
    const idStr = String(selectedItemId);
    if (activeTab === 'SECURITY') return auditLogs.find(l => String(l.histId) === idStr);
    if (activeTab === 'SYSTEM') return systemLogs.find(l => String(l.requstId) === idStr);
    if (activeTab === 'LOGIN') return loginLogs.find(l => String(l.logId) === idStr);
    return null;
  }, [selectedItemId, activeTab, auditLogs, systemLogs, loginLogs, comments]);

  const renderGenericList = (items: any[], idKey: string, titleKey: string, subKey: string, dateKey: string, icon: React.ReactNode) => (
    <div className="space-y-4">
      {items.map((item) => (
        <div 
          key={item[idKey]}
          onClick={() => setSelectedItemId(item[idKey])}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between overflow-hidden relative",
            selectedItemId === item[idKey] 
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
              : "bg-white border-slate-100 hover:border-primary/50 text-slate-600 shadow-sm"
          )}
        >
          <div className="flex items-start gap-6 relative z-10">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6 duration-500",
              selectedItemId === item[idKey] ? "bg-white/10 text-white" : "bg-primary/5 text-primary"
            )}>
              {icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={cn("text-[9px] font-black tracking-widest uppercase", selectedItemId === item[idKey] ? "text-white/40" : "text-primary/60")}>
                  {item[titleKey]}
                </span>
                <span className={cn("text-[9px] font-bold opacity-30 italic", selectedItemId === item[idKey] ? "text-white/40" : "")}>{item[dateKey]}</span>
              </div>
              <h4 className={cn("text-md font-black tracking-tighter truncate max-w-[280px]", selectedItemId === item[idKey] ? "text-white" : "text-foreground")}>
                {item[subKey]}
              </h4>
            </div>
          </div>
          <ChevronRight size={18} className={cn("transition-transform duration-500 relative z-10", selectedItemId === item[idKey] ? "rotate-90 text-primary" : "text-slate-200")} />
          
          {selectedItemId === item[idKey] && (
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
          )}
        </div>
      ))}
    </div>
  );

  const renderCommentList = () => (
    <div className="space-y-4">
      {comments.map((c) => (
        <div 
          key={c.commentNo}
          onClick={() => setSelectedItemId(c.commentNo)}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between overflow-hidden relative",
            selectedItemId === c.commentNo 
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
              : "bg-white border-slate-100 hover:border-indigo-500/50 text-slate-600 shadow-sm"
          )}
        >
          <div className="flex items-start gap-6 relative z-10">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6 duration-500",
              selectedItemId === c.commentNo ? "bg-white/10 text-white" : "bg-indigo-500/5 text-indigo-600"
            )}>
              <MessageSquare size={22} />
            </div>
            <div className="space-y-1">
              <h4 className={cn("text-md font-black tracking-tighter", selectedItemId === c.commentNo ? "text-white" : "text-foreground")}>{c.commentCn}</h4>
              <p className={cn("text-[9px] font-black opacity-40 uppercase tracking-[0.3em] mt-1")}>AUTHOR: {c.wrterNm}</p>
            </div>
          </div>
          {selectedItemId === c.commentNo ? (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(c.commentNo); }} 
                className="text-white bg-rose-500/20 hover:bg-rose-500/40 rounded-xl transition-all relative z-10"
            >
              <Trash2 size={18} />
            </Button>
          ) : (
            <ChevronRight size={18} className="text-slate-200" />
          )}
          
          {selectedItemId === c.commentNo && (
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
          )}
        </div>
      ))}
    </div>
  );

  const renderObservability = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-2 gap-6">
        <HubMetricCard title="CPU_부하" value="12.4%" icon={Cpu} color="emerald" status="최적" />
        <HubMetricCard title="메모리_할당" value="54.8GB" icon={HardDrive} color="primary" status="정상" />
        <HubMetricCard title="트래픽_처리량" value="240 r/s" icon={Zap} color="amber" />
        <HubMetricCard title="DB_지연시간" value="15.2ms" icon={Database} color="indigo" status="안정" />
      </div>

      <div className="rounded-[3rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group border-none">
        <div className="absolute top-0 right-0 p-16 opacity-10 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
          <Zap size={200} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-12">
          <div className="flex items-center gap-6">
            <div className="w-5 h-5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
            <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">코어 엔진: 정상 가동 중</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StatusIndicator label="API Microservices" status="온라인" icon={Network} />
            <StatusIndicator label="PostgreSQL Cluster" status="동기화됨" icon={Database} />
            <StatusIndicator label="Redis Cache Fabric" status="안정" icon={CheckCircle2} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="시스템 인텔리전스 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '모니터링 허브' }]}
      />

      <HubHeader 
        title="센티넬" 
        highlight="인텔리전스" 
        subtitle="전사 인프라 로깅 프로토콜 및 실시간 데이터 무결성 관찰 시스템" 
        icon={Activity} 
        actions={
          <div className="flex gap-4 p-2">
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-black text-[10px] tracking-widest uppercase gap-3 hover:bg-slate-50 transition-all">
              <Download size={18} /> 리포트 스냅샷
            </Button>
            <Button size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3">
              <Bell size={20} /> 알림 정책
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 px-2 min-h-[900px]">
        {/* --- Navigation Side Panel --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8 h-fit lg:sticky lg:top-8">
          <div className="rounded-[3rem] p-4 bg-white/40 backdrop-blur-xl border-2 border-slate-100 shadow-xl space-y-3">
            <NavButton icon={<ShieldAlert size={22} />} label="보안 감사 매트릭스" active={activeTab === 'SECURITY'} onClick={() => { setActiveTab('SECURITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Terminal size={22} />} label="시스템 로그 엔진" active={activeTab === 'SYSTEM'} onClick={() => { setActiveTab('SYSTEM'); setSelectedItemId(null); }} />
            <NavButton icon={<LogIn size={22} />} label="인증 접속 히스토리" active={activeTab === 'LOGIN'} onClick={() => { setActiveTab('LOGIN'); setSelectedItemId(null); }} />
            <NavButton icon={<MonitorCheck size={22} />} label="인프라 가동성 정보" active={activeTab === 'OBSERVABILITY'} onClick={() => { setActiveTab('OBSERVABILITY'); setSelectedItemId(null); }} />
            <NavButton icon={<MessageSquare size={22} />} label="서비스 피드백 관리" active={activeTab === 'COMMENTS'} onClick={() => { setActiveTab('COMMENTS'); setSelectedItemId(null); }} />
          </div>

          <div className="bg-slate-900 text-white rounded-[3rem] p-10 space-y-6 text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-inner transition-transform hover:rotate-12 duration-500">
              <ShieldCheck size={40} className="text-primary" />
            </div>
            <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tighter uppercase">감사 프로토콜</h4>
                <p className="text-[9px] font-black text-white/30 tracking-[0.4em] uppercase">보안 수준: 최상</p>
            </div>
            <div className="flex justify-center gap-2 opacity-20 mt-2">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          </div>
        </div>

        {/* --- Central Intelligence Stream --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 h-full">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-2xl flex-1 flex flex-col p-12 space-y-10 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">센티넬 스트림</h3>
                <p className="text-2xl font-black tracking-tighter text-foreground uppercase">데이터 인베스티게이션</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => queryClient.invalidateQueries()} 
                className="h-14 w-14 rounded-2xl bg-slate-50 hover:bg-primary hover:text-white transition-all shadow-inner group"
              >
                <RefreshCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
              </Button>
            </div>
            
            {activeTab !== 'OBSERVABILITY' && (
              <div className="relative group/search relative z-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input 
                  className="pl-16 h-16 bg-slate-50 border-none rounded-[1.25rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30" 
                  placeholder="로그 객체 필터링..." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                >
                  {activeTab === 'OBSERVABILITY' ? renderObservability() : 
                  activeTab === 'COMMENTS' ? renderCommentList() : 
                  activeTab === 'SECURITY' ? renderGenericList(auditLogs, 'histId', 'sysNm', 'histCn', 'frstRegisterPnttm', <ShieldAlert size={22} />) :
                  activeTab === 'SYSTEM' ? renderGenericList(systemLogs, 'requstId', 'srvcNm', 'methodNm', 'occcrrncDe', <Terminal size={22} />) :
                  renderGenericList(loginLogs, 'logId', 'loginId', 'loginMthd', 'creatDt', <LogIn size={22} />)}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* --- Precision Detail Analysis --- */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId ? (
              <motion.div 
                key={selectedItemId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.6, ease: "backOut" }}
                className="h-full"
              >
                <div className="rounded-[3.5rem] bg-white border-2 border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-14 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="border-b border-slate-100 pb-12 relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                        <h3 className="text-[10px] font-black text-muted-foreground/40 tracking-[0.5em] uppercase">인스턴스 메타데이터</h3>
                    </div>
                    <h2 className="text-4xl font-black text-foreground tracking-tighter leading-none mb-4 uppercase">
                        객체 상세 분석
                    </h2>
                    <p className="text-xs font-mono font-black text-primary/60 tracking-widest uppercase">로그 고유 식별자: {selectedItemId}</p>
                  </div>
                  
                  <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                    <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] shadow-inner relative overflow-hidden group">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-slate-700 leading-relaxed font-black relative z-10 italic">
                        {JSON.stringify(selectedItem, null, 2)}
                      </pre>
                      <SearchCode size={120} className="absolute right-0 bottom-0 p-8 text-slate-200/50 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000" />
                    </div>
                  </div>

                  <div className="pt-12 mt-auto border-t border-slate-100 space-y-8 relative z-10">
                    <div className="flex items-center justify-between px-6">
                       <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase">결정 매트릭스</span>
                       <Activity size={20} className="text-primary animate-pulse" />
                    </div>
                    <Button className="w-full h-18 bg-slate-900 text-white rounded-[1.5rem] font-black tracking-[0.4em] text-[11px] shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 uppercase group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      유지보수 파이프라인 실행
                    </Button>
                  </div>
                  
                  <div className="absolute left-0 top-0 w-full h-2 bg-primary/10" />
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40 select-none grayscale rounded-[3.5rem] border-4 border-dashed border-slate-100 bg-slate-50/50 group transition-all hover:bg-white hover:border-primary/20 duration-1000">
                <div className="w-24 h-24 rounded-3xl bg-white border-2 border-slate-100 flex items-center justify-center mb-10 shadow-xl group-hover:rotate-12 transition-transform duration-700">
                    <Activity size={100} className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </div>
                <h3 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-4">인텔리전스 대기 중</h3>
                <p className="text-[10px] font-black text-muted-foreground/30 tracking-[0.6em] uppercase leading-relaxed max-w-xs">분석할 로그 객체를 스트림에서 캡처하십시오</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full group p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-6",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10 shadow-slate-200" 
          : "bg-transparent border-transparent hover:bg-white hover:border-slate-100 text-slate-400 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
        active ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-black tracking-widest uppercase text-left leading-tight ">{label}</span>
    </button>
  );
}

function StatusIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-6 group hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">{label}</p>
          <Icon size={16} className="text-white/20 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-pulse" />
        <span className="text-2xl font-black tracking-tighter text-white uppercase">{status}</span>
      </div>
    </div>
  );
}
