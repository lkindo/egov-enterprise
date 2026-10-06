import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { surveyParticipationService } from '@/services/foundation/survey/SurveyParticipationService';
import SurveyDetailClient from './SurveyDetailClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: `설문 참여 | ${SITE_IDENTITY.frameworkName}`,
};

/**
 * 종전에는 {@code params} 를 받지도, 넘기지도 않았다 — `[id]` 세그먼트가 장식이었다.
 * (Next.js 15+ 는 동적 세그먼트 params 를 Promise 로 전달한다.)
 */
export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const srvySn = Number(id);
  if (!Number.isSafeInteger(srvySn) || srvySn <= 0) notFound();
  const [survey, questions] = await Promise.allSettled([
    surveyParticipationService.getSurvey(srvySn),
    surveyParticipationService.getQuestions(srvySn),
  ]);
  return (
    <SurveyDetailClient
      srvySn={srvySn}
      initialSurvey={survey.status === 'fulfilled' ? survey.value : undefined}
      initialQuestions={questions.status === 'fulfilled' ? questions.value : undefined}
      initialTodayYmd={getTodayYmd()}
    />
  );
}
