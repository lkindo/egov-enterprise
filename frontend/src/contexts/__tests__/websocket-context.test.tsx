import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketProvider, useWebSocket } from '../websocket-context';
import { AuthProvider } from '../AuthContext';
import { ToastProvider } from '@/app/components/ui/toast';
import React from 'react';

// Mock STOMP and SockJS
vi.mock('@stomp/stompjs', () => {
 const mockClient = {
 activate: vi.fn(),
 deactivate: vi.fn(),
 subscribe: vi.fn(),
 onConnect: null,
 };
 return { Client: vi.fn(() => mockClient) };
});

vi.mock('sockjs-client', () => ({
 default: vi.fn(),
}));

describe('WebSocketContext', () => {
 it('provides websocket client and connection state', () => {
 const wrapper = ({ children }: { children: React.ReactNode }) => (
 <ToastProvider>
 <AuthProvider>
 <WebSocketProvider>{children}</WebSocketProvider>
 </AuthProvider>
 </ToastProvider>
 );

 const { result } = renderHook(() => useWebSocket(), { wrapper });

 expect(result.current).toHaveProperty('client');
 expect(result.current).toHaveProperty('isConnected');
 });
});
