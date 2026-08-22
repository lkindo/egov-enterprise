import { Suspense } from 'react';
import { cookies } from 'next/headers';
;
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { MenuInfo } from '@/types/foundation/menu';
import MenuAdminClient, { type FetchResult, type ProgramOption } from './MenuAdminClient';

export const metadata = {
    title: '시스템 메뉴 아키텍처 | 전자정부 표준프레임워크',
    description: '시스템 트리 구조와 프로그램 연결 체계를 통합 관리합니다.',
};

/**
 * 서버 조회 실패를 빈 배열로 삼키면 화면이 "데이터 0건"으로 거짓말한다.
 * 실패 사유를 봉투(FetchResult)에 담아 클라이언트로 넘겨 사용자에게 그대로 드러낸다.
 */
function toMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error) return error;
    return '알 수 없는 오류가 발생했습니다.';
}

export default async function MenuAdminPage() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // [P1: Waterfall Elimination] Initiate promises without awaiting
    const menusPromise: Promise<FetchResult<MenuInfo[]>> = menuAdminService
        .getAllMenus(axiosConfig)
        .then((data) => {
            const list = Array.isArray(data)
                ? data
                : ((data as unknown as { list?: unknown[] })?.list ?? []);
            return { data: list as unknown as MenuInfo[], error: null };
        })
        .catch((error: unknown) => {
            return { data: [] as MenuInfo[], error: toMessage(error) };
        });

    const programsPromise: Promise<FetchResult<ProgramOption[]>> = programAdminService
        .getProgramList({ page: 0, size: 1000 }, axiosConfig)
        .then((data) => ({ data: (data?.list ?? []) as ProgramOption[], error: null }))
        .catch((error: unknown) => {
            return { data: [] as ProgramOption[], error: toMessage(error) };
        });

    return (
        // 루트 레이아웃(app/layout.tsx)이 이미 max-w-7xl · p-6/md:p-12/lg:p-16 을 제공하므로
        // 화면 단위 p-8 이중 여백을 두지 않는다.
        <div className="pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <Suspense fallback={
                <div className="animate-pulse space-y-12">
                    <h1 className="sr-only">시스템 메뉴 아키텍처를 불러오는 중</h1>
                    <div className="h-11 bg-muted rounded-lg w-1/3" />
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-5 h-[800px] bg-muted rounded-lg" />
                        <div className="col-span-12 lg:col-span-7 h-[800px] bg-muted rounded-lg" />
                    </div>
                </div>
            }>
                <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
            </Suspense>
        </div>
    );
}
