import SurveyResponseDetailClient from './SurveyResponseDetailClient';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const srvyRspnsSn = Number(id);
    if (!Number.isSafeInteger(srvyRspnsSn) || srvyRspnsSn <= 0) notFound();
    return <SurveyResponseDetailClient srvyRspnsSn={srvyRspnsSn} />;
}
