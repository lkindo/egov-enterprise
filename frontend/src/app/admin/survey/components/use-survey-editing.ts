'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import {
  EMPTY_PERIOD,
  SURVEYS_FOR_QUESTIONS_KEY,
  type SurveyInfoUpdate,
  type SurveyItemUpdate,
  type SurveyQuestionUpdate,
} from './survey-questions-model';
import {
  surveyInfoValidationLabels,
  surveyItemEditSchema,
  surveyQuestionEditSchema,
  surveyTitleEditSchema,
} from './survey-panel-form-validation';

/**
 * 문항·항목 관리 패널의 '한 번에 하나만 고치기' 상태(2026-10-18 패널 분해 때 SurveyQuestionsPanel 에서 옮겼다 — 동작 변경 없음).
 *
 * <p>설문지 제목·기간, 문항 내용, 선택 항목 내용의 수정은 같은 상태를 나눠 쓴다 — 고치는 대상(`editingTarget`)은 하나뿐이고
 * 입력값도 하나다. 이 훅은 편집을 열고 닫는 일, 검증을 지난 값만 쓰기로 넘기는 {@link submitEdit} 의 동기 잠금
 * (`editPendingRef`), 세 수정 요청(editSurvey·editQuestion·editItem)을 갖는다. 폼과 그 제출 처리기는 패널 파일에 있다.
 *
 * <p>[2026-09-07] 수정 배선. 2026-08-28 에 등록·삭제만 배선하고 update 3본은 남겨 뒀는데,
 * 그래서 오타 하나를 고치려면 지우고 다시 만들어야 했다(축 2 실측: 소비자 0).
 *
 * <p>⚠ 서버의 update 는 전부 **전체 치환**이다 —
 *   · updateSurvey  → srvyTtl·srvyPrps·srvyWrtGdCn·srvyBgngYmd·srvyEndYmd·srvyTrgt·srvyTmpltSn 7필드
 *   · updateQuestion→ qstnSn·qstnTypeCd·qstnCn·maxChcCnt 4필드
 *   · updateItem    → artclSn·artclCn·etcAnsYn 3필드
 * 바꾸는 필드만 보내면 나머지가 null 로 지워진다. 그래서 목록 행이 가진 나머지 값을 그대로
 * 함께 실어 보낸다(round-trip). 목록 projection 이 SurveyInfoDto·SurveyQuestionDto·
 * SurveyArticleDto 전체를 주므로 별도 상세 조회 없이 가능하다.
 *
 * <p>편집 검증도 등록과 같은 규격을 쓴다 — 오류 요약·첫 오류 포커스·서버 필드 오류 매핑·동기 잠금이 폼 검증 census 의
 * native-form 계약이다(임시 trim 검사로는 그 계약을 못 지킨다).
 */
export function useSurveyEditing({ setError, srvySn, invalidateQuestions }: {
  setError: (message: string | null) => void;
  /** 고른 설문지 — 문항 수정 요청의 경로다. */
  srvySn: number | null;
  /** 고른 설문지의 문항 목록을 다시 읽는다. */
  invalidateQuestions: () => void;
}) {
  const queryClient = useQueryClient();
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [originalEditingText, setOriginalEditingText] = useState('');
  const [editingPeriod, setEditingPeriod] = useState(EMPTY_PERIOD);
  const [originalEditingPeriod, setOriginalEditingPeriod] = useState(EMPTY_PERIOD);
  const editPendingRef = useRef(false);

  const titleEditValidation = useManualFormValidation(surveyTitleEditSchema, {
    labels: surveyInfoValidationLabels,
  });
  const questionEditValidation = useManualFormValidation(surveyQuestionEditSchema, {
    labels: { qstnCn: '문항 내용' },
  });
  const itemEditValidation = useManualFormValidation(surveyItemEditSchema, {
    labels: { artclCn: '항목 내용' },
  });

  const clearEditErrors = () => {
    titleEditValidation.setFormErrors({}, false);
    questionEditValidation.setFormErrors({}, false);
    itemEditValidation.setFormErrors({}, false);
  };

  const beginEdit = (target: string, current: string) => {
    if (editPendingRef.current) return;
    setEditingTarget(target);
    setEditingText(current);
    setOriginalEditingText(current);
    setError(null);
    clearEditErrors();
  };
  const cancelEdit = () => {
    if (editPendingRef.current) return;
    setEditingTarget(null);
    setEditingText('');
    clearEditErrors();
  };
  const finishEdit = () => {
    editPendingRef.current = false;
    setEditingTarget(null);
    setEditingText('');
    clearEditErrors();
  };

  /**
   * 빈 값은 서버에 보내지 않는다 — 전체 치환이라 빈 문자열이 그대로 저장된다.
   * 검증은 각 편집 폼의 스키마가 하고, 통과한 값만 sink 로 넘긴다.
   */
  const submitEdit = <TInput, TOutput>(
    validation: { validate: (values: TInput) => TOutput | null },
    input: TInput,
    run: (validated: TOutput) => void,
  ) => {
    if (editPendingRef.current) return;
    const validated = validation.validate(input);
    if (!validated) return;
    editPendingRef.current = true;
    setError(null);
    run(validated);
  };

  const editSurvey = useMutation({
    mutationFn: (payload: { srvySn: number; body: SurveyInfoUpdate }) =>
      surveyAdminService.updateSurvey(payload.srvySn, payload.body),
    onSuccess: () => { setError(null); finishEdit(); void queryClient.invalidateQueries({ queryKey: SURVEYS_FOR_QUESTIONS_KEY }); },
    onError: (mutationError: unknown) => {
      editPendingRef.current = false;
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) titleEditValidation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(mutationError, '설문지 수정에 실패했습니다.'));
    },
  });

  const editQuestion = useMutation({
    mutationFn: (payload: { srvyQstnSn: number; body: SurveyQuestionUpdate }) =>
      surveyAdminService.updateQuestion(srvySn!, payload.srvyQstnSn, payload.body),
    onSuccess: () => { setError(null); finishEdit(); invalidateQuestions(); },
    onError: (mutationError: unknown) => {
      editPendingRef.current = false;
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) questionEditValidation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(mutationError, '문항 수정에 실패했습니다.'));
    },
  });

  const editItem = useMutation({
    mutationFn: (payload: { srvyArtclSn: number; body: SurveyItemUpdate }) =>
      surveyAdminService.updateItem(payload.srvyArtclSn, payload.body),
    onSuccess: () => { setError(null); finishEdit(); invalidateQuestions(); },
    onError: (mutationError: unknown) => {
      editPendingRef.current = false;
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) itemEditValidation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(mutationError, '선택 항목 수정에 실패했습니다.'));
    },
  });

  return {
    editSurvey,
    editQuestion,
    editItem,
    editingTarget,
    setEditingTarget,
    editingText,
    setEditingText,
    originalEditingText,
    editingPeriod,
    setEditingPeriod,
    originalEditingPeriod,
    setOriginalEditingPeriod,
    editPendingRef,
    titleEditValidation,
    questionEditValidation,
    itemEditValidation,
    beginEdit,
    cancelEdit,
    finishEdit,
    submitEdit,
  };
}

export type SurveyEditing = ReturnType<typeof useSurveyEditing>;
