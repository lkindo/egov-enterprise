import { deptAdminService } from '@/services/admin/user/DeptAdminService';
import { cookies } from 'next/headers';
import DeptAdminClient from './DeptAdminClient';

export const metadata = {
  title: '부서 관리 | 시스템관리',
};

export default async function DeptAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; page?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  const page = params.page ? parseInt(params.page) : 0;
  const keyword = params.keyword;

  const initialDepts = await deptAdminService.getDeptList({ keyword, page, size: 10 }, axiosConfig).catch(() => ({
    list: [],
    pagination: { totalItems: 0 }
  }));

  return (
    <DeptAdminClient initialDepts={initialDepts} />
  );
}
