import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';

/*
 * [2026-10-05 반박 리뷰] 화면 목록 표와 넘어가는 경로 표는 같은 자리에 번갈아 그리는 같은 컴포넌트(StandardDataTable)다.
 * key 가 없으면 React 가 표 하나를 두 표에 재사용해 TanStack 정렬 상태(열 id 가 위치 기반 `col-N`)와 스크롤 상자가 두 표
 * 사이로 샌다 — 화면 목록을 '화면 이름' 내림차순으로 정렬한 채 '넘어가는 경로' 를 고르면 정렬한 적 없는 '경로' 열이
 * 내림차순이었다(리뷰 탐침 P1). 다른 테스트 파일은 표를 목으로 바꿔 이 결함을 볼 수 없으므로 실제 표로 따로 본다.
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));
const navigation = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => navigation.searchParams,
  usePathname: () => '/admin/system/programs',
}));
// 브레드크럼은 메뉴 SSOT 를 조회한다 — 이 테스트의 대상이 아니므로 응답을 고정한다.
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { getMenuStructure: vi.fn() },
}));
// 메뉴 조회 권한이 없으면 메뉴 구조를 묻지 않고 처음 보기가 바로 '전체' 다 — 정렬만 본다.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin', permissions: [], authorizationVersion: 'v1' }, loading: false }),
}));

import ProgramAdminClient from '../ProgramAdminClient';

function columnHeader(name: string): HTMLElement {
  return screen.getByRole('columnheader', { name });
}

function viewChip(label: string): HTMLElement {
  return within(screen.getByRole('group', { name: '화면 목록 보기' })).getByRole('button', { name: new RegExp(`^${label} `) });
}

describe('화면 관리 — 두 표의 상태 분리(실제 표)', () => {
  it('화면 목록을 정렬한 채 넘어가는 경로를 고르면 그 표는 정렬하지 않은 채로 시작하고, 화면 보기끼리는 정렬이 남는다', () => {
    render(<QueryClientProvider client={createAppQueryClient()}><ProgramAdminClient /></QueryClientProvider>);
    expect(viewChip('전체')).toHaveAttribute('aria-pressed', 'true');

    const sortByName = within(columnHeader('화면 이름')).getByRole('button');
    fireEvent.click(sortByName);
    fireEvent.click(within(columnHeader('화면 이름')).getByRole('button'));
    expect(columnHeader('화면 이름')).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(viewChip('넘어가는 경로'));
    expect(screen.getByRole('table', { name: '다른 화면으로 넘어가는 경로' })).toBeInTheDocument();
    expect(columnHeader('경로')).toHaveAttribute('aria-sort', 'none');

    // 화면 보기로 돌아오면 새 화면 목록 표다(넘어가는 경로 표와 바꿔 그렸다).
    fireEvent.click(viewChip('전체'));
    expect(columnHeader('화면 이름')).toHaveAttribute('aria-sort', 'none');
    // 화면 보기끼리(전체 ↔ 로그인만 하면 열리는 화면)는 같은 표라 정렬이 남는다.
    fireEvent.click(within(columnHeader('화면 이름')).getByRole('button'));
    expect(columnHeader('화면 이름')).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(viewChip('로그인만 하면 열리는 화면'));
    expect(columnHeader('화면 이름')).toHaveAttribute('aria-sort', 'ascending');
  });
});
