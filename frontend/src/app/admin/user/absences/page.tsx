import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import UserOrgHubPage from '../UserOrgHubPage';

export const metadata: Metadata = {
  title: `부재 상태 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function AbsenceManagePage() {
  return <UserOrgHubPage tab="ABSENCES" loadingTitle="부재 상태를 불러오는 중" />;
}
