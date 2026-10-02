import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { menuAdminService, type MenuStructure } from '@/services/foundation/system/MenuAdminService';
import MenuAdminClient, { type FetchResult } from './MenuAdminClient';
import { SITE_IDENTITY } from '@/config/site-identity';
import { failureMessage } from '@/lib/safe-error-log';

export const metadata = {
    title: `시스템 메뉴 관리 | ${SITE_IDENTITY.frameworkName}`,
    description: '메뉴 영역·섹션·화면의 배치와 이름·연결 화면·보이는 그룹을 한 번에 편집하고 저장합니다.',
};

/*
 * [2026-10-02 D1·D2] 메뉴 구조(버전 포함)만 읽는다 — 이 화면은 MENU_READ 만으로 완전하다. 종전에는 수정 창의 '연결 프로그램'
 * 선택지를 위해 프로그램 목록(PROGRAM_READ)도 읽었는데, 이제 메뉴는 화면 목록의 경로로 연결하고 이전 프로그램 연결은
 * 상세에 읽기 전용으로만 보인다. 그룹 권한(AUTHRT_READ)은 화면이 권한을 확인한 뒤에만 읽는다(없는 사람에게 403 기록을 남기지 않는다).
 */
export default async function MenuAdminPage() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const structurePromise: Promise<FetchResult<MenuStructure | null>> = menuAdminService
        .getMenuStructure(axiosConfig)
        .then((data) => ({ data, error: null }))
        // 조회 실패를 빈 구조로 삼키면 화면이 "메뉴 0건"으로 거짓말한다 — 사유를 봉투에 담아 화면이 그대로 드러낸다.
        .catch((error: unknown) => ({ data: null, error: failureMessage(error, '메뉴 구조를 불러오지 못했습니다.') }));

    return (
        <Suspense fallback={
            <div className="animate-pulse space-y-4">
                <h1 className="sr-only">시스템 메뉴 관리를 불러오는 중</h1>
                <div className="h-11 w-1/3 rounded-md bg-muted" />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
                    <div className="h-[32rem] rounded-md bg-muted" />
                    <div className="h-[32rem] rounded-md bg-muted" />
                </div>
            </div>
        }>
            <MenuAdminClient structurePromise={structurePromise} />
        </Suspense>
    );
}
