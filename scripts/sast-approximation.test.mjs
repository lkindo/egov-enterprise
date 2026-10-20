/**
 * CodeQL 근사(scripts/sast-approximation.mjs)의 판정을 고정한다. 붉은 예는 CI CodeQL 이 실제로 막았던 모양(커밋 566ab9140·69082c7d1·
 * 08f021bc6·a20a35224·5921e47a4·772d10254·387ec3f02·5ec9e1abf·2b2533584·f20af4eb4·0be6062e7 의 직전 판본)을 줄인 것이고, 초록 예는
 * 같은 커밋의 고친 판본과 main 에서 CodeQL 이 통과시키는 모양이다. 위반 코드는 모두 문자열이다 — 이 파일도 CodeQL 이 분석한다.
 * 근사가 현재 트리에서 0건인지는 pre-push·`npm run verify` 가 보고, CI 의 권위는 CodeQL 자체다.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  APPROXIMATED_RULES, approximationFiles, codeqlPaths, formatFinding, hasExponentialBacktracking, inspectSource, selectedFiles,
} from './sast-approximation.mjs';

const rules = (code, file = 'scripts/synthetic.mjs') => inspectSource(file, code).map(({ rule }) => rule);
const messages = (code, file = 'scripts/synthetic.mjs') => inspectSource(file, code).map(formatFinding);

test('the approximation reads the CodeQL JavaScript paths and leaves files CodeQL does not scan alone', () => {
  const paths = codeqlPaths();
  for (const expected of ['scripts', 'frontend/src', '.agent/scripts']) assert.ok(paths.includes(expected), expected);
  const files = approximationFiles();
  assert.ok(files.includes('scripts/restore-drill.mjs'));
  assert.ok(files.includes('scripts/sast-approximation.mjs'));
  assert.ok(files.some((file) => file.startsWith('frontend/src/') && file.endsWith('.tsx')));
  assert.ok(!files.some((file) => file.startsWith('tools/') || file.includes('/node_modules/') || file.endsWith('.d.ts')),
    'CodeQL 이 보지 않는 파일을 근사가 따로 막지 않는다');
  // pre-push 는 push 가 바꾼 파일만 넘긴다 — 모집단 밖·지운 파일은 거르고, 목록이 비면(범위를 모른다) 전체를 본다.
  assert.deepEqual(selectedFiles(['scripts/restore-drill.mjs', 'docs/README.md', 'tools/project-composer/ui.test.mjs', 'scripts/deleted.mjs', ''], files),
    ['scripts/restore-drill.mjs']);
  assert.equal(selectedFiles(['', '  '], files), files);
  // paths 를 읽지 못하면 조용히 빈 모집단으로 통과하지 않는다.
  const root = mkdtempSync(path.join(tmpdir(), 'sast-approximation-'));
  try {
    mkdirSync(path.join(root, 'config/security'), { recursive: true });
    writeFileSync(path.join(root, 'config/security/codeql.yml'), 'name: x\nqueries:\n  - uses: security-extended\n');
    assert.throws(() => codeqlPaths(root), /paths 목록이 없다/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.deepEqual(APPROXIMATED_RULES, ['js/file-system-race', 'js/incomplete-sanitization', 'js/redos']);
});

test('js/file-system-race: a checked path that is opened again is red in the shapes CodeQL blocked', () => {
  const header = "import fs, { existsSync, lstatSync, readFileSync, statSync, writeFileSync } from 'node:fs';\n";
  const red = {
    // 387ec3f02 직전 — lstat 으로 확인하고 throw 로 빠진 뒤 같은 경로를 다시 읽었다.
    lstatThenRead: `${header}function check(directory) {\n  const checksumPath = join(directory, 'sha256.txt');\n`
      + "  if (!lstatSync(checksumPath, { throwIfNoEntry: false })?.isFile()) throw new Error('missing');\n"
      + "  return readFileSync(checksumPath, 'utf8');\n}\n",
    // 69082c7d1·a20a35224·5ec9e1abf 직전 — 있는지 확인한 뒤 같은 경로에 썼다.
    existsThenWrite: `${header}function write(manifestFile, rendered) {\n  const text = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : undefined;\n`
      + "  fs.writeFileSync(manifestFile, rendered, 'utf8');\n  return text;\n}\n",
    // 772d10254 직전 — && 오른쪽의 stat 이 고른 갈래에서 읽었다.
    statGuardRead: `${header}for (const file of files) {\n  const path = join(root, file);\n`
      + '  if (existsSync(path) && statSync(path).isFile()) hash.update(readFileSync(path));\n}\n',
    // 566ab9140 직전 — || 의 오른쪽 stat 이 거짓일 때만 오는 else 에서 읽었다.
    statElseRead: `${header}function drift(path) {\n  if (!existsSync(path) || !statSync(path).isFile()) return 'missing';\n`
      + "  else if (readFileSync(path, 'utf8') !== expected) return 'stale';\n}\n",
    // || 오른쪽의 stat 을 지나야만 오는 자리 — 참 갈래가 throw 로 빠지면 그 뒤는 stat 이 거짓으로 끝난 자리다.
    statExitRead: `${header}function load(path) {\n  if (!existsSync(path) || !statSync(path).isFile()) throw new Error('missing');\n`
      + "  return readFileSync(path, 'utf8');\n}\n",
    // 5921e47a4 직전 — 크기를 본 뒤 같은 경로를 다시 열었다.
    sizeThenRead: `${header}function readReport(path) {\n  try {\n    if (statSync(path).size > LIMIT) return null;\n`
      + "    return JSON.parse(readFileSync(path, 'utf8'));\n  } catch { return null; }\n}\n",
    // 확인 콜백 안에서 같은 경로를 쓴다. require·promises 형태도 같다.
    callback: "const fs = require('fs');\nfs.stat(target, (error, info) => { fs.readFile(target, () => {}); });\n",
    promises: "import { promises as fsp } from 'node:fs';\nasync function f(p) { await fsp.stat(p); return fsp.writeFile(p, 'x'); }\n",
  };
  for (const [name, code] of Object.entries(red)) {
    assert.deepEqual(rules(code), ['js/file-system-race'], name);
  }
  assert.match(messages(red.lstatThenRead)[0],
    /^scripts\/synthetic\.mjs:5: \[js\/file-system-race 근사\] lstatSync\(checksumPath\) 로 확인한 뒤\(4줄\) 같은 경로를 readFileSync 로 다시 엽니다 — /u);
  assert.match(messages(red.existsThenWrite)[0], /existsSync\(manifestFile\) 로 확인한 뒤\(3줄\) 같은 경로를 writeFileSync 로 다시 엽니다/u);
});

test('js/file-system-race: the fixed shapes and the shapes CodeQL passes on main are not red', () => {
  const header = "import { closeSync, existsSync, fstatSync, lstatSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';\n";
  const green = {
    // 387ec3f02 — 열고 fstat 한 기술자로만 읽는다.
    descriptor: `${header}function open(file) {\n  const fd = openSync(file, 'r');\n  const stat = fstatSync(fd);\n`
      + '  const link = lstatSync(file, { throwIfNoEntry: false });\n  if (!stat.isFile() || !link) { closeSync(fd); return null; }\n'
      + "  return readFileSync(fd, 'utf8');\n}\n",
    // 566ab9140 — 확인하지 않고 읽기를 시도한다.
    tryRead: `${header}function read(path) {\n  try { return readFileSync(path, 'utf8'); } catch (error) {\n`
      + "    if (error?.code === 'ENOENT') return undefined;\n    throw error;\n  }\n}\n",
    // 있는지만 묻고 읽는 것은 CodeQL 이 막지 않는다(예외로 끝날 뿐이다).
    existsThenRead: `${header}const text = existsSync(gitLog) ? readFileSync(gitLog, 'utf8') : '';\n`,
    // 지우기는 사용으로 보지 않는다.
    existsThenRemove: `${header}if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });\n`,
    // 확인과 사용이 다른 함수에 있다(근사는 함수 안만 본다).
    otherFunction: `${header}function has(p) { return statSync(p).isFile(); }\nfunction load(p) { return readFileSync(p, 'utf8'); }\n`,
    // 확인이 사용 앞의 다른 갈래에만 있다.
    sideBranch: `${header}function f(p, verbose) {\n  if (verbose) console.log(statSync(p).size);\n  return readFileSync(p, 'utf8');\n}\n`,
    // || 오른쪽의 stat 이 고른 갈래가 빠져나가지 않는다(fail() 은 끝나지 않을 수 있다) — 그 뒤는 stat 을 건너뛴 길로도 온다.
    statNoExit: `${header}function load(path) {\n  if (!existsSync(path) || !statSync(path).isFile()) fail('missing');\n`
      + "  return readFileSync(path, 'utf8');\n}\n",
    // 다른 경로다.
    otherPath: `${header}if (statSync(source).isFile()) writeFileSync(target, 'x');\n`,
  };
  for (const [name, code] of Object.entries(green)) assert.deepEqual(rules(code), [], name);
});

test('js/incomplete-sanitization: escaping that skips backslash or replaces only the first metacharacter is red', () => {
  const red = [
    // 5ec9e1abf 직전
    "const pattern = new RegExp(`binding ${binding.path.replace(/[{}]/gu, '\\\\$&')} needs`, 'u');",
    // 2b2533584·f20af4eb4 직전
    "const name = type.replace(/[$]/gu, '\\\\$');",
    "const escaped = local.replace(/\\$/gu, '\\\\$');",
    // 메타 문자 하나를 전역 플래그 없이 바꾼다.
    "const normalized = file.replace('\\\\', '/');",
    "const quoted = value.replace(/'/, \"\\\\'\");",
  ];
  for (const code of red) assert.deepEqual(rules(code), ['js/incomplete-sanitization'], code);
  assert.match(messages(red[0])[0], /\/\[\{\}\]\/gu 를 이스케이프하면서 백슬래시는 이스케이프하지 않습니다/u);
  assert.match(messages(red[3])[0], /'\\\\' 의 첫 번째만 바꿉니다/u);
  const green = [
    "const name = port.replace(/[.*+?^${}()|[\\]\\\\]/gu, '\\\\$&');",
    "const normalized = file.replace(/\\\\/g, '/');",
    "const normalized = file.replaceAll('\\\\', '/');",
    "const json = value.replace(/\\\\/g, '\\\\\\\\').replace(/\"/g, '\\\\\"');",
    "const text = value.replace('ab', 'c');",
    "const lines = text.replace(/\\r\\n/g, '\\n');",
  ];
  for (const code of green) assert.deepEqual(rules(code), [], code);
});

test('js/redos: repetition that reads the same text two ways is red, and the fixed or bounded shapes are not', () => {
  const exponential = [
    // 0be6062e7 직전(조건부 등록 탐지)
    String.raw`^\s*\{?\s*(?:test|it|describe|suite|specify)\s*(?:\.\s*(?:describe|each|concurrent|sequential)\s*(?:\([^()]*\))?\s*)*\(`,
    // f20af4eb4 직전(다음 메서드 선언 찾기)
    String.raw`\n\s*(?:@\w+[^\n]*\n\s*)*(?:public|private|protected)\s[^;=\n]*\(`,
    String.raw`^(a+)+$`, String.raw`(a|a)*b`, String.raw`(\w+\s?)*$`, String.raw`(a*)*b`,
  ];
  for (const pattern of exponential) assert.equal(hasExponentialBacktracking(pattern, 'u'), true, pattern);
  const linear = [
    // 0be6062e7 의 고친 판본 — 각 반복이 '.' 로 시작한다.
    String.raw`^\s*(?:\{\s*)?(?:test|it|describe|suite|specify)(?:\s*\.\s*(?:describe|each|concurrent|sequential)(?:\s*\([^()]*\))?)*\s*\(`,
    String.raw`a*a*b`, String.raw`(ab|a)*c`, String.raw`^(?:a|b)+$`, String.raw`(a?)*b`,
    // main 에서 CodeQL 이 통과시키는 모양 — 횟수 지정 반복의 꼬리, 패턴 끝의 반복(거부시킬 뒷부분이 없다).
    String.raw`(?: {12}.+\n)+x`, String.raw`- name: x\n(?: {8,}.*\n)* {10}uses`, String.raw`^\s*(?:(?:\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)\s*)+`,
    '[.*+?^${}()|[\\]\\\\]',
  ];
  for (const pattern of linear) assert.equal(hasExponentialBacktracking(pattern, 'u'), false, pattern);
  // 소스 안의 정규식 리터럴과 문자열로 만든 RegExp 를 모두 본다.
  const literal = `const CALL = /${exponential[0]}/;\n`;
  assert.deepEqual(rules(literal), ['js/redos']);
  assert.match(messages(literal)[0], /^scripts\/synthetic\.mjs:1: \[js\/redos 근사\] .* 는 같은 글자열을 두 갈래로 읽으며 반복합니다\(지수 역추적\)/u);
  assert.deepEqual(rules("const built = new RegExp('^(a+)+$');\n"), ['js/redos']);
  assert.deepEqual(rules(`const CALL = /${linear[0]}/;\n`), []);
});
