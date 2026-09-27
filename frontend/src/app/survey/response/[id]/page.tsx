import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SurveyResponseDetailClient from './SurveyResponseDetailClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: `설문 응답 상세 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const srvyRspnsSn = Number(id);
    if (!Number.isSafeInteger(srvyRspnsSn) || srvyRspnsSn <= 0) notFound();
    return <SurveyResponseDetailClient srvyRspnsSn={srvyRspnsSn} />;
}
