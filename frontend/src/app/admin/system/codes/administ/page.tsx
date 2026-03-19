import { Suspense } from 'react';
import { codeAdminService } from '@/services/admin/system/CodeAdminService';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';

export const metadata = {
 title: '행정코드 관리 | 전자정부 표준프레임워크',
 description: '법정동 및 행정동 코드를 관리합니다.',
};

export default async function AdministCodePage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 let initialData: any = { list: [], total: 0 };
 try {
 initialData = await codeAdminService.getAdministCodeList({ page번호: 1, pageUnit: 10 }, axiosConfig);
 } catch (error) {
 console.error('Failed to fetch initial administ codes:', error);
 }

 return (
 <Suspense fallback={<div>로딩 중...</div>}>
 <AdministCodeClient initialData={initialData} />
 </Suspense>
 );
}
