import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { DeptJobListSection } from '@/components/business/deptJob/DeptJobListSection';
import { connection } from 'next/server';

/*
 * 나의 업무(core, 업무 허브 분해 W1). 메뉴 '나의 업무'(1000000)의 목적지다. 업무 관리 목록을 열고, 업무 보고·일정 탭은 그 기능이
 * 있는 구성에서만 탭 줄에 더해진다(useWorkHubTabStrip). 문서 제목은 메뉴 이름을 따른다 — 이 화면이 보고·일정을 그리지 않는다.
 */
export const metadata: Metadata = {
  title: `나의 업무 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function WorkHubPage() {
 await connection();
 return <DeptJobListSection breadcrumbItems={[{ label: '나의 업무' }, { label: '업무 관리' }]} filterStateKey="work-hub" />;
}
