import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import UserOrgHubClient from '../UserOrgHubClient';

export default async function AbsenceManagePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate promises without awaiting
  const usersPromise = userAdminService.getUserList({ pageNo: 1, searchKeyword: '' }, axiosConfig).catch(() => ({ list: [], total: 0, totalPage: 0 }));
  const deptsPromise = deptAdminService.getDeptList({ pageNo: 1, searchKeyword: '' }, axiosConfig).catch(() => ({ list: [], total: 0, totalPage: 0 }));

  return (
    <Suspense fallback={<div className="p-24 text-center font-mono text-[10px] tracking-widest uppercase animate-pulse">Synchronizing Identity Fabric...</div>}>
      <UserOrgHubClient 
        defaultTab="ABSENCES" 
        usersPromise={usersPromise} 
        deptsPromise={deptsPromise} 
      />
    </Suspense>
  );
}
