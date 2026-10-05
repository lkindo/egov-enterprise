vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { menuAdminService, type MenuStructureSave } from '../MenuAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  }
}));

describe('MenuAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
    });
    vi.mocked(client.requestRaw).mockResolvedValue({ success: true, code: 'S000', message: '성공' });
  });

  it('getMenuList should call correct API', async () => {
    await menuAdminService.getMenuList({ page: 1 });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/menus', expect.objectContaining({
      params: expect.objectContaining({ pageIndex: 2 }) 
    }));
  });
 
  it('createMenu should call post', async () => {
    const data = { menuNm: 'Test', menuOrdr: 1 };
    await menuAdminService.createMenu(data);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/menus',
      method: 'post',
      data,
    });
  });
});

/** [2026-10-02 D1·D2] 메뉴 구조 읽기·저장 — 초안의 기준선과 한 번에 저장. */
describe('MenuAdminService — 메뉴 구조', () => {
  const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
  const row = (menuNo: number, extra: Record<string, unknown> = {}) => ({
    menuNo, menuNm: `메뉴${menuNo}`, upMenuSn: null, menuOrdr: menuNo, modernRoute: null, menuExpln: null, useYn: 'Y', ...extra,
  });
  const structure = { version: 's1', menus: [row(1), row(2, { upMenuSn: 1, modernRoute: '', useYn: 'N' }), row(3, { upMenuSn: 0, modernRoute: '/note', useYn: 'X' })] };
  const save: MenuStructureSave = {
    version: 's1',
    creations: [{ key: 'new-1', menuNm: '새 화면', modernRoute: '/note', menuExpln: null, useYn: 'Y' }],
    placements: [{ ref: 'new-1', parentRef: '1', menuOrdr: 1 }, { ref: '2', parentRef: '1', menuOrdr: 2 }],
    properties: [],
    deletions: [],
    grants: [{ groupCode: 'CONTENT', groupVersion: 'g1', navigationAdd: ['new-1'], navigationRemove: [], operationAdd: [] }],
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it('구조를 기준선으로 맞춰 읽는다 — 라우트 없음은 null, 최상위는 null, 사용 여부는 Y·N', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(envelope(structure));
    const result = await menuAdminService.getMenuStructure();

    expect(client.getRaw).toHaveBeenCalledWith('admin/system/menus/structure', undefined);
    expect(result.version).toBe('s1');
    expect(result.menus.map(({ menuNo, upMenuSn, modernRoute, useYn }) => ({ menuNo, upMenuSn, modernRoute, useYn }))).toEqual([
      { menuNo: 1, upMenuSn: null, modernRoute: null, useYn: 'Y' },
      { menuNo: 2, upMenuSn: 1, modernRoute: null, useYn: 'N' },
      { menuNo: 3, upMenuSn: null, modernRoute: '/note', useYn: 'N' },
    ]);
  });

  it.each([
    ['버전이 없는 응답', { ...structure, version: '' }],
    ['메뉴 번호가 겹치는 응답', { ...structure, menus: [row(1), row(1)] }],
  ])('%s은 기준선으로 쓰지 않는다', async (_label, data) => {
    vi.mocked(client.getRaw).mockResolvedValue(envelope(data));
    await expect(menuAdminService.getMenuStructure()).rejects.toThrow();
  });

  it('초안을 PUT 으로 한 번에 보내고 저장 뒤 구조를 새 기준선으로 돌려준다', async () => {
    vi.mocked(client.requestRaw).mockResolvedValue(envelope({ ...structure, version: 's2' }));
    await expect(menuAdminService.saveMenuStructure(save)).resolves.toMatchObject({ version: 's2' });
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'admin/system/menus/structure', method: 'put', data: save, timeout: 120000 });
  });

  it.each([
    [{ ...save, version: '' }, '메뉴 구조를 다시 불러온 뒤 저장해 주세요.'],
    [{ ...save, grants: [{ ...save.grants[0], groupVersion: '' }] }, '그룹 권한을 다시 불러온 뒤 저장해 주세요.'],
    [{ version: 's1', creations: [], placements: [], properties: [], deletions: [], grants: [] }, '바뀐 내용이 없습니다.'],
  ])('저장할 수 없는 초안은 전송 전에 막는다 %#', (body, message) => {
    expect(() => menuAdminService.saveMenuStructure(body)).toThrow(message);
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('서버 계약에 없는 키는 전송 전에 거부된다(생성 요청 스키마)', async () => {
    const body = { ...save, properties: [{ menuNo: 2, menuNm: '메뉴2', modernRoute: null, menuExpln: null, useYn: 'Y', upMenuSn: 1 }] };
    await expect(menuAdminService.saveMenuStructure(body as unknown as MenuStructureSave)).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});
