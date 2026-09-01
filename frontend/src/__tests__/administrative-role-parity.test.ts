import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
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

/**
 * 한 소스가 **자기만의 관리자 역할 집합**을 정의하는가.
 *
 * 판정 기준은 "관리자 역할 리터럴이 하나의 배열/Set 리터럴 안에 둘 이상" 이다. 값 하나짜리
 * fixture 는 판정이 아니라 데이터이므로 걸리지 않는다.
 */
export function definesOwnAdministrativeRoleSet(source: string): boolean {
  /*
    수집한 리터럴이 **판정에 쓰이는가**를 함께 본다. msw 목 응답처럼 역할 값을 데이터로
    나르기만 하는 파일까지 잡으면 경로 예외 목록을 만들게 되고, 그 목록이 곧 서랍이 된다.
    판정의 표식은 role 을 대상으로 한 멤버십 검사다.
  */
  const membershipTest = /\.(?:has|includes)\s*\(\s*[^)]*role/i;
  if (!membershipTest.test(source)) return false;

  const ROLE_TOKEN = /'(?:ROLE_)?(?:ADMIN|SYSTEM)'/g;
  for (const literal of source.matchAll(/\[[^\][]*\]/g)) {
    const found = literal[0].match(ROLE_TOKEN);
    if (found && found.length >= 2) return true;
  }
  return false;
}

describe('자체 역할 집합 탐지기', () => {
  it('멤버십 검사에 쓰이는 자체 집합을 잡는다', () => {
    expect(definesOwnAdministrativeRoleSet(
      "const OWN = new Set(['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM']);"
      + " if (OWN.has(user.role)) return true;",
    )).toBe(true);
  });

  it('역할 값을 데이터로 나르기만 하는 목 응답은 잡지 않는다', () => {
    expect(definesOwnAdministrativeRoleSet(
      "const users = [{ id: 'a', role: 'ROLE_ADMIN' }, { id: 'b', role: 'ROLE_SYSTEM' }];",
    )).toBe(false);
  });

  it('값이 하나뿐인 집합은 판정 중복이 아니다', () => {
    expect(definesOwnAdministrativeRoleSet(
      "const ONLY = ['ADMIN']; if (ONLY.includes(user.role)) return true;",
    )).toBe(false);
  });
});

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

  /**
   * 한 파일만 지키면 다음 화면이 같은 실수를 반복한다.
   *
   * 실제로 그랬다 — 위 케이스가 BoardMasterListClient 만 보는 동안 KnowledgeHubClient·
   * BoardListClient·MemoReportManagementClient 세 곳이 리터럴 비교를 그대로 갖고 있었고,
   * 셋 다 SYSTEM 권한 관리자에게 기능이 사라지는 상태였다(2026-08-28 실측).
   *
   * 그래서 검사를 **전역 금지**로 넓힌다. 예외 목록은 두지 않는다 — 목록을 만들면 그 목록이
   * 곧 서랍이 되고, 다음 위반은 목록에 한 줄 더하는 것으로 통과한다(H2 와 같은 방향의 왜곡).
   */
  it('어느 화면도 role 을 리터럴로 비교하지 않는다 — 판정은 SSOT 한 곳뿐이다', () => {
    const violations: string[] = [];
    let scanned = 0;

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        // 판정 SSOT 자신과 라우트 게이트는 값 집합을 정의하는 곳이라 제외한다.
        if (full.endsWith(join('lib', 'auth', 'administrative-role.ts'))) continue;
        if (full.endsWith(join('src', 'proxy.ts'))) continue;

        scanned += 1;
        // ⚠ [2026-08-31] 줄 주석(콜론 가드) → 블록 주석 순서로 지운다. 종전에는 블록을 먼저
        //   지우고 `//` 를 무가드로 지워서, 줄 주석 속 블록 여는 기호가 코드를 삼키거나
        //   URL 의 `//` 뒤를 먹는 두 결함(형제 계약들이 실측 기록)을 그대로 갖고 있었다.
        const source = readFileSync(full, 'utf8')
          .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
          .replace(/\/\*[\s\S]*?\*\//g, ' ');
        if (/\brole\s*===\s*'[A-Za-z_]+'/.test(source)) {
          violations.push(full.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
          continue;
        }
        /*
          [2026-08-29] 리터럴 === 비교만 보면 **자체 집합을 만든 화면을 놓친다.**

          BoardDetailClient 가 정확히 그랬다 — 관리자 역할 4종을 담은 Set 을 따로 두고
          원문으로 비교했다. 값은 같았지만 SSOT·proxy 가 흡수하는 대소문자를 흡수하지
          않아, 서버 표기가 흔들리면 **라우트는 열어 주는데 화면에서만 기능이 사라진다**
          (DEC-OPS-023 ② 가 기록한 조용히 죽는 결함과 같은 방향).

          그래서 "관리자 역할 리터럴을 둘 이상 모아 둔 컬렉션" 자체를 금지한다. 값 하나를
          가진 fixture(role: 'ROLE_ADMIN' 같은 목 응답)는 판정이 아니므로 대상이 아니다.
        */
        if (definesOwnAdministrativeRoleSet(source)) {
          violations.push(full.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
        }
      }
    };
    walk(SRC_DIR);

    // 스캔이 0건이면 게이트가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
    expect(scanned).toBeGreaterThan(100);
    expect(violations).toEqual([]);
  });
});
