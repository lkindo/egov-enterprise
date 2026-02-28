import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { congratulationService, Congratulation } from '@/services/congratulationService';
import CongratulationClient from './CongratulationClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
    title: '임직원 경조사 관리 | 전자정부 표준프레임워크',
    description: '임직원의 경조사 신청 현황을 관리하고 복리후생 지원 프로세스를 운영합니다.',
};

export default async function CongratulationPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const usid = (resolvedSearchParams.usid as string) || '';

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    let rawData = { content: [] as Congratulation[], totalElements: 0, totalPages: 0 };

    try {
        rawData = await congratulationService.getCtsnnList({ usid, page: 0, size: 50 }, axiosConfig);
    } catch (error) {
        console.error('Server-side fetch congratulation failed:', error);
    }

    // [Server Serialization Optimization]
    const optimizedContent = selectFieldsList(rawData.content, [
        'ctsnnId', 'ctsnnCode', 'ctsnnNm', 'trgetNm', 'relate', 'occrrncDe', 'confmAt'
    ]);

    return (
        <Suspense fallback={<CongratulationLoading />}>
            <CongratulationClient
                initialData={{ ...rawData, content: optimizedContent as Congratulation[] }}
                searchUsid={usid}
            />
        </Suspense>
    );
}

function CongratulationLoading() {
    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
            <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
            </div>
            <div className="h-24 bg-slate-50 rounded-[2rem]" />
            <div className="h-[600px] bg-slate-50 rounded-[4rem]" />
        </div>
    );
}
