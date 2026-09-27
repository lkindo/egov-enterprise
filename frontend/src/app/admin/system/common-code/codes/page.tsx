import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import CommonCodeCodesClient from './CommonCodeCodesClient';

export const metadata: Metadata = {
  title: `공통코드 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
 return <CommonCodeCodesClient />;
}
