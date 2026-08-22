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
