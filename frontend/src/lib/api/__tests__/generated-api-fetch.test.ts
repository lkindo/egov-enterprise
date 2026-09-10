import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeGeneratedFetchOperation } from '../generated-api-client';
import { authzReplaceGrantsOperation, getCurrentUserOperation } from '@/types/generated-operations';

afterEach(() => vi.unstubAllGlobals());
describe('generated server fetch transport', () => {
  it('생성 경로를 고정하고 캐시와 redirect를 차단한다', async () => {
    const data = { id: 'login-id', groups: [], permissions: [], authorizationVersion: 'v1' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await executeGeneratedFetchOperation(getCurrentUserOperation, {}, { baseUrl: 'http://backend/api/v1' });
    expect(result.id).toBe('login-id');
    expect(fetchMock).toHaveBeenCalledWith('http://backend/api/v1/auth/me', expect.objectContaining({ method: 'GET', cache: 'no-store', redirect: 'error' }));
  });
  it('mutation descriptor 또는 transport override는 요청 전에 거부한다', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(executeGeneratedFetchOperation(authzReplaceGrantsOperation, { path: { code: 'CONTENT' }, body: { grants: [], version: 'v1', complete: true } }, { baseUrl: 'http://backend/api/v1' })).rejects.toThrow();
    await expect(executeGeneratedFetchOperation(getCurrentUserOperation, { config: { headers: { Authorization: 'override' } } }, { baseUrl: 'http://backend/api/v1' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([new Response('{}', { status: 403 }), new Response(JSON.stringify({ success: false, data: {} }))])('실패 또는 잘못된 envelope는 성공으로 해석하지 않는다', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(executeGeneratedFetchOperation(getCurrentUserOperation, {}, { baseUrl: 'http://backend/api/v1' })).rejects.toThrow();
  });
});
