import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const menuAdminService = vi.hoisted(() => ({ getMenuStructure: vi.fn(), getAllMenus: vi.fn() }));
const captured = vi.hoisted(() => ({
  structurePromise: undefined as Promise<unknown> | undefined,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => name === 'accessToken' ? { value: 'token' } : undefined,
  })),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({ menuAdminService }));
vi.mock('../MenuAdminClient', () => ({
  default: (props: { structurePromise: Promise<unknown> }) => {
    captured.structurePromise = props.structurePromise;
    return null;
  },
}));

import MenuAdminPage from '../page';

/**
 * [2026-10-02 D1·D2] 메뉴 화면은 메뉴 구조(버전 포함) 하나만 서버에서 읽는다 — MENU_READ 만으로 화면이 완전해야 한다.
 * 종전에는 수정 창의 '연결 프로그램' 선택지 때문에 프로그램 목록(PROGRAM_READ)도 모든 쪽을 읽었다. 2026-10-04 프로그램 목록
 * 퇴역으로 그 서비스(ProgramAdminService)가 없어져 '읽지 않는다' 단언은 늘 참이 되므로 걷었다 — 서버 컴포넌트가 읽는 서비스는
 * 메뉴 서비스 하나뿐이고, 아래 단언이 그 호출을 정확히 본다.
 */
describe('MenuAdminPage 메뉴 구조 조회 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.structurePromise = undefined;
  });

  it('인증 헤더로 메뉴 구조를 읽어 봉투에 담아 넘기고, 캐시된 메뉴 목록은 읽지 않는다', async () => {
    const structure = { version: 'v1', menus: [] };
    menuAdminService.getMenuStructure.mockResolvedValue(structure);

    render(await MenuAdminPage());

    await waitFor(() => expect(menuAdminService.getMenuStructure).toHaveBeenCalledTimes(1));
    expect(menuAdminService.getMenuStructure).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer token' } });
    await expect(captured.structurePromise).resolves.toStrictEqual({ data: structure, error: null });
    expect(menuAdminService.getAllMenus).not.toHaveBeenCalled();
  });

  it('조회 실패를 빈 구조로 삼키지 않고 사용자 문장 사유를 봉투에 담는다', async () => {
    menuAdminService.getMenuStructure.mockRejectedValue({ response: { data: { message: '메뉴 조회 권한이 없습니다.' } } });

    render(await MenuAdminPage());

    await expect(captured.structurePromise).resolves.toStrictEqual({ data: null, error: '메뉴 조회 권한이 없습니다.' });
  });

  it('전송 원문(Network Error)은 사용자 문장으로 쓰지 않는다', async () => {
    menuAdminService.getMenuStructure.mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }));

    render(await MenuAdminPage());

    await expect(captured.structurePromise).resolves.toStrictEqual({ data: null, error: '메뉴 구조를 불러오지 못했습니다.' });
  });
});
