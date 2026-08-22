import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getFaqs: vi.fn(),
  getFaqDetail: vi.fn(),
  getQnas: vi.fn(),
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

const FAQ_LIST_ITEM = {
  faqId: 'faq-1',
  qstnTtl: '계정 잠금은 어떻게 해제하나요?',
  inqCnt: 0,
  mdfcnDt: '2026-08-21T00:00:00Z',
};

describe('HelpClient FAQ detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.getFaqs.mockResolvedValue({ list: [FAQ_LIST_ITEM] });
    harness.getQnas.mockResolvedValue({ list: [] });
  });

  it('lazy-loads an answer on expand, exposes loading, and renders response text without markup injection', async () => {
    const user = userEvent.setup();
    let resolveDetail!: (value: { faqId: string; qstnTtl: string; ansCn: string }) => void;
    harness.getFaqDetail.mockReturnValueOnce(new Promise((resolve) => {
      resolveDetail = resolve;
    }));
    const { container } = render(<HelpClient />);

    const question = await screen.findByRole('button', { name: /계정 잠금은 어떻게 해제하나요/ });
    expect(screen.queryByText('안전한 상세 답변')).not.toBeInTheDocument();

    await user.click(question);

    expect(harness.getFaqDetail).toHaveBeenCalledTimes(1);
    expect(harness.getFaqDetail).toHaveBeenCalledWith('faq-1');
    expect(screen.getByRole('status')).toHaveTextContent('답변을 불러오는 중입니다.');

    resolveDetail({
      faqId: 'faq-1',
      qstnTtl: FAQ_LIST_ITEM.qstnTtl,
      ansCn: '안전한 상세 답변 <img src=x onerror=alert(1)>',
    });

    expect(await screen.findByText('안전한 상세 답변 <img src=x onerror=alert(1)>')).toBeVisible();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('shows an inline error, retries only the failed detail, and preserves the search value', async () => {
    const user = userEvent.setup();
    harness.getFaqDetail
      .mockRejectedValueOnce(new Error('synthetic detail failure'))
      .mockResolvedValueOnce({
        faqId: 'faq-1',
        qstnTtl: FAQ_LIST_ITEM.qstnTtl,
        ansCn: '재시도 후 상세 답변',
      });
    render(<HelpClient />);

    const search = screen.getByRole('textbox', { name: '도움말 키워드 검색' });
    await user.type(search, '계정');
    await user.click(await screen.findByRole('button', { name: /계정 잠금은 어떻게 해제하나요/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('답변을 불러오지 못했습니다.');
    expect(search).toHaveValue('계정');

    await user.click(screen.getByRole('button', { name: '답변 다시 불러오기' }));

    expect(await screen.findByText('재시도 후 상세 답변')).toBeVisible();
    expect(harness.getFaqDetail).toHaveBeenCalledTimes(2);
    expect(search).toHaveValue('계정');
    await waitFor(() => {
      expect(harness.getFaqs).toHaveBeenLastCalledWith({ keyword: '계정' });
    });
  });
});
