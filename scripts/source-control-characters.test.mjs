import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/*
 * 저장소 scripts/ 소스에 눈에 보이지 않는 제어문자가 섞이지 않게 한다.
 *
 * 규칙과 이유는 프런트 시험(frontend/src/__tests__/source-control-characters.test.ts)과 같다 — 정규식 단어경계 `\b` 를
 * 이스케이프가 아니라 실제 백스페이스 문자(U+0008)로 쓴 편집은 어떤 입력에도 맞지 않는 죽은 검사를 만들고, 편집기·diff 가
 * 그 문자를 지워 보여 사람이 잡을 수 없다(2026-08-25 실측). 허용은 탭·개행·캐리지리턴뿐이다.
 *
 * 종전에는 그 프런트 시험이 scripts/ 도 읽었다. 그 시험은 frontend 축에서만 돌아 생성기 스크립트만 바꾼 변경도 frontend
 * 전체를 다시 돌려야 했고, 백엔드만 바꾼 변경에서는 scripts/ 가 검사되지 않았다. scripts/ 범위를 늘 도는 운영 계약으로 옮긴다
 * (11단계 C11) — 이제 모든 변경에서 돈다.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOT = 'scripts';
const ALLOWED = new Set([0x09, 0x0a, 0x0d]);
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js', '.css'];
const SKIP_DIRECTORIES = new Set(['node_modules']);

/**
 * 의도적으로 제어문자를 쓰는 예외. **파일 단위 allowlist 가 아니라 이유를 적는 자리**다.
 * 새 항목을 넣으려면 "왜 이 문자가 데이터로서 필요한가"를 여기 남긴다.
 */
const INTENTIONAL = {
  // 코드 census 가 8줄 묶음을 해시할 때 쓰는 구분자. 소스에 나타날 수 없는 값이라야 안전하다.
  'scripts/code-census.mjs': 'U+0001 을 줄 묶음 구분자로 사용(중복 코드 탐지 해시 키)',
};

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) ? [] : sourceFiles(file);
    return SCAN_EXTENSIONS.some(extension => entry.name.endsWith(extension)) ? [file] : [];
  });
}

function offendingLines(source) {
  return source.split('\n').flatMap((line, index) => {
    const codes = [...line].map(character => character.charCodeAt(0)).filter(code => code < 0x20 && !ALLOWED.has(code));
    if (codes.length === 0) return [];
    return [`${index + 1}행: ${codes.map(code => `U+${code.toString(16).padStart(4, '0').toUpperCase()}`).join(', ')}`];
  });
}

const files = sourceFiles(path.join(repoRoot, SCAN_ROOT));
const findings = files
  .map(file => ({ path: path.relative(repoRoot, file).split(path.sep).join('/'), lines: offendingLines(readFileSync(file, 'utf8')) }))
  .filter(entry => entry.lines.length > 0);

test('scripts 소스에는 기록한 예외 밖의 제어문자가 없다', () => {
  // 2026-10-13 실측 255개. 열거가 깨져 모집단이 사라지면 아무것도 보지 않고 녹색이 된다.
  assert.ok(files.length >= 200, `scripts/ 에서 읽은 소스가 ${files.length}개뿐이다 — 열거가 깨졌다`);
  const unexpected = findings.filter(entry => !(entry.path in INTENTIONAL)).map(entry => `${entry.path} — ${entry.lines.join(' / ')}`);
  assert.deepEqual(unexpected, [],
    '보이지 않는 제어문자가 섞였습니다. 정규식의 \\b·\\t 를 이스케이프 문자열이 아니라 실제 문자로 쓴 편집이 원인일 수 있습니다.');
});

test('예외 목록은 실제로 제어문자를 가진 파일만 담는다', () => {
  // 사유가 사라진 예외가 목록에 남아 있으면 다음 사람이 "여기는 원래 그래도 된다"고 읽는다.
  const stale = Object.keys(INTENTIONAL).filter(file => !findings.some(entry => entry.path === file));
  assert.deepEqual(stale, [], `사유가 없어진 예외: ${stale.join(', ')}`);
});

test('판정은 탭·개행·캐리지리턴만 허용하고 그 밖의 제어문자를 줄 번호와 함께 보고한다', () => {
  assert.deepEqual(offendingLines('a\tb\r\nc'), []);
  assert.deepEqual(offendingLines(`ok\n/<Report${String.fromCharCode(8)}/\nx${String.fromCharCode(0x0b)}`), ['2행: U+0008', '3행: U+000B']);
});
