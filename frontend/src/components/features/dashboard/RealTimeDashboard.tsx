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

 // 접속 異붿쟻 님?ъ슜
 useDashboardConnection();

 // ?ㅼ떆媛님듦퀎 ?낅뜲?댄듃
 const handleStatsUpdate = useCallback((data: RealTimeStats) => {
 setStats(prev => ({ ...prev, ...data }));
 }, []);

 // ?ㅼ떆媛님뚮┝ 泥섎━
 const handleNotification = useCallback((notification: RealTimeNotification) => {
 setNotifications(prev => [notification, ...prev].slice(0, 50)); // 理쒕? 50 媛?蹂닿?
 onNotification?.(notification);

 // 釉뚮씪?곗? ?뚮┝
 if (Notification.permission === 'granted') {
 new Notification(notification.title, {
 body: notification.message,
 icon: '/favicon.ico'
 });
 }
 }, [onNotification]);

 // WebSocket 援щ룆
 useEffect(() => {
 if (!client || !isConnected) return;

 // ?ㅼ떆媛님듦퀎 援щ룆 (怨듭슜)
 const statsSubscription = client.subscribe('/topic/dashboard/stats', (message) => {
 const data = JSON.parse(message.body);
 handleStatsUpdate(data);
 });

 // ?ㅼ떆媛님쒖뒪님?뚮┝ 援щ룆 (怨듭슜)
 const notificationSubscription = client.subscribe('/topic/notifications', (message) => {
 const notification = JSON.parse(message.body);
 handleNotification(notification);
 });

 // ?ъ슜?먮퀎 媛쒖씤 ?뚮┝ 援щ룆 (Private)
 let userSubscription: any = null;
 if (user?.id) {
 // ?ㅽ봽留님쒗걧由ы떚님/user ?꾩슜 님?쒖슜
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

 // 釉뚮씪?곗? ?뚮┝ 沅뚰븳 요청
 useEffect(() => {
 if ('Notification' in window && Notification.permission === 'default') {
 Notification.requestPermission();
 }
 }, []);

 const unreadCount = notifications.filter(n => !n.read).length;

 return (
 <div className="space-y-4">
 {/* ?ㅼ떆媛님곌껐 ?곹깭 */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={cn(
 "w-2 h-2 rounded-full",
 isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
 )} />
 <span className="text-sm font-bold text-muted-foreground">
 {isConnected ? '?ㅼ떆媛님곌껐님 : '?곌껐 ?딄?'}
 </span>
 </div>

 {/* ?뚮┝ 踰꾪듉 */}
 <div className="relative">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setShowNotifications(!showNotifications)}
 className="relative"
 data-testid="notif-bell"
 aria-label="?뚮┝ ?닿린"
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

 {/* ?뚮┝ ?쒕∼?ㅼ슫 */}
 {showNotifications && (
 <Card className="absolute right-0 top-12 w-80 shadow-lg z-50">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-bold">?ㅼ떆媛님뚮┝</CardTitle>
 </CardHeader>
 <CardContent className="max-h-96 overflow-y-auto">
 {notifications.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-4">
 ?덈줈님?뚮┝님?놁뒿?덈떎.
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
 <span className="text-[10px] text-muted-foreground">
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

 {/* ?ㅼ떆媛님듦퀎 移대뱶 */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <RealTimeStatCard
 title="?ㅼ떆媛님묒냽님
 value={stats.activeUsers}
 icon={<Users size={20} />}
 trend={`${stats.visitsPerMinute}紐?遺?}
 color="blue"
 />
 <RealTimeStatCard
 title="遺꾨떦 諛⑸Ц"
 value={stats.visitsPerMinute}
 icon={<TrendingUp size={20} />}
 trend="諛⑸Ц/遺?
 color="green"
 />
 <RealTimeStatCard
 title="신규 寃뚯떆湲"
 value={stats.newPosts}
 icon={<Activity size={20} />}
 trend="?ㅻ뒛"
 color="purple"
 />
 <RealTimeStatCard
 title="?뚮┝"
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
 <div className={cn("p-3 rounded-xl", colorClasses[color as keyof typeof colorClasses])}>
 {icon}
 </div>
 {trend && (
 <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded">
 {trend}
 </span>
 )}
 </div>
 <h4 className="text-2xl font-black text-foreground">{value?.toLocaleString() 님 0}</h4>
 <p className="text-[10px] font-black text-muted-foreground tracking-tight mt-1">
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

