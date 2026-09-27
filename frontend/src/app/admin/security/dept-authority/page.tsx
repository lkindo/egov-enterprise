import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SecurityDeptAuthorityClient from './SecurityDeptAuthorityClient';

export const metadata: Metadata = {
  title: `부서별 권한 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
 return <SecurityDeptAuthorityClient />;
}
