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

    if (process.env.NODE_ENV === 'development') {
        console.log(`[MenuAdminPage] AccessToken present: ${!!accessToken}`);
        if (!accessToken) {
            console.log(`[MenuAdminPage] All cookies: ${JSON.stringify((await cookies()).getAll().map(c => c.name))}`);
        }
    }

    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // Parallel fetching of menus and programs to eliminate waterfalls
    let menus: any[] = [];
    let programs: any[] = [];
    let isUnauthorized = false;

    try {
        const [menuData, programData] = await Promise.all([
            menuAdminService.getAllMenus(axiosConfig),
            programAdminService.getProgramList({ page: 0, size: 1000 }, axiosConfig)
        ]);

        menus = Array.isArray(menuData) ? menuData : (menuData as any)?.list || [];
        programs = programData?.list || [];
    } catch (error: any) {
        if (error.response?.status === 401) {
            isUnauthorized = true;
        } else {
            console.error('Server-side fetch menu architecture failed:', error);
        }
    }

    if (isUnauthorized) {
        redirect(`/login?expired=true&redirect=/admin/system/menus`);
    }

    return (
        <div className="p-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <Suspense fallback={
                <div className="animate-pulse space-y-12">
                    <div className="h-20 bg-slate-100 rounded-[2rem] w-1/3" />
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-5 h-[800px] bg-slate-100 rounded-[3rem]" />
                        <div className="col-span-12 lg:col-span-7 h-[800px] bg-slate-100 rounded-[3rem]" />
                    </div>
                </div>
            }>
                <MenuAdminClient initialMenus={menus} programs={programs} />
            </Suspense>
        </div>
    );
}
