import { manualAdminService } from '@/services/foundation/user/ManualAdminService';
import { cookies } from 'next/headers';
import ManualAdminClient from './ManualAdminClient';

export const metadata = {
 title: '?�라??매뉴??관�?| 부가?�비??,
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

 const initialManuals = await manualAdminService.getManualList({ keyword, page, size: 10 }, axiosConfig).catch(() => ({
  list: [],
  total: 0,
  page: 0,
  size: 10,
  totalPage: 1
 }));

 return (
 <ManualAdminClient initialManuals={initialManuals} />
 );
}
