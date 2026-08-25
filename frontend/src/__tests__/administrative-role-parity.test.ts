import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMINISTRATIVE_ROLES, isAdministrativeRole } from '@/lib/auth/administrative-role';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 화면의 관리자 표시 판정과 라우트 게이트의 판정이 **같은 값 집합**인지 고정한다.
 *
 * 두 축이 어긋나면 조용히 죽는 결함이 된다 — proxy 는 /admin 을 열어주는데 화면은 액션을
 * 숨겨서, 권한 있는 사용자에게 기능이 "없는 것"이 된다. 2026-08-25 실측으로 게시판 마스터의
 * 생성 마법사가 정확히 이 방식으로 사라졌고(role 은 authority id 라 `ROLE_ADMIN`),
 * 하단 마케팅 배너가 같은 동작을 중복 제공하던 동안 가려져 있었다.
 */
function proxyAdminRoles(): string[] {
  const proxy = readFileSync(join(SRC_DIR, 'proxy.ts'), 'utf8');
  const gate = proxy.slice(proxy.indexOf('const isAdmin ='));
  const block = gate.slice(0, gate.indexOf(';'));
  return [...block.matchAll(/normalizedRole === '([A-Z_]+)'/g)].map((match) => match[1]).sort();
}

describe('관리자 판정 parity', () => {
  it('클라이언트 표시 판정이 라우트 게이트와 같은 역할 집합을 쓴다', () => {
    expect(proxyAdminRoles()).toEqual([...ADMINISTRATIVE_ROLES].sort());
  });

  it('authority id 형태(ROLE_ADMIN)와 대소문자 흔들림을 모두 인정한다', () => {
    expect(isAdministrativeRole('ROLE_ADMIN')).toBe(true);
    expect(isAdministrativeRole('ADMIN')).toBe(true);
    expect(isAdministrativeRole('role_system')).toBe(true);
    expect(isAdministrativeRole('USER')).toBe(false);
    expect(isAdministrativeRole(undefined)).toBe(false);
  });

  it('관리자 전용 화면 액션이 단일 리터럴 비교로 되돌아가지 않는다', () => {
    // 되돌아가면 e2e 가 잡기 전까지 "관리자에게 버튼이 없다"가 정상처럼 보인다.
    const client = readFileSync(
      join(SRC_DIR, 'app/admin/community/boards/master/BoardMasterListClient.tsx'),
      'utf8',
    );
    expect(client).toContain('isAdministrativeRole(user?.role)');
    expect(client).not.toMatch(/user\?\.role === '[A-Z_]+'/);
  });
});
