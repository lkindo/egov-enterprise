import { afterEach, describe, expect, it, vi } from 'vitest';
import { canEnterRegisteredPage, loadPageAuthorization } from '../page-authorization';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';

const current = { id: 'subject', groups: ['USER'], permissions: [], authorizationVersion: 'v1' };
const upstream = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data }), { status });

afterEach(() => vi.unstubAllGlobals());

describe('page permission mapping', () => {
  it('does not inherit an authenticated parent’s empty permission requirement for unknown children', () => {
    expect(canEnterRegisteredPage('/admin', current)).toBe(true);
    expect(canEnterRegisteredPage('/admin/unregistered-child', current)).toBe(false);
  });

  it('requires an explicitly registered permission for a protected page', () => {
    const required = PAGE_PERMISSIONS['/admin/system/menus'];
    expect(required.length).toBeGreaterThan(0);
    expect(canEnterRegisteredPage('/admin/system/menus', current)).toBe(false);
    expect(canEnterRegisteredPage('/admin/system/menus', { ...current, permissions: [...required] })).toBe(true);
  });

  it('fetches the current backend response with no store and no credential-forwarding redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream(current));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadPageAuthorization('test-token', 'subject')).resolves.toEqual({
      groups: ['USER'], permissions: [], authorizationVersion: 'v1',
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/me$/), expect.objectContaining({
      headers: { Authorization: 'Bearer test-token', Accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
    }));
  });

  it.each([
    { ...current, id: 'different-subject' },
    { ...current, authorizationVersion: undefined },
    { ...current, groups: undefined },
  ])('rejects a mismatched or incomplete snapshot', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream(data)));
    await expect(loadPageAuthorization('test-token', 'subject')).resolves.toBeNull();
  });

  it('does not grant access when the current-authority service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
    await expect(loadPageAuthorization('test-token', 'subject')).resolves.toBeNull();
  });
});
