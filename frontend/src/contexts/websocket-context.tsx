'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/app/components/ui/toast';

interface WebSocketContextType {
 client: Client | null;
 isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ client: null, isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
 const { user } = useAuth();
 const { toast, success, info } = useToast() as any; // 기존 toast 시스템 활용
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
 reconnectDelay: 5000,
 heartbeatIncoming: 4000,
 heartbeatOutgoing: 4000,
 });

 client.onConnect = (frame) => {
 console.log('Connected to WebSocket');
 setIsConnected(true);

 // 1. 공통 공지사항 채널 구독
 client.subscribe('/topic/notices', (message) => {
 const payload = JSON.parse(message.body);
 toast(payload.message || '새로운 공지사항이 등록되었습니다.', 'info');
 });

 // 2. 사용자 개별 알림 채널 구독 (결재, 댓글 등)
 client.subscribe('/user/queue/notifications', (message) => {
 const payload = JSON.parse(message.body);
 // 중요도에 따라 success 또는 info 사용
 if (payload.type === 'APPROVAL') {
 success(`[결재 알림] ${payload.message}`);
 } else {
 toast(payload.message, 'info');
 }
 });
 };

 client.onStompError = (frame) => {
 console.error('STOMP error', frame);
 setIsConnected(false);
 };

 client.activate();
 stompClient.current = client;

 return () => {
 client.deactivate();
 };
 }, [user, toast, success]);

 return (
 <WebSocketContext.Provider value={{ client: stompClient.current, isConnected }}>
 {children}
 </WebSocketContext.Provider>
 );
}
