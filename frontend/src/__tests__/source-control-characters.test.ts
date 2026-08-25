import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(FRONTEND_DIR, '..');

/**
 * 소스에 눈에 보이지 않는 제어문자가 섞이지 않게 한다.
 *
 * [왜 필요한가 — 2026-08-25 실측]
 * 정규식 단어경계 `\b` 를 쓰려던 편집이 **실제 백스페이스 문자(U+0008)** 를 써서
 * `/<ReportPage␈/` 가 됐다. 이런 정규식은 어떤 입력에도 매치되지 않으므로 그 단언은
 * **영원히 통과하지 않거나(이번 경우) 영원히 통과하는 죽은 검사**가 된다. 더 나쁜 것은
 * 편집기·터미널·diff 가 그 문자를 지워서 보여줘 **코드가 정상으로 보인다**는 점이다.
 *
 * 같은 사고는 `\t`(탭)을 의도한 문자열, `\v`·`\f` 를 포함한 붙여넣기에서도 난다.
 * 사람이 읽어서 잡을 수 없는 결함이므로 기계가 막는다.
 *
 * 허용: 탭(U+0009)·개행(U+000A)·캐리지리턴(U+000D).
 */
const ALLOWED = new Set([0x09, 0x0a, 0x0d]);

/**
 * 의도적으로 제어문자를 쓰는 예외. **파일 단위 allowlist 가 아니라 이유를 적는 자리**다.
 * 새 항목을 넣으려면 "왜 이 문자가 데이터로서 필요한가"를 여기 남긴다.
 */
const INTENTIONAL: Record<string, string> = {
  // 코드 census 가 8줄 묶음을 해시할 때 쓰는 구분자. 소스에 나타날 수 없는 값이라야 안전하다.
  'scripts/code-census.mjs': 'U+0001 을 줄 묶음 구분자로 사용(중복 코드 탐지 해시 키)',
};

const SCAN_ROOTS = [
  join(FRONTEND_DIR, 'src'),
  join(FRONTEND_DIR, 'e2e'),
  join(REPO_DIR, 'scripts'),
];

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js', '.css'];
const SKIP_DIRECTORIES = new Set(['node_modules', '.next', 'test-results', 'playwright-report']);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) ? [] : sourceFiles(path);
    return SCAN_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
  });
}

function offendingLines(source: string): string[] {
  return source.split('\n').flatMap((line, index) => {
    const codes = [...line]
      .map((character) => character.charCodeAt(0))
      .filter((code) => code < 0x20 && !ALLOWED.has(code));
    if (codes.length === 0) return [];
    const hex = codes.map((code) => `U+${code.toString(16).padStart(4, '0').toUpperCase()}`).join(', ');
    return [`${index + 1}행: ${hex}`];
  });
}

describe('소스 제어문자 차단', () => {
  const findings = SCAN_ROOTS
    .flatMap((root) => sourceFiles(root))
    .map((path) => ({
      path: relative(REPO_DIR, path).split(sep).join('/'),
      lines: offendingLines(readFileSync(path, 'utf8')),
    }))
    .filter((entry) => entry.lines.length > 0);

  it('의도적으로 기록한 예외 밖에는 제어문자가 없다', () => {
    const unexpected = findings
      .filter((entry) => !(entry.path in INTENTIONAL))
      .map((entry) => `${entry.path} — ${entry.lines.join(' / ')}`);

    expect(
      unexpected,
      unexpected.length > 0
        ? '보이지 않는 제어문자가 섞였습니다. 정규식의 \\b·\\t 를 이스케이프 문자열이 아니라 실제 문자로 쓴 편집이 원인일 수 있습니다.'
        : '',
    ).toEqual([]);
  });

  it('예외 목록은 실제로 제어문자를 가진 파일만 담는다', () => {
    // 사유가 사라진 예외가 목록에 남아 있으면 다음 사람이 "여기는 원래 그래도 된다"고 읽는다.
    const stale = Object.keys(INTENTIONAL).filter(
      (path) => !findings.some((entry) => entry.path === path),
    );

    expect(stale, `사유가 없어진 예외: ${stale.join(', ')}`).toEqual([]);
  });
});
