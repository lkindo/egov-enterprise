import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const ACTION_SOURCE_DIRECTORY = new URL('../frontend/src/app/actions/', import.meta.url);
const ACTION_SOURCES = readdirSync(ACTION_SOURCE_DIRECTORY, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => `frontend/src/app/actions/${entry.name}`)
  .sort();

const VALIDATION_SOURCE_DIRECTORY = new URL('../frontend/src/lib/validations/', import.meta.url);
const VALIDATION_SOURCES = readdirSync(VALIDATION_SOURCE_DIRECTORY, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
  .map((entry) => `frontend/src/lib/validations/${entry.name}`)
  .sort();

const HARDENED_SOURCES = [...new Set([
  ...ACTION_SOURCES,
  ...VALIDATION_SOURCES,
  'frontend/src/app/actions/boardActions.ts',
  'frontend/src/app/error.tsx',
  'frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx',
  'frontend/src/app/admin/error.tsx',
  'frontend/src/app/admin/operation/external-hr/page.tsx',
  'frontend/src/app/admin/operation/rewards/page.tsx',
  'frontend/src/app/admin/stats/page.tsx',
  'frontend/src/app/admin/system/banner/page.tsx',
  'frontend/src/app/admin/system/common-code/page.tsx',
  'frontend/src/app/admin/system/menus/by-authority/page.tsx',
  'frontend/src/app/admin/system/menus/page.tsx',
  'frontend/src/app/admin/system/policies/PolicyAdminClient.tsx',
  'frontend/src/app/admin/system/programs/page.tsx',
  'frontend/src/app/admin/user/UserOrgHubClient.tsx',
  'frontend/src/app/admin/user/absences/page.tsx',
  'frontend/src/app/admin/user/departments/page.tsx',
  'frontend/src/app/admin/user/indvdl-info-policy/page.tsx',
  'frontend/src/app/admin/user/login-policy/page.tsx',
  'frontend/src/app/admin/user/manage/page.tsx',
  'frontend/src/app/admin/uss/ion/sms/page.tsx',
  'frontend/src/app/admin/uss/olh/online-manual/page.tsx',
  'frontend/src/app/help/policies/[type]/page.tsx',
  'frontend/src/app/api/auth/login/route.ts',
  'frontend/src/app/api/auth/logout/route.ts',
  'frontend/src/app/api/auth/reissue/route.ts',
  'frontend/src/app/components/layout/NavItem.tsx',
  'frontend/src/app/components/ui/global-command-center.tsx',
  'frontend/src/app/components/ui/standard-error-boundary.tsx',
  'frontend/src/app/smart-toolkit/schedule/dept/ScheduleDeptClient.tsx',
  'frontend/src/app/login/LoginClient.tsx',
  'frontend/src/contexts/AuthContext.tsx',
  'frontend/src/contexts/websocket-context.tsx',
  'frontend/src/lib/api/menu-loader.ts',
  'frontend/src/lib/hooks/use-notifications.ts',
  'frontend/src/services/business/user/MenuService.ts',
])];

const CONSOLE_CALL = /\bconsole\s*\.\s*(?:error|warn|log|info|debug)\s*\(/u;

function consoleCallLines(source) {
  return source
    .split(/\r?\n/u)
    .flatMap((line, index) => (CONSOLE_CALL.test(line) ? [index + 1] : []));
}

test('server actions and hardened authenticated sources do not send errors or payloads to console', () => {
  const offenders = [];
  for (const source of HARDENED_SOURCES) {
    const content = readFileSync(new URL(`../${source}`, import.meta.url), 'utf8');
    const lines = consoleCallLines(content);
    if (lines.length > 0) offenders.push(`${source}:${lines.join(',')}`);
  }

  assert.deepEqual(offenders, []);
});

test('a raw Axios-style error console payload is a reproducible red', () => {
  const unsafeFixture = [
    'try { await request(config); }',
    'catch (error) {',
    "  console.error('request failed', error);",
    '}',
  ].join('\n');

  assert.deepEqual(consoleCallLines(unsafeFixture), [3]);
  assert.deepEqual(consoleCallLines("console.error('Validation Errors:', errors);"), [1]);
  assert.deepEqual(consoleCallLines('catch { return null; }'), []);
});

test('new top-level server action sources are discovered without an allow-list update', () => {
  assert.ok(ACTION_SOURCES.includes('frontend/src/app/actions/actionUtils.ts'));
  assert.ok(ACTION_SOURCES.includes('frontend/src/app/actions/userActions.ts'));
  assert.equal(
    ACTION_SOURCES.length,
    readdirSync(ACTION_SOURCE_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .length,
  );
});

test('validation production sources are discovered and the boundary anchor cannot disappear', () => {
  assert.ok(VALIDATION_SOURCES.includes('frontend/src/lib/validations/common.ts'));
  assert.equal(
    VALIDATION_SOURCES.length,
    readdirSync(VALIDATION_SOURCE_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
      .length,
  );
});

/*
  [2026-09-04] `no-console` 규칙 자체의 회귀 방지 계약.

  b0c487b55 가 `frontend/eslint.config.mjs` 에 `no-console` 을 신설했지만 **그 규칙을 지키는
  계약이 없었다**. 집행이 `--max-warnings` 캡 하나에 의존했는데 그 캡의 방향은 `maximum` 이라
  값이 **줄어드는** 것은 계약상 안전하다 — 즉 누가 규칙을 지우면 경고 수가 줄어 캡을 통과하고
  어떤 게이트도 red 가 되지 않았다. 규칙이 잡으려던 결함(동작 대신 로그만 남기는 컨트롤)과
  같은 방향의 은폐 경로를 규칙 자신이 갖고 있었던 셈이다.
  AGENTS.md 는 "규칙·게이트 변경은 관련 문서와 회귀 방지 계약을 같은 변경 세트로 갱신한다"
  고 요구한다 — 그 빠진 절반을 여기서 채운다.

  왜 거버넌스 registry 의 `eslint-rule-severity` ratchet 이 아닌가:
  그 selector 는 `"rule": "warn"` 형태의 **severity 만** 읽는다. 그러면
  `allow: ["warn","error","log"]` 로 넓혀 규칙을 무력화하거나 `files` 스코프를 바꿔도 통과한다.
  이 파일은 이미 console 정책을 소유하고 `scripts/*.test.mjs` 글롭으로 required `secret-scan`
  에 결속돼 있으므로, 세 축(존재·허용목록·스코프)을 한 번에 고정한다.
*/
const ESLINT_CONFIG = readFileSync(new URL('../frontend/eslint.config.mjs', import.meta.url), 'utf8');

/** 규칙 선언 블록. 공백만 다르게 써도 아래 단언이 걸리도록 정규식으로 잡는다. */
const NO_CONSOLE_BLOCK = ESLINT_CONFIG.match(
  /files:\s*\[([^\]]*)\][\s\S]{0,200}?ignores:\s*\[([^\]]*)\][\s\S]{0,200}?"no-console":\s*\[\s*"([^"]+)"\s*,\s*\{\s*allow:\s*\[([^\]]*)\]\s*\}\s*\]/u,
);

test('no-console 규칙이 존재하고 severity·허용목록이 동결돼 있다', () => {
  assert.ok(NO_CONSOLE_BLOCK, 'no-console 규칙 선언을 찾지 못했습니다 — 삭제되었거나 형태가 바뀌었습니다.');

  const [, , , severity, allowRaw] = NO_CONSOLE_BLOCK;
  const allow = allowRaw.split(',').map((entry) => entry.trim().replace(/^"|"$/gu, '')).filter(Boolean);

  assert.equal(severity, 'warn');
  // console.error/warn 은 진단이라 남긴다 — 특히 CSP 위반 리포트의 현재 유일한 sink
  // (frontend/src/app/api/security/csp/route.ts)와 proxy 의 서버 경고가 여기 해당한다.
  // `log` 를 허용목록에 넣으면 규칙이 잡으려던 바로 그 결함이 통과한다.
  assert.deepEqual(allow, ['warn', 'error']);
});

test('no-console 스코프가 src 배포물로 고정돼 있다 — e2e 로 넓히면 캡이 무너진다', () => {
  assert.ok(NO_CONSOLE_BLOCK);
  const [, filesRaw, ignoresRaw] = NO_CONSOLE_BLOCK;
  const parse = (raw) => raw.split(',').map((entry) => entry.trim().replace(/^"|"$/gu, '')).filter(Boolean);

  assert.deepEqual(parse(filesRaw), ['src/**/*.ts', 'src/**/*.tsx']);
  // 테스트는 배포물이 아니라 제외한다. 넓히면 e2e 러너 진행 로그(console.log 355건)가
  // 한 번에 `--max-warnings` 캡을 넘겨 required frontend-build 가 무관하게 red 가 된다.
  assert.deepEqual(parse(ignoresRaw), ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.test.tsx']);
});

test('규칙 무력화 시도는 재현 가능한 red 다', () => {
  const widened = 'files: ["src/**/*.ts"], ignores: [], rules: { "no-console": ["warn", { allow: ["warn", "error", "log"] }] }';
  const match = widened.match(
    /files:\s*\[([^\]]*)\][\s\S]{0,200}?ignores:\s*\[([^\]]*)\][\s\S]{0,200}?"no-console":\s*\[\s*"([^"]+)"\s*,\s*\{\s*allow:\s*\[([^\]]*)\]\s*\}\s*\]/u,
  );
  const allow = match[4].split(',').map((entry) => entry.trim().replace(/^"|"$/gu, ''));
  assert.deepEqual(allow, ['warn', 'error', 'log']);
  assert.notDeepEqual(allow, ['warn', 'error']);
});
