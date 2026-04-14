'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, User, Clock, Trash2, Edit2, Send, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import commentService from '@/services/business/comment/commentService';
import { CommentVO } from '@/types/business/comment';
import { format } from 'date-fns';

interface CommentSectionProps {
  nttId: number;
  bbsId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ nttId, bbsId }) => {
  const [comments, setComments] = useState<CommentVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCn, setCommentCn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCn, setEditCn] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await commentService.getComments({ nttId, bbsId, size: 100 });
      setComments(result.list || []);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  }, [nttId, bbsId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentCn.trim()) return;

    try {
      setSubmitting(true);
      await commentService.createComment({
        nttId,
        bbsId,
        commentCn: commentCn.trim()
      });
      setCommentCn('');
      fetchComments();
    } catch (error) {
      console.error('Failed to create comment', error);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await commentService.deleteComment(id);
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editCn.trim()) return;
    try {
      await commentService.updateComment(id, {
        nttId,
        bbsId,
        commentCn: editCn.trim()
      });
      setEditingId(null);
      fetchComments();
    } catch (error) {
      console.error('Failed to update comment', error);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="space-y-4 pt-10">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-32 w-full rounded-[0.1rem]" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-[0.1rem]" />
          <Skeleton className="h-24 w-full rounded-[0.1rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pt-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">댓글</h3>
            <p className="text-sm font-bold text-slate-400 tracking-tight">{comments.length} 개의 생각</p>
          </div>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[0.1rem] bg-slate-50/50">
            <p className="text-slate-400 font-bold tracking-tight">아직 등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="border-none shadow-xl shadow-slate-100/50 rounded-[0.1rem] overflow-hidden bg-white ring-1 ring-slate-50 hover:ring-slate-100 transition-all group">
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 leading-tight">{comment.wrterNm}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 tracking-tight mt-1">
                          <Clock className="w-3 h-3" />
                          {comment.createdDate ? format(new Date(comment.createdDate), 'yyyy-MM-dd HH:mm') : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === comment.id ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdate(comment.id)} className="h-8 w-8 p-0 rounded-lg text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-slate-50"><X className="w-4 h-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(comment.id); setEditCn(comment.commentCn); }} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-slate-100"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.id)} className="h-8 w-8 p-0 rounded-lg text-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === comment.id ? (
                    <Textarea
                      value={editCn}
                      onChange={(e) => setEditCn(e.target.value)}
                      className="min-h-[100px] rounded-[0.1rem] border-slate-200 focus:ring-slate-900 border-2 text-slate-700 font-medium"
                    />
                  ) : (
                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {comment.commentCn}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="relative group pt-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-slate-100 rounded-[0.1rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <Card className="relative border-none shadow-2xl rounded-[0.1rem] bg-white ring-1 ring-slate-100 overflow-hidden">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="px-3 py-1 rounded-lg bg-slate-900 text-white font-black hover:bg-slate-900">댓글</Badge>
            </div>
            <Textarea
              placeholder="메시지를 입력하세요..."
              value={commentCn}
              onChange={(e) => setCommentCn(e.target.value)}
              className="min-h-[150px] border-none focus-visible:ring-0 text-lg font-medium text-slate-700 resize-none p-0 bg-transparent placeholder:text-slate-300"
            />
            <div className="flex justify-end border-t pt-6">
              <Button
                type="submit"
                disabled={submitting || !commentCn.trim()}
                className="h-14 px-8 rounded-[0.1rem] bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-200 flex gap-2 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" /> 게시하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CommentSection;
