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
  isQnaSolved: () => false,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: harness.toast }),
}));

import HelpClient from '../HelpClient';

/**
 * [2026-09-15 DEC-OPS-100] 도움말 센터는 조회 중·조회 실패를 "등록된 … 없습니다"로 말하지 않는다.
 *
 * 종전에는 실패하면 토스트만 뜨고 목록이 빈 채로 남아, 토스트가 사라지면 데이터가 없는 것으로 읽혔다.
 * 검색어가 있으면 "검색 결과가 없습니다"로 읽혔고, FAQ 첫 조회 중에도 없음 문구가 먼저 보였다.
 */
describe('HelpClient 조회 상태', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('첫 조회가 끝나기 전에는 불러오는 중을 말하고 등록된 질문이 없다고 말하지 않는다', async () => {
    harness.getFaqs.mockReturnValue(new Promise(() => undefined));
    render(<HelpClient />);

    expect(screen.getByText('자주 묻는 질문을 불러오는 중…')).toBeInTheDocument();
    await waitFor(() => expect(harness.getFaqs).toHaveBeenCalledTimes(1));
    expect(screen.getByText('자주 묻는 질문을 불러오는 중…')).toBeInTheDocument();
    expect(screen.queryByText('등록된 자주 묻는 질문이 없습니다.')).toBeNull();
  });

  it('FAQ 조회가 실패하면 실패와 다시 시도를 말하고, 다시 시도하면 다시 조회한다', async () => {
    harness.getFaqs
      .mockRejectedValueOnce(new Error('FAQ 조회 장애'))
      .mockResolvedValue({ list: [{ faqId: 'faq-1', qstnTtl: '합성 질문' }] });
    const user = userEvent.setup();
    render(<HelpClient />);

    expect(await screen.findByText('자주 묻는 질문을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('등록된 자주 묻는 질문이 없습니다.')).toBeNull();

    await user.click(screen.getByRole('button', { name: '데이터 다시 불러오기' }));

    expect(await screen.findByRole('button', { name: /합성 질문/ })).toBeInTheDocument();
    expect(harness.getFaqs).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('자주 묻는 질문을 불러오지 못했습니다.')).toBeNull();
  });

  it('Q&A 조회가 실패하면 표가 실패를 말하고 문의 내역이 없다고 말하지 않는다', async () => {
    harness.getFaqs.mockResolvedValue({ list: [] });
    harness.getQnas.mockRejectedValue(new Error('Q&A 조회 장애'));
    const user = userEvent.setup();
    render(<HelpClient />);
    await waitFor(() => expect(harness.getFaqs).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: /1:1 Q&A 문의/ }));

    expect(await screen.findByText('Q&A 문의 내역을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(harness.getQnas).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('등록된 Q&A 문의 내역이 없습니다.')).toBeNull();
  });
});
