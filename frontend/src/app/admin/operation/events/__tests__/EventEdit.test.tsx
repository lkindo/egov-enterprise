/**
 * 행사 수정 계약 — 화면에 없는 값을 지우지 않는다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 행사 화면은 등록·삭제만 있었다. 수정 경로는 위아래로 다 열려 있었는데
 * (`PUT /events/{evntSn}` → `eventService.updateEvent`) 화면이 부르지 않았다.
 * 그래서 오타 하나에도 행사를 지우고 다시 만들어야 했고, **필수로 입력한 '상세 내용'(evntCn)을
 * 다시 볼 방법이 아예 없었다** — 목록 컬럼에 없고 상세 화면도 없었기 때문이다.
 *
 * 편집을 붙일 때 진짜 위험은 다른 데 있다. `PUT` 은 **전체 DTO** 를 받는데 이 폼은 다섯 필드만
 * 다룬다. 폼 값만 보내면 `picNm`·`prepMttr`·`evntTypeCd`·`evntAprvYn` 같은 화면에 없는 값이
 * **조용히 지워진다** — 저장은 성공하고 화면도 정상으로 보이므로 아무도 눈치채지 못한다.
 * 그래서 저장 payload 가 원본을 보존하는지를 이 계약의 중심에 둔다.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventManagementClient from '../EventManagementClient';

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/operation/events',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/services/foundation/operation/eventService', () => ({
  eventService: {
    getEvents: mocks.getEvents,
    getEvent: mocks.getEvent,
    createEvent: mocks.createEvent,
    updateEvent: mocks.updateEvent,
    deleteEvent: mocks.deleteEvent,
  },
}));

const ROW = {
  evntSn: 12,
  evntNm: '가을 워크숍',
  evntCn: '1박 2일 팀 빌딩',
  evntBgngYmd: '20261001',
  evntEndYmd: '20261002',
  evntUseCnt: 30,
};

/** 목록에는 없고 상세에만 있는 값들 — 저장할 때 이 값들이 지워지면 안 된다. */
const DETAIL = {
  ...ROW,
  bizYr: '2026',
  picNm: '김담당',
  prepMttr: '버스 2대 예약',
  evntTypeCd: 'WORKSHOP',
  evntAprvYn: 'Y',
  evntAprvYmd: '20260915',
};

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventManagementClient />
    </QueryClientProvider>,
  );
}

describe('행사 수정', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue({ list: [ROW], total: 1, totalPage: 1 });
    mocks.getEvent.mockResolvedValue(DETAIL);
    mocks.updateEvent.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정을 열면 상세를 조회해 폼을 채운다 — 상세 내용을 다시 볼 유일한 경로다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '가을 워크숍 수정' }));

    await waitFor(() => expect(mocks.getEvent).toHaveBeenCalledWith(12));
    expect(await screen.findByDisplayValue('1박 2일 팀 빌딩')).toBeVisible();
    expect(screen.getByDisplayValue('가을 워크숍')).toBeVisible();
    // 저장형 YYYYMMDD 를 date input 값으로 되돌려야 사용자가 다시 고르지 않아도 된다.
    expect(screen.getByDisplayValue('2026-10-01')).toBeVisible();
  });

  it('저장할 때 화면에 없는 필드를 지우지 않는다 — 조용한 데이터 손실 방지', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '가을 워크숍 수정' }));
    const title = await screen.findByDisplayValue('가을 워크숍');
    fireEvent.change(title, { target: { value: '가을 워크숍(수정)' } });

    fireEvent.click(screen.getByRole('button', { name: /변경 사항 저장/ }));

    await waitFor(() => expect(mocks.updateEvent).toHaveBeenCalledTimes(1));
    const [evntSn, payload] = mocks.updateEvent.mock.calls[0];
    expect(evntSn).toBe(12);
    expect(payload).toMatchObject({
      evntNm: '가을 워크숍(수정)',
      // 폼에 없는 값들이 원본 그대로 실려 나가야 한다.
      picNm: '김담당',
      prepMttr: '버스 2대 예약',
      evntTypeCd: 'WORKSHOP',
      evntAprvYn: 'Y',
      evntAprvYmd: '20260915',
    });
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it('등록 진입은 이전 편집 값을 물고 가지 않는다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '가을 워크숍 수정' }));
    await screen.findByDisplayValue('가을 워크숍');

    // 툴바의 '행사 등록' 버튼(모달 제출 버튼과 이름이 같으므로 첫 번째를 집는다)
    fireEvent.click(screen.getAllByRole('button', { name: /행사 등록$/ })[0]);

    expect(screen.queryByDisplayValue('가을 워크숍')).not.toBeInTheDocument();
    // 편집 모드가 풀리면 제목이 '신규 행사 등록' 으로 돌아온다.
    expect(await screen.findByText('신규 행사 등록')).toBeVisible();
  });

  it('상세 조회가 실패하면 빈 폼으로 열어 두지 않는다 — 빈 값을 저장하면 원본이 지워진다', async () => {
    mocks.getEvent.mockRejectedValue(new Error('불러오지 못했습니다.'));
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '가을 워크숍 수정' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('불러오지 못했습니다.', 'error'));
    expect(mocks.updateEvent).not.toHaveBeenCalled();
  });
});
