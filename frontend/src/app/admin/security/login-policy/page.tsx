import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import LoginPolicyAdminClient from './LoginPolicyAdminClient';

export const metadata: Metadata = {
  title: `로그인 정책 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function LoginPolicyPage() {
  return <LoginPolicyAdminClient />;
}
