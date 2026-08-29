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
  /**
   * 분류. 서버가 저장하는 값이 아니라 **제목 키워드에서 추론**한다
   * (use-notifications: 제목에 '보안'/'시스템' 포함 여부, 그 밖은 활동).
   * NotificationDto 에는 분류 필드 자체가 없다.
   */
  type: 'security' | 'system' | 'message' | 'alert';
  status: 'new' | 'read' | 'archived';
}

const NOTIFICATION_TABS = [
  { id: 'all', label: '전체 알림' },
  { id: 'unread', label: '읽지 않은 알림' },
  // [2026-08-29] '중요 알림' → '보안 알림'. 종전 탭은 priority === 'critical' 로 걸렀는데
  //   그 값은 분류에서 한 번 더 파생된 것이라 결국 분류가 보안인 알림과 완전히 같았다.
  //   없는 심각도를 만들지 말고 실제로 거르는 축을 그대로 이름에 쓴다.
  { id: 'security', label: '보안 알림' },
] as const;

export function SmartNotificationHub() {
  const [activeTab, setActiveTab] = useState<'all' | 'security' | 'unread'>('all');
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
        // [2026-08-29] priority 를 걷었다. 서버는 우선순위를 저장하지 않는다
        //   (NotificationDto: notiSn·notiTtlNm·notiCn·notiDt·notiIvlVal·rcvrId·readYn·linkUrl·crtDt).
        //   종전 값은 제목 키워드 → 분류 → 우선순위로 **두 단계 파생**한 것이라, 제목에 '보안' 이
        //   없는 긴급 알림은 언제나 'low' 로 보였다. 심각도를 판단해 준 적이 없는데 판단한 것처럼
        //   보여 주면 관리자가 그 열로 분류(triage)한다.
        status: n.readYn === 'Y' ? 'read' : 'new',
      })),
    [rawNotifications],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchKeyword = n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchTab = activeTab === 'all' || 
                       (activeTab === 'security' && n.type === 'security') ||
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
      // 헤더에 판정 근거를 밝힌다 — 서버가 분류를 저장하지 않고 제목에서 추론하므로,
      // 제목에 키워드가 없는 알림은 '활동' 으로 떨어진다. 그 사실을 모르면 관리자가
      // 이 열로 거르다 놓친다.
      header: '분류(제목 기준)',
      accessor: (n) => (
        <div className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-tight",
          n.type === 'security' ? "bg-rose-500/10 text-rose-600" :
          n.type === 'system' ? "bg-hub-indigo/10 text-hub-indigo" :
          n.type === 'message' ? "bg-emerald-500/10 text-emerald-600" :
          "bg-amber-500/10 text-amber-600"
        )}>
          {n.type === 'security' ? '보안' : n.type === 'system' ? '시스템' : n.type === 'alert' ? '안내' : '활동'}
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
