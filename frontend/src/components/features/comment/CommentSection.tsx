'use client';

import { useOptimistic, useRef, useState, useTransition, type FormEvent } from 'react';
import { MessageSquare, User, Clock, Trash2, Edit2, Send, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommentVO } from '@/types/business/comment';
import { format } from 'date-fns';
import { createComment, deleteComment, updateComment } from '@/app/actions/commentActions';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
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
  /** 서버가 센 전체 댓글 수. 상세 화면은 첫 100개만 받으므로 불러온 수와 다를 수 있다. */
  totalComments?: number;
}

type CommentView = CommentVO & { isOptimistic?: boolean };
type OptimisticCommentAction =
  | { type: 'add'; payload: CommentView }
  | { type: 'delete'; payload: number }
  | { type: 'update'; payload: Pick<CommentVO, 'ansSn' | 'ansCn'> };

import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';

export default function CommentSection({ pstSn, bbsId, initialComments, totalComments }: CommentSectionProps) {
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  /**
   * 수정·삭제 버튼 노출 판정.
   *
   * 서버 가드({@code SecurityUtil.assertOwnerOrAdmin})와 **같은 축**을 본다 — 등록자 로그인 ID.
   * 종전에는 판정 자체가 없어 남의 댓글에도 버튼이 떴고, 사용자는 확인창을 통과한 뒤에야 실패했다.
   * 소유자의 수정·삭제 기능권한과 다른 작성자의 댓글 관리 권한을 구분한다.
   */
  const canManageComment = (comment: CommentView, action: 'UPDATE' | 'DELETE') =>
    canPermission(user, `COMMENT_${action}`)
    && (canPermission(user, `COMMENT_${action}_ALL`) || Boolean(user?.id && comment.frstRgtrId && comment.frstRgtrId === user.id));
  
  // Optimistic State Management (React 19)
  const [optimisticComments, addOptimisticComment] = useOptimistic<CommentView[], OptimisticCommentAction>(
    initialComments,
    (state, action) => {
      switch (action.type) {
        // [2026-09-26 DIP C7] 서버는 댓글을 등록순으로 준다. 새 댓글을 맨 앞에 두면 새로고침 뒤 맨 뒤로 튄다.
        case 'add':
          return [...state, action.payload];
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
  const [createPending, setCreatePending] = useState(false);
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
  const hasWritePending = createPending || editPendingId !== null || deletePendingId !== null;
  // 표시 수는 서버가 센 전체 수를 기준으로 하고, 이 화면에서 더하거나 지운 만큼만 반영한다.
  //   종전에는 불러온 행 수를 세어 100개를 넘는 글도 '댓글 100개' 라 말했다.
  const hiddenCommentCount = Math.max(0, (totalComments ?? initialComments.length) - initialComments.length);
  const commentCount = optimisticComments.length + hiddenCommentCount;

  const handleCreate = (formData: FormData) => {
    if (createPendingRef.current) return;
    const validated = createValidation.validate({ pstSn, bbsId, ansCn });
    if (!validated) return;
    createPendingRef.current = true;
    setCreatePending(true);
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
          wrterNm: user?.name ?? '', // 서버가 확정한 이름이 도착하면 대체된다
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
        setCreatePending(false);
      }
    });
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCreate(new FormData(event.currentTarget));
  };

  const handleDelete = async (id: number) => {
    if (deletePendingRef.current || editPendingRef.current || createPendingRef.current) return;
    deletePendingRef.current = true;
    // [2026-09-06 DEC-OPS-038] 네이티브 confirm → useConfirm 모달. 확인은 transition 밖(onClick)에서 먼저 받는다.
    const ok = await confirm({
      title: '댓글 삭제',
      message: '댓글을 삭제하시겠습니까? 삭제한 댓글은 복구할 수 없습니다.',
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (!ok) {
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
    <div className="space-y-3 pt-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-foreground">댓글</h3>
            <p className="text-xs text-muted-foreground">댓글 {commentCount}개</p>
          </div>
        </div>
      </div>

      {hiddenCommentCount > 0 && (
        <p role="note" className="text-xs text-muted-foreground">
          댓글이 많아 처음 {initialComments.length}개만 보입니다. 나머지 {hiddenCommentCount}개는 이 화면에서 볼 수 없습니다.
        </p>
      )}

      {/* Comment List */}
      <div className="divide-y divide-border rounded-[var(--radius)] border border-border">
        {optimisticComments.length === 0 ? (
          <div className="px-[var(--cell-px)] py-6 text-center">
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">아직 등록된 댓글이 없습니다. 아래에서 첫 댓글을 남겨 주세요.</p>
          </div>
        ) : (
            optimisticComments.map((comment) => (
              <div key={comment.ansSn}>
                <Card className={cn(
                  "gap-0 rounded-none border-0 py-0 shadow-none",
                  comment.isOptimistic && "opacity-60"
                )}>
                  <CardContent className="px-[var(--cell-px)] py-[var(--cell-py)]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                            <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <h4 className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{comment.wrterNm}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
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
                        {!comment.isOptimistic && (canManageComment(comment, 'UPDATE') || canManageComment(comment, 'DELETE')) && (
                        <div className="flex shrink-0 items-center gap-1">
                          {editingId === comment.ansSn && canManageComment(comment, 'UPDATE') ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={hasWritePending}
                                aria-busy={editPendingId === comment.ansSn}
                                onClick={() => { void handleEdit(comment.ansSn); }}
                                aria-label={editPendingId === comment.ansSn ? '댓글 수정 저장 중' : '댓글 수정 저장'}
                                className="size-8 rounded-md p-0 text-success-emphasis hover:bg-success/10"
                                data-testid="edit-save-button"
                              >
                                {editPendingId === comment.ansSn
                                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  : <Check className="h-4 w-4" aria-hidden="true" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={hasWritePending}
                                onClick={() => {
                                  editValidation.setFormErrors({}, false);
                                  setEditingId(null);
                                }}
                                aria-label="댓글 수정 취소"
                                className="h-[var(--control-h-sm)] w-[var(--control-h-sm)] p-0 text-muted-foreground hover:bg-muted"
                                data-testid="edit-cancel-button"
                              ><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              {canManageComment(comment, 'UPDATE') && <Button
                                variant="ghost"
                                size="sm"
                                disabled={hasWritePending}
                                onClick={() => {
                                  editValidation.setFormErrors({}, false);
                                  setEditingId(comment.ansSn);
                                  setEditCn(comment.ansCn);
                                }}
                                aria-label="댓글 수정"
                                className="h-[var(--control-h-sm)] w-[var(--control-h-sm)] p-0 text-muted-foreground hover:bg-muted"
                                data-testid="comment-edit-button"
                              ><Edit2 className="h-4 w-4" /></Button>}
                              {canManageComment(comment, 'DELETE') && <Button
                                variant="ghost"
                                size="sm"
                                disabled={hasWritePending}
                                aria-busy={deletePendingId === comment.ansSn}
                                onClick={() => { void handleDelete(comment.ansSn); }}
                                aria-label={deletePendingId === comment.ansSn ? '댓글 삭제 중' : '댓글 삭제'}
                                className="h-[var(--control-h-sm)] w-[var(--control-h-sm)] p-0 text-destructive-emphasis hover:bg-destructive/10"
                                data-testid="comment-delete-button"
                              >
                                {deletePendingId === comment.ansSn
                                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                              </Button>}
                            </>
                          )}
                        </div>
                        )}
                      </div>

                      {editingId === comment.ansSn && canManageComment(comment, 'UPDATE') ? (
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
                            className="min-h-20 rounded-[var(--radius)] border-border bg-background p-2 text-[length:var(--font-size-body)] text-foreground"
                          />
                          {editValidation.errors.editCn ? (
                            <p {...editValidation.messageProps('editCn')} className="text-xs font-bold text-destructive-emphasis" />
                          ) : null}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-[length:var(--font-size-body)] leading-relaxed text-foreground">
                          {comment.ansCn}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
      </div>

      {/* Comment Form */}
      <motion.form
        onSubmit={handleCreateSubmit}
        noValidate
        className="pt-2"
      >
        <input type="hidden" name="bbsId" value={bbsId} />
        <input type="hidden" name="pstSn" value={pstSn} />
        <Card className="gap-0 rounded-[var(--radius)] border-border py-0 shadow-none">
          <CardContent className="space-y-[var(--form-gap)] p-[var(--filter-pad)]">
            <FormErrorSummary
              errors={createValidation.errors}
              labels={commentCreateValidationLabels}
              onNavigate={createValidation.focusError}
            />
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">새 댓글</Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Textarea
              ref={createInputRef}
              {...createValidation.fieldProps('ansCn')}
              aria-label="새 댓글 작성"
              placeholder="댓글을 입력하세요."
              value={ansCn}
              onChange={(e) => {
                createValidation.clearError('ansCn');
                setAnsCn(e.target.value);
              }}
              maxLength={4000}
              required
              className="min-h-24 resize-y rounded-[var(--radius)] border-border bg-background p-2 text-[length:var(--font-size-body)] text-foreground placeholder:text-muted-foreground"
            />
            {createValidation.errors.ansCn ? (
              <p {...createValidation.messageProps('ansCn')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
            <div className="flex justify-end border-t border-border pt-3">
              <Button
                type="submit"
                size="sm"
                disabled={hasWritePending}
                aria-busy={createPending}
                className="gap-1.5"
              >
                {createPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 댓글 등록 중…</>
                ) : (
                  <><Send className="h-4 w-4" aria-hidden="true" /> 댓글 등록</>
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
