'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import type { StompSubscription } from '@stomp/stompjs';
import { useWebSocket } from '@/contexts/websocket-context';
import { normalizeNotification, type Notification as ServerNotification } from '@/lib/hooks/use-notifications';
import { Bell, TrendingUp, Users, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface RealTimeNotification {
  id: string;
  type: NonNullable<ServerNotification['type']>;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface RealTimeStats {
  activeUsers: number;
  visitsPerMinute: number;
  newPosts: number;
  alerts: number;
  newPostsAvailable: boolean;
  alertsAvailable: boolean;
}

interface RealTimeDashboardProps {
  onNotification?: (notification: RealTimeNotification) => void;
}

/**
 * 알림 시각 표기. 시스템 표준은 'yyyy-MM-dd HH:mm:ss' 다.
 *
 * <p>[2026-09-08] 종전 `toLocaleString()` 은 브라우저 로케일을 따라가 '2026. 9. 8. 오후 8:05:13'
 * 처럼 자릿수·구분자·오전/오후 표기가 사용자마다 달라졌다. 서버·다른 화면과 같은 형식으로 고정한다.
 * 값이 시각으로 해석되지 않으면 원문을 그대로 보여 준다(없는 시각을 지어내지 않는다).
 */
function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
    + ` ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStats(body: string): RealTimeStats | null {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) return null;
    const keys = ['activeUsers', 'visitsPerMinute', 'newPosts', 'alerts'] as const;
    if (!keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)) {
      return null;
    }
    const availabilityKeys = ['newPostsAvailable', 'alertsAvailable'] as const;
    if (availabilityKeys.some((key) => value[key] !== undefined && typeof value[key] !== 'boolean')) {
      return null;
    }
    // 기존 서버의 네 숫자 프레임도 읽는다. 새 서버는 조회 실패를 명시적으로 false로 보낸다.
    return {
      ...Object.fromEntries(keys.map((key) => [key, value[key]])),
      newPostsAvailable: value.newPostsAvailable !== false,
      alertsAvailable: value.alertsAvailable !== false,
    } as RealTimeStats;
  } catch {
    return null;
  }
}

/**
 * 개인 큐의 알림 프레임을 해석한다.
 *
 * <p>[2026-09-25] 종전에는 서버가 보내지 않는 형태(`id`·`title`·`message`·`read`·`type: USER|POST…`)를
 * 요구해, 서버가 보내는 NotificationDto(`notiSn`·`notiTtlNm`·`notiCn`·`notiDt`·`readYn`)를 전부 버렸다.
 * 패널은 늘 '새로운 알림이 없습니다' 였다. 같은 큐를 읽는 헤더 알림함의 정규화를 그대로 쓴다.
 */
function parseNotification(body: string): RealTimeNotification | null {
  try {
    const notification = normalizeNotification(JSON.parse(body));
    if (!notification) return null;
    return {
      id: String(notification.notiSn),
      type: notification.type ?? 'ACTIVITY',
      title: notification.notiTtlNm,
      message: notification.notiCn,
      timestamp: notification.notiDt,
      read: notification.readYn === 'Y',
    };
  } catch {
    return null;
  }
}

export function RealTimeDashboard({ onNotification }: RealTimeDashboardProps) {
  const { client, isConnected } = useWebSocket();
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // 실시간 통계 업데이트
  const handleStatsUpdate = useCallback((data: RealTimeStats) => {
    setStats(data);
  }, []);

  // 실시간 알림 처리
  const handleNotification = useCallback((notification: RealTimeNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // 최대 50 개 보관
    onNotification?.(notification);

    // 브라우저 알림
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }, [onNotification]);

  // WebSocket 구독
  useEffect(() => {
    if (!client || !isConnected) return;

    // 실시간 통계 구독 (인증 사용자 전용)
    const statsSubscription = client.subscribe('/topic/dashboard/stats', (message) => {
      const data = parseStats(message.body);
      if (data) handleStatsUpdate(data);
    });

    // 사용자별 개인 알림 구독 (Private)
    // 연결 Provider는 인증 사용자가 있을 때만 Client를 활성화하므로 클라이언트 제공 ID가 필요 없다.
    const userSubscription: StompSubscription = client.subscribe('/user/queue/notifications', (message) => {
      const notification = parseNotification(message.body);
      if (notification) handleNotification(notification);
    });

    return () => {
      statsSubscription.unsubscribe();
      userSubscription.unsubscribe();
    };
  }, [client, isConnected, handleStatsUpdate, handleNotification]);

  const toggleNotifications = useCallback(() => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    // 권한 프롬프트는 사용자 제스처 없이 페이지 진입 즉시 띄우지 않는다.
    if (opening && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, [showNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      {/* 실시간 연결 상태 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
          )} />
          <span className="text-sm font-bold text-muted-foreground" role="status" aria-live="polite">
            {!isConnected ? '연결 끊김' : !stats ? '통계 수신 대기 중'
              : stats.newPostsAvailable && stats.alertsAvailable ? '통계 수신 중' : '일부 통계 확인 불가'}
          </span>
        </div>

        {/* 알림 버튼 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleNotifications}
            className="relative"
            data-testid="notif-bell"
            aria-label={`알림 ${showNotifications ? '닫기' : '열기'}${unreadCount ? `, 읽지 않음 ${unreadCount}개` : ''}`}
            aria-expanded={showNotifications}
            aria-controls="realtime-notification-panel"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-sm"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <Card
              id="realtime-notification-panel"
              role="region"
              aria-label="실시간 알림 목록"
              className="absolute right-0 top-12 w-80 shadow-lg z-50"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">실시간 알림</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    새로운 알림이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border text-sm space-y-1",
                          !notification.read && "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <NotificationIcon type={notification.type} />
                          <span className="font-bold">{notification.title}</span>
                        </div>
                        <p className="text-muted-foreground">{notification.message}</p>
                        <span className="text-xs text-muted-foreground">
                          {/* [2026-09-08] toLocaleString 은 브라우저 로케일에 따라 '2026. 9. 8.' 처럼
                              자릿수와 구분자가 달라진다. 시스템 표준 표기로 고정한다. */}
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 실시간 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RealTimeStatCard
          title="현재 접속자"
          value={stats?.activeUsers ?? null}
          icon={<Users size={20} />}
          trend={stats ? `${stats.visitsPerMinute}명/분` : undefined}
          color="blue"
        />
        <RealTimeStatCard
          title="분당 방문"
          value={stats?.visitsPerMinute ?? null}
          icon={<TrendingUp size={20} />}
          trend="방문/분"
          color="green"
        />
        <RealTimeStatCard
          title="신규 게시글"
          value={stats?.newPostsAvailable ? stats.newPosts : null}
          icon={<Activity size={20} />}
          trend="오늘"
          unavailableMessage={stats && !stats.newPostsAvailable ? '게시글 수 확인 불가' : undefined}
          color="purple"
        />
        <RealTimeStatCard
          title="알림"
          value={stats?.alertsAvailable ? stats.alerts : null}
          unavailableMessage={stats && !stats.alertsAvailable ? '알림 수 확인 불가' : undefined}
          icon={<AlertCircle size={20} />}
          isAlert
          color="red"
        />
      </div>
    </div>
  );
}

const statColorClasses = {
    blue: 'bg-hub-blue/10 text-hub-blue',
    green: 'bg-success/10 text-success-emphasis',
    purple: 'bg-hub-purple/10 text-hub-purple',
    red: 'bg-destructive/10 text-destructive-emphasis'
} as const;

interface RealTimeStatCardProps {
  title: string;
  value: number | null;
  icon: ReactNode;
  trend?: string;
  unavailableMessage?: string;
  isAlert?: boolean;
  color?: keyof typeof statColorClasses;
}

function RealTimeStatCard({ title, value, icon, trend, unavailableMessage, isAlert = false, color = 'blue' }: RealTimeStatCardProps) {

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isAlert && value !== null && value > 0 && "border-destructive/20 bg-destructive/5"
    )}>
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
        {unavailableMessage && <p className="text-xs text-destructive-emphasis mt-1">{unavailableMessage}</p>}
      </CardContent>
    </Card>
  );
}

function NotificationIcon({ type }: { type: RealTimeNotification['type'] }) {
  const icons: Record<RealTimeNotification['type'], ReactNode> = {
    SECURITY: <AlertCircle size={14} className="text-destructive-emphasis" />,
    SYSTEM: <Bell size={14} className="text-muted-foreground" />,
    ACTIVITY: <Activity size={14} className="text-success-emphasis" />,
    INFO: <Bell size={14} className="text-hub-blue" />,
  };

  return icons[type] || icons.SYSTEM;
}
