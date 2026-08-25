import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * 페이지 헤더 단일 소유 게이트.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3 G1(골격 순서) · §5 A1.
 *
 * [무엇이 문제였나 — 2026-08-26 실측]
 * 7개 화면이 `PageHeader`(제목·브레드크럼) **아래에** `HubHeader`(영문 혼용 히어로 + 마케팅
 * 문구)를 한 번 더 두고 있었다. 사용자가 보는 결과는 한 화면에 제목이 두 겹이고, 그 사이에
 * "전사 인적 자원 … 컨트롤 센터" 같은 문구가 세로 공간을 먹는 것이다. 더 나쁜 것은
 * **주요 액션이 두 번째 헤더에 붙어 있었다**는 점이라, 첫 번째 헤더만 보면 그 화면에서 무엇을
 * 할 수 있는지 알 수 없었다.
 *
 * 한 화면의 페이지 헤더는 하나이며, 그 하나가 제목·브레드크럼·주요 액션을 소유한다.
 *
 * ⚠ `HubHeader` 자체를 금지하는 게 아니다. `PageHeader` 없이 단독으로 쓰는 화면은 그대로 둔다
 *   — 아래 허용 목록은 **둘을 동시에** 쓰는 화면만 담는다.
 */
const ALLOWED_DUPLICATES: Record<string, string> = {
  // next.config 리다이렉트로 도달 불가한 화면이라 사용자에게 보이는 변화가 없다(DEC-OPS-023).
  'src/app/admin/system/audit/AuditTimelineClient.tsx':
    '도달 불가(리다이렉트) 화면 — 이행 대상이 아니다',
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx':
    '도달 불가(리다이렉트) alias — 이행 대상이 아니다',
};

function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

function duplicates(): string[] {
  return screenFiles(APP_DIR)
    .filter((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes('<PageHeader') && source.includes('<HubHeader');
    })
    .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
    .sort();
}

describe('페이지 헤더 단일 소유', () => {
  it('한 화면이 페이지 헤더를 두 겹으로 두지 않는다', () => {
    const unexpected = duplicates().filter((path) => !(path in ALLOWED_DUPLICATES));

    expect(
      unexpected,
      `헤더가 두 겹입니다:\n${unexpected.join('\n')}\n`
        + 'HubHeader 를 걷고 주요 액션을 PageHeader 의 actions 로 옮기세요.',
    ).toEqual([]);
  });

  it('허용 목록에 사유가 사라진 항목이 남아 있지 않다', () => {
    const current = new Set(duplicates());
    const stale = Object.keys(ALLOWED_DUPLICATES).filter((path) => !current.has(path));

    expect(stale, `사유가 없어진 예외: ${stale.join(', ')}`).toEqual([]);
  });
});
