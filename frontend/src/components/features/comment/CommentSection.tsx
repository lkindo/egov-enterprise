'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { MessageSquare, User, Clock, Trash2, Edit2, Send, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommentVO } from '@/types/business/comment';
import { format } from 'date-fns';
import { createComment, deleteComment, updateComment } from '@/app/actions/commentActions';
import { useToast } from '@/app/components/ui/toast';

interface CommentSectionProps {
  pstId: string;
  bbsId: string;
  initialComments: CommentVO[];
}

import { motion, AnimatePresence } from 'framer-motion';

export default function CommentSection({ pstId, bbsId, initialComments }: CommentSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Optimistic State Management (React 19)
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    initialComments,
    (state: CommentVO[], action: { type: 'add' | 'delete' | 'update', payload: any }) => {
      switch (action.type) {
        case 'add':
          return [action.payload, ...state];
        case 'delete':
          return state.filter(c => c.ansSn !== action.payload);
        case 'update':
          return state.map(c => c.ansSn === action.payload.ansSn ? { ...c, ansCn: action.payload.ansCn } : c);
        default:
          return state;
      }
    }
  );

  const [ansCn, setAnsCn] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCn, setEditCn] = useState('');

  const handleCreate = async (formData: FormData) => {
    const content = formData.get('ansCn') as string;
    if (!content.trim()) return;

    setAnsCn(''); // Clear input immediately
    
    startTransition(async () => {
      // Add optimistic comment
      const tempId = Math.random();
      addOptimisticComment({
        type: 'add',
        payload: {
          id: tempId,
          ansCn: content,
          wrterNm: 'User', // Assume current user
          crtDt: new Date().toISOString(),
          isOptimistic: true
        }
      });

      const result = await createComment(null, formData);
      if (!result.success) {
        toast(result.message || '댓글 등록에 실패했습니다.', 'error');
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    startTransition(async () => {
      addOptimisticComment({ type: 'delete', payload: id });
      
      const formData = new FormData();
      formData.append('id', id.toString());
      formData.append('bbsId', bbsId);
      formData.append('pstId', pstId);
      
      const result = await deleteComment(null, formData);
      if (!result.success) {
        toast(result.message || '삭제에 실패했습니다.', 'error');
      }
    });
  };

  const handleEdit = async (id: number) => {
    if (!editCn.trim()) return;
    
    const originalContent = editCn;
    setEditingId(null);
    
    startTransition(async () => {
      addOptimisticComment({ type: 'update', payload: { ansSn: id, ansCn: originalContent } });
      
      const formData = new FormData();
      formData.append('id', id.toString());
      formData.append('ansCn', originalContent);
      formData.append('bbsId', bbsId);
      formData.append('pstId', pstId);
      
      const result = await updateComment(null, formData);
      if (!result.success) {
        toast(result.message || '수정에 실패했습니다.', 'error');
      }
    });
  };

  return (
    <div className="space-y-12 pt-24 relative">
      <div className="flex items-center justify-between border-b-2 border-border pb-8 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-20" />
        <div className="flex items-center gap-6 relative z-10">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-16 h-16 rounded-2xl bg-surface-inverse flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
          >
            <MessageSquare className="w-8 h-8 text-surface-inverse-foreground" />
          </motion.div>
          <div>
            <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none mb-2">Discussion Hub</h3>
            <p className="text-[10px] font-black text-muted-foreground tracking-[0.4em] uppercase">{optimisticComments.length} active threads</p>
          </div>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {optimisticComments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-24 text-center border-2 border-dashed border-border rounded-[2rem] bg-muted/50"
            >
              <p className="text-muted-foreground font-black tracking-widest uppercase text-xs">No entries found. Initiate the thread below.</p>
            </motion.div>
          ) : (
            optimisticComments.map((comment) => (
              <motion.div
                key={comment.ansSn}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring" as const, stiffness: 100 }}
              >
                <Card className={cn(
                  "border border-white shadow-2xl rounded-3xl overflow-hidden bg-white/70 backdrop-blur-md ring-1 ring-black/5 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all group",
                  (comment as any).isOptimistic && "opacity-60 grayscale-[0.5]"
                )}>
                  <CardContent className="p-10">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-muted border-2 border-white shadow-inner flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <User className="w-7 h-7 text-muted-foreground group-hover:text-white" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-black text-foreground tracking-tight text-lg leading-none uppercase">{comment.wrterNm}</h4>
                            <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-2">
                              <Clock className="w-3.5 h-3.5" />
                              {comment.crtDt ? format(new Date(comment.crtDt), 'yyyy-MM-dd HH:mm') : '-'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {editingId === comment.ansSn ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(comment.ansSn)} className="h-10 w-10 p-0 rounded-xl text-green-600 hover:bg-green-50" data-testid="edit-save-button"><Check className="w-5 h-5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-10 w-10 p-0 rounded-xl text-muted-foreground hover:bg-muted" data-testid="edit-cancel-button"><X className="w-5 h-5" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setEditingId(comment.ansSn); setEditCn(comment.ansCn); }} className="h-10 w-10 p-0 rounded-xl text-muted-foreground hover:bg-muted" data-testid="comment-edit-button"><Edit2 className="w-5 h-5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.ansSn)} className="h-10 w-10 p-0 rounded-xl text-rose-400 hover:bg-rose-50" data-testid="comment-delete-button"><Trash2 className="w-5 h-5" /></Button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId === comment.ansSn ? (
                        <Textarea
                          value={editCn}
                          onChange={(e) => setEditCn(e.target.value)}
                          className="min-h-[120px] rounded-2xl border-border focus:ring-slate-900 border-2 text-foreground font-bold text-lg p-6 bg-muted/50"
                        />
                      ) : (
                        <p className="text-foreground font-bold text-lg leading-relaxed whitespace-pre-wrap pl-1">
                          {comment.ansCn}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Comment Form */}
      <motion.form 
        action={handleCreate} 
        className="relative group pt-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <input type="hidden" name="bbsId" value={bbsId} />
        <input type="hidden" name="pstId" value={pstId} />
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-slate-200/20 to-hub-indigo/20 rounded-[2.5rem] blur-xl opacity-25 group-hover:opacity-100 transition duration-1000"></div>
        <Card className="relative border border-white shadow-2xl rounded-[2.5rem] bg-white/80 backdrop-blur-3xl ring-1 ring-black/5 overflow-hidden">
          <CardContent className="p-12 space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <Badge className="px-5 py-2 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-black tracking-widest text-[10px] uppercase hover:bg-surface-inverse shadow-xl">Initiate Response</Badge>
              <div className="h-[2px] flex-1 bg-muted" />
            </div>
            <Textarea
              name="ansCn"
              placeholder="Inject your thoughts into the collective knowledge..."
              value={ansCn}
              onChange={(e) => setAnsCn(e.target.value)}
              className="min-h-[180px] border-none focus-visible:ring-0 text-2xl font-black text-foreground tracking-tighter resize-none p-0 bg-transparent placeholder:text-muted-foreground placeholder:uppercase"
            />
            <div className="flex justify-end border-t border-border pt-8">
              <Button
                type="submit"
                disabled={isPending || !ansCn.trim()}
                className="h-16 px-12 rounded-[1.5rem] bg-surface-inverse hover:bg-black text-surface-inverse-foreground font-black tracking-widest text-xs uppercase shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] flex gap-4 active:scale-95 transition-all group"
              >
                {isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> COMMITTING...</>
                ) : (
                  <><Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Commit Response</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.form>
    </div>
  );
}


// Utility function for conditional class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
