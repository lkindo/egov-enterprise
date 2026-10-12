import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '@/test-utils/projection';
import { visibleEntries } from '@/extensions/slots';
import promotionSections from '@/extensions/promotion/home-sections';

/**
 * [Phase 2 9단계 H3] 업무 홈의 홍보 조각(배너·팝업 기여)의 노출 행렬. 배너·팝업 디렉터리에 두어 배너·팝업과 함께 빠진다 — 업무 홈
 * 레지스트리는 import 하지 않는다(소비자 표). 기여 파일과 슬롯 판정 함수(visibleEntries)를 그대로 탄다.
 *
 * 팝업은 POPUP_READ, 배너는 BANNER_READ 가 있는 주체에게만 보인다(사용자 결정 B5 — 조각이 부르는 사용자 API 의 권한). 권한 상태를
 * 모르면(로그아웃·권한 버전 없음·빈 권한 버전) 보이지 않는다. 노출일 뿐 인가가 아니다 — API 는 서버가 같은 권한으로 막는다(H3).
 */
type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  both: { id: 'user', permissions: ['DASHBOARD_READ', 'POPUP_READ', 'BANNER_READ'], authorizationVersion: 'v1' },
  popupOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'POPUP_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 업무 홈과 관리 화면 권한은 있지만 사용자 조회 권한이 없다.
  bannerAdminOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'BANNER_UPDATE', 'POPUP_UPDATE'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'user', permissions: ['POPUP_READ', 'BANNER_READ'] },
  emptyVersion: { id: 'user', permissions: ['POPUP_READ', 'BANNER_READ'], authorizationVersion: '' },
} satisfies Record<string, Subject>;
const EXPECTED: Record<keyof typeof SUBJECTS, string[]> = {
  both: ['popup', 'banner'],
  popupOnly: ['popup'],
  bannerAdminOnly: [],
  signedOut: [],
  noVersion: [],
  emptyVersion: [],
};

const read = (file: string) => JSON.parse(readFileSync(path.join(REPO_ROOT, file), 'utf8'));

describe('업무 홈 홍보 조각의 노출(배너·팝업 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [promotionSections]).map(entry => entry.id).sort())
      .toEqual([...EXPECTED[subject]].sort());
  });

  it('술어는 조각이 부르는 사용자 API 의 권한이고, 기본 그룹 셋이 모두 그 권한을 가진다', () => {
    const bindings = read('business-core/src/main/resources/authorization/operation-bindings.json') as
      Array<{ method: string; path: string; permission?: string }>;
    const permissionOf = (route: string) => bindings.find(row => row.method === 'GET' && row.path === route)?.permission;
    expect(promotionSections.map(entry => [entry.id, entry.visibleWhen])).toEqual([
      ['popup', { permissions: [permissionOf('/api/v1/popups/active')] }],
      ['banner', { permissions: [permissionOf('/api/v1/banners/reflected')] }],
    ]);
    expect([permissionOf('/api/v1/popups/active'), permissionOf('/api/v1/banners/reflected')]).toEqual(['POPUP_READ', 'BANNER_READ']);
    const catalog = read('config/governance/permission-catalog.json') as { permissions: Array<{ code: string; defaultGroups: string[] }> };
    // 기본 그룹은 모두 두 권한을 가져 화면이 바뀌지 않는다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
    for (const code of ['POPUP_READ', 'BANNER_READ']) {
      expect(catalog.permissions.find(row => row.code === code)?.defaultGroups, code).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
    }
  });
});
