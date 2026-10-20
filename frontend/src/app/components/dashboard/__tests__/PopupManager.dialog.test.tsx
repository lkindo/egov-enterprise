import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-20] 공지 팝업은 접근 가능한 대화상자다.
 *
 * 종전 팝업은 px 좌표·고정 크기의 `fixed` 상자였다 — 휴대폰 폭에서 넘치고 여러 개가 겹쳤으며, `role="dialog"`·`aria-modal`·초점 이동·Esc 가
 * 없었다. 이 시험은 실제 Radix 대화상자(공용 원천 components/ui/dialog)로 이름·모달·초점 가두기·Esc·복귀를, 그리고 자리를 JS 가 아니라
 * CSS(틀 크기 기준)가 정한다는 것을 고정한다.
 */
vi.unmock('@/components/ui/dialog');

const harness = vi.hoisted(() => ({ popups: vi.fn() }));
vi.mock('@/services/business/user/PopupService', () => ({
  popupService: { getActivePopups: harness.popups },
}));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span data-testid="popup-image">{alt}</span> }));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: () => null,
  extractAtchFileSn: () => null,
}));

import { NOTICE_POPUP_PANEL_CLASS, PopupManager, noticePopupGeometry } from '../PopupManager';

const popup = (popupSn: number, popupTtlNm: string, extra: Record<string, string> = {}) => ({
  popupSn, popupTtlNm, fileUrl: 'https://example.invalid/notice.png', popupWdthPstn: '120', popupVrtcPstn: '80',
  popupVrtcSz: '300', popupWdthSz: '420', ntceBgnde: '2026-10-01', ntceEndde: '2026-10-31',
  stopvewSetupYn: 'Y', ntceYn: 'Y', ...extra,
});

function renderWithInvoker() {
  render(<><button type="button">업무 홈 단추</button><PopupManager /></>);
  const invoker = screen.getByRole('button', { name: '업무 홈 단추' });
  invoker.focus();
  return invoker;
}

describe('공지 팝업 대화상자', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('모달 대화상자로 열려 제목이 이름이 되고, 초점이 제목으로 들어와 안에 갇힌다', async () => {
    harness.popups.mockResolvedValue([popup(1, '시스템 점검 안내')]);
    const user = userEvent.setup();
    renderWithInvoker();

    const dialog = await screen.findByRole('dialog', { name: '시스템 점검 안내' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('공지');
    const title = within(dialog).getByRole('heading', { name: '시스템 점검 안내' });
    await waitFor(() => expect(title).toHaveFocus());

    // 탭 이동은 대화상자 밖으로 나가지 않는다(뒤 화면의 단추로 가지 않는다).
    for (let step = 0; step < 5; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('Esc 로 닫히고, 다 닫으면 열리기 전 초점 자리로 돌아간다', async () => {
    harness.popups.mockResolvedValue([popup(1, '시스템 점검 안내')]);
    const user = userEvent.setup();
    const invoker = renderWithInvoker();
    await screen.findByRole('dialog', { name: '시스템 점검 안내' });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(invoker).toHaveFocus());
  });

  it('여러 공지는 겹쳐 띄우지 않고 하나씩 순서대로 보인다 — 다음 공지로 넘기면 새 제목으로 초점이 간다', async () => {
    harness.popups.mockResolvedValue([popup(1, '첫 공지'), popup(2, '둘째 공지'), popup(3, '셋째 공지')]);
    const user = userEvent.setup();
    const invoker = renderWithInvoker();

    const first = await screen.findByRole('dialog', { name: '첫 공지' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getAllByTestId('notice-popup-panel')).toHaveLength(1);
    expect(first).toHaveAccessibleDescription('공지 1/3');
    await user.click(within(first).getByRole('button', { name: '다음 공지' }));

    const second = await screen.findByRole('dialog', { name: '둘째 공지' });
    expect(second).toHaveAccessibleDescription('공지 2/3');
    await waitFor(() => expect(within(second).getByRole('heading', { name: '둘째 공지' })).toHaveFocus());
    // Esc 도 지금 공지만 닫는다.
    await user.keyboard('{Escape}');

    const third = await screen.findByRole('dialog', { name: '셋째 공지' });
    expect(within(third).queryByRole('button', { name: '다음 공지' })).not.toBeInTheDocument();
    await user.click(within(third).getByRole('button', { name: '닫기' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(invoker).toHaveFocus());
  });

  it('오늘 하루 보지 않기는 그 공지만 숨기고 다음 공지로 넘어간다', async () => {
    harness.popups.mockResolvedValue([popup(1, '첫 공지'), popup(2, '둘째 공지')]);
    const user = userEvent.setup();
    renderWithInvoker();
    const first = await screen.findByRole('dialog', { name: '첫 공지' });

    await user.click(within(first).getByRole('button', { name: '오늘 하루 보지 않기' }));

    expect(localStorage.getItem('popup_hide_1')).not.toBeNull();
    expect(localStorage.getItem('popup_hide_2')).toBeNull();
    expect(await screen.findByRole('dialog', { name: '둘째 공지' })).toBeInTheDocument();
  });

  it('관리자가 다시보지않기 처리를 끄면 오늘 하루 보지 않기를 두지 않는다', async () => {
    harness.popups.mockResolvedValue([popup(1, '꼭 보아야 할 공지', { stopvewSetupYn: 'N', fileUrl: '' })]);
    renderWithInvoker();
    const dialog = await screen.findByRole('dialog', { name: '꼭 보아야 할 공지' });

    expect(within(dialog).queryByRole('button', { name: '오늘 하루 보지 않기' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '닫기' })).toBeInTheDocument();
    // 그림이 없으면 없는 자리 표시 그림을 걸지 않고 사실을 말한다.
    expect(within(dialog).getByText('등록된 이미지가 없습니다.')).toBeInTheDocument();
  });

  it('자리는 CSS 가 틀 크기로 정한다 — 휴대폰 폭은 아래쪽 시트, 넓은 폭은 저장 좌표를 틀 안으로 묶는다', async () => {
    harness.popups.mockResolvedValue([popup(1, '점검 안내')]);
    renderWithInvoker();
    const dialog = await screen.findByRole('dialog', { name: '점검 안내' });
    const panel = within(dialog).getByTestId('notice-popup-panel');

    // 틀은 화면 전체이고 컨테이너 질의(폭·높이)의 기준이다.
    expect(dialog.className).toContain('[container-type:size]');
    expect(dialog.className).toContain('inset-0');
    // 기본(휴대폰 폭) 클래스는 아래쪽 시트다.
    expect(panel.className).toContain('inset-x-0');
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('max-h-[85cqh]');
    // 넓은 폭에서만 저장 좌표·크기를 쓰고, 틀 밖으로 나가지 않게 clamp·min 으로 묶는다.
    expect(panel.className).toContain('@min-[40rem]:left-[clamp(0.5rem,var(--popup-x),calc(100cqw_-_0.5rem_-_var(--popup-w-fit)))]');
    expect(panel.className).toContain('@min-[40rem]:w-(--popup-w-fit)');
    expect(panel.className).toBe(NOTICE_POPUP_PANEL_CLASS);
    // 저장값은 CSS 변수로만 넘긴다 — 종전처럼 px 를 left/width 에 바로 넣지 않는다.
    expect(panel.style.getPropertyValue('--popup-x')).toBe('120px');
    expect(panel.style.getPropertyValue('--popup-w')).toBe('420px');
    expect(panel.style.left).toBe('');
    expect(panel.style.width).toBe('');
  });
});

describe('공지 팝업 저장 좌표·크기 읽기', () => {
  it('숫자가 아니면 기본값, 범위를 벗어나면 끝값으로 읽는다', () => {
    const style = noticePopupGeometry({
      popupWdthPstn: '999999999999', popupVrtcPstn: '-5', popupWdthSz: 'abc', popupVrtcSz: '20',
    }) as Record<string, string>;
    expect(style['--popup-x']).toBe('10000px');
    expect(style['--popup-y']).toBe('0px');
    expect(style['--popup-w']).toBe('400px');
    expect(style['--popup-h']).toBe('100px');
  });
});
