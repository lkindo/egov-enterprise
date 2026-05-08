import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import MenuAdminClient from './MenuAdminClient';

export const metadata = {
    title: '시스템 메뉴 아키텍처 | 전자정부 표준프레임워크',
    description: '시스템 트리 구조와 프로그램 연결 체계를 통합 관리합니다.',
};

export default async function MenuAdminPage() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // [P1: Waterfall Elimination] Initiate promises without awaiting
    const menusPromise = menuAdminService.getAllMenus(axiosConfig)
        .then(data => Array.isArray(data) ? data : (data as any)?.list || [])
        .catch(() => []);
    
    const programsPromise = programAdminService.getProgramList({ page: 0, size: 1000 }, axiosConfig)
        .then(data => data?.list || [])
        .catch(() => []);

    return (
        <div className="p-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <Suspense fallback={
                <div className="animate-pulse space-y-12">
                    <div className="h-20 bg-slate-100 rounded-lg w-1/3" />
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-5 h-[800px] bg-slate-100 rounded-lg" />
                        <div className="col-span-12 lg:col-span-7 h-[800px] bg-slate-100 rounded-lg" />
                    </div>
                </div>
            }>
                <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
            </Suspense>
        </div>
    );
}
