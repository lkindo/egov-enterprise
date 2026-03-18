import { policyAdminService } from '@/services/admin/user/PolicyAdminService';
import { cookies } from 'next/headers';
import PrivacyPolicyClient from './PrivacyPolicyClient';

export const metadata = {
  title: '개인정보 보호 정책 | 보안관리',
};

export default async function PrivacyPolicyPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  const initialPolicy = await policyAdminService.getPolicy('privacy', axiosConfig).catch(() => ({
    type: 'privacy',
    title: '개인정보 처리 방침',
    content: '정보를 불러오는 중 오류가 발생했습니다.'
  }));

  return (
    <PrivacyPolicyClient initialPolicy={initialPolicy} />
  );
}
