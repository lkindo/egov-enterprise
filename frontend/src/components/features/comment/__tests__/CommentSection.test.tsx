vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentSection from '../CommentSection';
import * as commentActions from '@/app/actions/commentActions';
import { CommentVO } from '@/types/business/comment';

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

// Mock toast
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
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
      ansCn: 'First Comment',
      crtDt: '2024-03-10T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders comments correctly', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();
    expect(screen.getByText('User One')).toBeDefined();
    expect(screen.getByText(/Discussion Hub/i)).toBeDefined();
  });

  it('handles empty comment list', async () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);

    expect(screen.getByText(/No entries found/i)).toBeDefined();
  });

  it('submits a new comment', async () => {
    vi.mocked(commentActions.createComment).mockResolvedValue({ success: true, message: '성공' });

    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={[]} />);

    const textarea = screen.getByPlaceholderText(/Inject your thoughts/i);
    const submitButton = screen.getByText(/Commit Response/i);

    fireEvent.change(textarea, { target: { value: 'New Test Comment' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(commentActions.createComment).toHaveBeenCalled();
      expect(textarea).toHaveValue('');
    });
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
    fireEvent.click(screen.getByRole('button', { name: /commit response/i }));

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

  it('확정된 댓글에는 수정·삭제 버튼이 그대로 있다 (가드 과잉 회귀 방어)', () => {
    render(<CommentSection pstSn={mockPstSn} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.queryByTestId('comment-edit-button')).not.toBeNull();
    expect(screen.queryByTestId('comment-delete-button')).not.toBeNull();
  });
});

type CommentViewForTest = CommentVO & { isOptimistic: boolean };
