/**
 * 행사 **등록** 제출 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 기존 단위 계약(`EventEdit.test.tsx`)은 전부 **수정** 경로만 다뤘다. 등록 제출은 e2e
 * (`02-admin-system.spec.ts` Full Event Lifecycle)만 덮고 있었고, 그 e2e 는 서비스가 필요해
 * 로컬에서 돌지 않는다 — 즉 등록이 깨져도 로컬 검증은 전부 green 이었다.
 *
 * 실제로 그렇게 깨졌다(PR #508 CI). 그래서 e2e 가 채우는 것과 **똑같은 입력만** 채우고
 * 제출하는 계약을 단위 계층에 둔다. e2e page object 가 채우는 항목은 정확히 다섯이다:
 * 행사 명칭 · 상세 내용 · 시작일 · 종료일 · 참여 정원.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventManagementClient />
    </QueryClientProvider>,
  );
}

/** e2e page object(OpsDetailPage.createEvent)가 채우는 것과 같은 항목만 채운다. */
async function fillLikeE2e() {
  renderClient();
  fireEvent.click(await screen.findByRole('button', { name: /행사 등록/ }));
  const dialog = within(await screen.findByRole('dialog'));

  fireEvent.change(dialog.getByPlaceholderText('행사 명칭을 입력하십시오'), {
    target: { value: 'E2E 워크숍' },
  });
  fireEvent.change(dialog.getByPlaceholderText('상세 내용을 입력하십시오'), {
    target: { value: 'E2E 상세 내용' },
  });

  const dates = Array.from(
    screen.getByRole('dialog').querySelectorAll('input[type="date"]'),
  ) as HTMLInputElement[];
  expect(dates, 'e2e 는 date 입력이 정확히 2개라고 가정한다').toHaveLength(2);
  fireEvent.change(dates[0], { target: { value: '2026-10-01' } });
  fireEvent.change(dates[1], { target: { value: '2026-10-02' } });

  /*
    e2e page object 는 라벨이 아니라 **타입 셀렉터**로 집는다:
      dialog.locator('input[type="date"]')  → toHaveCount(2) 를 단언
      dialog.locator('input[type="number"]').fill(...)  → 여러 개면 strict 위반
    로컬 계약도 같은 방식으로 집어야 개수 모호성을 잡는다.
  */
  const dialogEl = screen.getByRole('dialog');
  const numberInputs = dialogEl.querySelectorAll('input[type="number"]');
  expect(numberInputs, 'e2e 는 number 입력이 정확히 1개라고 가정한다').toHaveLength(1);

  fireEvent.change(numberInputs[0], { target: { value: '30' } });

  return dialog;
}

describe('행사 등록 제출 — e2e 가 채우는 입력만으로 저장된다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.createEvent.mockResolvedValue(1);
    mocks.confirm.mockResolvedValue(true);
  });

  it('담당자·준비사항을 비워 두어도 등록이 나간다', async () => {
    /*
     * 담당자(picNm)·준비사항(prepMttr)은 서버가 요구하지 않으므로 화면도 요구하지 않는다.
     * 이 둘을 필수로 만들면 e2e 뿐 아니라 실제 사용자도 등록을 못 한다.
     */
    const dialog = await fillLikeE2e();

    fireEvent.click(dialog.getByRole('button', { name: '행사 등록' }));

    await waitFor(() => expect(mocks.createEvent).toHaveBeenCalledTimes(1));
    expect(mocks.createEvent.mock.calls[0][0]).toMatchObject({
      evntNm: 'E2E 워크숍',
      evntCn: 'E2E 상세 내용',
      evntUseCnt: 30,
    });
  });

  it('담당자·준비사항을 채우면 그대로 실려 나간다', async () => {
    const dialog = await fillLikeE2e();
    fireEvent.change(dialog.getByLabelText('담당자'), { target: { value: '김담당' } });
    fireEvent.change(dialog.getByLabelText('준비사항'), { target: { value: '버스 2대' } });

    fireEvent.click(dialog.getByRole('button', { name: '행사 등록' }));

    await waitFor(() => expect(mocks.createEvent).toHaveBeenCalledTimes(1));
    expect(mocks.createEvent.mock.calls[0][0]).toMatchObject({
      picNm: '김담당',
      prepMttr: '버스 2대',
    });
  });
});
