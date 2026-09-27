import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import WorkflowHubClient from '../WorkflowHubClient';

export const metadata: Metadata = {
  title: `결재 서식 예시 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ApprovalFormsPage() {
 return <WorkflowHubClient defaultTab="FORMS" />;
}
