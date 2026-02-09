import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import client from '@/lib/api/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock the client module
vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      response: { use: vi.fn() }
    }
  }
}));

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not log credentials during login', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Mock successful login
        (client.post as any).mockResolvedValue({
            data: { success: true, user: { id: 'test', name: 'Test User' } }
        });
        // Mock auth check
        (client.get as any).mockResolvedValue({
            data: { success: false }
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for initial checkAuth to complete
        await waitFor(() => expect(client.get).toHaveBeenCalledWith('/auth/me'));

        await act(async () => {
             await result.current.login({ id: 'test', password: 'password' });
        });

        expect(client.post).toHaveBeenCalledWith('/auth/login', { id: 'test', password: 'password' });

        // New behavior: logs should not be present
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
