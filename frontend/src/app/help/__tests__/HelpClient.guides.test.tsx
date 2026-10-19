import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getFaqs: vi.fn(),
  getFaqDetail: vi.fn(),
  getQnas: vi.fn(),
  getHelpGuides: vi.fn(),
  getOnlineManuals: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/business/user/help/HelpUserService', () => ({
  helpUserService: {
    getFaqs: harness.getFaqs,
    getFaqDetail: harness.getFaqDetail,
    getQnas: harness.getQnas,
    getHelpGuides: harness.getHelpGuides,
    getOnlineManuals: harness.getOnlineManuals,
  },
  isQnaSolved: () => false,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: harness.toast }),
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => null }));

import HelpClient from '../HelpClient';

const page = <T,>(list: T[]) => ({ list, total: list.length, size: 10, page: 0, totalPage: list.length ? 1 : 0 });

/**
 * [2026-10-19] 도움말(HPCM)·온라인 매뉴얼은 관리 화면에서 등록만 되고 일반 사용자가 읽는 화면이 없었다. 도움말 센터의 두 탭이
 * 그것을 읽는다. 비어 있으면 '아직 등록된 … 없다' 는 사실만 말하고, 조회 중·실패를 빈 상태로 말하지 않는다.
 */
describe('HelpClient 도움말·온라인 매뉴얼 열람', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.getFaqs.mockResolvedValue(page([]));
    harness.getQnas.mockResolvedValue(page([]));
  });

  it('도움말 탭은 열람 목록을 불러와 제목과 설명(줄바꿈 포함)을 보인다', async () => {
    harness.getHelpGuides.mockResolvedValue(page([
      { id: '1', title: '비밀번호 변경', description: '내 정보에서 바꿉니다.\n임시 비밀번호는 먼저 바꿔야 합니다.' },
    ]));
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(screen.getByRole('tab', { name: /^도움말$/ }));

    const list = await screen.findByRole('list', { name: '도움말 목록' });
    const item = within(list).getByRole('article', { name: '비밀번호 변경' });
    expect(item).toHaveTextContent('내 정보에서 바꿉니다.');
    expect(item).toHaveTextContent('임시 비밀번호는 먼저 바꿔야 합니다.');
    expect(harness.getHelpGuides).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 10, keyword: '' }));
    expect(harness.getOnlineManuals).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /^도움말$/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('온라인 매뉴얼 탭은 리소스 경로가 있을 때만 그것을 보인다', async () => {
    harness.getOnlineManuals.mockResolvedValue(page([
      { id: '7', title: '전자결재 사용법', description: '결재 상신과 승인 절차', resourcePath: '/docs/manuals/approval' },
      { id: '8', title: '쪽지 사용법', description: '' },
    ]));
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(screen.getByRole('tab', { name: /온라인 매뉴얼/ }));

    const list = await screen.findByRole('list', { name: '온라인 매뉴얼 목록' });
    expect(within(list).getByRole('article', { name: '전자결재 사용법' })).toHaveTextContent('리소스 경로: /docs/manuals/approval');
    const empty = within(list).getByRole('article', { name: '쪽지 사용법' });
    expect(empty).toHaveTextContent('등록된 설명이 없습니다.');
    expect(empty).not.toHaveTextContent('리소스 경로');
  });

  it.each([
    ['도움말', /^도움말$/, harness.getHelpGuides, '아직 등록된 도움말이 없습니다.'],
    ['온라인 매뉴얼', /온라인 매뉴얼/, harness.getOnlineManuals, '아직 등록된 온라인 매뉴얼이 없습니다.'],
  ] as const)('%s 이 비어 있으면 아직 등록된 것이 없다고 말하고, 검색어가 있으면 검색 결과가 없다고 말한다', async (_label, tabName, load, empty) => {
    load.mockResolvedValue(page([]));
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(screen.getByRole('tab', { name: tabName }));
    expect(await screen.findByText(empty)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '도움말 키워드 검색' }), { target: { value: '결재' } });
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, keyword: '결재' })));
    expect(await screen.findByText('"결재"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText(empty)).toBeNull();
  });

  it('조회 중과 조회 실패를 빈 상태로 말하지 않고, 실패는 다시 시도할 수 있다', async () => {
    let fail = true;
    let release!: () => void;
    harness.getHelpGuides.mockImplementation(() => (fail
      ? Promise.reject(new Error('network'))
      : new Promise((resolve) => { release = () => resolve(page([{ id: '1', title: '다시 불러온 도움말', description: '설명' }])); })));
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(screen.getByRole('tab', { name: /^도움말$/ }));
    expect(await screen.findByText('도움말을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('아직 등록된 도움말이 없습니다.')).toBeNull();

    fail = false;
    await user.click(screen.getByRole('button', { name: '데이터 다시 불러오기' }));
    expect(await screen.findByText('도움말을 불러오는 중…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText('아직 등록된 도움말이 없습니다.')).toBeNull();
    release();
    expect(await screen.findByRole('article', { name: '다시 불러온 도움말' })).toBeInTheDocument();
  });

  it('도움말에서 온라인 매뉴얼로 옮기면 앞 탭의 목록을 다음 탭의 내용처럼 남기지 않는다', async () => {
    harness.getHelpGuides.mockResolvedValue(page([{ id: '1', title: '도움말 한 건', description: '설명' }]));
    let release!: () => void;
    harness.getOnlineManuals.mockImplementation(() => new Promise((resolve) => { release = () => resolve(page([])); }));
    const user = userEvent.setup();
    render(<HelpClient />);

    await user.click(screen.getByRole('tab', { name: /^도움말$/ }));
    expect(await screen.findByRole('article', { name: '도움말 한 건' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /온라인 매뉴얼/ }));
    expect(screen.queryByRole('article', { name: '도움말 한 건' })).toBeNull();
    await waitFor(() => expect(harness.getOnlineManuals).toHaveBeenCalled());
    release();
    expect(await screen.findByText('아직 등록된 온라인 매뉴얼이 없습니다.')).toBeInTheDocument();
  });
});
