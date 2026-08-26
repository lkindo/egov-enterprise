'use client';

import { useOptimistic, useRef, useState, useTransition } from 'react';
import { MessageSquare, User, Clock, Trash2, Edit2, Send, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommentVO } from '@/types/business/comment';
import { format } from 'date-fns';
import { createComment, deleteComment, updateComment } from '@/app/actions/commentActions';
import { useToast } from '@/app/components/ui/toast';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
  commentCreateFormSchema,
  commentCreateValidationLabels,
  commentEditFormSchema,
  commentEditValidationLabels,
  mapCommentEditFieldErrors,
} from './comment-form-validation';

interface CommentSectionProps {
  pstSn: number;
  bbsId: string;
  initialComments: CommentVO[];
}

type CommentView = CommentVO & { isOptimistic?: boolean };
type OptimisticCommentAction =
  | { type: 'add'; payload: CommentView }
  | { type: 'delete'; payload: number }
  | { type: 'update'; payload: Pick<CommentVO, 'ansSn' | 'ansCn'> };

import { motion, AnimatePresence } from 'framer-motion';

export default function CommentSection({ pstSn, bbsId, initialComments }: CommentSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Optimistic State Management (React 19)
  const [optimisticComments, addOptimisticComment] = useOptimistic<CommentView[], OptimisticCommentAction>(
    initialComments,
    (state, action) => {
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
  const [editPendingId, setEditPendingId] = useState<number | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);
  const createPendingRef = useRef(false);
  const editPendingRef = useRef(false);
  const deletePendingRef = useRef(false);
  const createInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const createValidation = useManualFormValidation(commentCreateFormSchema, {
    labels: commentCreateValidationLabels,
    focusTargets: { ansCn: () => createInputRef.current },
  });
  const editValidation = useManualFormValidation(commentEditFormSchema, {
    labels: commentEditValidationLabels,
    focusTargets: { editCn: () => editInputRef.current },
  });

  const handleCreate = async (formData: FormData) => {
    if (createPendingRef.current) return;
    const validated = createValidation.validate({ pstSn, bbsId, ansCn });
    if (!validated) return;
    createPendingRef.current = true;
    const content = validated.ansCn;
    formData.set('pstSn', String(validated.pstSn));
    formData.set('bbsId', validated.bbsId);
    formData.set('ansCn', content);

    setAnsCn(''); // Clear input immediately
    
    startTransition(async () => {
      // Add optimistic comment
      // [2026-08-12 수정] 식별자 필드는 `id` 가 아니라 `ansSn` 이다(CommentVO).
      //   `id` 로 넣으면 낙관적 행의 `ansSn` 이 undefined 가 되어 ① 리스트 key 가 undefined 이고
      //   ② `editingId === comment.ansSn` 이 `undefined === undefined` 로 **참**이 되어
      //   엉뚱하게 편집 폼이 열린다. 임시 ID 라도 실어야 행이 자기 정체성을 갖는다.
      const tempId = Math.random();
      addOptimisticComment({
        type: 'add',
        payload: {
          ansSn: tempId,
          pstSn,
          bbsId,
          ansCn: content,
          wrterId: '',
          wrterNm: 'User', // Assume current user
          crtDt: new Date().toISOString(),
          isOptimistic: true
        }
      });

      try {
        const result = await createComment(null, formData);
        if (!result.success) {
          // 요청 중 사용자가 새로 입력했다면 덮어쓰지 않고, 비어 있을 때만 실패한 원문을 복구한다.
          setAnsCn(current => current.trim() ? current : content);
          if (result.fieldErrors) createValidation.setFormErrors(result.fieldErrors);
          else toast(result.message || '댓글 등록에 실패했습니다.', 'error');
        } else {
          createValidation.setFormErrors({}, false);
        }
      } catch {
        setAnsCn(current => current.trim() ? current : content);
        toast('댓글 등록 중 오류가 발생했습니다.', 'error');
      } finally {
        createPendingRef.current = false;
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (deletePendingRef.current || editPendingRef.current || createPendingRef.current) return;
    deletePendingRef.current = true;
    if (!confirm('댓글을 삭제하시겠습니까?')) {
      deletePendingRef.current = false;
      return;
    }
    setDeletePendingId(id);
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('id', id.toString());
      formData.append('bbsId', bbsId);
      formData.append('pstSn', String(pstSn));
      
      try {
        const result = await deleteComment(null, formData);
        if (!result.success) {
          toast(result.message || '삭제에 실패했습니다.', 'error');
        } else {
          addOptimisticComment({ type: 'delete', payload: id });
        }
      } catch {
        toast('댓글 삭제 중 오류가 발생했습니다.', 'error');
      } finally {
        deletePendingRef.current = false;
        setDeletePendingId(null);
      }
    });
  };

  const handleEdit = async (id: number) => {
    if (editPendingRef.current || createPendingRef.current || deletePendingRef.current) return;
    const validated = editValidation.validate({ pstSn, bbsId, editCn });
    if (!validated) return;
    editPendingRef.current = true;
    setEditPendingId(id);
    const originalContent = validated.editCn;
    
    startTransition(async () => {
      addOptimisticComment({ type: 'update', payload: { ansSn: id, ansCn: originalContent } });
      
      const formData = new FormData();
      formData.append('id', id.toString());
      formData.append('ansCn', originalContent);
      formData.append('bbsId', validated.bbsId);
      formData.append('pstSn', String(validated.pstSn));
      
      try {
        const result = await updateComment(null, formData);
        if (!result.success) {
          // 낙관적 본문은 useOptimistic이 원복한다. 편집 폼도 다시 열어 사용자의 수정 원문을 보존한다.
          setEditingId(id);
          setEditCn(originalContent);
          if (result.fieldErrors) {
            editValidation.setFormErrors(mapCommentEditFieldErrors(result.fieldErrors));
          } else {
            toast(result.message || '수정에 실패했습니다.', 'error');
          }
        } else {
          editValidation.setFormErrors({}, false);
          setEditingId(null);
        }
      } catch {
        setEditingId(id);
        setEditCn(originalContent);
        toast('댓글 수정 중 오류가 발생했습니다.', 'error');
      } finally {
        editPendingRef.current = false;
        setEditPendingId(null);
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
                  comment.isOptimistic && "opacity-60 grayscale-[0.5]"
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
                        {/*
                          [2026-08-12 수정] 서버 미확정(낙관적) 행에는 수정·삭제를 노출하지 않는다.
                          그 행에는 서버가 채번한 ID 가 없어 수정·삭제 요청 자체가 성립하지 않고,
                          설령 편집 폼을 열어도 revalidate 로 확정 행이 도착하는 순간
                          `editingId` 가 새 `ansSn` 과 어긋나 **폼이 조용히 접히며 입력이 유실된다.**
                          (카드가 이미 opacity/grayscale 로 미확정임을 알리고 있었는데, 동작만 막지 않고 있었다.)
                        */}
                        {!comment.isOptimistic && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {editingId === comment.ansSn ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending || editPendingId === comment.ansSn}
                                aria-busy={editPendingId === comment.ansSn}
                                onClick={() => { void handleEdit(comment.ansSn); }}
                                aria-label={editPendingId === comment.ansSn ? '댓글 수정 저장 중' : '댓글 수정 저장'}
                                className="h-10 w-10 p-0 rounded-xl text-success-emphasis hover:bg-success/10"
                                data-testid="edit-save-button"
                              >
                                {editPendingId === comment.ansSn
                                  ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                  : <Check className="w-5 h-5" aria-hidden="true" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => {
                                  editValidation.setFormErrors({}, false);
                                  setEditingId(null);
                                }}
                                aria-label="댓글 수정 취소"
                                className="h-10 w-10 p-0 rounded-xl text-muted-foreground hover:bg-muted"
                                data-testid="edit-cancel-button"
                              ><X className="w-5 h-5" /></Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => {
                                  editValidation.setFormErrors({}, false);
                                  setEditingId(comment.ansSn);
                                  setEditCn(comment.ansCn);
                                }}
                                aria-label="댓글 수정"
                                className="h-10 w-10 p-0 rounded-xl text-muted-foreground hover:bg-muted"
                                data-testid="comment-edit-button"
                              ><Edit2 className="w-5 h-5" /></Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending || deletePendingId === comment.ansSn}
                                aria-busy={deletePendingId === comment.ansSn}
                                onClick={() => { void handleDelete(comment.ansSn); }}
                                aria-label={deletePendingId === comment.ansSn ? '댓글 삭제 중' : '댓글 삭제'}
                                className="h-10 w-10 p-0 rounded-xl text-destructive-emphasis hover:bg-destructive/10"
                                data-testid="comment-delete-button"
                              >
                                {deletePendingId === comment.ansSn
                                  ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                  : <Trash2 className="w-5 h-5" aria-hidden="true" />}
                              </Button>
                            </>
                          )}
                        </div>
                        )}
                      </div>

                      {editingId === comment.ansSn ? (
                        <div className="space-y-3">
                          <FormErrorSummary
                            errors={editValidation.errors}
                            labels={commentEditValidationLabels}
                            onNavigate={editValidation.focusError}
                          />
                          <Textarea
                            ref={editInputRef}
                            {...editValidation.fieldProps('editCn')}
                            aria-label="댓글 수정 내용"
                            value={editCn}
                            onChange={(e) => {
                              editValidation.clearError('editCn');
                              setEditCn(e.target.value);
                            }}
                            maxLength={4000}
                            required
                            className="min-h-[120px] rounded-2xl border-border focus:ring-slate-900 border-2 text-foreground font-bold text-lg p-6 bg-muted/50"
                          />
                          {editValidation.errors.editCn ? (
                            <p {...editValidation.messageProps('editCn')} className="text-xs font-bold text-destructive-emphasis" />
                          ) : null}
                        </div>
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
        noValidate
        className="relative group pt-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <input type="hidden" name="bbsId" value={bbsId} />
        <input type="hidden" name="pstSn" value={pstSn} />
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-slate-200/20 to-hub-indigo/20 rounded-[2.5rem] blur-xl opacity-25 group-hover:opacity-100 transition duration-1000"></div>
        <Card className="relative border border-white shadow-2xl rounded-[2.5rem] bg-white/80 backdrop-blur-3xl ring-1 ring-black/5 overflow-hidden">
          <CardContent className="p-12 space-y-8">
            <FormErrorSummary
              errors={createValidation.errors}
              labels={commentCreateValidationLabels}
              onNavigate={createValidation.focusError}
            />
            <div className="flex items-center gap-4 mb-2">
              <Badge className="px-5 py-2 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-black tracking-widest text-[10px] uppercase hover:bg-surface-inverse shadow-xl">Initiate Response</Badge>
              <div className="h-[2px] flex-1 bg-muted" />
            </div>
            <Textarea
              ref={createInputRef}
              {...createValidation.fieldProps('ansCn')}
              aria-label="새 댓글 작성"
              placeholder="Inject your thoughts into the collective knowledge..."
              value={ansCn}
              onChange={(e) => {
                createValidation.clearError('ansCn');
                setAnsCn(e.target.value);
              }}
              maxLength={4000}
              required
              className="min-h-[180px] border-none focus-visible:ring-0 text-2xl font-black text-foreground tracking-tighter resize-none p-0 bg-transparent placeholder:text-muted-foreground placeholder:uppercase"
            />
            {createValidation.errors.ansCn ? (
              <p {...createValidation.messageProps('ansCn')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
            <div className="flex justify-end border-t border-border pt-8">
              <Button
                type="submit"
                disabled={isPending}
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
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
