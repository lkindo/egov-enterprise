'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';

/**
 * ?ㅼ떆媛님?쒕낫님접속 異붿쟻 님 */
export function useDashboardConnection() {
 const { client, isConnected } = useWebSocket();

  useEffect(() => {
    if (!client || !isConnected) return;

    // 접속 ?뚮┝ 諛쒖넚
    client.publish({
      destination: '/app/user.connect',
      body: JSON.stringify({ timestamp: new Date().toISOString() })
    });

    // ?곌껐 醫낅즺 님?뚮┝
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
