'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardConnection } from '@/hooks/useDashboardConnection';
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

  const { user } = useAuth();

  // 접속 추적 훅 사용
  useDashboardConnection();

  // 실시간 통계 업데이트
  const handleStatsUpdate = useCallback((data: RealTimeStats) => {
    setStats(prev => ({ ...prev, ...data }));
  }, []);

  // 실시간 알림 처리
  const handleNotification = useCallback((notification: RealTimeNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // 최대 50 개 보관
    onNotification?.(notification);

    // 브라우저 알림
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }, [onNotification]);

  // WebSocket 구독
  useEffect(() => {
    if (!client || !isConnected) return;

    // 실시간 통계 구독 (공용)
    const statsSubscription = client.subscribe('/topic/dashboard/stats', (message) => {
      const data = JSON.parse(message.body);
      handleStatsUpdate(data);
    });

    // 실시간 시스템 알림 구독 (공용)
    const notificationSubscription = client.subscribe('/topic/notifications', (message) => {
      const notification = JSON.parse(message.body);
      handleNotification(notification);
    });

    // 사용자별 개인 알림 구독 (Private)
    let userSubscription: any = null;
    if (user?.id) {
      // 스프링 시큐리티의 /user 전용 큐 활용
      userSubscription = client.subscribe('/user/queue/notifications', (message) => {
        const notification = JSON.parse(message.body);
        handleNotification(notification);
      });
      console.log(`Subscribed to private notifications for user: ${user.id}`);
    }

    return () => {
      statsSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
      if (userSubscription) userSubscription.unsubscribe();
    };
  }, [client, isConnected, handleStatsUpdate, handleNotification, user?.id]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      {/* 실시간 연결 상태 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-lg",
            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
          )} />
          <span className="text-sm font-bold text-muted-foreground">
            {isConnected ? '실시간 연결됨' : '연결 끊김'}
          </span>
        </div>

        {/* 알림 버튼 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
            data-testid="notif-bell"
            aria-label="알림 열기"
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
            <Card className="absolute right-0 top-12 w-80 shadow-lg z-50">
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

function RealTimeStatCard({ title, value, icon, trend, isAlert, color = 'blue' }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isAlert && value > 0 && "border-red-200 bg-red-50/30 dark:bg-red-900/10"
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-[0.1rem]", colorClasses[color as keyof typeof colorClasses])}>
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
    USER: <Users size={14} className="text-blue-500" />,
    POST: <Activity size={14} className="text-green-500" />,
    COMMENT: <TrendingUp size={14} className="text-purple-500" />,
    SYSTEM: <Bell size={14} className="text-gray-500" />,
    ALERT: <AlertCircle size={14} className="text-red-500" />
  };

  return icons[type] || icons.SYSTEM;
}
