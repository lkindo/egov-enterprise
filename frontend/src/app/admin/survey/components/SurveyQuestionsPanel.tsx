'use client';

import { useRef, useState, type RefObject } from 'react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { Survey, SurveyQuestion } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Pencil, Plus, Trash2, X, ListChecks, MessageSquareText } from 'lucide-react';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { SurveyCopyDialog } from './SurveyCopyDialog';
import { SurveySelectionBar } from './SurveySelectionBar';
import { useSurveyEditing, type SurveyEditing } from './use-survey-editing';
import { omitNulls } from '@/lib/api/omit-nulls';
import { fromDateInputValue, toDateInputValue } from '@/lib/format-date';
import {
  surveyInfoCreateSchema,
  surveyInfoValidationLabels,
  surveyItemCreateSchema,
  surveyItemValidationLabels,
  surveyQuestionCreateSchema,
  surveyQuestionValidationLabels,
} from './survey-panel-form-validation';
import {
  EMPTY_PERIOD,
  MULTIPLE_CHOICE,
  PERIOD_FIELDS,
  SURVEYS_FOR_QUESTIONS_KEY,
  type SurveyInfoUpdate,
  type SurveyItemUpdate,
  type SurveyQuestionUpdate,
} from './survey-questions-model';

/*
 * [2026-10-18] 패널 분해 — 한 함수(약 1,000줄)에 모여 있던 것을 동작 변경 없이 나눴다.
 *   · 타입·상수 → survey-questions-model.ts
 *   · '한 번에 하나만 고치기' 상태와 세 수정 요청 → use-survey-editing.ts
 *   · 설문지 선택기와 설문지 단위 동작 줄 → SurveySelectionBar.tsx
 *   · 이 파일 안의 하위 컴포넌트 → 설문지 등록(SurveyCreateForm), 설문지 제목·기간 수정(SurveyEditForm),
 *     문항 추가(SurveyQuestionCreateForm), 문항 하나와 그 항목(SurveyQuestionCard)
 * 폼은 이 파일에 둔다 — URL 상태 census 와 폼 검증 census 가 폼을 파일 단위로 세고, 검증·서버 오류·동기 잠금 계약을 그
 * 파일에서 읽는다. 쓰기(mutation)는 패널이 소유하고 하위 컴포넌트에는 같은 이름으로 넘긴다.
 */

type Mutation<TVariables> = { mutate: (variables: TVariables) => void; isPending: boolean };
type QuestionCreateValidation = ReturnType<typeof useManualFormValidation<typeof surveyQuestionCreateSchema>>;
type ItemCreateValidation = ReturnType<typeof useManualFormValidation<typeof surveyItemCreateSchema>>;

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
  // 파괴적 액션은 native confirm 대신 useConfirm — 본문에 대상과 소실 범위를 노출한다.
  const confirm = useConfirm();
  // [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다. 이 패널은 조회 권한만으로 들어올 수 있어, 종전에는
  //   등록·복제·수정·삭제가 모두 보였고 누른 뒤에야 403 을 만났다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
  const { user } = useAuth();
  const canCreateSurvey = canPermission(user, 'SURVEY_CREATE_ALL');
  const canUpdateSurvey = canPermission(user, 'SURVEY_UPDATE_ALL');
  const canDeleteSurvey = canPermission(user, 'SURVEY_DELETE_ALL');
  const [srvySn, setSrvySn] = useState<number | null>(null);
  /** [2026-09-26 DIP B5 F6] 복제 대화상자를 연 원본 설문. */
  const [copySource, setCopySource] = useState<{ srvySn: number; srvyTtl?: string | null } | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  /** [DIP B4 P6] 새 문항의 선택 방식 — 하나만 고르기(1) 또는 여러 개 고르기(2 이상). */
  const [newQuestionMultiple, setNewQuestionMultiple] = useState(false);
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
  const itemValidation = useManualFormValidation(surveyItemCreateSchema, {
    labels: surveyItemValidationLabels,
  });

  const { data: surveys } = useQuery<PageResponse<Survey>>({
    queryKey: SURVEYS_FOR_QUESTIONS_KEY,
    queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, size: 100 }),
  });

  const surveysKey = SURVEYS_FOR_QUESTIONS_KEY;
  /** 템플릿은 설문지 등록의 필수 입력이다(SurveyInfoDto.srvyTmpltSn @NotNull). */
  const { data: templates } = useQuery({
    queryKey: ['admin-survey-templates-for-select'],
    queryFn: () => surveyAdminService.getTemplateList({ pageIndex: 1, size: 100 }),
  });

  const removeSurvey = useMutation({
    mutationFn: (targetSrvySn: number) => surveyAdminService.deleteSurvey(targetSrvySn),
    onSuccess: () => {
      setSrvySn(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: surveysKey });
    },
    onError: (mutationError: unknown) => {
      setError(extractErrorMessage(mutationError, '설문지 삭제에 실패했습니다.'));
    },
    onSettled: () => { surveyDeletePendingRef.current = false; },
  });

  const questionsKey = ['admin-survey-questions', srvySn];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: questionsKey });
  // 수정(제목·기간·문항·항목) 상태와 요청 — 한 번에 하나만 고친다(use-survey-editing.ts).
  const editing = useSurveyEditing({ setError, srvySn, invalidateQuestions: () => { void invalidate(); } });
  const {
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
    beginEdit,
  } = editing;
  // 설문지 등록 폼의 입력·처리 중 상태는 SurveyCreateForm 이 따로 등록한다(같은 미저장 확인에 모인다).
  const navigate = useUnsavedChanges(() => ({
    dirty: Boolean(newQuestion || newItemText || (editingTarget && editingText !== originalEditingText)
      || (editingTarget === 'survey' && PERIOD_FIELDS.some((name) => editingPeriod[name] !== originalEditingPeriod[name]))),
    pending: surveyDeletePendingRef.current || questionPendingRef.current || itemPendingRef.current || deletePendingRef.current || editPendingRef.current,
  }));

  /*
    [2026-10-01 결정 21] 공개 전환. 새 설문은 작성 중으로 시작해 응답자 목록에 보이지 않는다 — 문항을 다 넣기 전의
    설문에 응답이 쌓이지 않게 한다. 서버 수정은 전체 치환이라 나머지 필드를 되돌려 싣고 공개 여부만 바꾼다.
  */
  const releasePendingRef = useRef(false);
  const releaseSurvey = useMutation({
    mutationFn: (payload: { srvySn: number; body: SurveyInfoUpdate }) =>
      surveyAdminService.updateSurvey(payload.srvySn, payload.body),
    onSuccess: () => { setError(null); void queryClient.invalidateQueries({ queryKey: surveysKey }); },
    onError: (mutationError: unknown) => setError(extractErrorMessage(mutationError, '설문지 공개 상태를 바꾸지 못했습니다.')),
    onSettled: () => { releasePendingRef.current = false; },
  });
  const handleToggleRelease = async (survey: Survey) => {
    if (releasePendingRef.current) return;
    releasePendingRef.current = true;
    const releasing = survey.rlsYn === 'N';
    const ok = await confirm({
      title: releasing ? '설문지 공개' : '설문지 공개 중단',
      message: releasing
        ? `'${survey.srvyTtl}' 설문지를 응답자에게 공개합니다. 공개한 뒤 응답이 모이면 문항을 더하거나 바꿀 수 없습니다.`
        : `'${survey.srvyTtl}' 설문지를 응답자 목록에서 숨깁니다. 이미 모인 응답은 그대로 남습니다.`,
      confirmText: releasing ? '공개' : '공개 중단',
    });
    if (!ok) { releasePendingRef.current = false; return; }
    releaseSurvey.mutate({
      srvySn: survey.srvySn,
      body: {
        srvyTtl: survey.srvyTtl,
        srvyTmpltSn: survey.srvyTmpltSn,
        ...omitNulls({
          srvyPrps: survey.srvyPrps,
          srvyWrtGdCn: survey.srvyWrtGdCn,
          srvyBgngYmd: survey.srvyBgngYmd,
          srvyEndYmd: survey.srvyEndYmd,
          srvyTrgt: survey.srvyTrgt,
        }),
        rlsYn: releasing ? 'Y' : 'N',
      },
    });
  };

  const { data: questions = [], isLoading } = useQuery<SurveyQuestion[]>({
    queryKey: questionsKey,
    queryFn: () => surveyAdminService.getQuestions(srvySn!),
    enabled: srvySn !== null,
  });

  const onError = (e: unknown) => setError(extractErrorMessage(e, '처리에 실패했습니다.'));

  const addQuestion = useMutation({
    mutationFn: (payload: { srvySn: number; qstnCn: string; qstnTypeCd: string; qstnSn: number; maxChcCnt: number }) =>
      surveyAdminService.createQuestion(payload.srvySn, payload),
    onSuccess: () => {
      setNewQuestion('');
      setNewQuestionMultiple(false);
      setNewQuestionMaxChoice('2');
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

  const handleDeleteSurvey = async () => {
    if (surveyDeletePendingRef.current || srvySn === null) return;

    const target = surveyOptions.find((s) => s.srvySn === srvySn);
    const ok = await confirm({
      title: '설문지 삭제',
      message: `'${target?.srvyTtl ?? srvySn}' 설문지를 삭제하시겠습니까? 이 설문지의 문항·선택 항목과 이미 모인 응답이 함께 사라지며 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (!ok) return;

    surveyDeletePendingRef.current = true;
    setError(null);
    removeSurvey.mutate(srvySn);
  };

  const templateOptions = templates?.list ?? [];
  const surveyOptions = surveys?.list ?? [];
  const selectedSurvey = surveyOptions.find((s) => s.srvySn === srvySn) ?? null;

  return (
    <div className="space-y-6">
      {/*
        [2026-08-28] 설문지 등록 폼.
        종전에는 아래 '설문 선택'만 있고 설문지를 만드는 경로가 제품 어디에도 없었다 —
        선택기가 비면 문항·응답자·통계 탭이 전부 죽는데, 사용자는 그 이유를 알 수 없었다.
        createSurvey 는 서버·프런트 서비스에 이미 있었고 아무도 부르지 않았을 뿐이다.
      */}
      {canCreateSurvey && <SurveyCreateForm templateOptions={templateOptions} setError={setError} />}

      <SurveySelectionBar
        surveyOptions={surveyOptions}
        srvySn={srvySn}
        selectedSurvey={selectedSurvey}
        onSelect={(next) => {
          void navigate(() => {
          setSrvySn(next);
          setNewQuestion(''); setNewItemFor(null); setNewItemText('');
          setEditingTarget(null); setEditingText('');
          setError(null);
          questionValidation.setFormErrors({}, false);
          itemValidation.setFormErrors({}, false);
          });
        }}
        canCreateSurvey={canCreateSurvey}
        canUpdateSurvey={canUpdateSurvey}
        editing={editingTarget !== null}
        deletePending={removeSurvey.isPending}
        onBeginSurveyEdit={(survey) => {
          const period = { srvyBgngYmd: survey.srvyBgngYmd ?? '', srvyEndYmd: survey.srvyEndYmd ?? '' };
          setEditingPeriod(period);
          setOriginalEditingPeriod(period);
          beginEdit('survey', survey.srvyTtl ?? '');
        }}
        onCopy={setCopySource}
        releaseAction={canUpdateSurvey && selectedSurvey && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={removeSurvey.isPending || releaseSurvey.isPending || editingTarget !== null}
          aria-busy={releaseSurvey.isPending || undefined}
          onClick={() => { void handleToggleRelease(selectedSurvey); }}
          className="shrink-0"
        >
          {selectedSurvey.rlsYn === 'N' ? '응답자에게 공개' : '공개 중단'}
        </Button>
        )}
        deleteAction={canDeleteSurvey && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={srvySn === null || removeSurvey.isPending || editingTarget !== null}
          aria-busy={removeSurvey.isPending || undefined}
          onClick={() => { void handleDeleteSurvey(); }}
          className="shrink-0 border-destructive/30 text-destructive-emphasis hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 size={14} aria-hidden="true" /> {removeSurvey.isPending ? '삭제 중…' : '설문지 삭제'}
        </Button>
        )}
      />

      {editingTarget === 'survey' && selectedSurvey ? (
        <SurveyEditForm selectedSurvey={selectedSurvey} editing={editing} editSurvey={editSurvey} />
      ) : null}
      {editingTarget === 'survey' && titleEditValidation.errors.srvyTtl ? (
        <p {...titleEditValidation.messageProps('srvyTtl')} className="text-xs font-bold text-destructive-emphasis" />
      ) : null}

      {error && <p role="alert" className="text-sm text-destructive-emphasis">{error}</p>}

      {srvySn === null ? (
        <div className="p-16 text-center bg-card rounded-lg border-2 border-dashed">
          <ListChecks size={36} className="mx-auto text-muted-foreground/30 mb-3" aria-hidden="true" />
          <p className="text-muted-foreground">설문을 선택하면 문항과 선택 항목을 관리할 수 있습니다.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {canCreateSurvey && (
          <SurveyQuestionCreateForm
            srvySn={srvySn}
            questions={questions}
            newQuestion={newQuestion}
            setNewQuestion={setNewQuestion}
            newQuestionMultiple={newQuestionMultiple}
            setNewQuestionMultiple={setNewQuestionMultiple}
            newQuestionMaxChoice={newQuestionMaxChoice}
            setNewQuestionMaxChoice={setNewQuestionMaxChoice}
            questionValidation={questionValidation}
            questionPendingRef={questionPendingRef}
            itemPendingRef={itemPendingRef}
            deletePendingRef={deletePendingRef}
            addQuestion={addQuestion}
            addItem={addItem}
            deletingTarget={deletingTarget}
            setError={setError}
          />
          )}

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">등록된 문항이 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q, idx) => (
                <SurveyQuestionCard
                  key={q.srvyQstnSn}
                  q={q}
                  idx={idx}
                  srvySn={srvySn}
                  canCreateSurvey={canCreateSurvey}
                  canUpdateSurvey={canUpdateSurvey}
                  canDeleteSurvey={canDeleteSurvey}
                  editing={editing}
                  editQuestion={editQuestion}
                  editItem={editItem}
                  addQuestion={addQuestion}
                  addItem={addItem}
                  removeQuestion={removeQuestion}
                  removeItem={removeItem}
                  deletingTarget={deletingTarget}
                  beginDelete={beginDelete}
                  newItemFor={newItemFor}
                  setNewItemFor={setNewItemFor}
                  newItemText={newItemText}
                  setNewItemText={setNewItemText}
                  itemValidation={itemValidation}
                  itemPendingRef={itemPendingRef}
                  questionPendingRef={questionPendingRef}
                  deletePendingRef={deletePendingRef}
                  setError={setError}
                  navigate={navigate}
                />
              ))}
            </ul>
          )}
        </>
      )}
      {copySource ? (
        <SurveyCopyDialog
          source={copySource}
          onClose={() => setCopySource(null)}
          onCopied={(copySn) => {
            // 사본을 목록에 다시 읽고 곧바로 고른다 — 관리자는 이어서 문항을 손본다.
            void queryClient.invalidateQueries({ queryKey: surveysKey });
            setSrvySn(copySn);
            setNewQuestion(''); setNewItemFor(null); setNewItemText('');
            setEditingTarget(null); setEditingText('');
            setError(null);
          }}
        />
      ) : null}
    </div>
  );
}

/*
 * [2026-08-28] 설문지 등록 배선.
 * createSurvey/updateSurvey/deleteSurvey 는 서버·프런트 서비스에 모두 있는데 **소비자가
 * 0건**이었다(전 저장소 grep). 설문지를 만들 방법이 없으니 아래 선택기가 영영 비고,
 * 문항·응답자·통계 탭이 전부 죽는다 — 이 화면에서 가장 먼저 막히는 지점이 여기다.
 *
 * 등록 입력·검증·요청·동기 잠금은 이 폼이 소유한다(패널의 다른 입력과 섞이지 않는다). 미저장 입력과 처리 중 상태는 같은
 * 미저장 확인에 따로 등록한다 — 패널을 떠나거나 다른 설문지를 고를 때 함께 확인된다.
 */
function SurveyCreateForm({ templateOptions, setError }: {
  templateOptions: NonNullable<Awaited<ReturnType<typeof surveyAdminService.getTemplateList>>['list']>;
  setError: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [newSurveyTemplate, setNewSurveyTemplate] = useState('');
  const [newSurveyPeriod, setNewSurveyPeriod] = useState(EMPTY_PERIOD);
  const surveyPendingRef = useRef(false);
  const surveyValidation = useManualFormValidation(surveyInfoCreateSchema, {
    labels: surveyInfoValidationLabels,
  });
  useUnsavedChanges(() => ({
    dirty: Boolean(newSurveyTitle || newSurveyPeriod.srvyBgngYmd || newSurveyPeriod.srvyEndYmd),
    pending: surveyPendingRef.current,
  }));

  const addSurvey = useMutation({
    mutationFn: (payload: SurveyInfoUpdate) =>
      surveyAdminService.createSurvey(payload),
    onSuccess: () => {
      setNewSurveyTitle('');
      setNewSurveyPeriod(EMPTY_PERIOD);
      setError(null);
      surveyValidation.setFormErrors({}, false);
      void queryClient.invalidateQueries({ queryKey: SURVEYS_FOR_QUESTIONS_KEY });
    },
    onError: (mutationError: unknown) => {
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) surveyValidation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(mutationError, '설문지 등록에 실패했습니다.'));
    },
    onSettled: () => { surveyPendingRef.current = false; },
  });

  const submitSurvey = (event: React.FormEvent) => {
    event.preventDefault();
    if (surveyPendingRef.current) return;

    const validated = surveyValidation.validate({
      srvyTtl: newSurveyTitle,
      srvyTmpltSn: newSurveyTemplate ? Number(newSurveyTemplate) : 0,
      srvyPrps: '',
      ...newSurveyPeriod,
    });
    if (!validated) return;

    surveyPendingRef.current = true;
    setError(null);
    addSurvey.mutate({
      srvyTtl: validated.srvyTtl,
      srvyTmpltSn: validated.srvyTmpltSn,
      ...(validated.srvyBgngYmd ? { srvyBgngYmd: validated.srvyBgngYmd } : {}),
      ...(validated.srvyEndYmd ? { srvyEndYmd: validated.srvyEndYmd } : {}),
    });
  };

  return (
      <form onSubmit={submitSurvey} noValidate className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-bold text-foreground">설문지 등록</h3>
        <FormErrorSummary
          errors={surveyValidation.errors}
          labels={surveyInfoValidationLabels}
          onNavigate={(name) => { surveyValidation.focusError(name); }}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="new-survey-title" className="text-xs font-bold text-muted-foreground">설문지 제목</label>
            <Input
              id="new-survey-title"
              {...surveyValidation.fieldProps('srvyTtl')}
              value={newSurveyTitle}
              onChange={(e) => {
                surveyValidation.clearError('srvyTtl');
                setNewSurveyTitle(e.target.value);
              }}
              maxLength={256}
              placeholder="예: 2026년 사내 만족도 조사"
            />
            {surveyValidation.errors.srvyTtl ? (
              <p {...surveyValidation.messageProps('srvyTtl')} className="text-xs text-destructive-emphasis" />
            ) : null}
          </div>
          <div className="space-y-1.5 sm:w-64">
            <label htmlFor="new-survey-template" className="text-xs font-bold text-muted-foreground">템플릿</label>
            <select
              id="new-survey-template"
              {...surveyValidation.fieldProps('srvyTmpltSn')}
              value={newSurveyTemplate}
              onChange={(e) => {
                surveyValidation.clearError('srvyTmpltSn');
                setNewSurveyTemplate(e.target.value);
              }}
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="">— 템플릿을 선택하세요 —</option>
              {templateOptions.map((template) => (
                <option key={template.srvyTmpltSn} value={template.srvyTmpltSn}>
                  {template.srvyTmpltExpln || `템플릿 ${template.srvyTmpltSn}`}
                </option>
              ))}
            </select>
            {surveyValidation.errors.srvyTmpltSn ? (
              <p {...surveyValidation.messageProps('srvyTmpltSn')} className="text-xs text-destructive-emphasis" />
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PERIOD_FIELDS.map((name) => (
            <div key={name} className="space-y-1.5">
              <label htmlFor={`new-survey-${name}`} className="text-xs font-bold text-muted-foreground">{surveyInfoValidationLabels[name]}</label>
              <Input
                id={`new-survey-${name}`}
                type="date"
                {...surveyValidation.fieldProps(name)}
                value={toDateInputValue(newSurveyPeriod[name])}
                onChange={(event) => {
                  surveyValidation.clearError(name);
                  setNewSurveyPeriod((current) => ({ ...current, [name]: fromDateInputValue(event.target.value) }));
                }}
                disabled={addSurvey.isPending}
              />
              {surveyValidation.errors[name] ? <p {...surveyValidation.messageProps(name)} className="text-xs text-destructive-emphasis" /> : null}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">시작일을 비우면 즉시 시작하며, 종료일을 비우면 무기한 진행합니다. 시작일과 종료일 당일에도 응답할 수 있습니다.</p>
        <Button type="submit" disabled={addSurvey.isPending} aria-busy={addSurvey.isPending || undefined} className="gap-2">
          <Plus size={16} aria-hidden="true" /> {addSurvey.isPending ? '등록 중…' : '설문지 등록'}
        </Button>
        {templateOptions.length === 0 ? (
          // 템플릿이 필수인데 없으면 등록이 원리적으로 불가능하다. 그 사실을 먼저 말한다.
          <p className="text-xs text-muted-foreground">
            등록된 템플릿이 없습니다. <Link href="/admin/survey/hub?tab=templates" className="text-primary underline">템플릿 만들기</Link> 후 설문지를 등록하세요.
          </p>
        ) : null}
      </form>
  );
}

/** 설문지 제목·기간 수정 폼(편집 대상이 'survey' 일 때). 상태는 useSurveyEditing, 요청은 패널의 editSurvey 다. */
function SurveyEditForm({ selectedSurvey, editing, editSurvey }: {
  selectedSurvey: Survey;
  editing: SurveyEditing;
  editSurvey: Mutation<{ srvySn: number; body: SurveyInfoUpdate }>;
}) {
  const {
    editingText,
    setEditingText,
    editingPeriod,
    setEditingPeriod,
    originalEditingPeriod,
    titleEditValidation,
    submitEdit,
    cancelEdit,
  } = editing;
  return (
        <form
          className="space-y-3 rounded-lg border border-border p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitEdit(titleEditValidation, { srvyTtl: editingText, ...editingPeriod }, (validated) =>
              editSurvey.mutate({
                srvySn: selectedSurvey.srvySn!,
                /*
                  제목·기간은 입력값을 보내고 목적·작성안내·대상·템플릿은 그대로 되돌려 보낸다.
                  전체 치환이므로 나머지 필드를 빠뜨리면 기존 정보가 지워진다.

                  ⚠ 그중 **null 인 값은 떨어뜨려야 한다.** 생성 계약은 이 5필드를 요청에서
                  `.optional()`(null 거부), 응답에서 `.optional().nullable()` 로 선언한다
                  (DEC-OPS-028 의 방향 비대칭 — omit-nulls.ts). 선택 입력을 비운 채 **등록**하면
                  서버는 그 값을 null 로 저장한다. 종전에는 이 화면으로 만든 설문지를
                  수정하려 하면 null 이 그대로 요청에 실려
                  `parseGeneratedOperationRequest` 가 **HTTP 요청 전에** throw 했다 — 제목 한
                  글자도 고칠 수 없었고, 서버에 닿지 않아 로그에도 단서가 없었다.

                  srvyTmpltSn 은 요청·응답 모두 required 라 비대칭이 아니다 — 그대로 싣는다.
                */
                body: {
                  srvyTtl: validated.srvyTtl,
                  srvyTmpltSn: selectedSurvey.srvyTmpltSn,
                  ...omitNulls({
                    srvyPrps: selectedSurvey.srvyPrps,
                    srvyWrtGdCn: selectedSurvey.srvyWrtGdCn,
                    srvyBgngYmd: editingPeriod.srvyBgngYmd === originalEditingPeriod.srvyBgngYmd ? selectedSurvey.srvyBgngYmd : validated.srvyBgngYmd,
                    srvyEndYmd: editingPeriod.srvyEndYmd === originalEditingPeriod.srvyEndYmd ? selectedSurvey.srvyEndYmd : validated.srvyEndYmd,
                    srvyTrgt: selectedSurvey.srvyTrgt,
                  }),
                },
              }));
          }}
        >
          <FormErrorSummary errors={titleEditValidation.errors} labels={surveyInfoValidationLabels} onNavigate={(name) => { titleEditValidation.focusError(name); }} />
          <Input
            {...titleEditValidation.fieldProps('srvyTtl')}
            value={editingText}
            onChange={(e) => { titleEditValidation.clearError('srvyTtl'); setEditingText(e.target.value); }}
            aria-label="설문지 제목 수정"
            maxLength={256}
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {PERIOD_FIELDS.map((name) => (
              <div key={name} className="space-y-1.5">
                <label htmlFor={`edit-survey-${name}`} className="text-xs font-bold text-muted-foreground">{surveyInfoValidationLabels[name]} 수정</label>
                <Input
                  id={`edit-survey-${name}`}
                  type="date"
                  {...titleEditValidation.fieldProps(name)}
                  value={toDateInputValue(editingPeriod[name])}
                  onChange={(event) => {
                    titleEditValidation.clearError(name);
                    setEditingPeriod((current) => ({ ...current, [name]: fromDateInputValue(event.target.value) }));
                  }}
                  disabled={editSurvey.isPending}
                />
                {titleEditValidation.errors[name] ? <p {...titleEditValidation.messageProps(name)} className="text-xs text-destructive-emphasis" /> : null}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">시작일을 비우면 즉시 시작하며, 종료일을 비우면 무기한 진행합니다.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={editSurvey.isPending} aria-busy={editSurvey.isPending || undefined} className="shrink-0">
              {editSurvey.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} 저장
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={editSurvey.isPending} onClick={cancelEdit} className="shrink-0">
              <X size={14} aria-hidden="true" /> 취소
            </Button>
          </div>
        </form>
  );
}

/** 새 문항 추가 폼. 입력 상태와 요청(addQuestion)은 패널이 소유한다 — 설문지를 바꾸면 패널이 입력을 비운다. */
function SurveyQuestionCreateForm({
  srvySn,
  questions,
  newQuestion,
  setNewQuestion,
  newQuestionMultiple,
  setNewQuestionMultiple,
  newQuestionMaxChoice,
  setNewQuestionMaxChoice,
  questionValidation,
  questionPendingRef,
  itemPendingRef,
  deletePendingRef,
  addQuestion,
  addItem,
  deletingTarget,
  setError,
}: {
  srvySn: number;
  questions: SurveyQuestion[];
  newQuestion: string;
  setNewQuestion: (value: string) => void;
  newQuestionMultiple: boolean;
  setNewQuestionMultiple: (value: boolean) => void;
  newQuestionMaxChoice: string;
  setNewQuestionMaxChoice: (value: string) => void;
  questionValidation: QuestionCreateValidation;
  questionPendingRef: RefObject<boolean>;
  itemPendingRef: RefObject<boolean>;
  deletePendingRef: RefObject<boolean>;
  addQuestion: Mutation<{ srvySn: number; qstnCn: string; qstnTypeCd: string; qstnSn: number; maxChcCnt: number }>;
  addItem: Mutation<{ srvyQstnSn: number; srvySn: number; artclCn: string }>;
  deletingTarget: string | null;
  setError: (message: string | null) => void;
}) {
  return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (questionPendingRef.current || itemPendingRef.current || deletePendingRef.current) return;
              // [DIP B4 P6] 순번은 '문항 수 + 1' 이 아니라 가장 큰 순번 다음이다 — 중간 문항을 지운 뒤 추가하면
              //   마지막 문항과 순번이 겹쳤다. 서버도 같은 규칙으로 다시 매긴다.
              const nextQstnSn = questions.reduce((max, question) => Math.max(max, question.qstnSn ?? 0), 0) + 1;
              const validated = questionValidation.validate({
                srvySn,
                qstnCn: newQuestion,
                qstnTypeCd: MULTIPLE_CHOICE,
                qstnSn: nextQstnSn,
                maxChcCnt: newQuestionMultiple ? Number(newQuestionMaxChoice) : 1,
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
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">선택 방식</span>
                <select
                  aria-label="선택 방식"
                  className="h-[var(--control-h)] rounded-md border border-border bg-background px-2 text-sm"
                  value={newQuestionMultiple ? 'multiple' : 'single'}
                  onChange={(e) => {
                    questionValidation.clearError('maxChcCnt');
                    setNewQuestionMultiple(e.target.value === 'multiple');
                  }}
                >
                  <option value="single">하나만 고르기</option>
                  <option value="multiple">여러 개 고르기</option>
                </select>
              </label>
              {newQuestionMultiple && (
                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground">최대 선택 수</span>
                  <Input
                    {...questionValidation.fieldProps('maxChcCnt')}
                    type="number"
                    min={2}
                    max={20}
                    className="w-20"
                    value={newQuestionMaxChoice}
                    onChange={(e) => {
                      questionValidation.clearError('maxChcCnt');
                      setNewQuestionMaxChoice(e.target.value);
                    }}
                    aria-label="최대 선택 수"
                  />
                </label>
              )}
              <span className="text-xs text-muted-foreground">응답이 모인 뒤에는 문구와 선택 방식을 바꿀 수 없습니다.</span>
            </div>
            {questionValidation.errors.maxChcCnt ? (
              <p {...questionValidation.messageProps('maxChcCnt')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </form>
  );
}

/**
 * 문항 하나 — 머리(순번·내용·유형·수정·삭제), 선택 항목 목록(수정·삭제), 항목 추가. 상태와 요청은 패널이 소유하고 같은
 * 이름으로 넘긴다(폼 검증 census 가 핸들러 이름으로 쓰기를 따라간다).
 */
function SurveyQuestionCard({
  q,
  idx,
  srvySn,
  canCreateSurvey,
  canUpdateSurvey,
  canDeleteSurvey,
  editing,
  editQuestion,
  editItem,
  addQuestion,
  addItem,
  removeQuestion,
  removeItem,
  deletingTarget,
  beginDelete,
  newItemFor,
  setNewItemFor,
  newItemText,
  setNewItemText,
  itemValidation,
  itemPendingRef,
  questionPendingRef,
  deletePendingRef,
  setError,
  navigate,
}: {
  q: SurveyQuestion;
  idx: number;
  srvySn: number;
  canCreateSurvey: boolean;
  canUpdateSurvey: boolean;
  canDeleteSurvey: boolean;
  editing: SurveyEditing;
  editQuestion: Mutation<{ srvyQstnSn: number; body: SurveyQuestionUpdate }>;
  editItem: Mutation<{ srvyArtclSn: number; body: SurveyItemUpdate }>;
  addQuestion: Mutation<{ srvySn: number; qstnCn: string; qstnTypeCd: string; qstnSn: number; maxChcCnt: number }>;
  addItem: Mutation<{ srvyQstnSn: number; srvySn: number; artclCn: string }>;
  removeQuestion: Mutation<number>;
  removeItem: Mutation<number>;
  deletingTarget: string | null;
  beginDelete: (target: string, remove: () => void) => void;
  newItemFor: number | null;
  setNewItemFor: (value: number | null) => void;
  newItemText: string;
  setNewItemText: (value: string) => void;
  itemValidation: ItemCreateValidation;
  itemPendingRef: RefObject<boolean>;
  questionPendingRef: RefObject<boolean>;
  deletePendingRef: RefObject<boolean>;
  setError: (message: string | null) => void;
  navigate: (action: () => void) => Promise<boolean>;
}) {
  const {
    editingTarget,
    editingText,
    setEditingText,
    questionEditValidation,
    itemEditValidation,
    beginEdit,
    cancelEdit,
    submitEdit,
  } = editing;
  return (
                <li className="border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    {editingTarget === `question-${q.srvyQstnSn}` ? (
                      <form
                        className="flex items-center gap-2 flex-1 min-w-0"
                        noValidate
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitEdit(questionEditValidation, { qstnCn: editingText }, (validated) =>
                            editQuestion.mutate({
                              srvyQstnSn: q.srvyQstnSn!,
                              /*
                                내용 외 3필드 round-trip — 빠뜨리면 순번·유형·최대선택수가 지워진다.
                                ⚠ null 은 떨어뜨린다(요청 `.optional()` vs 응답
                                `.optional().nullable()` 비대칭 — omit-nulls.ts). 이 화면의 등록
                                폼은 maxChcCnt 를 보내지 않아 서버가 null 로 저장하므로, 걸러
                                내지 않으면 **이 화면으로 만든 문항은 내용 수정이 영영 막힌다**.
                              */
                              body: {
                                qstnCn: validated.qstnCn,
                                ...omitNulls({
                                  qstnSn: q.qstnSn,
                                  qstnTypeCd: q.qstnTypeCd,
                                  maxChcCnt: q.maxChcCnt,
                                }),
                              },
                            }));
                        }}
                      >
                        <Input
                          {...questionEditValidation.fieldProps('qstnCn')}
                          value={editingText}
                          onChange={(e) => { questionEditValidation.clearError('qstnCn'); setEditingText(e.target.value); }}
                          aria-label="문항 내용"
                          maxLength={4000}
                          autoFocus
                        />
                        <Button type="submit" size="sm" disabled={editQuestion.isPending} aria-busy={editQuestion.isPending || undefined} className="shrink-0">
                          {editQuestion.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} 저장
                        </Button>
                        <Button type="button" size="sm" variant="ghost" disabled={editQuestion.isPending} onClick={cancelEdit} className="shrink-0">
                          <X size={14} aria-hidden="true" /> 취소
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="font-bold text-foreground flex-1 min-w-0 break-words">{q.qstnCn}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-hub-blue/10 text-hub-blue shrink-0">
                          {q.qstnTypeCd === MULTIPLE_CHOICE ? '객관식' : '주관식'}
                        </span>
                        {canUpdateSurvey && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${q.qstnCn} 문항 수정`}
                          disabled={deletingTarget !== null || editingTarget !== null || addQuestion.isPending || addItem.isPending}
                          className="shrink-0"
                          onClick={() => beginEdit(`question-${q.srvyQstnSn}`, q.qstnCn ?? '')}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        )}
                      </>
                    )}
                    {canDeleteSurvey && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={deletingTarget === `question-${q.srvyQstnSn}`
                        ? `${q.qstnCn} 문항 삭제 중`
                        : `${q.qstnCn} 문항 삭제`}
                      aria-busy={deletingTarget === `question-${q.srvyQstnSn}`}
                      disabled={deletingTarget !== null || addQuestion.isPending || addItem.isPending}
                      className="text-destructive-emphasis hover:bg-destructive/10 shrink-0"
                      onClick={() => beginDelete(
                        `question-${q.srvyQstnSn}`,
                        () => removeQuestion.mutate(q.srvyQstnSn),
                      )}
                    >
                      {deletingTarget === `question-${q.srvyQstnSn}`
                        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                    )}
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
                            <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                            {editingTarget === `item-${item.srvyArtclSn}` ? (
                              <form
                                className="flex items-center gap-2 flex-1 min-w-0"
                                noValidate
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  submitEdit(itemEditValidation, { artclCn: editingText }, (validated) =>
                                    editItem.mutate({
                                      srvyArtclSn: item.srvyArtclSn!,
                                      /*
                                        내용 외 2필드 round-trip — 빠뜨리면 순번·기타답변여부가
                                        지워진다. ⚠ null 은 떨어뜨린다(요청·응답 비대칭 —
                                        omit-nulls.ts). 등록 폼이 artclSn·etcAnsYn 을 **둘 다**
                                        보내지 않아 이 화면으로 만든 항목은 두 값이 모두 null 이다
                                        — 걸러 내지 않으면 항목 내용 수정이 전부 막힌다.
                                      */
                                      body: {
                                        artclCn: validated.artclCn,
                                        ...omitNulls({
                                          artclSn: item.artclSn,
                                          etcAnsYn: item.etcAnsYn,
                                        }),
                                      },
                                    }));
                                }}
                              >
                                <Input
                                  {...itemEditValidation.fieldProps('artclCn')}
                                  value={editingText}
                                  onChange={(e) => { itemEditValidation.clearError('artclCn'); setEditingText(e.target.value); }}
                                  aria-label="선택 항목 내용"
                                  maxLength={4000}
                                  autoFocus
                                />
                                <Button type="submit" size="sm" disabled={editItem.isPending} aria-busy={editItem.isPending || undefined} className="shrink-0">
                                  {editItem.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} 저장
                                </Button>
                                <Button type="button" size="sm" variant="ghost" disabled={editItem.isPending} onClick={cancelEdit} className="shrink-0">
                                  <X size={14} aria-hidden="true" /> 취소
                                </Button>
                              </form>
                            ) : (
                              <>
                                <span className="flex-1 min-w-0 break-words">{item.artclCn}</span>
                                {canUpdateSurvey && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`${item.artclCn} 항목 수정`}
                                  disabled={deletingTarget !== null || editingTarget !== null || addQuestion.isPending || addItem.isPending}
                                  className="h-7 w-7"
                                  onClick={() => beginEdit(`item-${item.srvyArtclSn}`, item.artclCn ?? '')}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                                )}
                              </>
                            )}
                            {canDeleteSurvey && (
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
                            )}
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
                            className="text-sm h-[var(--control-h-sm)]"
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
                    ) : canCreateSurvey ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        disabled={addQuestion.isPending || addItem.isPending || deletingTarget !== null}
                        onClick={() => {
                          const open = () => {
                          itemValidation.setFormErrors({}, false);
                          setNewItemFor(q.srvyQstnSn);
                          setNewItemText('');
                          };
                          if (newItemText) void navigate(open);
                          else open();
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> 항목 추가
                      </Button>
                    ) : null}
                  </div>
                </li>
  );
}
