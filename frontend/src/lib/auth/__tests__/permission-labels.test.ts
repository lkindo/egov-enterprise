import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'config/governance/permission-catalog.json'), 'utf8')) as {
  permissions: Array<{ code: string; domain: string; action: string }>;
};
const domains = [...new Set(catalog.permissions.map((permission) => permission.domain))];
const actions = [...new Set(catalog.permissions.map((permission) => permission.action))];

describe('권한 영역 분류', () => {
  it('카탈로그를 실제로 읽었다(공허 통과 방지)', () => {
    expect(domains.length).toBeGreaterThanOrEqual(50);
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
    expect(listed.filter((domain) => !domains.includes(domain))).toEqual([]);
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
