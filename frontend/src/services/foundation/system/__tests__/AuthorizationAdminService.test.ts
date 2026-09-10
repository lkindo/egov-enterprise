import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { authorizationAdminService } from '../AuthorizationAdminService';

vi.mock('@/lib/api/generated-api-client', () => ({ executeGeneratedOperation: vi.fn() }));

describe('AuthorizationAdminService', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('미완료 전체 권한 응답은 거부한다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ code: 'CONTENT', name: '콘텐츠', version: 'v1', complete: false, grants: [] });
    await expect(authorizationAdminService.getGroup('CONTENT')).rejects.toThrow();
  });
  it('다른 그룹의 응답을 현재 그룹의 기준선으로 사용하지 않는다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ code: 'OTHER', name: '다른 그룹', description: null, version: 'v1', complete: true, grants: [] });
    await expect(authorizationAdminService.getGroup('CONTENT')).rejects.toThrow('일치하지 않습니다');
  });
  it('다른 사용자의 응답을 현재 배정 기준선으로 사용하지 않는다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ userId: 'ESNTL_B', version: 'v1', complete: true, groups: [] });
    await expect(authorizationAdminService.getMemberships('ESNTL_A')).rejects.toThrow('일치하지 않습니다');
  });
  it('복수 그룹 교체는 정확한 esntlId와 version을 생성 operation으로 전달한다', async () => {
    const body = { groups: ['CONTENT', 'SURVEY'], version: 'v1', complete: true as const };
    await authorizationAdminService.saveUserGroups('ESNTL_A', body);
    expect(executeGeneratedOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 'authzReplaceMemberships' }), { path: { userId: 'ESNTL_A' }, body });
  });
  it('빈 revision은 생성 transport 전에 차단한다', () => {
    expect(() => authorizationAdminService.saveGroupGrants('CONTENT', { grants: [], version: '', complete: true })).toThrow();
    expect(() => authorizationAdminService.saveUserGroups('ESNTL_A', { groups: [], version: '', complete: true })).toThrow();
    expect(executeGeneratedOperation).not.toHaveBeenCalled();
  });
  it('사용자 검색은 페이지 결과만 반환하고 전체 배정으로 재해석하지 않는다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ list: [{ id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가', departmentId: null }], total: 30, page: 2, size: 20, totalPage: 2 });
    const result = await authorizationAdminService.getUsers('사용자', 1);
    expect(result.total).toBe(30);
    expect(executeGeneratedOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 'authzUsers' }), { query: { keyword: '사용자', page: 1, size: 20 } });
  });
});
