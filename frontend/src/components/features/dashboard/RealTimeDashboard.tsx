'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import type { StompSubscription } from '@stomp/stompjs';
import { useWebSocket } from '@/contexts/websocket-context';
import { Bell, TrendingUp, Users, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface RealTimeNotification {
  id: string;
  type: 'USER' | 'POST' | 'COMMENT' | 'SYSTEM' | 'ALERT';
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
}

interface RealTimeDashboardProps {
  onNotification?: (notification: RealTimeNotification) => void;
}

const NOTIFICATION_TYPES = new Set<RealTimeNotification['type']>(['USER', 'POST', 'COMMENT', 'SYSTEM', 'ALERT']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStats(body: string): RealTimeStats | null {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) return null;
    const keys: Array<keyof RealTimeStats> = ['activeUsers', 'visitsPerMinute', 'newPosts', 'alerts'];
    if (!keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)) {
      return null;
    }
    return Object.fromEntries(keys.map((key) => [key, value[key]])) as unknown as RealTimeStats;
  } catch {
    return null;
  }
}

function parseNotification(body: string): RealTimeNotification | null {
  try {
    const value: unknown = JSON.parse(body);
    if (!isRecord(value)) return null;
    if (typeof value.id !== 'string' || typeof value.title !== 'string'
      || typeof value.message !== 'string' || typeof value.timestamp !== 'string'
      || typeof value.read !== 'boolean' || typeof value.type !== 'string'
      || !NOTIFICATION_TYPES.has(value.type as RealTimeNotification['type'])) {
      return null;
    }
    return value as unknown as RealTimeNotification;
  } catch {
    return null;
  }
}

export function RealTimeDashboard({ onNotification }: RealTimeDashboardProps) {
  const { client, isConnected } = useWebSocket();
  const [stats, setStats] = useState<RealTimeStats>({
    activeUsers: 0,
    visitsPerMinute: 0,
    newPosts: 0,
    alerts: 0
  });
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // 실시간 통계 업데이트
  const handleStatsUpdate = useCallback((data: RealTimeStats) => {
    setStats(prev => ({ ...prev, ...data }));
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
            {isConnected ? '실시간 연결됨' : '연결 끊김'}
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
            aria-haspopup="dialog"
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
                          {new Date(notification.timestamp).toLocaleString()}
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
          title="실시간 접속자"
          value={stats.activeUsers}
          icon={<Users size={20} />}
          trend={`${stats.visitsPerMinute}명/분`}
          color="blue"
        />
        <RealTimeStatCard
          title="분당 방문"
          value={stats.visitsPerMinute}
          icon={<TrendingUp size={20} />}
          trend="방문/분"
          color="green"
        />
        <RealTimeStatCard
          title="신규 게시글"
          value={stats.newPosts}
          icon={<Activity size={20} />}
          trend="오늘"
          color="purple"
        />
        <RealTimeStatCard
          title="알림"
          value={stats.alerts}
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
  value: number;
  icon: ReactNode;
  trend?: string;
  isAlert?: boolean;
  color?: keyof typeof statColorClasses;
}

function RealTimeStatCard({ title, value, icon, trend, isAlert = false, color = 'blue' }: RealTimeStatCardProps) {

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isAlert && value > 0 && "border-destructive/20 bg-destructive/5"
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
        <h4 className="text-2xl font-bold text-foreground">{value?.toLocaleString() ?? 0}</h4>
        <p className="text-xs font-bold text-muted-foreground tracking-tight mt-1">
          {title}
        </p>
      </CardContent>
    </Card>
  );
}

function NotificationIcon({ type }: { type: RealTimeNotification['type'] }) {
  const icons = {
    USER: <Users size={14} className="text-hub-blue" />,
    POST: <Activity size={14} className="text-success-emphasis" />,
    COMMENT: <TrendingUp size={14} className="text-hub-purple" />,
    SYSTEM: <Bell size={14} className="text-muted-foreground" />,
    ALERT: <AlertCircle size={14} className="text-destructive-emphasis" />
  };

  return icons[type] || icons.SYSTEM;
}
