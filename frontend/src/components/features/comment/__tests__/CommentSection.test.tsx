import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentSection from '../CommentSection';
import commentService from '@/services/comment/commentService';

// Mock dependencies
vi.mock('@/services/comment/commentService');
vi.mock('date-fns', () => ({
 format: vi.fn(() => '2024-03-10 12:00'),
}));

// Mock lucide icons to have accessible names for testing
vi.mock('lucide-react', () => ({
 MessageSquare: () => <div data-testid="icon-message-square" />,
 User: () => <div data-testid="icon-user" />,
 Clock: () => <div data-testid="icon-clock" />,
 Trash2: () => <div data-testid="icon-trash" />,
 Edit2: () => <div data-testid="icon-edit" />,
 Send: () => <div data-testid="icon-send" />,
 X: () => <div data-testid="icon-x" />,
 Check: () => <div data-testid="icon-check" />,
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
 resultList: mockComments,
 paginationInfo: {},
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
 resultList: [],
 paginationInfo: {},
 });

 render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

 await waitFor(() => {
 expect(screen.getByText(/아직 등록된 댓글이 없습니다/)).toBeDefined();
 });
 });

 it('submits a new comment', async () => {
 vi.mocked(commentService.getComments).mockResolvedValue({
 resultList: [],
 paginationInfo: {},
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
 // The state commentCn is cleared after success
 expect(textarea).toHaveValue('');
 });
 });

 it('handles comment update', async () => {
 vi.mocked(commentService.getComments).mockResolvedValue({
 resultList: mockComments,
 paginationInfo: {},
 });
 vi.mocked(commentService.updateComment).mockResolvedValue(undefined);

 render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

 await waitFor(() => {
 expect(screen.getByText('First Comment')).toBeDefined();
 });

 // Find the edit button (the one containing icon-edit)
 const editButton = screen.getByTestId('icon-edit').closest('button')!;
 fireEvent.click(editButton);

 // After clicking edit, expect a textarea with the comment content
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
 resultList: mockComments,
 paginationInfo: {},
 });
 vi.mocked(commentService.deleteComment).mockResolvedValue(undefined);
 
 // Mock window.confirm
 const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

 render(<CommentSection nttId={mockNttId} bbsId={mockBbsId} />);

 await waitFor(() => {
 expect(screen.getByText('First Comment')).toBeDefined();
 });

 const deleteButton = screen.getByTestId('icon-trash').closest('button')!;
 fireEvent.click(deleteButton);

 expect(confirmSpy).toHaveBeenCalled();
 await waitFor(() => {
 expect(commentService.deleteComment).toHaveBeenCalledWith(101);
 });
 });
});
