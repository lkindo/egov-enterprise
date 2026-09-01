import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { MenuInfo } from '@/types/foundation/menu';
import MenuAdminClient, { type FetchResult, type ProgramOption } from './MenuAdminClient';
import { SITE_IDENTITY } from '@/config/site-identity';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';

export const metadata = {
    title: `시스템 메뉴 관리 | ${SITE_IDENTITY.frameworkName}`,
    description: '시스템 메뉴 계층과 프로그램 연결 정보를 관리합니다.',
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

    const programsPromise: Promise<FetchResult<ProgramOption[]>> = fetchAllPages(
        (pageIndex, pageUnit) => programAdminService.getProgramList(
            { pageIndex, pageUnit },
            axiosConfig,
        ),
    )
        .then((data) => ({ data, error: null }))
        .catch((error: unknown) => {
            return { data: [] as ProgramOption[], error: toMessage(error) };
        });

    return (
        <Suspense fallback={
            <div className="animate-pulse space-y-4">
                <h1 className="sr-only">시스템 메뉴 관리를 불러오는 중</h1>
                <div className="h-11 w-1/3 rounded-md bg-muted" />
                <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
                    <div className="h-[32rem] rounded-md bg-muted" />
                    <div className="h-[32rem] rounded-md bg-muted" />
                </div>
            </div>
        }>
            <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </Suspense>
    );
}
