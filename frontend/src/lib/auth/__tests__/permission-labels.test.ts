import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectionRemovedFiles } from '@/test-utils/projection';
import {
  OTHER_PERMISSION_CATEGORY,
  PERMISSION_DOMAIN_CATEGORIES,
  PERMISSION_MATRIX_COLUMNS,
  permissionActionLabel,
  permissionDomainCategory,
  permissionDomainLabel,
} from '../permission-labels';

/**
 * 권한 표의 분류·라벨은 화면 표현이지만, 카탈로그와 어긋나면 영역이 '기타'로 새거나 원시 코드가 보인다.
 * 정본 카탈로그(config/governance/permission-catalog.json)와 양방향으로 대조한다.
 */
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const readCatalog = (file: string) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as {
  permissions: Array<{ code: string; domain: string; action: string }>;
};
const domainsOf = (source: ReturnType<typeof readCatalog>) => [...new Set(source.permissions.map((permission) => permission.domain))];
const catalog = readCatalog('config/governance/permission-catalog.json');
const domains = domainsOf(catalog);
// 재사용 생성물은 카탈로그를 구성 코드로 줄이지만(DEC-OPS-287) 분류·라벨 표는 원본 그대로 남는다. 그래서 생성물에서는 표의 영역을
// 생성 때 남긴 원본 카탈로그 스냅숏과 대조한다(스냅숏이 없으면 읽기가 실패한다). 원본 저장소에는 투영 원장이 없어 지금 카탈로그와
// 대조한다 — 원본의 계약은 그대로다. 하한도 원본은 그대로이고, 생성물에서만 가장 작은 생성물(core 25개 영역)에서도 성립하는 값이다.
const projected = projectionRemovedFiles().size > 0;
const tableDomains = projected ? domainsOf(readCatalog('config/governance/upstream-review/permission-catalog.json')) : domains;
const actions = [...new Set(catalog.permissions.map((permission) => permission.action))];

describe('권한 영역 분류', () => {
  it('카탈로그를 실제로 읽었다(공허 통과 방지)', () => {
    expect(domains.length).toBeGreaterThanOrEqual(projected ? 20 : 50);
    expect(tableDomains.length).toBeGreaterThanOrEqual(50);
  });

  it('카탈로그의 모든 영역은 정확히 한 분류에 속한다 — 기타로 새지 않는다', () => {
    for (const domain of domains) {
      const owners = PERMISSION_DOMAIN_CATEGORIES.filter((category) => category.domains.includes(domain));
      expect(owners.map((category) => category.key), `${domain} 의 분류`).toHaveLength(1);
      expect(permissionDomainCategory(domain).key).not.toBe(OTHER_PERMISSION_CATEGORY.key);
    }
  });

  it('분류 표에는 카탈로그에 없는 영역도, 중복도 없다', () => {
    const listed = PERMISSION_DOMAIN_CATEGORIES.flatMap((category) => category.domains);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.filter((domain) => !tableDomains.includes(domain))).toEqual([]);
    expect(new Set(PERMISSION_DOMAIN_CATEGORIES.map((category) => category.key)).size).toBe(PERMISSION_DOMAIN_CATEGORIES.length);
  });

  it('표에 없는 영역은 기타다', () => {
    expect(permissionDomainCategory('UNKNOWN_DOMAIN')).toBe(OTHER_PERMISSION_CATEGORY);
  });
});

describe('권한 라벨', () => {
  it('카탈로그의 모든 영역·행위에 한국어 라벨이 있다 — 원시 코드로 물러나지 않는다', () => {
    expect(domains.filter((domain) => permissionDomainLabel(domain) === domain && domain !== 'FAQ')).toEqual([]);
    expect(actions.filter((action) => permissionActionLabel(action) === action)).toEqual([]);
    expect(permissionDomainLabel('FAQ')).toBe('FAQ');
  });

  it('새로 들어온 영역·행위의 라벨을 갖고, 퇴역한 네트워크 모니터링 라벨은 없다', () => {
    expect(permissionDomainLabel('DWORK')).toBe('후속 작업');
    expect(permissionDomainLabel('ADT_LOG')).toBe('민감 작업 감사');
    expect(permissionDomainLabel('MFA')).toBe('추가 인증');
    expect(permissionDomainLabel('NOTICE')).toBe('공지사항');
    expect(permissionActionLabel('EDIT')).toBe('편집');
    expect(permissionActionLabel('RETRY')).toBe('재처리');
    expect(permissionActionLabel('RECOVER')).toBe('복구');
    expect(permissionDomainLabel('NETWORK')).toBe('NETWORK');
  });

  it('표의 고정 열은 본인 자료와 타인 자료 행위를 나눈다', () => {
    expect(PERMISSION_MATRIX_COLUMNS.map((column) => column.action)).toEqual(['READ', 'CREATE', 'UPDATE', 'DELETE', 'READ_ALL', 'UPDATE_ALL', 'DELETE_ALL']);
    expect(PERMISSION_MATRIX_COLUMNS.every((column) => actions.includes(column.action))).toBe(true);
  });
});
