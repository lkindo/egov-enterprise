import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { DeptJobListSection } from '@/components/business/deptJob/DeptJobListSection';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: `부서 업무 목록 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function DeptJobPage() {
 await connection();
 return <DeptJobListSection />;
}
