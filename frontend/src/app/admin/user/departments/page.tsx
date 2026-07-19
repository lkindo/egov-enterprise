import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import UserOrgHubClient from '../UserOrgHubClient';

export default async function DeptManagePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate promises without awaiting
  const usersPromise = userAdminService.getUserList({ pageNo: 1, searchKeyword: '' }, axiosConfig).catch(() => ({ list: [], total: 0, totalPage: 0 }));
  // 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다. (pageNo/searchKeyword 는 무시됐다)
  const deptsPromise = deptAdminService.getDeptList({ keyword: '', page: 0, size: 10 }, axiosConfig).catch(() => ({ list: [], total: 0, totalPage: 0 }));

  return (
    <Suspense fallback={<div className="p-24 text-center font-mono text-xs tracking-widest uppercase animate-pulse">Synchronizing Identity Fabric...</div>}>
      <UserOrgHubClient 
        defaultTab="DEPTS" 
        usersPromise={usersPromise} 
        deptsPromise={deptsPromise} 
      />
    </Suspense>
  );
}
