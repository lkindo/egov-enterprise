'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { TrendingUp, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface RealTimeStats {
  activeUsers: number;
  visitsPerMinute: number;
  newPosts: number;
  newPostsAvailable: boolean;
  /** 그 집계 포트 구현이 이 구성에 있는지(Phase 2 9단계). false 면 그 기능이 빠진 구성이라 카드를 그리지 않는다. */
  newPostsProvided: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStats(body: string): RealTimeStats | null {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) return null;
    const keys = ['activeUsers', 'visitsPerMinute', 'newPosts'] as const;
    if (!keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)) {
      return null;
    }
    const flagKeys = ['newPostsAvailable', 'newPostsProvided'] as const;
    if (flagKeys.some((key) => value[key] !== undefined && typeof value[key] !== 'boolean')) {
      return null;
    }
    // 기존 서버의 숫자만 있는 프레임도 읽는다. 새 서버는 조회 실패를 명시적으로 false로 보낸다.
    // provided 키가 없는 프레임(구서버)은 집계 구현이 있다고 읽는다 — 종전 화면 그대로다.
    // [2026-10-20] 전 사용자의 읽지 않은 알림 합계(alerts·alertsAvailable·alertsProvided)는 읽지 않는다 — 그 카드를 걷었다.
    return {
      ...Object.fromEntries(keys.map((key) => [key, value[key]])),
      newPostsAvailable: value.newPostsAvailable !== false,
      newPostsProvided: value.newPostsProvided !== false,
    } as RealTimeStats;
  } catch {
    return null;
  }
}

/**
 * 업무 홈 '실시간 상태' 구역의 본문 — 통계 방송(/topic/dashboard/stats) 하나만 구독한다.
 *
 * [2026-10-20 DEC-OPS-153 원칙] 종전에는 이 구역이 개인 알림 큐(/user/queue/notifications)를 머리글 알림함과 따로 한 번 더 구독하고,
 * 받은 알림을 브라우저 알림으로 띄우며, 그 목록을 여는 종 단추를 따로 두었다. 같은 알림이 두 곳에 두 번 들어오고 브라우저 알림까지
 * 겹쳤다. 실시간 구독은 머리글 한 곳(use-notifications.ts)만 둔다 — 내 알림은 머리글 알림함이 보인다. 모든 사용자의 읽지 않은 알림
 * 합계 카드('전체 미읽음 알림')도 걷었다: 보는 사람이 처리할 수 있는 숫자가 아니었고 서버가 5초마다 전수 COUNT 를 돌렸다.
 */
export function RealTimeDashboard() {
  const { client, isConnected } = useWebSocket();
  const [stats, setStats] = useState<RealTimeStats | null>(null);

  // 실시간 통계 업데이트
  const handleStatsUpdate = useCallback((data: RealTimeStats) => {
    setStats(data);
  }, []);

  // WebSocket 구독
  useEffect(() => {
    if (!client || !isConnected) return;

    // 실시간 통계 구독 (인증 사용자 전용)
    const statsSubscription = client.subscribe('/topic/dashboard/stats', (message) => {
      const data = parseStats(message.body);
      if (data) handleStatsUpdate(data);
    });

    return () => {
      statsSubscription.unsubscribe();
    };
  }, [client, isConnected, handleStatsUpdate]);

  // [Phase 2 9단계] 그 집계를 하는 기능(게시판)이 빠진 구성이면 카드를 그리지 않는다 — 세지 않는 값을 '0 · 오늘' 로 약속하지
  //   않는다. 첫 프레임 전에는 알 수 없으므로 종전처럼 '—' 카드를 둔다(원본 제품은 늘 구현이 있어 화면이 같다).
  const showNewPosts = !stats || stats.newPostsProvided;
  const statColumns = STAT_COLUMNS[2 + Number(showNewPosts)];

  return (
    <div className="space-y-4">
      {/* 실시간 연결 상태.
          [2026-09-25] 종전에는 한 문구가 연결 상태와 집계 가용 여부를 함께 말해, 연결이 멀쩡한데(초록 점)
          '일부 통계 확인 불가' 가 보였고 그 전환이 알림 영역(live region)으로 읽혔다. 연결은 이 문구가,
          집계 실패는 해당 카드가 말한다. 대기 문구는 연결됐는데 첫 통계가 아직 없을 때만 덧붙인다. */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
        )} />
        <span className="text-sm font-bold text-muted-foreground" role="status" aria-live="polite">
          {isConnected ? '실시간 연결됨' : '연결 끊김'}
        </span>
        {isConnected && !stats && (
          <span className="text-sm text-muted-foreground">· 통계 수신 대기 중</span>
        )}
      </div>

      {/* 실시간 통계 카드 */}
      <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', statColumns)}>
        {/*
          서버(RealTimeDashboardService)는 이 인스턴스의 활성 연결을 세고, visitsPerMinute 는 새 연결마다
          증가한 뒤 스케줄러가 1분마다 0으로 초기화한다. 최근 60초 이동 구간이나 고유 사용자 수는 아니다.
          [2026-10-19] 숫자는 각 인스턴스의 메모리 값이고 방송은 단순 브로커라 이 화면이 연결된 서버의 값만 온다. 서버를 여러 대
          두면 전체 접속자 수가 아니다 — 공유 저장소를 들이지 않고 그 사실을 카드가 말한다(전 서버 합산·고유 사용자로 읽히지 않게).
        */}
        <RealTimeStatCard
          title="실시간 연결 세션(이 서버)"
          description="이 화면이 연결된 서버의 연결 수입니다. 서버를 여러 대 두면 전체 접속자 수가 아니며, 고유 사용자 수도 아닙니다."
          value={stats?.activeUsers ?? null}
          icon={<Users size={20} />}
          trend="이 서버"
          color="blue"
        />
        <RealTimeStatCard
          title="새 연결(이 서버, 1분마다 초기화)"
          description="마지막 초기화 이후 연결 횟수이며, 활성 세션 수나 고유 사용자 수가 아닙니다."
          value={stats?.visitsPerMinute ?? null}
          icon={<TrendingUp size={20} />}
          trend="회"
          color="green"
        />
        {showNewPosts && (
          <RealTimeStatCard
            title="신규 게시글"
            value={stats?.newPostsAvailable ? stats.newPosts : null}
            icon={<Activity size={20} />}
            trend="오늘"
            unavailableMessage={stats && !stats.newPostsAvailable ? '게시글 수 확인 불가' : undefined}
            color="purple"
          />
        )}
      </div>
    </div>
  );
}

/** 보이는 통계 카드 수 → 넓은 화면의 열 수(빈 열을 남기지 않는다). Tailwind 가 찾도록 클래스는 리터럴로 둔다. */
const STAT_COLUMNS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3' };

const statColorClasses = {
    blue: 'bg-hub-blue/10 text-hub-blue',
    green: 'bg-success/10 text-success-emphasis',
    purple: 'bg-hub-purple/10 text-hub-purple',
} as const;

interface RealTimeStatCardProps {
  title: string;
  description?: string;
  value: number | null;
  icon: ReactNode;
  trend?: string;
  unavailableMessage?: string;
  color?: keyof typeof statColorClasses;
}

function RealTimeStatCard({ title, description, value, icon, trend, unavailableMessage, color = 'blue' }: RealTimeStatCardProps) {

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-lg", statColorClasses[color])}>
            {icon}
          </div>
          {trend && (
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
              {trend}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value === null ? '—' : value.toLocaleString()}</p>
        <p className="text-xs font-bold text-muted-foreground tracking-tight mt-1">
          {title}
        </p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {unavailableMessage && <p className="text-xs text-destructive-emphasis mt-1">{unavailableMessage}</p>}
      </CardContent>
    </Card>
  );
}
