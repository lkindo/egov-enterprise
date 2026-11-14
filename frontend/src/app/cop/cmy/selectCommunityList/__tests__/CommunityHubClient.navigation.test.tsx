import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import CommunityHubClient from '../CommunityHubClient';
import type { CommunityVO } from '@/types/business/community';
import type { PageResponse } from '@/types/foundation/system';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'reader', esntlId: 'reader-key', authorizationVersion: 'v1' } }) }));
vi.mock('@/services/business/user/community/CommunityUserService', () => ({ communityUserService: { getCommunityList: vi.fn() } }));
// The page shell is unrelated; keep the real table, Link, Button and Slot rendering.
vi.mock('@/app/components/patterns/work-list-page', () => ({ WorkListPage: ({ children }: { children: ReactNode }) => <main>{children}</main> }));

describe('community detail navigation semantics', () => {
  it.each([['개발 커뮤니티', '개발 커뮤니티 상세 보기'], ['', '커뮤니티 상세 보기']])(
    '%s 상세 이동은 이름 있는 단일 링크이며 키보드 포커스가 한 번만 머문다', async (name, label) => {
      const initialData: PageResponse<CommunityVO> = {
        list: [{ cmntySn: 17, cmntyNm: name, cmntyIntroCn: '공유 공간', useYn: 'Y' }],
        total: 1, page: 1, size: 10, totalPage: 1,
      };
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      const user = userEvent.setup();
      render(<QueryClientProvider client={client}><CommunityHubClient initialData={initialData} /><button type="button">목록 다음</button></QueryClientProvider>);
      const link = await screen.findByRole('link', { name: label });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/cop/cmy/selectCommunityDetail/17');
      expect(within(link).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
      for (let count = 0; count < 20 && document.activeElement !== link; count++) await user.tab();
      expect(link).toHaveFocus();
      await user.tab();
      expect(link.contains(document.activeElement)).toBe(false);
      await user.tab({ shift: true });
      expect(link).toHaveFocus();
      client.clear();
    },
  );
});
