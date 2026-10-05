import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 화면 관리(구 프로그램 관리) 서버 컴포넌트 계약(2026-10-02).
 *
 * - 연결 메뉴(메뉴 구조 조회, MENU_READ)는 서버 컴포넌트가 조회하지 않는다. 서버 컴포넌트에는 권한 판정 도구가 없어,
 *   늘 조회하면 권한 없는 사람이 화면을 열 때마다 서버에 403 거부 기록(보안 실패 감사·WARN 로그)이 남는다.
 *   화면이 MENU_READ 를 확인한 뒤에만 조회한다.
 * - [D3] 메뉴명이 '화면 관리' 로 바뀌었다(사용자 사전 승인).
 * - [2026-10-04 프로그램 목록 퇴역] '이전 프로그램' 탭을 걷어 서버 컴포넌트가 읽던 프로그램 목록 첫 쪽과 그 401 로그인
 *   이동도 걷었다. 서버 컴포넌트는 아무것도 조회하지 않는다 — 화면 목록은 앱에 들어 있다.
 */
const menuAdminService = vi.hoisted(() => ({ getAllMenus: vi.fn(), getMenuStructure: vi.fn() }));
const captured = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

// 서버 컴포넌트가 메뉴를 조회하지 않는다는 것을 확인하려고 메뉴 서비스를 바꿔 둔다.
vi.mock('@/services/foundation/system/MenuAdminService', () => ({ menuAdminService }));
vi.mock('../ProgramAdminClient', () => ({
  default: (props: Record<string, unknown>) => {
    captured.props = props;
    return null;
  },
}));

import ProgramAdminPage, { metadata } from '../page';

describe('ProgramAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.props = undefined;
  });

  it('문서 제목은 화면 목적(화면 관리)으로 시작하고 설명에 이전 프로그램을 말하지 않는다', () => {
    expect(metadata.title).toMatch(/^화면 관리 \| /);
    expect(metadata.description).not.toMatch(/프로그램/);
  });

  it('로딩 중에도 제목(h1)이 화면 이름을 말한다', () => {
    // Suspense 대체 화면은 클라이언트 모듈을 기다릴 때만 보여 렌더로 잡기 어렵다 — 원문으로 확인한다.
    const source = readFileSync(join(process.cwd(), 'src/app/admin/system/programs/page.tsx'), 'utf8');
    expect(source).toContain('<h1 className="sr-only">화면 관리를 불러오는 중</h1>');
  });

  /*
   * [2026-10-05] 화면이 fill 셸이라(셸 루트가 남은 높이를 채우고 표 하나가 스크롤한다) 셸 아래에 하단 여백이나 다른 블록을
   * 두면 페이지가 다시 스크롤한다(카탈로그 §4). 종전의 pb-32(128px)는 본문 아래 패딩과 겹쳐 빈 공간만 늘렸다.
   */
  it('화면을 감싸는 하단 여백(pb-*)을 두지 않는다 — fill 셸 아래에 공간을 더하지 않는다', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/admin/system/programs/page.tsx'), 'utf8')
      .replace(/\/\/[^\n]*/g, '');
    expect(source).not.toMatch(/\bpb-\d/);
    expect(source).not.toMatch(/\bpb-\[/);
  });

  it('서버 컴포넌트는 아무것도 조회하지 않고 화면에 넘기는 값도 없다(MENU_READ 판정은 화면이 한다)', () => {
    render(ProgramAdminPage());

    expect(menuAdminService.getAllMenus).not.toHaveBeenCalled();
    expect(menuAdminService.getMenuStructure).not.toHaveBeenCalled();
    expect(captured.props).toStrictEqual({});
  });
});
