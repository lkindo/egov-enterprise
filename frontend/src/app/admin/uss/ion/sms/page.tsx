import { smsAdminService } from '@/services/foundation/operation'/SmsAdminService';
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
  const initialSmsList = await smsAdminService.getSmsList({ page: 0, size: 10 }, axiosConfig).catch(() => ({
    list: [],
    total: 0
  }));

  return (
    <SmsAdminClient initialSmsList={initialSmsList} />
  );
}
