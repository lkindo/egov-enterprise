import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { menuAdminService, type MenuStructure } from '@/services/foundation/system/MenuAdminService';
import MenuAdminClient, { type FetchResult } from './MenuAdminClient';
import { SITE_IDENTITY } from '@/config/site-identity';
import { failureMessage } from '@/lib/safe-error-log';
import { cn } from '@/lib/utils';
import { WORK_FILL_CONTENT_CLASS, WORK_FILL_ROOT_CLASS } from '@/app/components/patterns/work-fill';

export const metadata = {
    title: `시스템 메뉴 관리 | ${SITE_IDENTITY.frameworkName}`,
    description: '메뉴 영역·섹션·화면의 배치와 이름·연결 화면·보이는 그룹을 한 번에 편집하고 저장합니다.',
};

/*
 * [2026-10-02 D1·D2] 메뉴 구조(버전 포함)만 읽는다 — 이 화면은 MENU_READ 만으로 완전하다. 종전에는 수정 창의 '연결 프로그램'
 * 선택지를 위해 프로그램 목록(PROGRAM_READ)도 읽었는데, 이제 메뉴는 화면 목록의 경로로 연결한다(이전 프로그램 연결은
 * 2026-10-04 퇴역했다). 그룹 권한(AUTHRT_READ)은 화면이 권한을 확인한 뒤에만 읽는다(없는 사람에게 403 기록을 남기지 않는다).
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

    /*
     * 불러오는 동안의 자리 — 본 화면(MasterDetailPage fill)과 같은 높이 규칙을 쓴다(2차 리뷰: 종전 고정 32rem 상자 둘은 낮은 창에서
     * 페이지를 스크롤시키다가 본 화면으로 바뀌며 높이가 튀었다). 브레드크럼 자리(46px)·제목 줄·작업 영역 순서이고, 작업 영역은
     * fill 조건에서 남은 높이를 채우며(공용 작업 영역 클래스 — 본 화면과 같은 바닥값 22rem) 조건 밖에서는 기본 셸처럼
     * min-h-[32rem]·lg:h-[min(70vh,48rem)] 이다. 본 화면과 같은 fill 표지(data-work-fill)를 달아 fill 조건에서 푸터를 함께 숨긴다
     * — 표지가 없으면 불러오는 동안만 푸터가 보이고 푸터 몫이 남아, 본 화면으로 바뀔 때 작업 영역이 5rem 튄다(globals.css).
     */
    return (
        <Suspense fallback={
            <div data-work-fill="" className={cn('animate-pulse space-y-4', WORK_FILL_ROOT_CLASS, 'work-fill:space-y-3')}>
                <h1 className="sr-only">시스템 메뉴 관리를 불러오는 중</h1>
                <div className="h-[46px] rounded-md bg-muted/60" />
                <div className="h-7 w-1/3 rounded-md bg-muted" />
                <div
                    className={cn(
                        'grid min-h-[32rem] gap-4 lg:h-[min(70vh,48rem)] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]',
                        WORK_FILL_CONTENT_CLASS,
                        'work-fill:h-auto work-fill:min-h-[22rem] work-fill:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]',
                    )}
                >
                    <div className="rounded-md bg-muted" />
                    <div className="rounded-md bg-muted" />
                </div>
            </div>
        }>
            <MenuAdminClient structurePromise={structurePromise} />
        </Suspense>
    );
}
