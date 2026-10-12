import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from '@/test-utils/projection';

/**
 * [업무 허브 분해 W1] 업무 보고 화면 머리의 '메모보고 관리' 링크와 안내 문장은 메모 보고 기능의 링크 기여(shell-links 의 work-report
 * 배치)다. 이 시험은 **실제 레지스트리**와 core 도우미(useWorkReportLinks)로 노출을 본다. 메모 보고 디렉터리에 두어 메모 보고와 함께
 * 빠진다 — 업무 보고 화면은 import 하지 않는다(메모 보고만 고른 구성에는 업무 보고 화면이 없어, import 하면 이 시험 파일이 연쇄로
 * 지워져 정밀 점검의 소스 생존 검사가 생성을 막는다). 업무 보고 화면이 링크를 그리는 것은 업무 보고 디렉터리의 시험이 본다.
 *
 * 노출 행렬: 링크와 문장은 목적지 진입 권한(MEMO_RPT_READ)이 있는 주체에게만 보인다. 권한 상태를 모르면(로그아웃·권한 버전 없음·
 * 빈 권한 버전) 보이지 않는다. 판정은 목으로 막지 않는다 — 실제 레지스트리와 canOpenPage 를 그대로 탄다. 노출일 뿐 인가가 아니다 —
 * 메모 보고 화면과 API 는 서버가 같은 권한으로 막는다(H3). 종전에는 링크만 숨고 안내 문장은 늘 보였다(사용자 확인 B2).
 */
type Subject = null | { id: string; role: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  granted: { id: 'writer', role: 'ROLE_USER', permissions: ['WORK_RPT_READ', 'MEMO_RPT_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 업무 보고와 업무함 권한은 있지만 메모 보고 진입 권한이 없다. 종전 판정이 업무함 권한으로 보여 홈으로 튕겼다.
  denied: { id: 'writer', role: 'ROLE_USER', permissions: ['WORK_RPT_READ', 'DEPT_BOX_READ', 'MEMO_RPT_INSTRUCT'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'writer', role: 'ROLE_USER', permissions: ['WORK_RPT_READ', 'MEMO_RPT_READ'] },
  emptyVersion: { id: 'writer', role: 'ROLE_USER', permissions: ['WORK_RPT_READ', 'MEMO_RPT_READ'], authorizationVersion: '' },
} satisfies Record<string, Subject>;
type SubjectCase = keyof typeof SUBJECTS;

const mocks = vi.hoisted(() => ({ user: null as unknown }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: mocks.user });
  return { useAuth: auth, useOptionalAuth: auth };
});

import { useWorkReportLinks } from '@/components/business/work-hub/work-hub-tabs';
import memoReportLinks from '@/extensions/memoreport/shell-links';

function Links() {
  const links = useWorkReportLinks();
  return (
    <ul aria-label="업무 보고 머리 링크">
      {links.map(link => <li key={link.id}>{`${link.label}|${link.href}|${link.description ?? ''}`}</li>)}
    </ul>
  );
}
const shown = () => within(screen.getByRole('list', { name: '업무 보고 머리 링크' })).queryAllByRole('listitem').map(item => item.textContent);

describe('업무 보고 머리의 메모보고 관리 링크(메모 보고 기여)', () => {
  beforeEach(() => {
    mocks.user = SUBJECTS.granted;
  });

  it.each(Object.keys(SUBJECTS) as SubjectCase[])('노출 행렬 — 주체 %s', (subject) => {
    mocks.user = SUBJECTS[subject];
    render(<Links />);
    expect(shown()).toEqual(subject === 'granted'
      ? ['메모보고 관리|/admin/operation/memo-reports|누군가에게 보고하려면 메모 보고를 쓰세요.']
      : []);
  });

  it('노출 술어는 목적지 화면의 진입 권한과 같고, 기본 그룹 셋이 모두 그 권한을 가진다', () => {
    const catalog = JSON.parse(readFileSync(path.join(REPO_ROOT, 'config/governance/permission-catalog.json'), 'utf8')) as {
      permissions: Array<{ code: string; defaultGroups: string[] }>;
      pagePermissions: Record<string, string[]>;
    };
    expect(memoReportLinks.map(entry => [entry.placement, entry.href, entry.visibleWhen])).toEqual([
      ['work-report', '/admin/operation/memo-reports', { page: '/admin/operation/memo-reports' }],
    ]);
    expect(catalog.pagePermissions['/admin/operation/memo-reports']).toEqual(['MEMO_RPT_READ']);
    // 기본 그룹은 모두 이 권한을 가져 화면이 바뀌지 않는다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
    expect(catalog.permissions.find(row => row.code === 'MEMO_RPT_READ')?.defaultGroups).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
  });
});
