import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 화면 관리(구 프로그램 관리) 서버 컴포넌트 계약(2026-10-02).
 *
 * - 연결 메뉴(메뉴 구조 조회, MENU_READ)는 서버 컴포넌트가 조회하지 않는다. 이 화면은 PROGRAM_READ 만으로
 *   들어올 수 있는데 서버 컴포넌트에는 권한 판정 도구가 없어, 늘 조회하면 권한 없는 사람이 화면을 열 때마다
 *   서버에 403 거부 기록(보안 실패 감사·WARN 로그)이 남는다. 화면이 MENU_READ 를 확인한 뒤에만 조회한다.
 * - [D3] 메뉴명이 '화면 관리' 로 바뀌었다(사용자 사전 승인). 서버 컴포넌트는 '이전 프로그램' 탭의 첫 쪽만 읽는다.
 * - 401 은 종전과 같은 한 경로로 로그인에 보낸다(라우트 원장의 redirect 관측값과 같다).
 */
const programAdminService = vi.hoisted(() => ({ getProgramList: vi.fn() }));
const menuAdminService = vi.hoisted(() => ({ getAllMenus: vi.fn(), getMenuStructure: vi.fn() }));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
const captured = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => name === 'accessToken' ? { value: 'token' } : undefined,
  })),
}));
vi.mock('next/navigation', () => ({ redirect: navigation.redirect }));
vi.mock('@/services/foundation/system/ProgramAdminService', () => ({ programAdminService }));
// 서버 컴포넌트가 메뉴를 조회하지 않는다는 것을 확인하려고 메뉴 서비스도 바꿔 둔다.
vi.mock('@/services/foundation/system/MenuAdminService', () => ({ menuAdminService }));
vi.mock('../ProgramAdminClient', () => ({
  default: (props: Record<string, unknown>) => {
    captured.props = props;
    return null;
  },
}));

import ProgramAdminPage, { metadata } from '../page';

const AUTH = { headers: { Authorization: 'Bearer token' } };
const PAGE = { list: [{ prgrmFileNm: 'PROG_1', prgrmKornNm: '프로그램', url: '/p', prgrmStrgPath: '/' }], total: 1, page: 1, size: 10, totalPage: 1 };

describe('ProgramAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.props = undefined;
    programAdminService.getProgramList.mockResolvedValue(PAGE);
  });

  it('문서 제목은 화면 목적(화면 관리)으로 시작한다', () => {
    expect(metadata.title).toMatch(/^화면 관리 \| /);
  });

  it('로딩 중에도 제목(h1)이 화면 이름을 말한다', () => {
    // Suspense 대체 화면은 클라이언트 모듈을 기다릴 때만 보여 렌더로 잡기 어렵다 — 원문으로 확인한다.
    const source = readFileSync(join(process.cwd(), 'src/app/admin/system/programs/page.tsx'), 'utf8');
    expect(source).toContain('<h1 className="sr-only">화면 관리를 불러오는 중</h1>');
  });

  it('프로그램 목록만 조회하고 메뉴 전체 조회는 보내지 않는다(MENU_READ 판정은 화면이 한다)', async () => {
    render(await ProgramAdminPage({ searchParams: Promise.resolve({}) }));

    expect(programAdminService.getProgramList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10, pageUnit: 10 }),
      AUTH,
    );
    expect(menuAdminService.getAllMenus).not.toHaveBeenCalled();
    expect(menuAdminService.getMenuStructure).not.toHaveBeenCalled();
    expect(captured.props?.initialData).toStrictEqual(PAGE);
    expect(captured.props?.initialError).toBeNull();
    expect(captured.props).not.toHaveProperty('menuLinks');
  });

  it('프로그램 조회가 401 이면 같은 한 경로로 로그인에 보낸다', async () => {
    programAdminService.getProgramList.mockRejectedValue({ response: { status: 401 } });

    await expect(ProgramAdminPage({ searchParams: Promise.resolve({}) }))
      .rejects.toThrow('NEXT_REDIRECT:/login?expired=true&redirect=/admin/system/programs');
    expect(navigation.redirect).toHaveBeenCalledTimes(1);
  });
});
