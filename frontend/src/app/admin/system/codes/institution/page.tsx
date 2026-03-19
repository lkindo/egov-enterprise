import { Suspense } from 'react';
import { codeAdminService } from '@/services/admin/system/CodeAdminService';
import InstitutionCodeClient from './InstitutionCodeClient';
import { cookies } from 'next/headers';

export const metadata = {
 title: '기관코드 관리 | 전자정부 표준프레임워크',
 description: '행정기관 코드를 수신하고 관리합니다.',
};

export default async function InstitutionCodePage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 let initialData: any = { list: [], total: 0 };
 try {
 initialData = await codeAdminService.getInstitutionCodeList({ page번호: 1, pageUnit: 10 }, axiosConfig);
 } catch (error) {
 console.error('Failed to fetch initial institution codes:', error);
 }

 return (
 <Suspense fallback={<div>로딩 중...</div>}>
 <InstitutionCodeClient initialData={initialData} />
 </Suspense>
 );
}
