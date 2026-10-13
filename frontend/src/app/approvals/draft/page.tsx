import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ApprovalDraftHubClient from './ApprovalDraftHubClient';

export const metadata: Metadata = {
  title: `새 결재 기안 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ApprovalDraftPage() {
  return <ApprovalDraftHubClient />;
}
