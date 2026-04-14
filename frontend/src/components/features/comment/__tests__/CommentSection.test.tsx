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
import commentService from '@/services/business/comment/commentService';

// Mock dependencies
vi.mock('@/services/business/comment/commentService');
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2024-03-10 12:00'),
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
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: mockComments,
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });

    const { container } = render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

    // Wait until loading skeletons are gone
    await waitFor(() => {
      expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    }, { timeout: 3000 });

    expect(screen.getByText('First Comment')).toBeDefined();
    expect(screen.getByText('User One')).toBeDefined();
  });

  it('handles empty comment list', async () => {
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      size: 10,
      totalPage: 0,
    });

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

    await waitFor(() => {
      expect(screen.getByText(/아직 등록된 댓글이 없습니다/)).toBeDefined();
    });
  });

  it('submits a new comment', async () => {
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      size: 10,
      totalPage: 0,
    });
    vi.mocked(commentService.createComment).mockResolvedValue(201);

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

    const textarea = await screen.findByPlaceholderText('메시지를 입력하세요...');
    const submitButton = screen.getByText(/게시하기/);

    fireEvent.change(textarea, { target: { value: 'New Test Comment' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(commentService.createComment).toHaveBeenCalledWith({
        nttId: mockNttId,
        bbsId: mockBbsId,
        commentCn: 'New Test Comment',
      });
      expect(textarea).toHaveValue('');
    });
  });

  it('handles comment update', async () => {
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: mockComments,
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });
    vi.mocked(commentService.updateComment).mockResolvedValue(undefined);

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

    await waitFor(() => {
      expect(screen.getByText('First Comment')).toBeDefined();
    });

    const editButton = screen.getByTestId('icon-edit2').closest('button')!;
    fireEvent.click(editButton);

    const editArea = screen.getByDisplayValue('First Comment');
    fireEvent.change(editArea, { target: { value: 'Updated Comment Content' } });

    const checkButton = screen.getByTestId('icon-check').closest('button')!;
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(commentService.updateComment).toHaveBeenCalledWith(101, {
        nttId: mockNttId,
        bbsId: mockBbsId,
        commentCn: 'Updated Comment Content',
      });
    });
  });

  it('handles comment deletion', async () => {
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: mockComments,
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });
    vi.mocked(commentService.deleteComment).mockResolvedValue(undefined);
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

    await waitFor(() => {
      expect(screen.getByText('First Comment')).toBeDefined();
    });

    const deleteButton = screen.getByTestId('icon-trash2').closest('button')!;
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(commentService.deleteComment).toHaveBeenCalledWith(101);
    });
  });
});
