import { Suspense } from 'react';
import { administrationWordService } from '@/services/admin/help/AdministrationWordService';
import AdministrationWordClient from './AdministrationWordClient';
import { cookies } from 'next/headers';

export const metadata = {
  title: '행정전문용어사전 관리 | 전자정부 표준프레임워크',
  description: '행정 분야의 전문 용어를 관리하는 사전 서비스입니다.',
};

export default async function AdministrationWordPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  // Note: Client-side axios interceptor handles token normally, 
  // but SSR needs explicit token if calling from server.
  // HelpController doesn't seem to enforce strict RBAC on GET, but let's be safe.
  
  let initialData: any = { content: [], totalElements: 0 };
  try {
    const response = await administrationWordService.getWords({ page: 0, size: 10 });
    if (response.success) {
      initialData = response.data;
    }
  } catch (error) {
    console.error('Failed to fetch initial administration words:', error);
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">용어 데이터를 불러오는 중...</div>}>
      <AdministrationWordClient initialData={initialData} />
    </Suspense>
  );
}
