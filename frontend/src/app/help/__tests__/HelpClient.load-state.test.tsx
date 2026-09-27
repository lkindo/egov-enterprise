import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// 메뉴 경로 해석은 별도 계약이다. 이 시험은 도움말 목록의 조회·페이지 전환만 구동한다.
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => null }));

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

  it.each([['faq', 10], ['qna', 4]] as const)('페이지 탐색: %s 11번째 항목에 도달하고 검색·탭 전환은 첫 페이지로 돌아간다', async (tab, pageSize) => {
    const faqs = Array.from({ length: 11 }, (_, index) => ({ faqId: String(index + 1), qstnTtl: `도움말 항목 ${index + 1}` }));
    const qnas = faqs.map((faq) => ({ qaId: faq.faqId, qstnTtl: faq.qstnTtl, wrterNm: '테스트 작성자', writngDe: '2026-09-27' }));
    const respond = (items: typeof faqs | typeof qnas, params: { page?: number; keyword?: string }) => {
      const filtered = items.filter((item) => item.qstnTtl.includes(params.keyword || ''));
      const page = params.page ?? 0;
      return { list: filtered.slice(page * pageSize, (page + 1) * pageSize), total: filtered.length, size: pageSize, page, totalPage: Math.ceil(filtered.length / pageSize) };
    };
    harness.getFaqs.mockImplementation(async (params) => respond(faqs, params));
    harness.getQnas.mockImplementation(async (params) => respond(qnas, params));
    const user = userEvent.setup();
    render(<HelpClient />);
    await screen.findByRole('button', { name: /도움말 항목 1(?!\d)/ });
    if (tab === 'qna') {
      await user.click(screen.getByRole('tab', { name: /1:1 Q&A 문의/ }));
      await screen.findByText('도움말 항목 1');
    }
    const getList = tab === 'faq' ? harness.getFaqs : harness.getQnas;
    await user.click(screen.getByRole('link', { name: /^1$/ }));
    expect(screen.queryByText('자주 묻는 질문을 불러오는 중…')).toBeNull();
    for (let page = 1; page < Math.ceil(11 / pageSize); page++) {
      await user.click(screen.getByRole('link', { name: '다음 페이지로 이동' }));
      if (tab === 'faq') await screen.findByRole('button', { name: new RegExp(`도움말 항목 ${page * pageSize + 1}(?!\\d)`) });
      else await screen.findByText(`도움말 항목 ${page * pageSize + 1}`);
      expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({ page, size: pageSize }));
    }
    expect(screen.getByText('도움말 항목 11', { exact: false })).toBeVisible();
    expect(screen.getByRole('link', { name: '다음 페이지로 이동' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: '도움말 키워드 검색' }), { target: { value: '항목 11' } });
    await waitFor(() => expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, keyword: '항목 11' })));
    expect(await screen.findByText('도움말 항목 11', { exact: false })).toBeVisible();
    expect(screen.queryByRole('link', { name: '다음 페이지로 이동' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: tab === 'faq' ? /1:1 Q&A 문의/ : /FAQ 자주 묻는 질문/ }));
    const other = tab === 'faq' ? harness.getQnas : harness.getFaqs;
    await waitFor(() => expect(other).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, keyword: '항목 11' })));
  });

  it('페이지 탐색: 늦은 이전 FAQ 응답을 무시하고 다음 페이지 실패를 재시도한다', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    harness.getFaqs.mockResolvedValueOnce({ list: [{ faqId: '1', qstnTtl: '첫 페이지' }], total: 11, size: 10 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockRejectedValueOnce(new Error('검색 장애'))
      .mockResolvedValueOnce({ list: [{ faqId: '12', qstnTtl: '새 검색 결과' }], total: 1, size: 10 });
    const user = userEvent.setup();
    render(<HelpClient />);
    await screen.findByRole('button', { name: /첫 페이지/ });
    await user.click(screen.getByRole('link', { name: '다음 페이지로 이동' }));
    await waitFor(() => expect(harness.getFaqs).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole('textbox', { name: '도움말 키워드 검색' }), { target: { value: '새 검색' } });
    await screen.findByText('자주 묻는 질문을 불러오지 못했습니다.');
    await user.click(screen.getByRole('button', { name: '데이터 다시 불러오기' }));
    expect(await screen.findByRole('button', { name: /새 검색 결과/ })).toBeVisible();
    await act(async () => resolveOld({ list: [{ faqId: '11', qstnTtl: '늦은 이전 결과' }], total: 11, size: 10 }));
    expect(screen.queryByRole('button', { name: /늦은 이전 결과/ })).toBeNull();
    expect(screen.getByRole('button', { name: /새 검색 결과/ })).toBeVisible();
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

  it('한 탭의 조회 실패를 다른 탭으로 옮겨 보이지 않는다', async () => {
    harness.getFaqs.mockRejectedValue(new Error('FAQ 조회 장애'));
    harness.getQnas.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    render(<HelpClient />);

    expect(await screen.findByText('자주 묻는 질문을 불러오지 못했습니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /1:1 Q&A 문의/ }));

    expect(screen.queryByText('자주 묻는 질문을 불러오지 못했습니다.')).toBeNull();
  });
});
