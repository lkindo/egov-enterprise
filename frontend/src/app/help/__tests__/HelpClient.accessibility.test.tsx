import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test-utils/axe';

const harness = vi.hoisted(() => ({
  getFaqs: vi.fn().mockResolvedValue({
    list: [{ faqId: 'faq-1', qstnTtl: '합성 접근성 질문' }],
  }),
  getFaqDetail: vi.fn().mockResolvedValue({
    faqId: 'faq-1',
    qstnTtl: '합성 접근성 질문',
    ansCn: '합성 접근성 답변',
  }),
  getQnas: vi.fn().mockResolvedValue({ list: [] }),
  toast: vi.fn(),
}));

vi.mock('@/services/business/user/help/HelpUserService', () => ({
  helpUserService: {
    getFaqs: harness.getFaqs,
    getFaqDetail: harness.getFaqDetail,
    getQnas: harness.getQnas,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: harness.toast }),
}));

import HelpClient from '../HelpClient';

describe('HelpClient accessibility semantics', () => {
  it('uses a contrast-safe large-text marker when an FAQ answer is expanded', async () => {
    // Drive the actual 300ms search debounce; wall-clock scheduling under coverage is unrelated to contrast.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let container: HTMLElement;
    try {
      ({ container } = render(<HelpClient />));
      await act(async () => { await vi.advanceTimersByTimeAsync(300); });
      expect(harness.getFaqs).toHaveBeenCalledWith({ page: 1, size: 10, keyword: '' });
    } finally {
      vi.useRealTimers();
    }
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /합성 접근성 질문/ }));
    await screen.findByText('합성 접근성 답변');

    expect(screen.getByText('A.')).toHaveClass('text-primary');
    expect(screen.getByText('A.')).not.toHaveClass('text-primary/20');
    expect(screen.getByText('합성 접근성 답변')).toBeVisible();
    // [2026-10-28 D6-2] 펼친 질문 단추·답변 영역(aria-controls·aria-labelledby)을 axe 로도 본다.
    await expectNoAxeViolations(container);
  });
});
