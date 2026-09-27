import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import WorkflowClient from './WorkflowClient';

export const metadata: Metadata = {
  title: `워크플로우 예시 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
    return <WorkflowClient />;
}
