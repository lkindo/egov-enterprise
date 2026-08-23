import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import UserOrgHubClient from '../UserOrgHubClient';

export default async function DeptManagePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate promises without awaiting
  const usersPromise = userAdminService
    .getUserList({ page: 0, size: 10, searchKeyword: '' }, axiosConfig)
    .catch(() => {
      // 실패를 빈 목록으로 바꾸면 화면이 '0건'이라고 거짓말한다(감사 P1-1).
      // null 은 '시드 없음' 표식이며, 클라이언트 쿼리가 즉시 재조회해 실패를 화면에 드러낸다.
      return null;
    });
  // 조직도(D&D 트리)는 페이징과 상극 — 전량 로드해야 한다. 클라이언트(DEPT_LIST_SIZE=1000)와 동일한 size 를 쓴다.
  // 종전 size:10 → 11번째 부서부터 프리페치 시드에서 누락돼 불필요 재조회가 발생했다(D-11).
  const deptsPromise = deptAdminService
    .getDeptList({ keyword: '', page: 0, size: 1000 }, axiosConfig)
    .catch(() => {
      return null;
    });

  return (
    <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse"><h1 className="sr-only">부서 관리를 불러오는 중</h1>사용자·조직 데이터를 불러오는 중입니다...</div>}>
      <UserOrgHubClient 
        defaultTab="DEPTS" 
        usersPromise={usersPromise} 
        deptsPromise={deptsPromise} 
      />
    </Suspense>
  );
}
