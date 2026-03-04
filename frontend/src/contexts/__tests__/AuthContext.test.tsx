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
    window.localStorage.clear();
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('should not log credentials during login', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    // Mock successful login
    (client.post as any).mockResolvedValue({
      accessToken: 'mock-token',
      role: 'ROLE_USER'
    });
    // Mock auth check (getCurrentUser)
    (client.get as any).mockResolvedValue({
      id: 'test',
      name: 'Test User'
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login process
    await act(async () => {
      await result.current.login({ id: 'test', password: 'password' });
    });

    expect(client.post).toHaveBeenCalledWith('/auth/login', { id: 'test', password: 'password' });
    // After login, checkAuth is called
    await waitFor(() => expect(client.get).toHaveBeenCalledWith('/auth/me'));

    // Security check: logs should not be present
    // We only care about logs during the login action
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});