'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Client } from '@stomp/stompjs';

/**
 * 실시간 대시보드 접속 추적 훅
 */
export function useDashboardConnection() {
  const { client, isConnected } = useWebSocket();

  useEffect(() => {
    if (!client || !isConnected) return;

    // 접속 알림 발송
    const connectSubscription = client.onConnect = () => {
      client.publish({
        destination: '/app/user.connect',
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      });
    };

    // 연결 종료 시 알림
    return () => {
      if (client.connected) {
        client.publish({
          destination: '/app/user.disconnect',
          body: JSON.stringify({ timestamp: new Date().toISOString() })
        });
      }
    };
  }, [client, isConnected]);
}
