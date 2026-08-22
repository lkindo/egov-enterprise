'use client';

import { useMemo, useState } from 'react';
import { Bell, Zap, RefreshCw, Layers, Search, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/lib/hooks/use-notifications';

interface Notification {
  id: number;
  title: string;
  content: string;
  time: string;
  type: 'security' | 'system' | 'message' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'read' | 'archived';
}

const NOTIFICATION_TABS = [
  { id: 'all', label: '전체 알림' },
  { id: 'unread', label: '읽지 않은 알림' },
  { id: 'critical', label: '중요 알림' },
] as const;

export function SmartNotificationHub() {
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'unread'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 실제 알림 API(/notifications)를 헤더 드로어와 동일한 useNotifications 훅으로 연결.
  // (과거엔 SAMPLE_NOTIFICATIONS 하드코딩이라 새로 생성한 알림이 검색/목록에 절대 안 나타났음.)
  const { notifications: rawNotifications, error, refresh } = useNotifications();
  const notifications = useMemo<Notification[]>(
    () =>
      (rawNotifications || []).map((n) => ({
        id: n.notiSn,
        title: n.notiTtlNm,
        content: n.notiCn,
        time: n.notiDt,
        type:
          n.type === 'SECURITY' ? 'security'
          : n.type === 'SYSTEM' ? 'system'
          : n.type === 'INFO' ? 'alert'
          : 'message',
        priority: n.type === 'SECURITY' ? 'critical' : n.type === 'SYSTEM' ? 'medium' : 'low',
        status: n.readYn === 'Y' ? 'read' : 'new',
      })),
    [rawNotifications],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchKeyword = n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchTab = activeTab === 'all' || 
                       (activeTab === 'critical' && n.priority === 'critical') ||
                       (activeTab === 'unread' && n.status === 'new');
      return matchKeyword && matchTab;
    });
  }, [notifications, searchKeyword, activeTab]);

  const columns: Column<Notification>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '분류',
      accessor: (n) => (
        <div className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase",
          n.type === 'security' ? "bg-rose-500/10 text-rose-600" :
          n.type === 'system' ? "bg-hub-indigo/10 text-hub-indigo" :
          n.type === 'message' ? "bg-emerald-500/10 text-emerald-600" :
          "bg-amber-500/10 text-amber-600"
        )}>
          {n.type}
        </div>
      ),
      className: 'w-24'
    },
    {
      header: '알림 제목',
      accessor: (n) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            {n.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {n.title}
            </span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate max-w-md">{n.content}</p>
        </div>
      )
    },
    {
      header: '우선순위',
      accessor: (n) => (
        <span className={cn(
          "text-[10px] font-black tracking-widest uppercase",
          n.priority === 'critical' ? "text-rose-600" :
          n.priority === 'high' ? "text-rose-400" :
          n.priority === 'medium' ? "text-hub-indigo" : "text-muted-foreground"
        )}>
          {n.priority}
        </span>
      ),
      className: 'w-24'
    },
    {
      header: '발생 일시',
      accessor: (n) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{n.time}</span>
      ),
      className: 'w-40'
    },
    {
      header: '관리',
      accessor: () => (
        <div className="flex items-center justify-end pr-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="알림 옵션 (미지원)"
            title="개별 알림 옵션은 아직 연결되지 않았습니다."
            className="w-10 h-10 rounded-lg"
            disabled
          >
            <MoreVertical size={16} className="text-muted-foreground" />
          </Button>
        </div>
      ),
      className: 'w-20 text-right'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <HubHeader
        title="알림"
        highlight="목록"
        subtitle="현재 계정의 알림 API 응답과 연결 상태를 확인합니다."
        icon={Bell}
        actions={
          <div className="flex gap-3">
             <div className="flex bg-muted p-1 rounded-xl border border-border/50">
               {NOTIFICATION_TABS.map((tab) => (
                 <Button
                   key={tab.id}
                   variant="ghost"
                   size="sm"
                   aria-label={`${tab.label} 필터`}
                   aria-pressed={activeTab === tab.id}
                   className={cn(
                     "h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all",
                     activeTab === tab.id ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
                   )}
                   onClick={() => setActiveTab(tab.id)}
                 >
                   {tab.label}
                 </Button>
               ))}
             </div>
             <Button
               variant="outline"
               size="icon"
               aria-label="알림 목록 새로고침"
               className="h-10 w-10 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
               onClick={refresh}
             >
                <RefreshCw size={18} />
             </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 알림" value={notifications.length} icon={Layers} color="primary" />
        <HubMetricCard title="미열람" value={notifications.filter(n => n.status === 'new').length} icon={Zap} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="알림 목록"
        description="알림 API가 반환한 항목입니다. 조회 실패는 빈 목록과 구분해 표시합니다."
        icon={Bell}
        className="bg-card/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <div className="relative group max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <Input 
                aria-label="알림 제목 또는 내용 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
                placeholder="알림 제목 또는 내용 검색"
              />
            </div>
          </div>

          <div className="min-h-[400px]">
            <StandardDataTable
              columns={columns}
              data={filteredNotifications}
              emptyMessage="표시할 알림이 없습니다."
              error={error}
              onRetry={refresh}
              isPremium={true}
              className="border-none bg-transparent shadow-none"
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
