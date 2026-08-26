'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { Survey, SurveyQuestion } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, ListChecks, MessageSquareText } from 'lucide-react';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
  surveyItemCreateSchema,
  surveyItemValidationLabels,
  surveyQuestionCreateSchema,
  surveyQuestionValidationLabels,
} from './survey-panel-form-validation';

/** '1' = 객관식. 그 외는 주관식으로 취급한다(백엔드 통계 DTO 와 같은 규약). */
const MULTIPLE_CHOICE = '1';

/**
 * 문항·항목 관리 패널 — 허브의 `questions` 탭에서 렌더한다.
 *
 * <p><b>항목을 별도 화면으로 두지 않는 이유</b>: 항목(`tb_srvy_artcl`)은 문항 하위 자원이고
 * 소속 문항 없이는 의미가 없다. 구 메뉴 2010600('항목관리')이 독립 화면을 전제했지만 허브에
 * 그 탭이 존재한 적이 없다 — 문항 안에서 함께 다루는 것이 도메인에 맞다.
 *
 * <p>문항 목록은 <b>항목까지 중첩해서</b> 한 번에 온다(백엔드가 단일 IN 조회로 묶는다).
 * 문항별로 항목을 따로 조회하면 프론트에서 N+1 을 되살리는 셈이라 하지 않는다.
 */
export default function SurveyQuestionsPanel() {
  const queryClient = useQueryClient();
  const [srvySn, setSrvySn] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newItemFor, setNewItemFor] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<string | null>(null);
  const questionPendingRef = useRef(false);
  const itemPendingRef = useRef(false);
  const deletePendingRef = useRef(false);
  const questionValidation = useManualFormValidation(surveyQuestionCreateSchema, {
    labels: surveyQuestionValidationLabels,
  });
  const itemValidation = useManualFormValidation(surveyItemCreateSchema, {
    labels: surveyItemValidationLabels,
  });

  const { data: surveys } = useQuery<PageResponse<Survey>>({
    queryKey: ['admin-surveys-for-questions'],
    queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, size: 100 }),
  });

  const questionsKey = ['admin-survey-questions', srvySn];
  const { data: questions = [], isLoading } = useQuery<SurveyQuestion[]>({
    queryKey: questionsKey,
    queryFn: () => surveyAdminService.getQuestions(srvySn!),
    enabled: srvySn !== null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: questionsKey });
  const onError = (e: unknown) => setError(extractErrorMessage(e, '처리에 실패했습니다.'));

  const addQuestion = useMutation({
    mutationFn: (payload: { srvySn: number; qstnCn: string; qstnTypeCd: string; qstnSn: number }) =>
      surveyAdminService.createQuestion(payload.srvySn, payload),
    onSuccess: () => {
      setNewQuestion('');
      setError(null);
      questionValidation.setFormErrors({}, false);
      invalidate();
    },
    onError: (mutationError: unknown) => {
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) questionValidation.setFormErrors(fieldErrors);
      else onError(mutationError);
    },
    onSettled: () => {
      questionPendingRef.current = false;
    },
  });

  const removeQuestion = useMutation({
    mutationFn: (srvyQstnSn: number) => surveyAdminService.deleteQuestion(srvySn!, srvyQstnSn),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
    onSettled: () => {
      deletePendingRef.current = false;
      setDeletingTarget(null);
    },
  });

  const addItem = useMutation({
    mutationFn: (payload: { srvyQstnSn: number; srvySn: number; artclCn: string }) =>
      surveyAdminService.createItem(payload.srvyQstnSn, payload),
    onSuccess: () => {
      setNewItemFor(null);
      setNewItemText('');
      setError(null);
      itemValidation.setFormErrors({}, false);
      invalidate();
    },
    onError: (mutationError: unknown) => {
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) itemValidation.setFormErrors(fieldErrors);
      else onError(mutationError);
    },
    onSettled: () => {
      itemPendingRef.current = false;
    },
  });

  const removeItem = useMutation({
    mutationFn: (srvyArtclSn: number) => surveyAdminService.deleteItem(srvyArtclSn),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
    onSettled: () => {
      deletePendingRef.current = false;
      setDeletingTarget(null);
    },
  });

  const beginDelete = (target: string, remove: () => void) => {
    if (deletePendingRef.current || questionPendingRef.current || itemPendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingTarget(target);
    setError(null);
    remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label htmlFor="questions-srvy" className="text-sm font-bold shrink-0">
          설문 선택
        </label>
        <select
          id="questions-srvy"
          value={srvySn ?? ''}
          onChange={(e) => {
            setSrvySn(e.target.value ? Number(e.target.value) : null);
            setError(null);
            questionValidation.setFormErrors({}, false);
            itemValidation.setFormErrors({}, false);
          }}
          className="border rounded-lg px-3 py-2 text-sm bg-card max-w-md w-full"
        >
          <option value="">— 설문을 선택하세요 —</option>
          {(surveys?.list ?? []).map((s) => (
            <option key={s.srvySn} value={s.srvySn}>
              {s.srvyTtl}
            </option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-destructive-emphasis">{error}</p>}

      {srvySn === null ? (
        <div className="p-16 text-center bg-card rounded-lg border-2 border-dashed">
          <ListChecks size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">설문을 선택하면 문항과 선택 항목을 관리할 수 있습니다.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (questionPendingRef.current || itemPendingRef.current || deletePendingRef.current) return;
              const validated = questionValidation.validate({
                srvySn,
                qstnCn: newQuestion,
                qstnTypeCd: MULTIPLE_CHOICE,
                qstnSn: questions.length + 1,
              });
              if (!validated) return;
              setError(null);
              questionPendingRef.current = true;
              addQuestion.mutate(validated);
            }}
            noValidate
            className="space-y-2"
          >
            <FormErrorSummary
              errors={questionValidation.errors}
              labels={surveyQuestionValidationLabels}
              onNavigate={questionValidation.focusError}
            />
            <div className="flex gap-2">
              <Input
                {...questionValidation.fieldProps('qstnCn')}
                value={newQuestion}
                onChange={(e) => {
                  questionValidation.clearError('qstnCn');
                  setNewQuestion(e.target.value);
                }}
                placeholder="새 문항 내용"
                aria-label="새 문항 내용"
                maxLength={4000}
                required
              />
              <Button
                type="submit"
                disabled={addQuestion.isPending || addItem.isPending || deletingTarget !== null}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" /> 문항 추가
              </Button>
            </div>
            {questionValidation.errors.qstnCn ? (
              <p {...questionValidation.messageProps('qstnCn')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </form>

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">등록된 문항이 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q, idx) => (
                <li key={q.srvyQstnSn} className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-foreground flex-1 min-w-0 break-words">{q.qstnCn}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-hub-blue/10 text-hub-blue shrink-0">
                      {q.qstnTypeCd === MULTIPLE_CHOICE ? '객관식' : '주관식'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={deletingTarget === `question-${q.srvyQstnSn}`
                        ? `${q.qstnCn} 문항 삭제 중`
                        : `${q.qstnCn} 문항 삭제`}
                      aria-busy={deletingTarget === `question-${q.srvyQstnSn}`}
                      disabled={deletingTarget !== null || addQuestion.isPending || addItem.isPending}
                      className="h-8 w-8 text-destructive-emphasis hover:bg-destructive/10 shrink-0"
                      onClick={() => beginDelete(
                        `question-${q.srvyQstnSn}`,
                        () => removeQuestion.mutate(q.srvyQstnSn),
                      )}
                    >
                      {deletingTarget === `question-${q.srvyQstnSn}`
                        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>

                  <div className="p-4 space-y-2">
                    {(q.items ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <MessageSquareText size={12} /> 선택 항목이 없습니다 (주관식이면 정상입니다).
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {(q.items ?? []).map((item) => (
                          <li key={item.srvyArtclSn} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground/50">·</span>
                            <span className="flex-1 min-w-0 break-words">{item.artclCn}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={deletingTarget === `item-${item.srvyArtclSn}`
                                ? `${item.artclCn} 항목 삭제 중`
                                : `${item.artclCn} 항목 삭제`}
                              aria-busy={deletingTarget === `item-${item.srvyArtclSn}`}
                              disabled={deletingTarget !== null || addQuestion.isPending || addItem.isPending}
                              className="h-7 w-7 text-destructive-emphasis hover:bg-destructive/10"
                              onClick={() => beginDelete(
                                `item-${item.srvyArtclSn}`,
                                () => removeItem.mutate(item.srvyArtclSn),
                              )}
                            >
                              {deletingTarget === `item-${item.srvyArtclSn}`
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {newItemFor === q.srvyQstnSn ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (itemPendingRef.current || questionPendingRef.current || deletePendingRef.current) return;
                          const validated = itemValidation.validate({
                            srvyQstnSn: q.srvyQstnSn,
                            srvySn: srvySn,
                            artclCn: newItemText,
                          });
                          if (!validated) return;
                          setError(null);
                          itemPendingRef.current = true;
                          addItem.mutate(validated);
                        }}
                        noValidate
                        className="space-y-2 pt-2"
                      >
                        <FormErrorSummary
                          errors={itemValidation.errors}
                          labels={surveyItemValidationLabels}
                          onNavigate={itemValidation.focusError}
                        />
                        <div className="flex gap-2">
                          <Input
                            {...itemValidation.fieldProps('artclCn')}
                            autoFocus
                            value={newItemText}
                            onChange={(e) => {
                              itemValidation.clearError('artclCn');
                              setNewItemText(e.target.value);
                            }}
                            placeholder="항목 내용"
                            aria-label="새 항목 내용"
                            className="h-8 text-sm"
                            maxLength={4000}
                            required
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={addItem.isPending || addQuestion.isPending || deletingTarget !== null}
                          >
                            추가
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={addItem.isPending || addQuestion.isPending || deletingTarget !== null}
                            onClick={() => {
                              if (itemPendingRef.current || questionPendingRef.current || deletePendingRef.current) return;
                              itemValidation.setFormErrors({}, false);
                              setNewItemFor(null);
                            }}
                          >
                            취소
                          </Button>
                        </div>
                        {itemValidation.errors.artclCn ? (
                          <p {...itemValidation.messageProps('artclCn')} className="text-xs font-bold text-destructive-emphasis" />
                        ) : null}
                      </form>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        disabled={addQuestion.isPending || addItem.isPending || deletingTarget !== null}
                        onClick={() => {
                          itemValidation.setFormErrors({}, false);
                          setNewItemFor(q.srvyQstnSn);
                          setNewItemText('');
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> 항목 추가
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
