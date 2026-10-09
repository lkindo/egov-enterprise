import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { ComposerError, MENUS_REFRESH_COMMAND, REQUEST_ERROR_CODES, classifyDeclarationFailure } from './project-composer-errors.mjs';
import * as nameRule from './project-composer-name.mjs';
import { ProjectRecipeError, classifyRecipeFailure } from './project-composer-recipe.mjs';

const root = resolve(import.meta.dirname, '..');

/*
 * 선언 적재 실패의 분류(설계서 14.2 CATALOG_DRIFT). 선언 모듈이 일부러 던진 실패와 선언이 가리키는 파일이 사라진 경우만
 * 선언 불일치이고, 런타임 결함과 그 밖의 시스템 오류는 내부 오류로 남는다(사용자에게 고칠 거리를 잘못 주지 않는다).
 */
test('declaration failures become CATALOG_DRIFT only for deliberate failures and missing declared files', () => {
  const windowsRoot = 'D:\\work\\egov';
  const drift = classifyDeclarationFailure(new Error('project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx'), windowsRoot);
  assert.ok(drift instanceof ComposerError);
  assert.equal(drift.code, 'CATALOG_DRIFT');
  assert.deepEqual(drift.details.violations, ['project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx']);
  const missing = classifyDeclarationFailure(Object.assign(new Error("ENOENT: no such file or directory, open 'D:\\work\\egov\\frontend\\x.ts'"),
    { code: 'ENOENT', syscall: 'open' }), windowsRoot);
  assert.equal(missing.code, 'CATALOG_DRIFT');
  assert.deepEqual(missing.details.violations, ["ENOENT: no such file or directory, open '.\\frontend\\x.ts'"], 'the checkout path is not shown');
  const denied = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES', syscall: 'open' });
  assert.equal(classifyDeclarationFailure(denied, windowsRoot), denied, 'other system errors stay internal');
  for (const failure of [new TypeError('x is not a function'), new SyntaxError('Unexpected token'), new ReferenceError('y')]) {
    assert.equal(classifyDeclarationFailure(failure, windowsRoot), failure, failure.name);
  }
  const tagged = new ComposerError('MENU_SNAPSHOT_STALE');
  assert.equal(classifyDeclarationFailure(tagged, windowsRoot), tagged, 'an already tagged error keeps its code');
});

// 해석기 오류는 field 를 code 보다 먼저 본다. 카탈로그 결함(field catalog, CATALOG_MISMATCH)은 입력 오류가 아니다.
test('resolver failures are classified by field before code', () => {
  const classify = (code, field) => classifyRecipeFailure(new ProjectRecipeError(code, field, 'message'));
  assert.deepEqual([classify('INVALID_RECIPE', 'project.name').code, classify('INVALID_RECIPE', 'project.name').details], ['INVALID_NAME', { field: 'project.name' }]);
  assert.equal(classify('INVALID_RECIPE', 'catalog').code, 'CATALOG_DRIFT');
  assert.equal(classify('CATALOG_MISMATCH', 'catalog').code, 'CATALOG_DRIFT');
  assert.equal(classify('CATALOG_MISMATCH', 'selection.domains').code, 'CATALOG_DRIFT');
  for (const [code, field] of [['INVALID_RECIPE', 'selection.domains'], ['UNAVAILABLE_DOMAIN', 'selection.domains'],
    ['UNSUPPORTED_DATABASE', 'database.vendor'], ['UNSUPPORTED_LAYOUT', 'backendLayout'], ['INVALID_RECIPE', 'sourceRef']]) {
    assert.equal(classify(code, field).code, 'INVALID_RECIPE', `${code} ${field}`);
  }
  const plain = new Error('not a resolver error');
  assert.equal(classifyRecipeFailure(plain), plain);
  assert.ok(REQUEST_ERROR_CODES.includes('INVALID_NAME') && REQUEST_ERROR_CODES.includes('CATALOG_DRIFT'));
});

/*
 * 이름 규칙은 해석기·서버·화면이 같아야 한다. 화면 사본(public/name-rule.js)은 브라우저가 불러오는 파일이라 따로 있으므로
 * 상수·문장·판정 결과를 이 정본과 대조한다.
 */
test('the browser name rule is the same rule as the resolver and server rule', async () => {
  const browser = await import(pathToFileURL(join(root, 'tools/project-composer/public/name-rule.js')).href);
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(nameRule).sort());
  assert.equal(browser.PROJECT_NAME_MAX, nameRule.PROJECT_NAME_MAX);
  assert.equal(String(browser.PROJECT_NAME_PATTERN), String(nameRule.PROJECT_NAME_PATTERN));
  assert.deepEqual([...browser.RESERVED_NAMES], [...nameRule.RESERVED_NAMES]);
  assert.equal(browser.NAME_RULE_MESSAGE, nameRule.NAME_RULE_MESSAGE);
  const corpus = ['my-service', 'a', 'a1-b2', ...nameRule.RESERVED_NAMES, 'con1', 'console', 'com10', 'Con', 'A', 'a'.repeat(63), 'a'.repeat(64),
    'a-', 'a--b', '-a', '1a', 'a_b', 'a.b', '../x', '', ' a', 7, null, undefined];
  for (const value of corpus) assert.equal(browser.projectNameIsValid(value), nameRule.projectNameIsValid(value), String(value));
  assert.deepEqual(['con', 'nul', 'com0', 'com9', 'lpt0', 'lpt9'].map(nameRule.projectNameIsValid), [false, false, false, false, false, false]);
  assert.deepEqual(['con1', 'console', 'com10', 'my-service', 'a'.repeat(63)].map(nameRule.projectNameIsValid), [true, true, true, true, true]);
});

// 화면은 생성 요청이 이 코드들로 거부되면 계획을 지운다. 서버가 계획 단계에서 붙이는 코드와 같은 목록이어야 한다.
test('the screen treats exactly the request error codes as a rejected plan', () => {
  const app = readFileSync(join(root, 'tools/project-composer/public/app.js'), 'utf8');
  const declared = /const PLAN_REJECTION_CODES = new Set\(\[([^\]]*)\]\);/.exec(app);
  assert.ok(declared, 'app.js declares PLAN_REJECTION_CODES');
  assert.deepEqual([...declared[1].matchAll(/'([A-Z_]+)'/g)].map(match => match[1]).sort(), [...REQUEST_ERROR_CODES].sort());
});

// 화면이 보여 주는 갱신 명령은 실제로 있는 npm 명령이어야 한다(없는 명령을 안내하지 않는다).
test('the menu refresh command shown on screen is a real npm script', () => {
  const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
  const name = MENUS_REFRESH_COMMAND.replace(/^npm run /, '');
  assert.equal(MENUS_REFRESH_COMMAND, `npm run ${name}`);
  assert.equal(scripts[name], 'node scripts/project-composer-menus-refresh.mjs');
  assert.ok(existsSync(join(root, 'scripts/project-composer-menus-refresh.mjs')));
});
