import { manualAdminService } from '@/services/foundation/user/ManualAdminService';
import { cookies } from 'next/headers';
import ManualAdminClient from './ManualAdminClient';

export const metadata = {
  title: '온라인 매뉴얼 관리 | 부가서비스',
};

export default async function ManualAdminPage({
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

  const initialManuals = await manualAdminService.getManualList({ 
    keyword, 
    page, 
    size: 10 
  }, axiosConfig).catch((error) => {
    console.error('Failed to fetch initial manuals:', error);
    return {
      list: [],
      total: 0,
      page: 0,
      size: 10,
      totalPage: 1
    };
  });

  return (
    <ManualAdminClient initialManuals={initialManuals} />
  );
}
