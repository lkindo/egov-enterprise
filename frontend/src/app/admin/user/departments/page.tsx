import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import UserOrgHubPage from '../UserOrgHubPage';

export const metadata: Metadata = {
  title: `부서 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function DeptManagePage() {
  return <UserOrgHubPage tab="DEPTS" loadingTitle="부서 관리를 불러오는 중" />;
}
