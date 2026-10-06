import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import UserOrgHubPage from '../UserOrgHubPage';

export const metadata: Metadata = {
  title: `개인정보 정책 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function PrivacyPolicyPage() {
  return <UserOrgHubPage tab="POLICIES" loadingTitle="개인정보 정책을 불러오는 중" />;
}
