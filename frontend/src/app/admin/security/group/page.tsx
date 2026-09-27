import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SecurityGroupClient from './SecurityGroupClient';

export const metadata: Metadata = {
  title: `사용자 그룹 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
 return <SecurityGroupClient />;
}
