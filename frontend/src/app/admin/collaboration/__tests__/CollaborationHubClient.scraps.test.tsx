import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 협업 허브 스크랩 탭의 **등록·수정 진입점** 계약(DEC-OPS-079).
 *
 * ── 이 파일이 막는 회귀 ──────────────────────────────────────────────────────
 * §A3-1 이행으로 `insertScrap`(등록)과 `selectScrapDetail/[id]`(수정)이 page-redirect 가 됐는데
 * 이 허브는 두 라우트를 **계속 가리키고 있었다**. 결과는 둘 다 조용한 고장이었다.
 *
 *   - '스크랩 등록' → insertScrap → 스크랩 목록. 등록이라 적힌 버튼이 목록으로 떨어졌다.
 *   - 행 클릭 → selectScrapDetail/{scrapSn} → 스크랩 목록. **어느 스크랩을 눌렀는지
 *     식별자가 통째로 버려졌다.** 리다이렉트가 200 을 돌려주므로 오류도 남지 않는다.
 *
 * 같은 디렉터리의 소스 가드(`src/__tests__/a3-1-migrated-route-guard.test.ts`)는 "퇴역 라우트를
 * 가리키지 않는다" 만 본다. 그것만으로는 **링크를 지우고 아무것도 안 해도 통과**하므로,
 * 여기서 두 진입점이 실제로 모달을 여는 것과 수정 모달이 그 행의 값을 들고 오는 것을 고정한다.
 *
 * ⚠ 라우터 이동이 없다는 것도 함께 단언한다 — 모달을 열면서 동시에 이동하면 맥락(현재 탭·목록)이
 *   다시 사라지고, 그것이 이 이행이 없애려던 바로 그 손실이다.
 */

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  createScrap: vi.fn(),
  updateScrap: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  scrapRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/collaboration',
  useSearchParams: () => new URLSearchParams('tab=SCRAPS'),
}));

vi.mock('@/services/business/user/NoteService', () => ({
  noteService: { getReceivedNotes: vi.fn(async () => ({ list: [], totalCount: 0 })) },
}));

vi.mock('@/queries/scrap-query-options', () => ({
  scrapKeys: { all: ['scraps'], lists: () => ['scraps', 'list'] },
  scrapQueryOptions: {
    list: () => ({
      queryKey: ['scraps', 'list'],
      queryFn: async () => ({ list: mocks.scrapRows, totalCount: mocks.scrapRows.length }),
    }),
  },
  scrapMutationOptions: {
    create: () => ({ mutationFn: mocks.createScrap }),
    update: () => ({ mutationFn: mocks.updateScrap }),
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, success: mocks.toast, error: mocks.toast, removeToast: () => {} }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

import CollaborationHubClient from '../CollaborationHubClient';

function renderHub() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CollaborationHubClient defaultTab="SCRAPS" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scrapRows = [
    {
      scrapSn: 17,
      scrapNm: '참고 자료',
      scrapUrl: 'https://example.com/reference',
      scrapExpln: '나중에 다시 볼 것',
      useYn: 'Y',
    },
  ];
});

describe('협업 허브 스크랩 탭: 등록·수정은 라우트 이동이 아니라 모달이다', () => {
  it('행을 열면 그 스크랩의 수정 모달이 값과 함께 뜨고 라우터는 움직이지 않는다', async () => {
    const user = userEvent.setup();
    renderHub();

    const openRow = await screen.findByRole('button', { name: '참고 자료 스크랩 열기' });
    await user.click(openRow);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // 제목이 '수정' 이어야 한다 — 등록 모달이 뜨면 사용자는 새 스크랩을 만들게 된다.
    expect(await screen.findByText('스크랩 수정')).toBeInTheDocument();

    // 행의 값이 폼에 실려 와야 한다. 비어 있으면 저장 시 기존 값이 지워진다.
    expect(screen.getByTestId('scrap-name-input')).toHaveValue('참고 자료');
    expect(screen.getByTestId('scrap-url-input')).toHaveValue('https://example.com/reference');

    // 퇴역 라우트로의 이동이 남아 있으면 맥락이 다시 사라진다.
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("'스크랩 등록'은 빈 등록 모달을 열고 라우터는 움직이지 않는다", async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(await screen.findByRole('button', { name: /스크랩 등록/ }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('스크랩 등록', { selector: 'h2, h3, [id]' })).toBeInTheDocument();
    expect(screen.getByTestId('scrap-name-input')).toHaveValue('');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
