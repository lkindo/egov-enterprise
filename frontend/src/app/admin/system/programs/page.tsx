import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import ProgramAdminClient from './ProgramAdminClient';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';
import { SITE_IDENTITY } from '@/config/site-identity';

export const metadata = {
  title: `시스템 프로그램 미들웨어 | ${SITE_IDENTITY.frameworkName}`,
  description: '시스템 아키텍처 내의 각 프로그램과 엔드포인트를 정의하고 통합 관리합니다.',
};

const PAGE_SIZE = 10;

/** 1-base 페이지 파라미터 파싱(잘못된 값은 1페이지로 수렴). */
function parsePage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

export default async function ProgramAdminPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams.page);

  /*
    [2026-09-04] `?searchWrd=` 읽기를 걷었다 — **URL 에 그 값을 싣는 코드가 저장소에 없었다.**
    이 화면의 검색어는 `ProgramAdminClient` 의 로컬 상태이고, 서버로는
    `BaseSearchDto.searchKeyword` 로 나간다(같은 파일 :102 주석 참조 — `searchWrd` 는 바인딩 대상도 아니다).
    즉 producer 0건의 소비자 전용 잔존 경로였고 손으로 URL 을 만들지 않는 한 도달하지 않았다.
    시드 메뉴(`modern_route`)에도 `searchWrd` 참조가 없음을 확인했다.

    PD-UX-002 Q1 은 "URL 에 실리는 검색어를 전부 유지" 로 결정됐는데, 이 값은 **실린 적이 없어**
    그 결정의 대상이 아니다(Q4 죽은 표면). 되살리려면 producer 를 함께 만들어야 한다.
  */
  const searchWrd = '';

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // totalPageCount -> totalPage (PageResponse 인터페이스와 일치시켜 타입 오류 해결)
  let initialData: PageResponse<Program> = { list: [], total: 0, page, size: PAGE_SIZE, totalPage: 0 };
  // 조회 실패를 빈 목록으로 삼키면 화면이 "등록된 프로그램 없음"으로 거짓말한다. 사유를 클라이언트로 전달한다.
  let initialError: string | null = null;

  try {
    initialData = await programAdminService.getProgramList({
        page: page - 1,
        size: PAGE_SIZE,
        pageUnit: PAGE_SIZE,
        searchWrd
    }, axiosConfig);
  } catch (error: unknown) {
    if ((error as { response?: { status?: number } })?.response?.status === 401) {
      redirect('/login?expired=true&redirect=/admin/system/programs');
    }
    initialError = error instanceof Error && error.message
      ? error.message
      : '프로그램 목록을 불러오지 못했습니다.';
  }

  return (
    // 루트 레이아웃이 이미 max-w-7xl · p-6/md:p-12/lg:p-16 을 제공하므로 화면 단위 p-8 이중 여백을 제거한다.
    <div className="pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <Suspense fallback={
        <div className="animate-pulse space-y-12">
          <h1 className="sr-only">프로그램 관리를 불러오는 중</h1>
          <div className="h-11 bg-muted rounded-lg w-1/3" />
          <div className="h-[600px] bg-muted rounded-lg" />
        </div>
      }>
        <ProgramAdminClient
          initialData={initialData}
          searchWrd={searchWrd}
          initialError={initialError}
          initialPage={page}
        />
      </Suspense>
    </div>
  );
}
