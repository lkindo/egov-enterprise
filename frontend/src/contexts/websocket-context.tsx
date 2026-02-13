'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  client: Client | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ client: null, isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const stompClient = useRef<Client | null>(null);

  useEffect(() => {
    if (!user) {
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const socketUrl = API_URL.replace('/api/v1', '/ws');

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };

    client.onStompError = (frame) => {
      console.error('STOMP error', frame);
      setIsConnected(false);
    };

    client.onDisconnect = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    };

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ client: stompClient.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
