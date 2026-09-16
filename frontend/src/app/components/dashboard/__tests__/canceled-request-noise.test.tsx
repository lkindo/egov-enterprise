import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔇 취소된 요청은 콘솔 오류로 남기지 않는다.
 *
 * 인증 상태가 바뀌면 진행 중이던 배너·팝업 조회가 취소된다(authorization-state 의 CanceledError).
 * 종전에는 두 화면이 그것을 `console.error` 로 남겨, e2e 오류 감지기가 진짜 오류와 함께 세었다.
 * 2026-09-16 main 푸시 CI 에서 그 2건이 재시도 통과(flaky)를 만들어 Playwright result 계약이 red 였다.
 *
 * 진짜 실패는 그대로 남겨야 하므로 대조군을 함께 둔다 — 취소가 아니면 여전히 기록한다.
 */
const harness = vi.hoisted(() => ({
  banners: vi.fn(),
  popups: vi.fn(),
}));

vi.mock('@/services/business/user/BannerService', () => ({
  bannerService: { getReflectedBanners: harness.banners },
}));
vi.mock('@/services/business/user/PopupService', () => ({
  popupService: { getActivePopups: harness.popups },
}));

import { BannerSlider } from '../BannerSlider';
import { PopupManager } from '../PopupManager';

const canceledRequest = () => {
  const error = new Error('인증 상태가 변경되어 이전 요청 결과를 취소했습니다.');
  error.name = 'CanceledError';
  return error;
};

describe('취소된 조회는 콘솔 오류가 아니다', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('배너 조회가 취소되면 아무것도 기록하지 않는다', async () => {
    harness.banners.mockRejectedValue(canceledRequest());
    render(<BannerSlider />);
    await waitFor(() => expect(harness.banners).toHaveBeenCalledTimes(1));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('배너 조회가 실제로 실패하면 그대로 기록한다', async () => {
    harness.banners.mockRejectedValue(new Error('Request failed with status code 500'));
    render(<BannerSlider />);
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });

  it('팝업 조회가 취소되면 아무것도 기록하지 않는다', async () => {
    harness.popups.mockRejectedValue(canceledRequest());
    render(<PopupManager />);
    await waitFor(() => expect(harness.popups).toHaveBeenCalledTimes(1));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('팝업 조회가 실제로 실패하면 그대로 기록한다', async () => {
    harness.popups.mockRejectedValue(new Error('Request failed with status code 500'));
    render(<PopupManager />);
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});
