/**
 * 도움말 Q&A — 문의 등록 경로와 상태·범위 문구 계약.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * 1. **문의를 남길 방법이 없었다.** '새로운 문의 작성' 버튼은 `disabled` 에 onClick 도 대상
 *    라우트도 없는 死버튼이었다(카탈로그 G10). 그런데 경로는 위아래로 다 열려 있었다 —
 *    `helpUserService.createQna` 가 이미 있었고 `POST /api/v1/boards/posts` 는 클래스 레벨
 *    `@Authenticated` 라 로그인 사용자면 누구나 쓸 수 있다. 화면만 연결돼 있지 않았다.
 *
 * 2. **상태를 지어냈다.** `qnaProcessSttusCode` 를 `ansLv > 0 ? '3' : '1'` 로 파생했는데
 *    `ansLv` 는 그 글 자신의 답글 깊이다. 질문 글은 답변이 달려도 영원히 '접수' 로 남고,
 *    답변 글 자체가 '답변완료' 로 보였다. 서버는 실제 상태 컬럼(`qnaSttsCd`)을 이미
 *    내려주고 있었다(BoardDto).
 *
 * 3. **그 상태를 결재 어휘로 표시했다.** `StatusBadge` 의 기본 라벨이라 답변 상태가
 *    '승인'/'대기' 로 나왔다.
 *
 * 4. **목록 범위를 과장했다.** 제목이 '나의 문의 내역' 이었지만 서버는 이 게시판의 공개 글
 *    전체에 내 비밀 글을 더해 돌려준다(BoardPredicate: `scrtYn='N' OR userId=나`).
 *    개인 목록으로 부르면 남의 공개 문의가 내 것처럼 읽힌다.
 *
 * 등록은 `scrtYn: 'Y'` 로 보낸다 — 화면이 '1:1 문의' 라고 부르는 이상 열람 경계가 그래야
 * 하고, 그 경계를 집행하는 것은 화면 문구가 아니라 이 필드다.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getFaqs: vi.fn(),
  getQnas: vi.fn(),
  createQna: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/business/user/help/HelpUserService', () => ({
  helpUserService: {
    getFaqs: harness.getFaqs,
    getFaqDetail: vi.fn(),
    getQnas: harness.getQnas,
    createQna: harness.createQna,
  },
  isQnaSolved: (code?: string) => code === 'SOLVED',
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: harness.toast }) }));

import HelpClient from '../HelpClient';

const openQnaTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('tab', { name: /1:1 Q&A 문의/ }));
  await screen.findByText('문의 내역');
};

/** 목록에도 '제목' 열이 있으므로 폼 조회는 모달 안으로 범위를 좁힌다. */
const askForm = async () => within(await screen.findByRole('dialog', { name: '1:1 문의 작성' }));

describe('도움말 Q&A — 문의 등록', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.getFaqs.mockResolvedValue({ list: [] });
    harness.getQnas.mockResolvedValue({ list: [] });
    harness.createQna.mockResolvedValue(undefined);
  });

  it('문의 작성 버튼이 살아 있다 — 종전에는 disabled 死버튼이었다', async () => {
    const user = userEvent.setup();
    render(<HelpClient />);
    await openQnaTab(user);

    expect(screen.getByRole('button', { name: /새로운 문의 작성/ })).toBeEnabled();
  });

  it('제목과 내용을 채우면 문의가 등록되고 목록을 다시 읽는다', async () => {
    const user = userEvent.setup();
    render(<HelpClient />);
    await openQnaTab(user);
    const callsBefore = harness.getQnas.mock.calls.length;

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    const form = await askForm();
    await user.type(form.getByLabelText(/제목/), '로그인이 안 됩니다');
    await user.type(form.getByLabelText(/내용/), '비밀번호를 바꾼 뒤부터 로그인되지 않습니다.');
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    await waitFor(() => expect(harness.createQna).toHaveBeenCalledTimes(1));
    expect(harness.createQna).toHaveBeenCalledWith({
      qstnTtl: '로그인이 안 됩니다',
      qstnCn: '비밀번호를 바꾼 뒤부터 로그인되지 않습니다.',
    });
    // 방금 쓴 글이 보이지 않으면 등록됐는지 사용자가 확인할 수 없다.
    await waitFor(() => expect(harness.getQnas.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('빈 제목·내용은 보내지 않고 그 사실을 화면에 말한다', async () => {
    const user = userEvent.setup();
    render(<HelpClient />);
    await openQnaTab(user);

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    await user.click(await screen.findByRole('button', { name: '문의 등록' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('제목과 내용을 모두 입력해 주세요.');
    expect(harness.createQna).not.toHaveBeenCalled();
  });

  it('등록에 실패하면 입력을 지우지 않고 사유를 모달에도 남긴다', async () => {
    const user = userEvent.setup();
    harness.createQna.mockRejectedValueOnce(new Error('문의 등록 권한이 없습니다.'));
    render(<HelpClient />);
    await openQnaTab(user);

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    const form = await askForm();
    await user.type(form.getByLabelText(/제목/), '질문');
    await user.type(form.getByLabelText(/내용/), '내용입니다.');
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    // 토스트는 사라진다 — 사용자가 쓴 글이 걸린 실패는 화면에도 남아야 한다.
    expect(await screen.findByRole('alert')).toHaveTextContent('문의 등록 권한이 없습니다.');
    expect(form.getByLabelText(/제목/)).toHaveValue('질문');
    expect(form.getByLabelText(/내용/)).toHaveValue('내용입니다.');
  });
});

describe('도움말 Q&A — 상태와 범위를 사실대로 말한다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.getFaqs.mockResolvedValue({ list: [] });
    harness.createQna.mockResolvedValue(undefined);
  });

  it('상태는 서버 값에서 읽는다 — 답글 깊이로 지어내지 않는다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({
      list: [
        { qaId: '1', qstnTtl: '답변 끝난 문의', wrterNm: '김', writngDe: '20260828', qnaSttsCd: 'SOLVED' },
        { qaId: '2', qstnTtl: '기다리는 문의', wrterNm: '박', writngDe: '20260828', qnaSttsCd: 'OPEN' },
      ],
    });
    render(<HelpClient />);
    await openQnaTab(user);

    expect(await screen.findByText('답변완료')).toBeVisible();
    expect(screen.getByText('답변 대기')).toBeVisible();
    // 결재 어휘를 답변 상태에 쓰지 않는다.
    expect(screen.queryByText('승인')).not.toBeInTheDocument();
  });

  it('목록 범위를 개인 목록으로 과장하지 않는다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({ list: [] });
    render(<HelpClient />);
    await openQnaTab(user);

    expect(screen.queryByText(/나의 문의 내역/)).not.toBeInTheDocument();
    expect(screen.getByText(/공개된 문의를 함께 보여 줍니다/)).toBeVisible();
  });
});
