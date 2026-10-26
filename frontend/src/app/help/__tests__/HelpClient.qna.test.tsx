/**
 * 도움말 Q&A — 문의 등록 경로와 상태·범위 문구 계약.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * 1. **문의를 남길 방법이 없었다.** '새로운 문의 작성' 버튼은 `disabled` 에 onClick 도 대상
 *    라우트도 없는 死버튼이었다(카탈로그 G10). 그런데 경로는 위아래로 다 열려 있었다 —
 *    `helpUserService.createQna` 가 이미 있었고 `POST /api/v1/boards/posts` 는 게시글 등록 권한
 *    (BOARD_CREATE — 기본 배정상 ROLE_USER 포함)이라 일반 사용자도 쓸 수 있다. 화면만 연결돼
 *    있지 않았다.
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
  viewer: undefined as { esntlId: string } | undefined,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => (harness.viewer ? { user: harness.viewer } : undefined),
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

/*
  오류가 뜨면 FormErrorSummary 가 같은 라벨 텍스트를 한 번 더 그린다. 라벨로 집으면
  그때만 조회가 모호해져 테스트가 흔들리므로, 입력은 폼 필드 이름으로 집는다.
*/
const titleInput = () => document.querySelector<HTMLInputElement>('input[name="pstTtl"]')!;
const contentInput = () => document.querySelector<HTMLTextAreaElement>('textarea[name="pstCn"]')!;

describe('도움말 Q&A — 문의 등록', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    harness.viewer = undefined;
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
    await user.type(titleInput(), '로그인이 안 됩니다');
    await user.type(contentInput(), '비밀번호를 바꾼 뒤부터 로그인되지 않습니다.');
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    await waitFor(() => expect(harness.createQna).toHaveBeenCalledTimes(1));
    expect(harness.createQna).toHaveBeenCalledWith({
      qstnTtl: '로그인이 안 됩니다',
      qstnCn: '비밀번호를 바꾼 뒤부터 로그인되지 않습니다.',
    });
    // 방금 쓴 글이 보이지 않으면 등록됐는지 사용자가 확인할 수 없다.
    await waitFor(() => expect(harness.getQnas.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('빈 제목·내용은 보내지 않고 요약·인라인·첫 오류 포커스로 연결한다', async () => {
    const user = userEvent.setup();
    render(<HelpClient />);
    await openQnaTab(user);

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    const form = await askForm();
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    expect(await form.findByText('제목을 입력해 주세요.')).toBeVisible();
    expect(form.getByText('문의 내용을 입력해 주세요.')).toBeVisible();
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(titleInput()).toHaveFocus());
    expect(harness.createQna).not.toHaveBeenCalled();
  });

  it('구조적 서버 오류는 해당 입력으로 되돌리고 값을 보존한다', async () => {
    const user = userEvent.setup();
    const message = '문의 제목에 사용할 수 없는 표현이 있습니다.';
    harness.createQna.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pstTtl', message }] } },
    });
    render(<HelpClient />);
    await openQnaTab(user);

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    const form = await askForm();
    await user.type(titleInput(), '질문');
    await user.type(contentInput(), '내용입니다.');
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    expect(await form.findByText(message)).toBeVisible();
    // 실패가 곧 글 손실이 되면 안 된다.
    expect(titleInput()).toHaveValue('질문');
    expect(contentInput()).toHaveValue('내용입니다.');
    expect(harness.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('구조적이지 않은 실패도 침묵하지 않고 입력을 지우지 않는다', async () => {
    const user = userEvent.setup();
    harness.createQna.mockRejectedValueOnce(new Error('boom'));
    render(<HelpClient />);
    await openQnaTab(user);

    await user.click(screen.getByRole('button', { name: /새로운 문의 작성/ }));
    const form = await askForm();
    await user.type(titleInput(), '질문');
    await user.type(contentInput(), '내용입니다.');
    await user.click(form.getByRole('button', { name: '문의 등록' }));

    await waitFor(() => expect(harness.toast).toHaveBeenCalledWith(
      '문의를 등록하지 못했습니다. 입력 내용은 유지됩니다.', 'error'));
    expect(titleInput()).toHaveValue('질문');
    expect(contentInput()).toHaveValue('내용입니다.');
  });
});

describe('도움말 Q&A — 상태와 범위를 사실대로 말한다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    harness.viewer = undefined;
    harness.getFaqs.mockResolvedValue({ list: [] });
    harness.createQna.mockResolvedValue(undefined);
  });

  /*
    [2026-10-26 ADR-0043 UX-05] 상태 이름은 게시판 정본(qna-status.ts)을 쓴다. 두 상태는 '해결로 표시했는가' 라서, 답이 달려도 해결로
    표시하기 전까지 남는 상태를 '답변 대기' 로 부르면 사실과 다르다.
  */
  it('상태는 서버 값에서 읽고 정본 이름(미해결·해결됨)으로 말한다 — 답글 깊이로 지어내지 않는다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({
      list: [
        { qaId: '1', qstnTtl: '답변 끝난 문의', wrterNm: '김', writngDe: '2026-08-28', qnaSttsCd: 'SOLVED' },
        { qaId: '2', qstnTtl: '기다리는 문의', wrterNm: '박', writngDe: '2026-08-28', qnaSttsCd: 'OPEN' },
      ],
    });
    render(<HelpClient />);
    await openQnaTab(user);

    expect(await screen.findByText('해결됨')).toBeVisible();
    expect(screen.getByText('미해결')).toBeVisible();
    expect(screen.queryByText('답변 대기')).not.toBeInTheDocument();
    expect(screen.queryByText('답변완료')).not.toBeInTheDocument();
    // 결재 어휘를 답변 상태에 쓰지 않는다.
    expect(screen.queryByText('승인')).not.toBeInTheDocument();
  });

  /*
    [2026-10-26 ADR-0043 UX-04] 종전에는 행을 열 수 없어 1:1 문의에 달린 답을 읽을 길이 없었고, 내 문의와 남의 공개 질문이 같은
    모양이었다. 제목이 게시글 상세로 가고, 구분이 서버 값(비밀글·작성자)으로 정해진다.
  */
  it('제목으로 게시글 상세를 열고, 구분 열이 내 1:1 문의·공개 질문을 가른다', async () => {
    const user = userEvent.setup();
    harness.viewer = { esntlId: 'me' };
    harness.getQnas.mockResolvedValue({
      list: [
        { qaId: '11', qstnTtl: '내 비밀 문의', wrterNm: '나', authorId: 'me', writngDe: '2026-10-26', qnaSttsCd: 'OPEN', scrtYn: 'Y' },
        { qaId: '12', qstnTtl: '남의 공개 질문', wrterNm: '박', authorId: 'other', writngDe: '2026-10-25', qnaSttsCd: 'OPEN', scrtYn: 'N' },
        // 관리자에게만 오는 남의 비밀 문의 — '내' 문의라고 부르지 않는다.
        { qaId: '13', qstnTtl: '남의 비밀 문의', wrterNm: '최', authorId: 'other', writngDe: '2026-10-24', qnaSttsCd: 'OPEN', scrtYn: 'Y' },
      ],
    });
    render(<HelpClient />);
    await openQnaTab(user);

    const mine = (await screen.findByRole('link', { name: '내 비밀 문의' })).closest('tr')!;
    expect(screen.getByRole('link', { name: '내 비밀 문의' }))
      .toHaveAttribute('href', '/admin/community/boards/detail?bbsId=BBSMSTR_DDDDDDDDDDDD&pstSn=11');
    expect(within(mine).getByText('내 1:1 문의')).toBeVisible();
    expect(within(mine).getByText('2026-10-26')).toBeVisible();
    const publicRow = screen.getByRole('link', { name: '남의 공개 질문' }).closest('tr')!;
    expect(within(publicRow).getByText('공개 질문')).toBeVisible();
    const othersSecret = screen.getByRole('link', { name: '남의 비밀 문의' }).closest('tr')!;
    expect(within(othersSecret).getByText('1:1 문의')).toBeVisible();
    expect(within(othersSecret).queryByText('내 1:1 문의')).toBeNull();
  });

  it('로그인 사용자를 모르면 어떤 비밀 문의도 내 문의라고 부르지 않는다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({
      list: [{ qaId: '11', qstnTtl: '비밀 문의', wrterNm: '나', authorId: 'me', writngDe: '2026-10-26', scrtYn: 'Y' }],
    });
    render(<HelpClient />);
    await openQnaTab(user);

    const row = (await screen.findByRole('link', { name: '비밀 문의' })).closest('tr')!;
    expect(within(row).getByText('1:1 문의')).toBeVisible();
    expect(screen.queryByText('내 1:1 문의')).toBeNull();
  });

  it('모두에게 묻는 공개 질문의 자리(지식 허브 질의응답)를 안내한다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({ list: [] });
    render(<HelpClient />);
    await openQnaTab(user);

    expect(screen.getByRole('link', { name: '지식 허브 질의응답' })).toHaveAttribute('href', '/admin/help/qna');
  });

  it('상세에 다녀와 다시 마운트돼도 보던 탭으로 돌아온다', async () => {
    const user = userEvent.setup();
    harness.getQnas.mockResolvedValue({
      list: [{ qaId: '11', qstnTtl: '돌아올 문의', wrterNm: '나', writngDe: '2026-10-26', scrtYn: 'N' }],
    });
    const { unmount } = render(<HelpClient />);
    await openQnaTab(user);
    await screen.findByRole('link', { name: '돌아올 문의' });
    unmount();

    render(<HelpClient />);
    expect(screen.getByRole('tab', { name: /1:1 Q&A 문의/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('link', { name: '돌아올 문의' })).toBeVisible();
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
