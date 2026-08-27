'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import type { SurveyQuestion, SurveyResponseSubmit } from '@/types/business/survey';
import { SurveyStatsPanel } from '../components/SurveyStatsPanel';

/**
 * 설문 응답 화면.
 *
 * <p><b>⚠ 종전에는 라우트 파라미터를 아예 쓰지 않았다.</b> `/survey/[id]` 인데 컴포넌트는
 * 구 문자열 설문 ID 쿼리를 읽었고 `page.tsx` 도 {@code params} 를 넘기지 않았다.
 * 이제 경로 세그먼트를 그대로 받아 쓴다.
 *
 * <p><b>[2026-08-28] 응답 경로 신설.</b> 목록(`SurveyClient`)은 '참여할 수 있는 설문'을
 * 약속하고 행 액션도 '설문 응답 열기' 인데, 이 화면은 결과 통계만 렌더해 <b>입력 요소가
 * 하나도 없었다.</b> 즉 응답을 제출할 화면이 제품 어디에도 없었다.
 *
 * <p>필요한 것은 전부 이미 있었다 — 문항 조회 `GET /api/v1/surveys/{srvySn}/questions` 와
 * 제출 `POST /api/v1/surveys/{srvySn}/responses` 가 둘 다 {@code @Authenticated} 로 열려 있고
 * (DEC-OPS-010), 서버가 문항·항목 소속 검증과 중복 제출 차단까지 수행한다. 프런트 서비스의
 * 제출 경로만 존재하지 않는 `/respond` 를 가리키고 있었고 호출부가 0건이라 아무도 몰랐다.
 *
 * <p>통계는 응답 아래에 그대로 남긴다 — 이미 응답한 사용자와 결과를 보러 온 사용자가 같은
 * 경로로 들어오기 때문이다.
 */
export default function SurveyDetailClient({ srvySn }: { srvySn: number }) {
  const router = useRouter();
  const { toast } = useToast();

  /** 문항별 선택 항목. key = srvyQstnSn, value = srvyArtclSn. */
  const [selected, setSelected] = useState<Record<number, number>>({});
  /** '기타' 항목을 고른 문항의 자유 입력. key = srvyQstnSn. */
  const [etcText, setEtcText] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /**
   * 동기 잠금 — 같은 tick 의 연속 제출이 응답 행을 두 벌 만들지 않게 한다.
   * 이름이 `...Ref` 로 끝나야 폼 validation census 의 동기 잠금 탐지가 인식한다(저장소 규약).
   */
  const submitPendingRef = useRef(false);

  const {
    data: questions,
    isLoading,
    error,
    refetch,
  } = useQuery<SurveyQuestion[]>({
    queryKey: ['survey-questions', srvySn],
    queryFn: () => surveyAdminService.getQuestions(srvySn),
  });

  const questionList = useMemo(() => questions ?? [], [questions]);
  const answeredCount = Object.keys(selected).length;
  const canSubmit = answeredCount > 0 && !isSubmitting && !isSubmitted;

  const handleSubmit = async () => {
    if (submitPendingRef.current || !canSubmit) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: SurveyResponseSubmit = {
        answers: Object.entries(selected).map(([questionSn, articleSn]) => {
          const srvyQstnSn = Number(questionSn);
          const etc = etcText[srvyQstnSn]?.trim();
          return {
            srvyQstnSn,
            srvyArtclSn: articleSn,
            ...(etc ? { etcAnsCn: etc } : {}),
          };
        }),
      };

      await surveyAdminService.submitAnswers(srvySn, payload);
      setIsSubmitted(true);
      toast('설문 응답을 제출했습니다.', 'success');
    } catch (submitException) {
      /*
       * 서버는 중복 제출·소속 위반을 사유가 담긴 메시지로 돌려준다('이미 응답한 설문입니다.' 등).
       * 일반 문구로 덮으면 사용자가 왜 막혔는지 알 수 없으므로 그대로 보여 준다.
       */
      const message = extractErrorMessage(submitException, '응답 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitError(message);
      toast(message, 'error');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={() => router.push('/survey')}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설문 응답</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{srvySn}</p>
        </div>
      </div>

      <section aria-labelledby="survey-response-heading" className="space-y-4">
        <h2 id="survey-response-heading" className="text-lg font-semibold text-foreground">문항</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">문항을 불러오는 중입니다…</p>
        ) : error ? (
          <div className="space-y-3 rounded-lg border border-border p-6">
            <p className="text-sm font-medium text-destructive-emphasis">문항을 불러오지 못했습니다.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        ) : questionList.length === 0 ? (
          // 문항이 없으면 응답할 것도 없다. '제출' 버튼만 남겨 두면 눌러도 아무 일이 없다.
          <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
            이 설문에는 아직 등록된 문항이 없습니다. 관리자가 문항을 등록하면 응답할 수 있습니다.
          </p>
        ) : (
          <ol className="space-y-6">
            {questionList.map((question, index) => {
              const items = question.items ?? [];
              const groupName = `survey-question-${question.srvyQstnSn}`;
              const chosen = selected[question.srvyQstnSn];
              const chosenItem = items.find((item) => item.srvyArtclSn === chosen);
              const showEtcInput = chosenItem?.etcAnsYn === 'Y';

              return (
                <li key={question.srvyQstnSn} className="rounded-lg border border-border p-6">
                  <fieldset disabled={isSubmitted}>
                    <legend className="mb-4 text-sm font-bold text-foreground">
                      {index + 1}. {question.qstnCn}
                    </legend>

                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">선택 항목이 없어 응답할 수 없는 문항입니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => {
                          // 라벨을 감싸기만 하면 일부 보조기술이 이름을 읽지 못한다 — htmlFor 로 명시 연결한다.
                          const optionId = `${groupName}-${item.srvyArtclSn}`;
                          return (
                            <div
                              key={item.srvyArtclSn}
                              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                            >
                              <input
                                id={optionId}
                                type="radio"
                                name={groupName}
                                value={item.srvyArtclSn}
                                // htmlFor 로 라벨을 연결하지만 정적 분석이 템플릿 리터럴 id 를 따라가지
                                // 못한다. 이름을 컨트롤 자신에도 실어 두면 어느 경로로 읽어도 같은 이름이다.
                                aria-label={item.artclCn}
                                checked={chosen === item.srvyArtclSn}
                                onChange={() => {
                                  setSelected((prev) => ({ ...prev, [question.srvyQstnSn]: item.srvyArtclSn }));
                                  setSubmitError(null);
                                }}
                                className="size-4"
                              />
                              <label htmlFor={optionId} className="cursor-pointer">{item.artclCn}</label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {showEtcInput && (
                      <div className="mt-3 space-y-1.5">
                        <label
                          htmlFor={`${groupName}-etc`}
                          className="text-xs font-bold text-foreground"
                        >
                          기타 답변
                        </label>
                        <Textarea
                          id={`${groupName}-etc`}
                          value={etcText[question.srvyQstnSn] ?? ''}
                          onChange={(event) =>
                            setEtcText((prev) => ({ ...prev, [question.srvyQstnSn]: event.target.value }))
                          }
                          maxLength={4000}
                          placeholder="직접 입력해 주세요 (최대 4000자)"
                          className="min-h-[80px]"
                        />
                      </div>
                    )}
                  </fieldset>
                </li>
              );
            })}
          </ol>
        )}

        {submitError && (
          <p role="alert" className="text-sm font-medium text-destructive-emphasis">
            {submitError}
          </p>
        )}

        {questionList.length > 0 && (
          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              aria-busy={isSubmitting || undefined}
            >
              {isSubmitted ? '제출 완료' : isSubmitting ? '제출 중…' : '응답 제출'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {isSubmitted
                ? '이 설문에는 한 번만 응답할 수 있습니다.'
                : `${questionList.length}개 문항 중 ${answeredCount}개 선택`}
            </span>
          </div>
        )}
      </section>

      <section aria-labelledby="survey-stats-heading" className="space-y-4">
        <h2 id="survey-stats-heading" className="text-lg font-semibold text-foreground">결과 통계</h2>
        <SurveyStatsPanel srvySn={srvySn} />
      </section>
    </div>
  );
}
