import { userAdminService } from '@/services/admin/system/UserAdminService';
import { absenceAdminService } from '@/services/admin/user/AbsenceAdminService';
import { cookies } from 'next/headers';
import AbsenceAdminClient from './AbsenceAdminClient';

export const metadata = {
  title: '사용자 부재 관리 | 시스템관리',
};

export default async function AbsenceAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 사용자 목록과 부재 정보를 동시에 병렬로 조회
  const [initialUsers, initialAbsences] = await Promise.all([
    userAdminService.getUserList({ page: 0, size: 100 }, axiosConfig).catch(() => ({ list: [], pagination: { totalItems: 0 } })),
    absenceAdminService.getAbsenceList(axiosConfig).catch(() => [])
  ]);

  return (
    <AbsenceAdminClient initialUsers={initialUsers} initialAbsences={initialAbsences} />
  );
}
