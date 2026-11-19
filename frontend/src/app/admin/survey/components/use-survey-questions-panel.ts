'use client';

import { useRef, useState } from 'react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { Survey, SurveyQuestion } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useSurveyEditing } from './use-survey-editing';
import {
  surveyItemCreateSchema,
  surveyItemValidationLabels,
  surveyQuestionCreateSchema,
  surveyQuestionValidationLabels,
} from './survey-panel-form-validation';
import { PERIOD_FIELDS, SURVEYS_FOR_QUESTIONS_KEY } from './survey-questions-model';

export function useSurveyQuestionsPanel() {
  const queryClient = useQueryClient();
  // 파괴적 액션은 native confirm 대신 useConfirm — 본문에 대상과 소실 범위를 노출한다.
  const confirm = useConfirm();
  const [srvySn, setSrvySn] = useState<number | null>(null);
  /** [2026-09-26 DIP B5 F6] 복제 대화상자를 연 원본 설문. */
  const [copySource, setCopySource] = useState<{ srvySn: number; srvyTtl?: string | null } | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  /** [DIP B4 P6] 새 문항의 선택 방식 — 하나만 고르기(1) 또는 여러 개 고르기(2 이상). */
  const [newQuestionMultiple, setNewQuestionMultiple] = useState(false);
  const [newQuestionFreeText, setNewQuestionFreeText] = useState(false);
  const [newQuestionMaxChoice, setNewQuestionMaxChoice] = useState('2');
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
  const surveyDeletePendingRef = useRef(false);
  const releasePendingRef = useRef(false);
  const itemValidation = useManualFormValidation(surveyItemCreateSchema, {
    labels: surveyItemValidationLabels,
  });

  const { data: surveys } = useQuery<PageResponse<Survey>>({
    queryKey: SURVEYS_FOR_QUESTIONS_KEY,
    queryFn: () => surveyAdminService.getSurveyList({ page: 1, size: 100 }),
  });

  const surveysKey = SURVEYS_FOR_QUESTIONS_KEY;
  /** 템플릿은 설문지 등록의 필수 입력이다(SurveyInfoDto.srvyTmpltSn @NotNull). */
  const { data: templates } = useQuery({
    queryKey: ['admin-survey-templates-for-select'],
    queryFn: () => surveyAdminService.getTemplateList({ page: 1, size: 100 }),
  });

  const questionsKey = ['admin-survey-questions', srvySn];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: questionsKey });
  // 수정(제목·기간·문항·항목) 상태와 요청 — 한 번에 하나만 고친다(use-survey-editing.ts).
  const editing = useSurveyEditing({ setError, srvySn, invalidateQuestions: () => { void invalidate(); } });
  const {
    editingTarget,
    editingText,
    originalEditingText,
    editingPeriod,
    originalEditingPeriod,
    editPendingRef,
  } = editing;
  // 설문지 등록 폼의 입력·처리 중 상태는 SurveyCreateForm 이 따로 등록한다(같은 미저장 확인에 모인다).
  const navigate = useUnsavedChanges(() => ({
    dirty: Boolean(newQuestion || newItemText || (editingTarget && editingText !== originalEditingText)
      || (editingTarget === 'survey' && PERIOD_FIELDS.some((name) => editingPeriod[name] !== originalEditingPeriod[name]))),
    pending: surveyDeletePendingRef.current || questionPendingRef.current || itemPendingRef.current || deletePendingRef.current || editPendingRef.current,
  }));

  const { data: questions = [], isLoading } = useQuery<SurveyQuestion[]>({
    queryKey: questionsKey,
    queryFn: () => surveyAdminService.getQuestions(srvySn!),
    enabled: srvySn !== null,
  });

  const templateOptions = templates?.list ?? [];
  const surveyOptions = surveys?.list ?? [];
  const selectedSurvey = surveyOptions.find((s) => s.srvySn === srvySn) ?? null;

  return {
    queryClient,
    confirm,
    srvySn,
    setSrvySn,
    copySource,
    setCopySource,
    newQuestion,
    setNewQuestion,
    newQuestionMultiple,
    setNewQuestionMultiple,
    newQuestionFreeText,
    setNewQuestionFreeText,
    newQuestionMaxChoice,
    setNewQuestionMaxChoice,
    newItemFor,
    setNewItemFor,
    newItemText,
    setNewItemText,
    error,
    setError,
    deletingTarget,
    setDeletingTarget,
    questionPendingRef,
    itemPendingRef,
    deletePendingRef,
    surveyDeletePendingRef,
    releasePendingRef,
    questionValidation,
    itemValidation,
    surveysKey,
    invalidate,
    editing,
    navigate,
    questions,
    isLoading,
    templateOptions,
    surveyOptions,
    selectedSurvey,
  };
}
