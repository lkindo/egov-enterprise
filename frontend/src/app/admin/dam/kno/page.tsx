import { Suspense } from 'react';
import { cookies } from 'next/headers';
import damService from '@/services/dam/damService';
import { KnoListClient } from './KnoListClient';

export default async function KnoListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedSearchParams = await searchParams;
    const page = Number(resolvedSearchParams.page) || 1;
    const searchKeyword = (resolvedSearchParams.searchKeyword as string) || '';

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    let initialData = { list: [], pagination: { totalRecordCount: 0 } };
    try {
        initialData = await damService.getKnoList({
            pageIndex: page,
            searchKeyword: searchKeyword
        }, axiosConfig);
    } catch (error) {
        console.error('Server-side fetch kno list failed:', error);
    }

    return (
        <Suspense fallback={
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center"><div className="h-10 w-48 bg-slate-100 rounded-xl" /><div className="h-10 w-32 bg-slate-100 rounded-xl" /></div>
                <div className="h-16 w-full bg-slate-50 rounded-2xl" />
                <div className="h-[400px] w-full bg-slate-50 rounded-[2.5rem]" />
            </div>
        }>
            <KnoListClient
                initialData={initialData}
                searchKeyword={searchKeyword}
                currentPage={page}
            />
        </Suspense>
    );
}