vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentSection from '../CommentSection';
import * as commentActions from '@/app/actions/commentActions';
import { CommentVO } from '@/types/business/comment';
import {
  commentCreateFormSchema,
  commentEditFormSchema,
} from '../comment-form-validation';

// Mock dependencies
vi.mock('@/app/actions/commentActions');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2024-03-10 12:00'),
}));

// 인증 주체 — 수정·삭제 버튼 노출 판정이 이 값과 등록자 로그인 ID 를 대조한다.
const authMock = vi.hoisted(() => ({ user: { id: 'user01', name: '홍길동', role: 'ROLE_USER' } as { id: string; name: string; role: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authMock.user }),
}));

// Mock toast
const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

describe('CommentSection Component', () => {
  const mockPstSn = 1;
  const mockBbsId = 'BBS_001';
  const mockComments: CommentVO[] = [
    {
      ansSn: 101,
      pstSn: mockPstSn,
      bbsId: mockBbsId,
      wrterId: 'user01',
      wrterNm: 'User One',
      frstRgtrId: 'user01',
      ansCn: 'First Comment',
      crtDt: '2024-03-10T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('generated CommentDto와 entity의 ID·본문 길이/필수 경계를 보존한다', () => {
    const create = { pstSn: 1, bbsId: 'BBS_001', ansCn: '가'.repeat(4000) };
    const edit = { pstSn: 1, bbsId: 'BBS_001', editCn: '가'.repeat(4000) };

    expect(commentCreateFormSchema.safeParse(create).success).toBe(true);
    expect(commentCreateFormSchema.safeParse({ ...create, ansCn: '' }).success).toBe(false);
    expect(commentCreateFormSchema.safeParse({ ...create, ansCn: '가'.repeat(4001) }).success).toBe(false);
    expect(commentCreateFormSchema.safeParse({ ...create, bbsId: 'A'.repeat(21) }).success).toBe(false);
    expect(commentCreateFormSchema.safeParse({ ...create, pstSn: 0 }).success).toBe(false);
    expect(commentCreateFormSchema.safeParse({ ...create, pstSn: 1.5 }).success).toBe(false);
    expect(commentEditFormSchema.safeParse(edit).success).toBe(true);
    expect(commentEditFormSchema.safeParse({ ...edit, editCn: '가'.repeat(4001) }).success).toBe(false);
  });

  it('renders comments correctly', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();
    expect(screen.getByText('User One')).toBeDefined();
    expect(screen.getByRole('heading', { name: '댓글' })).toBeDefined();
  });

  it('handles empty comment list', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);

    expect(screen.getByText('아직 등록된 댓글이 없습니다. 아래에서 첫 댓글을 남겨 주세요.')).toBeDefined();
  });

  it('submits a new comment', async () => {
    vi.mocked(commentActions.createComment).mockResolvedValue({ success: true, message: '성공' });

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);

    const textarea = screen.getByPlaceholderText('댓글을 입력하세요.');
    const submitButton = screen.getByText(/댓글 등록/);

    fireEvent.change(textarea, { target: { value: 'New Test Comment' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(commentActions.createComment).toHaveBeenCalled();
      expect(textarea).toHaveValue('');
    });
  });

  it('등록 본문 길이 오류는 write 없이 인라인 연결하고 입력으로 이동한다', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);
    const textarea = screen.getByLabelText('새 댓글 작성');
    fireEvent.change(textarea, { target: { value: '가'.repeat(4001) } });

    fireEvent.click(screen.getByRole('button', { name: /댓글 등록/ }));

    expect(commentActions.createComment).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 4000자');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it('등록 서버 필드 오류를 인라인으로 연결하고 원문을 보존한다', async () => {
    vi.mocked(commentActions.createComment).mockResolvedValue({
      success: false,
      message: '검증 실패',
      fieldErrors: { ansCn: '댓글에 사용할 수 없는 표현이 있습니다.' },
    });
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);
    const textarea = screen.getByLabelText('새 댓글 작성');
    fireEvent.change(textarea, { target: { value: '보존할 댓글 원문' } });

    fireEvent.click(screen.getByRole('button', { name: /댓글 등록/ }));

    expect(await screen.findByText('댓글에 사용할 수 없는 표현이 있습니다.')).toBeVisible();
    expect(textarea).toHaveValue('보존할 댓글 원문');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it('등록 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: (result: { success: boolean; message: string }) => void;
    vi.mocked(commentActions.createComment).mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);
    fireEvent.change(screen.getByLabelText('새 댓글 작성'), { target: { value: '중복 방지 댓글' } });
    const submit = screen.getByRole('button', { name: /댓글 등록/ });
    const form = submit.closest('form');

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(commentActions.createComment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(submit).toHaveTextContent('댓글 등록 중…');

    await act(async () => resolveCreate({ success: true, message: '성공' }));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(submit).toHaveAttribute('aria-busy', 'false');
  });

  it('handles comment update', async () => {
    vi.mocked(commentActions.updateComment).mockResolvedValue({ success: true, message: '성공' });

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();

    const editButton = screen.getByTestId('comment-edit-button');
    fireEvent.click(editButton);

    const editArea = screen.getByDisplayValue('First Comment');
    fireEvent.change(editArea, { target: { value: 'Updated Comment Content' } });

    const saveButton = screen.getByTestId('edit-save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(commentActions.updateComment).toHaveBeenCalled();
    });
  });

  it('수정 본문 길이 오류는 write 없이 인라인 연결하고 편집 입력으로 이동한다', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);
    fireEvent.click(screen.getByTestId('comment-edit-button'));
    const editArea = screen.getByLabelText('댓글 수정 내용');
    fireEvent.change(editArea, { target: { value: '가'.repeat(4001) } });

    fireEvent.click(screen.getByTestId('edit-save-button'));

    expect(commentActions.updateComment).not.toHaveBeenCalled();
    expect(editArea).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 4000자');
    await waitFor(() => expect(editArea).toHaveFocus());
  });

  it('수정 서버 필드 오류를 인라인으로 연결하고 편집 원문을 보존한다', async () => {
    vi.mocked(commentActions.updateComment).mockResolvedValue({
      success: false,
      message: '검증 실패',
      fieldErrors: { ansCn: '수정 댓글 형식을 확인해 주세요.' },
    });
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);
    fireEvent.click(screen.getByTestId('comment-edit-button'));
    const editArea = screen.getByLabelText('댓글 수정 내용');
    fireEvent.change(editArea, { target: { value: '보존할 수정 댓글' } });

    fireEvent.click(screen.getByTestId('edit-save-button'));

    expect(await screen.findByText('수정 댓글 형식을 확인해 주세요.')).toBeVisible();
    expect(screen.getByLabelText('댓글 수정 내용')).toHaveValue('보존할 수정 댓글');
    expect(screen.getByLabelText('댓글 수정 내용')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('댓글 수정 내용')).toHaveFocus());
  });

  it('수정을 동기 잠금하고 pending 제어를 알리며 실패 시 편집 원문을 보존한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    vi.mocked(commentActions.updateComment).mockReturnValueOnce(new Promise((_, reject) => {
      rejectUpdate = reject;
    }));
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);
    fireEvent.click(screen.getByTestId('comment-edit-button'));
    fireEvent.change(screen.getByLabelText('댓글 수정 내용'), { target: { value: '중복 방지 수정' } });
    const save = screen.getByTestId('edit-save-button');

    act(() => {
      fireEvent.click(save);
      fireEvent.click(save);
    });

    await waitFor(() => expect(commentActions.updateComment).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('edit-save-button')).toBe(save);
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveAccessibleName('댓글 수정 저장 중');

    act(() => rejectUpdate(new Error('댓글 수정 서버 오류')));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('댓글 수정 중 오류가 발생했습니다.', 'error');
    });
    const restoredEditArea = screen.getByLabelText('댓글 수정 내용');
    expect(restoredEditArea).toBeVisible();
    expect(restoredEditArea).toHaveValue('중복 방지 수정');
    expect(save).not.toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'false');
    expect(save).toHaveAccessibleName('댓글 수정 저장');
  });

  it('삭제 pending 중 재요청을 막고 실패하면 댓글 행과 제어를 복구한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    vi.mocked(commentActions.deleteComment).mockReturnValueOnce(new Promise((_, reject) => {
      rejectDelete = reject;
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);
    const remove = screen.getByTestId('comment-delete-button');

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(commentActions.deleteComment).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('comment-delete-button')).toBe(remove);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('댓글 삭제 중');
    expect(screen.getByText('First Comment')).toBeInTheDocument();

    rejectDelete(new Error('댓글 삭제 서버 오류'));

    await waitFor(() => expect(screen.getByTestId('comment-delete-button')).not.toBeDisabled());
    expect(screen.getByText('First Comment')).toBeInTheDocument();
  });

  it('handles comment deletion', async () => {
    vi.mocked(commentActions.deleteComment).mockResolvedValue({ success: true, message: '성공' });
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();

    const deleteButton = screen.getByTestId('comment-delete-button');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(commentActions.deleteComment).toHaveBeenCalled();
    });
  });

  it('등록 실패 시 지워졌던 댓글 원문을 입력창에 복구한다', async () => {
    vi.mocked(commentActions.createComment).mockResolvedValue({ success: false, message: '등록 실패' });
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);

    const textarea = screen.getByLabelText('새 댓글 작성');
    fireEvent.change(textarea, { target: { value: '사라지면 안 되는 댓글' } });
    fireEvent.click(screen.getByRole('button', { name: /댓글 등록/ }));

    await waitFor(() => expect(commentActions.createComment).toHaveBeenCalled());
    await waitFor(() => expect(textarea).toHaveValue('사라지면 안 되는 댓글'));
  });

  it('수정 실패 시 편집 폼과 사용자가 고친 원문을 다시 연다', async () => {
    vi.mocked(commentActions.updateComment).mockResolvedValue({ success: false, message: '수정 실패' });
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    fireEvent.click(screen.getByTestId('comment-edit-button'));
    fireEvent.change(screen.getByLabelText('댓글 수정 내용'), { target: { value: '보존할 수정 원문' } });
    fireEvent.click(screen.getByTestId('edit-save-button'));

    await waitFor(() => expect(commentActions.updateComment).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText('댓글 수정 내용')).toHaveValue('보존할 수정 원문'));
  });

  /**
   * [2026-08-12 신설] 서버 미확정(낙관적) 행에는 수정·삭제 affordance 가 없어야 한다.
   *
   * 이 계약이 깨지면 E2E(`03-board-community` 댓글 생명주기)가 **180초 타임아웃**으로 죽는다.
   * 실제로 죽었고, 원인은 이랬다: 낙관적 행에는 서버 채번 ID 가 없어 편집 상태가 그 행에 묶이는데,
   * `revalidatePath` 로 확정 행이 도착하면 `editingId` 가 새 `ansSn` 과 어긋나 **편집 폼이 조용히
   * 접힌다.** 사용자에게는 "입력하던 내용이 경고 없이 사라지는" 결함이고, Playwright 에게는
   * "사라진 저장 버튼을 무한정 기다리는" 현상이다.
   *
   * E2E 는 이 결함을 느리고 간헐적으로만 드러내므로, 같은 불변식을 여기서 **결정적으로** 고정한다.
   * (서버 액션 프라미스를 일부러 미해결 상태로 두어 낙관적 렌더를 붙잡는다.)
   */
  it('낙관적(서버 미확정) 댓글에는 수정·삭제 버튼을 노출하지 않는다', () => {
    // 낙관적 행의 모양 그대로 — `isOptimistic` 이 서 있고 `ansSn` 은 서버 채번이 아닌 임시값이다.
    const optimisticRow = {
      ...mockComments[0],
      ansSn: 0.123456,
      ansCn: 'Pending Comment',
      isOptimistic: true,
    } as CommentViewForTest;

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[optimisticRow]} />);

    // 본문은 보이되(사용자는 자기 글이 올라간 것을 즉시 본다),
    expect(screen.getByText('Pending Comment')).toBeDefined();
    // 수정·삭제는 노출되지 않아야 한다.
    expect(screen.queryByTestId('comment-edit-button')).toBeNull();
    expect(screen.queryByTestId('comment-delete-button')).toBeNull();
  });

  it('확정된 내 댓글에는 수정·삭제 버튼이 그대로 있다 (가드 과잉 회귀 방어)', () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.queryByTestId('comment-edit-button')).not.toBeNull();
    expect(screen.queryByTestId('comment-delete-button')).not.toBeNull();
  });

  it('남의 댓글에는 수정·삭제 버튼을 노출하지 않는다', () => {
    // 종전에는 판정 자체가 없어 버튼이 떴고, 사용자는 확인창을 통과한 뒤에야 서버 403 을 만났다.
    // 판정 축은 서버 가드와 같은 등록자 로그인 ID 다.
    const othersComment: CommentVO = { ...mockComments[0], frstRgtrId: 'someone-else' };

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[othersComment]} />);

    expect(screen.getByText('First Comment')).toBeDefined();
    expect(screen.queryByTestId('comment-edit-button')).toBeNull();
    expect(screen.queryByTestId('comment-delete-button')).toBeNull();
  });

  it('관리자는 남의 댓글도 관리할 수 있다 — 라우트 게이트와 같은 역할 집합', () => {
    // 역할 문자열을 직접 비교하면 ROLE_ADMIN 원문을 가진 관리자에게 기능이 사라진다(DEC-OPS-023).
    const previous = authMock.user;
    authMock.user = { id: 'admin01', name: '관리자', role: 'ROLE_ADMIN' };
    try {
      const othersComment: CommentVO = { ...mockComments[0], frstRgtrId: 'someone-else' };

      render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[othersComment]} />);

      expect(screen.queryByTestId('comment-edit-button')).not.toBeNull();
      expect(screen.queryByTestId('comment-delete-button')).not.toBeNull();
    } finally {
      authMock.user = previous;
    }
  });
});

type CommentViewForTest = CommentVO & { isOptimistic: boolean };
