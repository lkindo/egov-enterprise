import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { codeAdminService } from '@/services/admin/system/CodeAdminService';
import CommonCodeClient from './CommonCodeClient';

export const metadata = {
  title: '공통 코드 관리 | 전자정부 표준프레임워크',
  description: '시스템 전반에서 사용되는 공통 코드 및 상세 내역을 관리합니다.',
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

  // Fetch groups and details in parallel if groupId exists
  let groups: any[] = [];
  let details: any[] = [];

  try {
    const [groupsRes, detailsRes] = await Promise.all([
      codeAdminService.getGroups({}, axiosConfig),
      groupId ? codeAdminService.getDetails({ codeId: groupId }, axiosConfig) : Promise.resolve({ resultList: [] } as any)
    ]);

    groups = groupsRes.resultList || [];
    details = detailsRes.resultList || [];
  } catch (error) {
    console.error('Server-side fetch common codes failed:', error);
  }

  return (
    <Suspense fallback={<CommonCodeLoading />}>
      <CommonCodeClient
        groups={groups}
        details={details}
        selectedGroupId={groupId}
      />
    </Suspense>
  );
}

function CommonCodeLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-64 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-50 rounded-[1.5rem]" />)}
        </div>
        <div className="lg:col-span-3 h-[600px] bg-slate-50 rounded-[3rem]" />
      </div>
    </div>
  );
}