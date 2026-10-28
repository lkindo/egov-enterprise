import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection } from '@/test-utils/projection';
import { BoardRegistClient } from '../BoardRegistClient';

/**
 * [2026-10-26 ADR-0043 1차 UX-06·07·08·09] 작성 화면의 안내와 미저장 보호.
 *  · UX-07: 고친 입력·새 첨부가 있으면 앱 공통 미저장 보호(useUnsavedChanges)에 '변경 있음', 저장 중에는 '처리 중' 을 알린다. 저장에
 *    성공하면 이동 전에 풀어 저장 직후의 이동을 묻거나 막지 않는다.
 *  · UX-08: 본문 상한을 서버와 같은 단위(서식 포함 HTML 길이)로 보이고, 넘으면 저장을 누르기 전에 그 칸에 오류를 붙인다. 첨부 안내는 저장
 *    한 번의 전체 크기(50MB)를 말한다.
 *  · UX-09: 머리에 게시판 이름과 공개 범위를 말한다. 행사 일자는 캘린더 게시판에서만, 게시 기간은 접힌 '게시 기간 설정' 에 둔다.
 *  · UX-06: Q&A 게시판의 공개 글이면 나만 볼 문의의 자리(도움말 센터 1:1 문의)를 함께 알린다.
 */
type EditState = { dirty: boolean; pending?: boolean };

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  clearDraft: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  restoreDraft: vi.fn(),
  saveBoardArticle: vi.fn(),
  toast: vi.fn(),
  permissions: ['BOARD_CREATE', 'BOARD_UPDATE'],
  meta: { requiredEditPermissions: [] } as Record<string, unknown>,
  guard: null as null | EditState | (() => EditState),
}));

vi.mock('@/queries/board-master-query-options', () => ({ boardMasterQueryOptions: {
  meta: () => ({ queryKey: ['board-meta-guidance-test'], initialData: mocks.meta, queryFn: async () => mocks.meta }),
} }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, replace: mocks.replace }),
}));

// 공통 보호의 등록값을 그대로 붙잡는다 — 이동 판정(확인·막기)은 UnsavedChangesContext 자체 시험의 몫이다.
vi.mock('@/contexts/UnsavedChangesContext', () => ({
  useUnsavedChanges: (state: EditState | (() => EditState)) => {
    mocks.guard = state;
    return vi.fn();
  },
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockRichTextEditor({
    value,
    onChange,
    className,
    enableTables: _enableTables,
    media: _media,
    ...props
  }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
    value: string;
    onChange: (value: string) => void;
    enableTables?: boolean;
    media?: unknown;
  }) {
    return (
      <textarea
        {...props}
        className={`ProseMirror ${className ?? ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  },
}));

vi.mock('@/app/actions/boardActions', () => ({
  saveBoardArticle: (...args: unknown[]) => mocks.saveBoardArticle(...args),
}));

vi.mock('@/hooks/use-auto-save-draft', () => ({
  useAutoSaveDraft: () => ({
    clearDraft: mocks.clearDraft,
    hasDraft: false,
    restoreDraft: mocks.restoreDraft,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'writer-owner', authorizationVersion: 'test-v1', permissions: mocks.permissions } }),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));
vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: vi.fn().mockResolvedValue([]), deleteFile: vi.fn() },
}));
// 새 첨부를 고른 상태를 만든다 — 업로더 자체의 동작은 attachment 계약의 관심사다.
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => (
    <button type="button" onClick={() => onFilesChange([new File(['x'], 'plan.txt', { type: 'text/plain' })])}>첨부 고르기</button>
  ),
}));

function renderSubject(props: Partial<React.ComponentProps<typeof BoardRegistClient>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardRegistClient bbsId="BBSMSTR_GUIDE_TEST" {...props} />
    </QueryClientProvider>,
  );
}

const guardState = (): EditState => {
  const guard = mocks.guard;
  if (!guard) throw new Error('작성 화면이 미저장 보호에 등록하지 않았다');
  return typeof guard === 'function' ? guard() : guard;
};

const title = () => screen.getByRole('textbox', { name: '게시글 제목' });
const editor = () => screen.getByRole('textbox', { name: /게시글 본문 내용/ });

function fillValidPost() {
  fireEvent.change(title(), { target: { value: '새 글' } });
  fireEvent.change(editor(), { target: { value: '<p>본문</p>' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard = null;
  mocks.permissions = ['BOARD_CREATE', 'BOARD_UPDATE'];
  mocks.meta = { requiredEditPermissions: [] };
  mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/admin/community/boards/detail?bbsId=B&pstSn=1' });
});

describe('UX-07 미저장 보호', () => {
  it('처음에는 변경이 없고, 입력을 고치면 변경 있음으로 알린다', () => {
    renderSubject();
    expect(guardState()).toEqual({ dirty: false, pending: false });

    fireEvent.change(title(), { target: { value: '고친 제목' } });
    expect(guardState().dirty).toBe(true);
  });

  it('입력을 고치지 않아도 새 첨부를 고르면 변경 있음으로 알린다', () => {
    renderSubject();
    fireEvent.click(screen.getByRole('button', { name: '첨부 고르기' }));
    expect(guardState().dirty).toBe(true);
  });

  it('저장 중에는 처리 중으로 알리고, 저장에 성공하면 이동하기 전에 보호를 푼다', async () => {
    let resolveSave!: (value: unknown) => void;
    mocks.saveBoardArticle.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    let atNavigation: EditState | null = null;
    mocks.replace.mockImplementation(() => { atNavigation = guardState(); });
    renderSubject();
    fillValidPost();

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(guardState().pending).toBe(true);

    await act(async () => resolveSave({ success: true, redirect: '/admin/community/boards/detail?bbsId=B&pstSn=1' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/community/boards/detail?bbsId=B&pstSn=1'));
    // 이동하는 순간 보호가 '변경 있음'·'처리 중' 이면 공통 보호가 저장 직후의 이동을 묻거나 막는다.
    expect(atNavigation).toEqual({ dirty: false, pending: false });
  });

  it('저장에 실패하면 보호를 풀지 않는다 — 입력은 아직 저장되지 않았다', async () => {
    mocks.saveBoardArticle.mockResolvedValueOnce({ success: false, message: '저장하지 못했습니다.' });
    renderSubject();
    fillValidPost();

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(guardState()).toEqual({ dirty: true, pending: false });
  });
});

describe('UX-08 본문 상한과 첨부 총량', () => {
  it('본문 칸이 서식 포함 상한과 지금 길이(편집기 HTML 길이)를 설명으로 갖는다', () => {
    renderSubject();
    fireEvent.change(editor(), { target: { value: '<p>본문</p>' } });
    expect(editor()).toHaveAccessibleDescription('본문은 서식 포함 4,000자까지 저장할 수 있습니다(현재 9자).');
  });

  it('상한을 넘으면 저장을 누르기 전에 그 칸에 오류를 붙이고, 다시 들어오면 지운다', async () => {
    renderSubject();
    fireEvent.change(editor(), { target: { value: `<p>${'가'.repeat(3994)}</p>` } });
    expect(editor()).toHaveAccessibleDescription(/현재 4,001자/);
    await waitFor(() => expect(editor()).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('본문은 서식을 포함해 4,000자까지 저장할 수 있습니다. 내용이나 서식(표·굵게 등)을 줄여 주세요.')).toBeVisible();
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();

    fireEvent.change(editor(), { target: { value: `<p>${'가'.repeat(100)}</p>` } });
    await waitFor(() => expect(editor()).toHaveAttribute('aria-invalid', 'false'));
    expect(screen.queryByText(/4,000자까지 저장할 수 있습니다. 내용이나/)).toBeNull();
  });

  it('상한을 넘긴 채 저장하면 보내지 않는다', async () => {
    renderSubject();
    fireEvent.change(title(), { target: { value: '긴 글' } });
    fireEvent.change(editor(), { target: { value: `<p>${'가'.repeat(3994)}</p>` } });
    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);
    await waitFor(() => expect(editor()).toHaveAttribute('aria-invalid', 'true'));
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
  });

  it('첨부 안내가 저장 한 번의 전체 크기 상한을 말한다', () => {
    renderSubject();
    expect(screen.getByText(/한 번 저장할 때 새로 올리는 파일은 본문 이미지·영상을 합쳐 모두 50MB까지입니다/)).toBeInTheDocument();
  });
});

describe('UX-09 게시판 이름·공개 범위·날짜 칸', () => {
  it('머리에 게시판 이름을 보이고, 늘 같던 커뮤니티 게시판 표지를 쓰지 않는다', () => {
    mocks.meta = { requiredEditPermissions: [], bbsTtl: '업무게시판', prvtPstPlcyCd: 'NONE' };
    renderSubject();
    expect(screen.getByText('업무게시판')).toBeVisible();
    expect(screen.queryByText('커뮤니티 게시판')).toBeNull();
  });

  it.each([
    ['커뮤니티 귀속을 모르면 열 수 있는 사용자라고만 말한다', { prvtPstPlcyCd: 'NONE' }, '이 글은 이 게시판을 열 수 있는 모든 사용자가 봅니다.'],
    ['귀속이 없다고 하면 로그인한 모든 사용자다', { prvtPstPlcyCd: 'NONE', community: null }, '이 글은 로그인한 모든 사용자가 봅니다.'],
    ['커뮤니티 귀속 게시판은 그 회원과 게시판 관리자다', { prvtPstPlcyCd: 'NONE', community: { cmntyNm: '사내 동호회' } }, '이 글은 사내 동호회 커뮤니티 회원과 게시판 관리자가 봅니다.'],
    ['비밀글 필수 게시판은 작성자와 게시판 관리자다', { prvtPstPlcyCd: 'REQUIRED', community: null }, '이 글은 작성자와 게시판 관리자만 봅니다.'],
  ])('%s', (_label, meta, sentence) => {
    mocks.meta = { requiredEditPermissions: [], ...meta };
    renderSubject();
    expect(screen.getByTestId('article-audience')).toHaveTextContent(sentence);
  });

  it('메타를 모르면 공개 범위를 지어내지 않는다', () => {
    mocks.meta = null as unknown as Record<string, unknown>;
    renderSubject();
    expect(screen.queryByTestId('article-audience')).toBeNull();
  });

  it('비밀글 선택을 바꾸면 공개 범위도 따라 바뀐다', () => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'OPTIONAL', community: null };
    renderSubject();
    expect(screen.getByTestId('article-audience')).toHaveTextContent('이 글은 로그인한 모든 사용자가 봅니다.');
    fireEvent.click(screen.getByRole('checkbox', { name: '비밀글로 쓰기' }));
    expect(screen.getByTestId('article-audience')).toHaveTextContent('이 글은 작성자와 게시판 관리자만 봅니다.');
  });

  it('행사 일자 칸은 캘린더 게시판에서만 보인다', () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_CALENDAR' };
    const { unmount } = renderSubject();
    expect(screen.getByLabelText('행사 일자')).toBeInTheDocument();
    unmount();

    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_LIST' };
    renderSubject();
    expect(screen.queryByLabelText('행사 일자')).toBeNull();
  });

  it('행사 일자 칸을 감춘 게시판에서도 이미 저장된 행사 일자는 지우지 않고 보낸다', async () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_LIST' };
    renderSubject({
      pstSn: 7,
      initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', userId: 'writer-owner', evntDt: '2026-11-03T00:00:00', version: 1 },
    });
    fireEvent.submit(screen.getByRole('button', { name: '게시글 수정' }).closest('form')!);
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect((mocks.saveBoardArticle.mock.calls[0][1] as FormData).get('evntDt')).toBe('2026-11-03');
  });

  it('게시 기간은 새 글에서 접혀 있고, 접힌 머리가 지금 값을 요약한다', () => {
    renderSubject();
    const period = screen.getByTestId('posting-period');
    expect(period).not.toHaveAttribute('open');
    expect(period.querySelector('summary')).toHaveTextContent('게시 기간 설정(정하지 않음)');
    fireEvent.change(screen.getByLabelText('게시 시작일'), { target: { value: '2026-11-01' } });
    expect(period.querySelector('summary')).toHaveTextContent('게시 기간 설정(2026-11-01부터)');
  });

  it('기간을 정한 글을 고칠 때와 기간 칸에 오류가 있을 때는 펼친다', async () => {
    const { unmount } = renderSubject({
      pstSn: 8,
      initialData: { pstSn: 8, pstTtl: '기존 글', pstCn: '<p>본문</p>', userId: 'writer-owner', pstEndYmd: '20261231', version: 1 },
    });
    expect(screen.getByTestId('posting-period')).toHaveAttribute('open');
    unmount();

    renderSubject();
    fillValidPost();
    fireEvent.change(screen.getByLabelText('게시 시작일'), { target: { value: '2026-11-30' } });
    fireEvent.change(screen.getByLabelText('게시 종료일'), { target: { value: '2026-11-01' } });
    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);
    await waitFor(() => expect(screen.getByLabelText('게시 종료일')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByTestId('posting-period')).toHaveAttribute('open');
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
  });
});

describe('UX-06 Q&A 게시판의 공개 범위 안내', () => {
  // 1:1 문의 안내(문장·링크)는 도움말 기능의 마커 블록 안에 있다 — 도움말을 고르지 않은 생성물에서는 투영이 그 블록을 걷는다.
  // 그 블록과 함께 빠지는 도움말 소유 파일로 도움말이 구성에 있는지 가르고(가이드 §4.2), 없으면 안내가 없음을 단언한다. 원본은 늘 있다.
  const helpInProjection = inProjection('frontend/src/app/help/HelpClient.tsx');

  if (helpInProjection) it('공개 글이면 모두가 본다는 사실과 나만 볼 문의(도움말 센터 1:1 문의)의 자리를 함께 알린다', () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_QNA', prvtPstPlcyCd: 'NONE', community: null };
    renderSubject();
    const audience = screen.getByTestId('article-audience');
    expect(audience).toHaveTextContent('이 글은 로그인한 모든 사용자가 봅니다. 나만 볼 문의는 도움말 센터 1:1 문의를 쓰세요.');
    expect(screen.getByRole('link', { name: '도움말 센터 1:1 문의' })).toHaveAttribute('href', '/help');
  });

  if (!helpInProjection) it('도움말이 없는 구성: 공개 글이면 모두가 본다는 사실만 알리고 1:1 문의를 권하지 않는다', () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_QNA', prvtPstPlcyCd: 'NONE', community: null };
    renderSubject();
    expect(screen.getByTestId('article-audience')).toHaveTextContent(/^이 글은 로그인한 모든 사용자가 봅니다[.]$/);
    expect(screen.queryByRole('link', { name: '도움말 센터 1:1 문의' })).toBeNull();
  });

  it('비밀글로 저장되는 글에는 1:1 문의를 권하지 않는다', () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_QNA', prvtPstPlcyCd: 'NONE', community: null };
    // 도움말 1:1 문의로 남긴 비밀글을 작성자가 고치는 경우 — 없음(NONE) 정책은 저장값을 그대로 둔다.
    renderSubject({
      pstSn: 9,
      initialData: { pstSn: 9, pstTtl: '1:1 문의', pstCn: '<p>본문</p>', userId: 'writer-owner', scrtYn: 'Y', version: 1 },
    });
    expect(screen.getByTestId('article-audience')).toHaveTextContent('이 글은 작성자와 게시판 관리자만 봅니다.');
    expect(screen.queryByRole('link', { name: '도움말 센터 1:1 문의' })).toBeNull();
  });

  it('Q&A 게시판이 아니면 1:1 문의를 권하지 않는다', () => {
    mocks.meta = { requiredEditPermissions: [], tmpltId: 'TMPLT_LIST', prvtPstPlcyCd: 'NONE', community: null };
    renderSubject();
    expect(screen.queryByRole('link', { name: '도움말 센터 1:1 문의' })).toBeNull();
  });
});
