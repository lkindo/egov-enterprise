import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ApprovalDraftHubClient from './ApprovalDraftHubClient';

export const metadata: Metadata = {
  title: `결재 양식 작성 예시 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ApprovalDraftPage() {
  return <ApprovalDraftHubClient />;
}
