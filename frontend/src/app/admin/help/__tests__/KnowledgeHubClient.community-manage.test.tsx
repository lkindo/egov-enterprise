import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🏘 지식 허브 '커뮤니티 관리' 진입 계약 (DEC-OPS-037, 감사 D07-01).
 *
 * 커뮤니티 CRUD 는 관리자 API 라 버튼은 관리자에게만, 그리고 커뮤니티 탭에서만 그린다. 누르면 다이얼로그가
 * 열릴 때만 마운트된다 — 허브의 조회 훅 집합에 다이얼로그 쿼리가 끼지 않는다.
 */
const harness = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: 'tab=COMMUNITY',
  role: 'ROLE_ADMIN' as string,
  dialogRenders: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/community',
  useRouter: () => ({ push: harness.push, replace: harness.replace }),
  useSearchParams: () => new URLSearchParams(harness.search),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: harness.role } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const common = { isError: false, error: null, isLoading: false, isFetching: false, refetch: vi.fn() };
    switch (queryKey[0]) {
      case 'knowledge-articles':
        return { ...common, data: { list: [], total: 0 } };
      case 'hot-articles':
        return { ...common, data: { list: [] } };
      case 'knowledge-stats':
        return { ...common, data: { intelligenceScore: 0, totalViews: 0, topContributor: '-' } };
      case 'knowledge-activities':
        return { ...common, data: [] };
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

import KnowledgeHubClient from '../KnowledgeHubClient';

describe('KnowledgeHubClient 커뮤니티 관리 진입', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.search = 'tab=COMMUNITY';
    harness.role = 'ROLE_ADMIN';
  });

  it('관리자에게 커뮤니티 탭에서만 버튼을 그리고, 누르면 다이얼로그를 마운트한다', async () => {
    const user = userEvent.setup();
    render(<KnowledgeHubClient defaultTab="COMMUNITY" />);
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

  it('비관리자에게는 버튼을 그리지 않는다(죽은 버튼 금지)', () => {
    harness.role = 'ROLE_USER';
    render(<KnowledgeHubClient defaultTab="COMMUNITY" />);
    expect(screen.queryByRole('button', { name: '커뮤니티 관리' })).not.toBeInTheDocument();
    expect(harness.dialogRenders).not.toHaveBeenCalled();
  });
});
