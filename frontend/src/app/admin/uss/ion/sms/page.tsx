import { Suspense } from 'react';
import { smsAdminService } from '@/services/foundation/operation/SmsAdminService';
import { cookies } from 'next/headers';
import SmsAdminClient from './SmsAdminClient';

export const metadata = {
  title: '문자 메시지 관리 | 부가서비스',
};

export default async function SmsAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 초기 발송 내역 조회 (첫 페이지)
  // 실패를 빈 목록으로 바꾸면 화면이 '0건'이라고 거짓말한다(감사 P1-1).
  // null 은 '시드 없음' 표식이며, 클라이언트 쿼리가 재조회해 실패를 화면에 그대로 드러낸다.
  const initialSmsList = await smsAdminService.getSmsList({ page: 0, size: 10 }, axiosConfig).catch(() => {
    return null;
  });

  // 클라이언트가 useSearchParams(페이지 URL 동기화)를 쓰므로 Suspense 경계를 둔다.
  return (
    <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse"><h1 className="sr-only">SMS 발송 내역을 불러오는 중</h1>발송 내역을 불러오는 중입니다...</div>}>
      <SmsAdminClient initialSmsList={initialSmsList} />
    </Suspense>
  );
}
