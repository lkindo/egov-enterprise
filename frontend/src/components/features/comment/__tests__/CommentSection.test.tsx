vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentSection from '../CommentSection';
import * as commentActions from '@/app/actions/commentActions';

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
  const mockNttId = 1;
  const mockBbsId = 'BBS_001';
  const mockComments = [
    {
      id: 101,
      nttId: mockNttId,
      bbsId: mockBbsId,
      wrterId: 'user01',
      wrterNm: 'User One',
      commentCn: 'First Comment',
      useAt: 'Y',
      createdDate: '2024-03-10T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders comments correctly', async () => {
    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();
    expect(screen.getByText('User One')).toBeDefined();
    expect(screen.getByText(/Discussion Hub/i)).toBeDefined();
  });

  it('handles empty comment list', async () => {
    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} initialComments={[]} />);

    expect(screen.getByText(/No entries found/i)).toBeDefined();
  });

  it('submits a new comment', async () => {
    vi.mocked(commentActions.createComment).mockResolvedValue({ success: true });

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} initialComments={[]} />);

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
    vi.mocked(commentActions.updateComment).mockResolvedValue({ success: true });

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} initialComments={mockComments} />);

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
    vi.mocked(commentActions.deleteComment).mockResolvedValue({ success: true });
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} initialComments={mockComments} />);

    expect(screen.getByText('First Comment')).toBeDefined();

    const deleteButton = screen.getByTestId('comment-delete-button');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(commentActions.deleteComment).toHaveBeenCalled();
    });
  });
});
