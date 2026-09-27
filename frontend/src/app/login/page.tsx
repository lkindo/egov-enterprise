import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: `로그인 | ${SITE_IDENTITY.frameworkName}`,
};

export default function LoginPage() {
    return <LoginClient />;
}
