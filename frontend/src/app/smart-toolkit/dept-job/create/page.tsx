import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import DeptJobCreateClient from './DeptJobCreateClient';

export const metadata: Metadata = {
  title: `부서 업무 등록 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
  return <DeptJobCreateClient />;
}
