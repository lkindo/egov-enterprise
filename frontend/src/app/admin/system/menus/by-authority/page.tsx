import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import MenuByAuthorityClient from './MenuByAuthorityClient';

export default async function MenuByAuthorityPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate authors promise on server
  const authorsPromise = authorAdminService.getAuthorList({ 
    pageNo: 1, 
    searchCondition: '1', 
    searchKeyword: '' 
  } as any, axiosConfig).catch(() => ({ list: [], total: 0 }));

  return (
    <Suspense fallback={<div className="p-24 text-center font-mono text-[10px] tracking-widest uppercase animate-pulse text-slate-400">Loading Authorization Inventory...</div>}>
      <MenuByAuthorityClient authorsPromise={authorsPromise} />
    </Suspense>
  );
}
