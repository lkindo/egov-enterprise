import React, { Suspense } from 'react';
import { templateAdminService } from '@/services/foundation/system/TemplateAdminService';
import { cookies } from 'next/headers';
import TemplateAdminClient from './TemplateAdminClient';

export const metadata = {
  title: '템플릿 관리 | 시스템 관리',
};

export default async function TemplateAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate data promise without awaiting.
  // 감사 P1-1: 과거 `.catch(() => [])` 로 조회 실패를 빈 배열로 삼켜 "템플릿 0건"으로 위장했다.
  // 실패는 그대로 전파시켜 `use()` → 도메인 error.tsx(app/admin/community/error.tsx) 경계에서 드러나게 한다.
  const templatesPromise = templateAdminService.getTemplateList(axiosConfig);

  return (
    <Suspense fallback={<div className="p-24 text-center text-muted-foreground font-bold">템플릿 라이브러리를 불러오는 중...</div>}>
      <TemplateAdminClient templatesPromise={templatesPromise} />
    </Suspense>
  );
}
