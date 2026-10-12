import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🏘 지식 허브 '커뮤니티 관리' 진입 계약 (DEC-OPS-037, 감사 D07-01).
 *
 * [허브 분해 H2] 커뮤니티 탭과 그 머리 동작은 커뮤니티의 hub-tabs 기여다. 그래서 이 시험은 커뮤니티 디렉터리에 두고 실제 레지스트리로
 * 지식 허브를 그린다 — 커뮤니티가 빠진 구성에서는 기능과 함께 지워진다.
 *
 * 커뮤니티 CRUD 는 관리자 API 라 버튼은 관리자에게만, 그리고 커뮤니티 탭에서만 그린다. 누르면 다이얼로그가
 * 열릴 때만 마운트된다 — 허브의 조회 훅 집합에 다이얼로그 쿼리가 끼지 않는다.
 */
const harness = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: 'tab=COMMUNITY',
  role: 'ROLE_ADMIN' as string,
  permissions: ['COMMUNITY_READ_ALL', 'BBS_MST_READ'] as string[],
  dialogRenders: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/community',
  useRouter: () => ({ push: harness.push, replace: harness.replace }),
  useSearchParams: () => new URLSearchParams(harness.search),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: harness.role, permissions: harness.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, select }: { queryKey: string[]; select?: (data: unknown) => unknown }) => {
    const common = { isError: false, error: null, isLoading: false, isFetching: false, refetch: vi.fn() };
    switch (queryKey[0]) {
      case 'knowledge-articles':
        return { ...common, data: select ? select({ list: [], total: 0 }) : { list: [], total: 0 } };
      case 'hot-articles':
        return { ...common, data: { list: [] } };
      case 'knowledge-stats':
        return { ...common, data: { totalViews: 0, topContributor: '-' } };
      default:
        throw new Error(`unexpected query: ${queryKey[0]}`);
    }
  },
}));
vi.mock('@/components/business/community/CommunityManageDialog', () => ({
  CommunityManageDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    harness.dialogRenders(isOpen);
    return isOpen ? (
      <div role="dialog" aria-label="커뮤니티 관리">
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    ) : null;
  },
}));

import KnowledgeHubClient from '@/app/admin/help/KnowledgeHubClient';

describe('KnowledgeHubClient 커뮤니티 관리 진입', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.search = 'tab=COMMUNITY';
    harness.role = 'ROLE_ADMIN';
    harness.permissions = ['COMMUNITY_READ_ALL', 'BBS_MST_READ'];
  });

  it('관리자에게 커뮤니티 탭에서만 버튼을 그리고, 누르면 다이얼로그를 마운트한다', async () => {
    const user = userEvent.setup();
    render(<KnowledgeHubClient />);
    expect(harness.dialogRenders).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '커뮤니티 관리' }));
    expect(screen.getByRole('dialog', { name: '커뮤니티 관리' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog', { name: '커뮤니티 관리' })).not.toBeInTheDocument();
  });

  it('위키·FAQ 탭에서는 노출하지 않는다', () => {
    harness.search = 'tab=FAQ';
    render(<KnowledgeHubClient defaultTab="FAQ" />);
    expect(screen.queryByRole('button', { name: '커뮤니티 관리' })).not.toBeInTheDocument();
  });

  // [2026-10-01 결정 20] 커뮤니티 탭은 권한과 무관하게 커뮤니티를 찾고 가입하는 목록 화면으로 잇는다.
  it('커뮤니티 탭은 권한과 무관하게 커뮤니티 목록·가입 화면으로 잇는다', async () => {
    const user = userEvent.setup();
    harness.role = 'ROLE_USER';
    harness.permissions = [];
    render(<KnowledgeHubClient />);
    await user.click(screen.getByRole('button', { name: /커뮤니티 목록·가입/ }));
    expect(harness.push).toHaveBeenCalledWith('/cop/cmy/selectCommunityList');
  });

  it('비관리자에게는 버튼을 그리지 않는다(죽은 버튼 금지)', () => {
    harness.role = 'ROLE_USER';
    harness.permissions = [];
    render(<KnowledgeHubClient />);
    expect(screen.queryByRole('button', { name: '커뮤니티 관리' })).not.toBeInTheDocument();
    expect(harness.dialogRenders).not.toHaveBeenCalled();
  });
});
