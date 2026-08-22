import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { CmmnClCode, CmmnCode, CmmnDetailCode, PageResponse } from '@/types/foundation/system';
import CommonCodeHubClient from './CommonCodeHubClient';

export const metadata = {
  title: '통합 코드 허브 | 전자정부 프레임워크',
  description: '공통코드, 행정코드, 기업코드 등 시스템 전반의 메타데이터를 통합 관리합니다.',
};

export default async function CommonCodePage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const groupId = (resolvedSearchParams.groupId as string) || null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // Fetch classifications, groups and details in parallel for STANDARD tab
  let clCodes: CmmnClCode[] = [];
  let groups: CmmnCode[] = [];
  let details: CmmnDetailCode[] = [];
  /*
   * [P1-1] 조회 실패를 빈 배열로 삼켜 "등록된 코드 0건"으로 위장하지 않는다.
   * 실패 사실을 클라이언트로 넘겨 화면 상단 경고로 노출한다.
   */
  let fetchError = false;

  try {
    const [clRes, groupsRes, detailsRes] = await Promise.all([
      codeAdminService.getClCodeList({ pageUnit: 999 }, axiosConfig),
      codeAdminService.getCmmnCodeList({ pageUnit: 999 }, axiosConfig),
      groupId 
        ? codeAdminService.getDetailCodeList({ cdId: groupId, pageUnit: 999 }, axiosConfig) 
        : Promise.resolve({ list: [], total: 0, page: 1, size: 10, totalPage: 1 } as PageResponse<CmmnDetailCode>)
    ]);

    clCodes = clRes.list || [];
    groups = groupsRes.list || [];
    details = (detailsRes.list || []) as CmmnDetailCode[];
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || !accessToken) {
      redirect('/login?expired=true');
    }
    fetchError = true;
  }

  return (
    <Suspense fallback={<CommonCodeLoading />}>
      <CommonCodeHubClient
        clCodes={clCodes}
        groups={groups}
        details={details}
        selectedGroupId={groupId}
        fetchError={fetchError}
      />
    </Suspense>
  );
}

/** [P2] 루트 레이아웃(max-w-7xl p-6/md:p-12/lg:p-16)이 이미 여백을 주므로 화면별 p-8 이중 여백은 제거했다. */
function CommonCodeLoading() {
  return (
    <div className="space-y-12 animate-pulse">
      <h1 className="sr-only">공통코드 통합 관리를 불러오는 중</h1>
      <div className="flex items-center gap-6 mb-12">
        <div className="h-11 w-16 bg-muted rounded-lg" />
        <div className="space-y-4">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-48 bg-muted rounded-lg opacity-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-1 space-y-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-11 bg-muted rounded-lg" />)}
        </div>
        <div className="lg:col-span-3 h-[700px] bg-muted rounded-lg" />
      </div>
    </div>
  );
}
