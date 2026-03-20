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
  Bell,
  Zap,
  LogIn,
  Cpu,
  HardDrive,
  Server,
  Download,
  Trash2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { auditAdminService } from '@/services/admin/system/AuditAdminService';
import { commentAdminService } from '@/services/admin/system/CommentAdminService';
import { systemLogAdminService } from '@/services/admin/system/SystemLogAdminService';
import { motion, AnimatePresence } from 'framer-motion';

type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS';

export default function MonitoringHubClient({ defaultTab = 'SECURITY' }: { defaultTab?: MonitoringTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MonitoringTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

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
    if (activeTab === 'SECURITY') return auditLogs.find(l => l.histId === selectedItemId);
    if (activeTab === 'SYSTEM') return systemLogs.find(l => l.requstId === selectedItemId);
    if (activeTab === 'LOGIN') return loginLogs.find(l => l.logId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, auditLogs, systemLogs, loginLogs, comments]);

  const renderGenericList = (items: any[], idKey: string, titleKey: string, subKey: string, dateKey: string, icon: React.ReactNode) => (
    <div className="space-y-3">
      {items.map((item) => (
        <div 
          key={item[idKey]}
          onClick={() => setSelectedItemId(item[idKey])}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
            selectedItemId === item[idKey] 
              ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02] dark:bg-primary dark:border-primary" 
              : "bg-card border-border/50 hover:border-primary/50 text-muted-foreground"
          )}
        >
          <div className="flex items-start gap-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
              selectedItemId === item[idKey] ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={cn("text-[8px] font-black tracking-tight", selectedItemId === item[idKey] ? "text-white/80" : "text-primary")}>
                  {item[titleKey]}
                </span>
                <span className="text-[8px] font-bold opacity-40">{item[dateKey]}</span>
              </div>
              <h4 className={cn("text-sm font-black italic", selectedItemId === item[idKey] ? "text-white" : "text-foreground tracking-tight truncate max-w-[200px]")}>
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
              ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02] dark:bg-primary dark:border-primary" 
              : "bg-card border-border/50 hover:border-primary/50 text-muted-foreground"
          )}
        >
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <MessageSquare size={20} />
            </div>
            <div className="space-y-1">
              <h4 className={cn("text-sm font-black italic", selectedItemId === c.commentNo ? "text-white" : "text-foreground tracking-tight")}>{c.commentCn}</h4>
              <p className="text-[8px] font-black tracking-tight opacity-40">작성자: {c.wrterNm}</p>
            </div>
          </div>
          {selectedItemId === c.commentNo && (
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(c.commentNo); }} className="text-white hover:bg-white/10">
              <Trash2 size={16} />
            </Button>
          )}
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

      <Card className="rounded-[3rem] border-0 bg-slate-900 text-white dark:bg-card dark:text-foreground p-12 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-all rotate-12">
          <Zap size={240} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
            <h3 className="text-2xl font-black italic tracking-tighter">시스템 코어 상태: 가동 중</h3>
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
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl skew-x-2 dark:bg-slate-100 dark:text-slate-900">
            <Activity size={28} className="text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-foreground tracking-tighter italic leading-none">
              모니터링 통합 허브
            </h2>
            <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 italic">
              통합 거버넌스 및 관찰 센터
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
            <Download size={18} /> 스냅샷
          </Button>
          <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white dark:bg-primary dark:text-white font-black tracking-tight shadow-xl hover:-translate-y-1 transition-all gap-2">
            <Bell size={20} /> 알림 규칙
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2 min-h-[800px]">
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-card border-2 border-border p-4 rounded-[3rem] shadow-sm overflow-hidden flex flex-col gap-2">
            <NavButton icon={<ShieldAlert size={20} />} label="보안 감사" active={activeTab === 'SECURITY'} onClick={() => { setActiveTab('SECURITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Terminal size={20} />} label="시스템 로그" active={activeTab === 'SYSTEM'} onClick={() => { setActiveTab('SYSTEM'); setSelectedItemId(null); }} />
            <NavButton icon={<LogIn size={20} />} label="로그인 기록" active={activeTab === 'LOGIN'} onClick={() => { setActiveTab('LOGIN'); setSelectedItemId(null); }} />
            <NavButton icon={<Activity size={20} />} label="시스템 가동성" active={activeTab === 'OBSERVABILITY'} onClick={() => { setActiveTab('OBSERVABILITY'); setSelectedItemId(null); }} />
            <NavButton icon={<MessageSquare size={20} />} label="댓글 관리" active={activeTab === 'COMMENTS'} onClick={() => { setActiveTab('COMMENTS'); setSelectedItemId(null); }} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1 bg-card border-2 border-border rounded-[3.5rem] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-muted/30 border-b p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.4em] italic leading-tight">
                  센티넬 로그 스트림 (통합)
                </h3>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-8 text-[9px] font-black tracking-tight gap-2">
                  <RefreshCcw size={12} /> 동기화
                </Button>
              </div>
              {activeTab !== 'OBSERVABILITY' && (
                <div className="flex gap-4">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input 
                      className="pl-12 h-14 bg-background border-border rounded-2xl text-sm font-bold shadow-sm" 
                      placeholder="로그 검색..." 
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="h-14 w-14 rounded-2xl"><Filter size={20} /></Button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {activeTab === 'OBSERVABILITY' ? renderObservability() : 
                   activeTab === 'COMMENTS' ? renderCommentList() : 
                   activeTab === 'SECURITY' ? renderGenericList(auditLogs, 'histId', 'sysNm', 'histCn', 'frstRegisterPnttm', <ShieldAlert size={20} />) :
                   activeTab === 'SYSTEM' ? renderGenericList(systemLogs, 'requstId', 'srvcNm', 'methodNm', 'occcrrncDe', <Terminal size={20} />) :
                   renderGenericList(loginLogs, 'logId', 'loginId', 'loginMthd', 'creatDt', <LogIn size={20} />)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

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
                <div className="flex-1 bg-card border-2 border-border rounded-[3.5rem] shadow-sm flex flex-col overflow-hidden relative">
                  <div className="bg-muted/30 p-10 border-b">
                    <h2 className="text-2xl font-black text-foreground tracking-tighter italic leading-tight">
                      로그 상세 정보 #{selectedItemId}
                    </h2>
                  </div>
                  <div className="flex-1 p-10 space-y-8 overflow-y-auto">
                    <pre className="text-[10px] font-mono p-6 bg-muted rounded-2xl border border-border/50 overflow-x-auto text-foreground">
                      {JSON.stringify(selectedItem, null, 2)}
                    </pre>
                    <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black tracking-tight text-[11px] shadow-xl uppercase italic">
                      관리 작업 실행
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center select-none bg-card rounded-[3.5rem] border-2 border-dashed border-border/50">
                <Activity size={64} className="mb-8 text-muted-foreground/30 animate-pulse" />
                <h3 className="text-2xl font-black text-muted-foreground tracking-tighter italic uppercase">Monitoring Idle</h3>
                <p className="text-xs text-muted-foreground/60 mt-2">왼쪽 리스트에서 로그를 선택하여 관찰하십시오.</p>
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
        "w-full group p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-xl dark:bg-primary dark:border-primary" 
          : "bg-card border-transparent hover:border-primary/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
        active ? "bg-white/10 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <span className="text-[11px] font-black tracking-tight italic">{label}</span>
    </button>
  );
}

function MetricCard({ icon, label, value, subtitle }: { icon: React.ReactNode, label: string, value: string, subtitle: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-card border-2 border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shadow-lg border border-border">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-muted-foreground tracking-tight flex items-center gap-2 mb-1">{label}</p>
        <p className="text-3xl font-black text-foreground tracking-tighter italic">{value}</p>
      </div>
    </div>
  );
}

function StatusIndicator({ label, status }: { label: string, status: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 dark:bg-muted/50 border border-white/10 dark:border-border space-y-3">
      <p className="text-[10px] font-black text-white/40 dark:text-muted-foreground tracking-[0.2em]">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xl font-black italic tracking-tighter text-white dark:text-foreground">{status}</span>
      </div>
    </div>
  );
}
