import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { popupPostingState } from '@/lib/popup-status';

/**
 * [2026-09-26 DIP V9] 팝업 게시 상태와 '오늘 하루 보지 않기'.
 *
 * - 관리 목록의 '게시 중' 은 게시 기간까지 본다(사용자 화면의 활성 팝업 판정과 같다).
 * - '오늘 하루' 는 24시간이 아니라 오늘 자정까지다.
 * - 저장소가 막힌 브라우저에서도 팝업은 뜬다 — 숨김 기록만 잃는다.
 */
const harness = vi.hoisted(() => ({ popups: vi.fn() }));
vi.mock('@/services/business/user/PopupService', () => ({
  popupService: { getActivePopups: harness.popups },
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: () => null,
  extractAtchFileSn: () => null,
}));

import { PopupManager } from '../PopupManager';

const POPUP = {
  popupSn: 7, popupTtlNm: '점검 안내', fileUrl: '', popupWdthPstn: '0', popupVrtcPstn: '0',
  popupVrtcSz: '300', popupWdthSz: '300', ntceBgnde: '2026-09-01', ntceEndde: '2026-09-30',
  stopvewSetupYn: 'Y', ntceYn: 'Y',
};

describe('팝업 게시 상태 판정', () => {
  it('🚨 게시 여부가 켜져 있어도 기간 밖이면 게시 중이라 말하지 않는다', () => {
    expect(popupPostingState(POPUP as never, '20260915')).toBe('live');
    expect(popupPostingState(POPUP as never, '20260831')).toBe('scheduled');
    expect(popupPostingState(POPUP as never, '20261001')).toBe('ended');
    expect(popupPostingState({ ...POPUP, ntceYn: 'N' } as never, '20260915')).toBe('off');
    // 오늘을 모르면(서버 렌더) 단정하지 않는다.
    expect(popupPostingState(POPUP as never, '')).toBe('unknown');
  });
});

describe('PopupManager 오늘 하루 보지 않기', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    harness.popups.mockResolvedValue([POPUP]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('🚨 숨김은 24시간이 아니라 오늘 자정까지다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 26, 23, 0, 0));
    render(<PopupManager />);

    fireEvent.click(await screen.findByRole('button', { name: '오늘 하루 보지 않기' }));

    expect(Number(localStorage.getItem('popup_hide_7'))).toBe(new Date(2026, 8, 27, 0, 0, 0).getTime());
  });

  it('🚨 저장소가 막혀도 팝업은 뜨고, 숨김을 눌러도 화면이 깨지지 않는다', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError'); });
    render(<PopupManager />);

    const hide = await screen.findByRole('button', { name: '오늘 하루 보지 않기' });
    fireEvent.click(hide);

    expect(screen.queryByRole('button', { name: '오늘 하루 보지 않기' })).toBeNull();
  });
});
