import { onlinePollAdminService } from '@/services/foundation/system'/OnlinePollAdminService';
import { cookies } from 'next/headers';
import OnlinePollAdminClient from './OnlinePollAdminClient';

export const metadata = {
  title: '온라인 설문 관리 | 설문관리',
};

export default async function OnlinePollAdminPage({
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

  const initialPolls = await onlinePollAdminService.getPollList({ keyword, page, size: 10 }, axiosConfig).catch(() => ({
    list: [],
    total: 0
  }));

  return (
    <OnlinePollAdminClient initialPolls={initialPolls} />
  );
}
