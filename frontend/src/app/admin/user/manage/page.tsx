import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import UserOrgHubPage from '../UserOrgHubPage';

export const metadata: Metadata = {
  title: `사용자 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function UserManagePage() {
  return <UserOrgHubPage tab="USERS" loadingTitle="사용자 관리를 불러오는 중" />;
}
