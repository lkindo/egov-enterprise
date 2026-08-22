import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(await screen.findByRole('button', { name: /합성 접근성 질문/ }));

    expect(screen.getByText('A.')).toHaveClass('text-primary');
    expect(screen.getByText('A.')).not.toHaveClass('text-primary/20');
    expect(screen.getByText('합성 접근성 답변')).toBeVisible();
  });
});
