import { smsAdminService } from '@/services/foundation/operation/SmsAdminService';
import { cookies } from 'next/headers';
import SmsAdminClient from './SmsAdminClient';

export const metadata = {
  title: '臾몄옄 硫붿떆吏 관리| 遺媛쒕퉬님,
};

export default async function SmsAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 珥덇린 諛쒖넚 ?댁뿭 조회 (泥님섏씠吏)
  const initialSmsList = await smsAdminService.getSmsList({ page: 0, size: 10 }, axiosConfig).catch(() => ({
    list: [],
    total: 0
  }));

  return (
    <SmsAdminClient initialSmsList={initialSmsList} />
  );
}

