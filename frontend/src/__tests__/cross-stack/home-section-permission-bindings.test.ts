// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, keepInProjection, missingOutsideLedger } from '@/test-utils/projection';
import { HOME_SECTION_PERMISSIONS } from './home-section-permissions';

/**
 * [Phase 2 9단계 H3] 업무 홈 조각의 노출 술어가 그 조각이 부르는 사용자 API 의 **서버 권한**과 같은지 본다 — 서버 쪽 대조.
 *
 * 술어 권한의 기대값은 home-section-permissions.ts 한 벌이다. 기능 디렉터리의 노출 시험이 기여의 `visibleWhen` 을 그 값과
 * 비교하고, 여기서는 서버 인가 원장(operation-bindings)의 그 API 바인딩과 권한 원장의 기본 그룹을 비교한다. 서버 바인딩만
 * 바꾸는 백엔드-only PR 에서도 돌아야 하므로 cross-stack 에 둔다(FE-CONTRACT-02).
 *
 * 노출일 뿐 인가가 아니다 — API 는 서버가 같은 권한으로 막는다(H3). 기여 파일이 투영에 남아 있을 때만(그 기능을 고른 구성) 그 조각의
 * 대조를 등록한다. 기능이 빠진 생성물에서는 원장도 그 API 바인딩을 걷는다.
 */
const BINDINGS = 'business-core/src/main/resources/authorization/operation-bindings.json';
const CATALOG = 'config/governance/permission-catalog.json';
const DEFAULT_GROUPS = ['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER'];

const FEATURES = Object.values(HOME_SECTION_PERMISSIONS);
const repoFile = (file: string) => path.join(REPO_ROOT, file);
const read = (file: string) => JSON.parse(readFileSync(repoFile(file), 'utf8'));

describe('업무 홈 조각 술어 ↔ 서버 권한 바인딩', () => {
  it('결속한 기여·원장 파일은 남아 있거나 투영으로 빠졌다', () => {
    expect(missingOutsideLedger([...FEATURES.map((feature) => feature.contribution), BINDINGS, CATALOG].map(repoFile))).toEqual([]);
  });

  for (const feature of keepInProjection(FEATURES, (entry) => repoFile(entry.contribution))) {
    it(`${feature.label} — 술어는 조각이 부르는 사용자 API 의 권한이고, 기본 그룹 셋이 모두 그 권한을 가진다`, () => {
      const bindings = read(BINDINGS) as Array<{ method: string; path: string; permission?: string }>;
      const permissionOf = (route: string) => bindings.find((row) => row.method === 'GET' && row.path === route)?.permission;
      expect(feature.sections.map(({ id, route }) => [id, permissionOf(route)]))
        .toEqual(feature.sections.map(({ id, permission }) => [id, permission]));

      const catalog = read(CATALOG) as { permissions: Array<{ code: string; defaultGroups: string[] }> };
      // 기본 그룹은 모두 이 권한을 가져 화면이 바뀌지 않는다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
      for (const code of new Set(feature.sections.map(({ permission }) => permission))) {
        expect(catalog.permissions.find((row) => row.code === code)?.defaultGroups, code).toEqual(DEFAULT_GROUPS);
      }
    });
  }
});
