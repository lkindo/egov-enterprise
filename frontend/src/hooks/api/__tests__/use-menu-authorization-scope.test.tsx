import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMenuAuthorizationScope } from '../use-menu-authorization-scope';

const auth = vi.hoisted(() => ({ user: { id: 'first', authorizationVersion: 'v1' } as { id: string; authorizationVersion: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

describe('menu authorization scope', () => {
  it('does not reuse initial server menus for another account, revision or logged-out state', () => {
    auth.user = { id: 'first', authorizationVersion: 'v1' };
    const { result, rerender } = renderHook(() => useMenuAuthorizationScope());
    expect(result.current.acceptsInitialMenus).toBe(true);
    auth.user = { id: 'first', authorizationVersion: 'v2' };
    rerender();
    expect(result.current.scope).toEqual(['first', 'v2']);
    expect(result.current.acceptsInitialMenus).toBe(false);
    auth.user = { id: 'second', authorizationVersion: 'v1' };
    rerender();
    expect(result.current.acceptsInitialMenus).toBe(false);
    auth.user = null;
    rerender();
    expect(result.current.acceptsInitialMenus).toBe(false);
    expect(result.current.authenticated).toBe(false);
  });
});
