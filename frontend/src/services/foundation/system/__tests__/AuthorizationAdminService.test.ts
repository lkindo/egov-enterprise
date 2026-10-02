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

/** [2026-10-02 S2] 그룹 생성·수정·권한 저장·복제는 저장 뒤 스냅샷을 돌려준다 — 화면은 그것을 새 기준선으로 쓴다. */
describe('AuthorizationAdminService — 저장 뒤 스냅샷', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  const saved = { code: 'CONTENT', name: '콘텐츠 담당', description: null, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }], version: 'v2', complete: true };

  it('그룹 등록·정보 수정·권한 저장이 저장 뒤 스냅샷을 돌려준다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue(saved);
    await expect(authorizationAdminService.createGroup({ code: 'CONTENT', name: '콘텐츠 담당', description: '' })).resolves.toMatchObject({ version: 'v2' });
    await expect(authorizationAdminService.updateGroup('CONTENT', { name: '콘텐츠 담당', description: '', version: 'v1' })).resolves.toMatchObject({ version: 'v2' });
    await expect(authorizationAdminService.saveGroupGrants('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }], version: 'v1', complete: true })).resolves.toMatchObject({ version: 'v2', grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] });
    expect(vi.mocked(executeGeneratedOperation).mock.calls.map(([descriptor]) => descriptor.id)).toEqual(['authzCreateGroup', 'authzUpdateGroup', 'authzReplaceGrants']);
  });

  it.each([
    ['다른 그룹의 응답', { ...saved, code: 'OTHER' }],
    ['미완료 응답', { ...saved, complete: false }],
    ['version 없는 응답', { ...saved, version: '' }],
  ])('저장 응답이 %s이면 기준선으로 쓰지 않는다', async (_label, response) => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue(response);
    await expect(authorizationAdminService.createGroup({ code: 'CONTENT', name: '콘텐츠 담당', description: '' })).rejects.toThrow();
    await expect(authorizationAdminService.updateGroup('CONTENT', { name: '콘텐츠 담당', description: '', version: 'v1' })).rejects.toThrow();
    await expect(authorizationAdminService.saveGroupGrants('CONTENT', { grants: [], version: 'v1', complete: true })).rejects.toThrow();
  });

  it('그룹 복제는 원본 코드로 보내고 새 그룹의 스냅샷을 돌려준다 — 원본 version 이 없으면 전송 전에 막는다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ ...saved, code: 'CONTENT_COPY', version: 'n1' });
    const body = { code: 'CONTENT_COPY', name: '콘텐츠 사본', description: '', sourceVersion: 'v1' };
    await expect(authorizationAdminService.createGroupCopy('CONTENT', body)).resolves.toMatchObject({ code: 'CONTENT_COPY', version: 'n1' });
    expect(executeGeneratedOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 'authzCopyGroup' }), { path: { code: 'CONTENT' }, body });

    vi.mocked(executeGeneratedOperation).mockClear();
    expect(() => authorizationAdminService.createGroupCopy('CONTENT', { ...body, sourceVersion: '' })).toThrow('원본 그룹을 다시 조회해 주세요.');
    expect(executeGeneratedOperation).not.toHaveBeenCalled();

    vi.mocked(executeGeneratedOperation).mockResolvedValue({ ...saved, code: 'CONTENT' });
    await expect(authorizationAdminService.createGroupCopy('CONTENT', body)).rejects.toThrow('일치하지 않습니다');
  });

  it('전체 그룹 권한을 읽고, 그룹 코드가 겹치는 응답은 거부한다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ catalogVersion: 'c1', groups: [saved] });
    await expect(authorizationAdminService.getGrantMatrix()).resolves.toMatchObject({ groups: [{ code: 'CONTENT', version: 'v2' }] });
    expect(executeGeneratedOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 'authzGrantMatrix' }), { config: undefined });

    vi.mocked(executeGeneratedOperation).mockResolvedValue({ catalogVersion: 'c1', groups: [saved, saved] });
    await expect(authorizationAdminService.getGrantMatrix()).rejects.toThrow();
  });
});

/** [2026-10-02 D6] 그룹 쪽 구성원 일괄 추가·회수. */
describe('AuthorizationAdminService — 구성원 일괄 변경', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  const user = { id: 'E1', userId: 'kim', userNm: '김', departmentId: null };

  it('추가·회수 대상을 esntlId 로 보내고 바뀐 사람과 구성원 수를 돌려준다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ code: 'CONTENT', added: [user], removed: [], memberCount: 4 });
    const body = { add: ['E1'], remove: [] as string[], complete: true as const };
    await expect(authorizationAdminService.updateGroupMembers('CONTENT', body)).resolves.toEqual({ code: 'CONTENT', added: [user], removed: [], memberCount: 4 });
    expect(executeGeneratedOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 'authzChangeGroupMembers' }), { path: { code: 'CONTENT' }, body });
  });

  it.each([
    [{ add: [], remove: [], complete: true as const }, '추가하거나 회수할 사용자를 선택해 주세요.'],
    [{ add: ['E1', 'E1'], remove: [], complete: true as const }, '중복된 사용자입니다.'],
    [{ add: ['E1'], remove: ['E1'], complete: true as const }, '같은 사용자를 추가와 회수에 함께 지정할 수 없습니다.'],
    [{ add: ['E1'], remove: [], complete: false as unknown as true }, '구성원 목록을 다시 조회한 뒤 저장해 주세요.'],
    [{ add: [' '], remove: [], complete: true as const }, '사용자를 다시 선택해 주세요.'],
    [{ add: Array.from({ length: 501 }, (_, index) => `E${index}`), remove: [], complete: true as const }, '한 번에 추가하거나 회수할 수 있는 사용자는 각각 500명까지입니다.'],
  ])('잘못된 요청은 서버 문구·한국어 안내로 전송 전에 막는다 %#', (body, message) => {
    expect(() => authorizationAdminService.updateGroupMembers('CONTENT', body)).toThrow(message);
    expect(executeGeneratedOperation).not.toHaveBeenCalled();
  });

  it('다른 그룹의 결과는 받지 않는다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ code: 'OTHER', added: [user], removed: [], memberCount: 1 });
    await expect(authorizationAdminService.updateGroupMembers('CONTENT', { add: ['E1'], remove: [], complete: true })).rejects.toThrow('일치하지 않습니다');
  });
});
