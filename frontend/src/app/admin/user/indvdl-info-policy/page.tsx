import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import UserOrgHubClient from '../UserOrgHubClient';

export default async function PrivacyPolicyPage() {
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
  // 조직도 전량 로드(D-11). 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다.
  const deptsPromise = deptAdminService
    .getDeptList({ keyword: '', page: 0, size: 1000 }, axiosConfig)
    .catch(() => {
      return null;
    });

  return (
    <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse"><h1 className="sr-only">개인정보 정책을 불러오는 중</h1>사용자·조직 데이터를 불러오는 중입니다...</div>}>
      <UserOrgHubClient 
        defaultTab="POLICIES" 
        usersPromise={usersPromise} 
        deptsPromise={deptsPromise} 
      />
    </Suspense>
  );
}
