import SurveyDetailClient from './SurveyDetailClient';
import { notFound } from 'next/navigation';

/**
 * 종전에는 {@code params} 를 받지도, 넘기지도 않았다 — `[id]` 세그먼트가 장식이었다.
 * (Next.js 15+ 는 동적 세그먼트 params 를 Promise 로 전달한다.)
 */
export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const srvySn = Number(id);
  if (!Number.isSafeInteger(srvySn) || srvySn <= 0) notFound();
  return <SurveyDetailClient srvySn={srvySn} />;
}
