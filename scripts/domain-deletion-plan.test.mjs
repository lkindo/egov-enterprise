import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { asciiJson, planDomainDeletion } from './domain-deletion-plan.mjs';

/*
 * 수동 도메인 삭제(delete-domain.ps1)의 동반 삭제 판정 계약. 판정은 카탈로그 requires 간선의 역방향 폐포다.
 * 실제 표만으로는 방향이 갈리지 않는 간선(묶음 선언은 양방향)이 있어 합성 카탈로그로 방향을 따로 증명한다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = loadProjectComposerCatalog(ROOT);

const edge = (domain, kind = 'java', extra = {}) => ({ domain, kind, userReason: `${domain} 이 필요합니다.`, ...extra });
const synthetic = capabilities => ({ capabilities: Object.entries(capabilities).map(([id, requires]) => ({ id, requires })) });

// 단독 삭제마다 함께 지워지는 도메인. 바뀌면 delete-domain 이 지우는 범위가 바뀐 것이다.
const SINGLE_DELETIONS = {
  addressbook: ['addressbook'],
  board: ['board', 'comment', 'dashboard', 'scrap'],
  comment: ['board', 'comment', 'dashboard', 'scrap'],
  dashboard: ['dashboard'],
  help: ['help'],
  informalsanction: ['informalsanction', 'operation'],
  isg: ['isg'],
  mail: ['mail'],
  memoreport: ['memoreport'],
  note: ['note'],
  notification: ['dashboard', 'notification'],
  operation: ['informalsanction', 'operation'],
  report: ['report'],
  schedule: ['schedule'],
  scrap: ['board', 'comment', 'dashboard', 'scrap'],
  sms: ['sms'],
  survey: ['survey'],
  system: ['system'],
  // 커뮤니티(system)가 쓰는 템플릿 배정 구현이 템플릿 디렉터리에 있다. 템플릿만 지우면 그 구현이 사라진다.
  template: ['system', 'template'],
};

test('every single deletion of the real catalog removes exactly the frozen set', () => {
  assert.deepEqual(catalog.capabilities.map(capability => capability.id).sort(), Object.keys(SINGLE_DELETIONS).sort(),
    'the frozen table covers every selectable domain');
  for (const [domain, expected] of Object.entries(SINGLE_DELETIONS)) {
    assert.deepEqual(planDomainDeletion({ catalog, requested: [domain] }).domains, expected, domain);
  }
});

test('each companion names the requirement that pulled it in with the user sentence of that pair', () => {
  const plan = planDomainDeletion({ catalog, requested: ['template'] });
  assert.deepEqual(plan.added, [{ domain: 'system', because: { from: 'system', to: 'template', kinds: ['java'],
    userReason: '커뮤니티를 만들 때 템플릿을 고릅니다.' } }]);
});

test('deletion follows requirements backwards: the requirer goes, the required stays', () => {
  const chain = synthetic({ a: [edge('b')], b: [edge('c')], c: [] });
  assert.deepEqual(planDomainDeletion({ catalog: chain, requested: ['c'] }).domains, ['a', 'b', 'c']);
  assert.deepEqual(planDomainDeletion({ catalog: chain, requested: ['b'] }).domains, ['a', 'b']);
  assert.deepEqual(planDomainDeletion({ catalog: chain, requested: ['a'] }).domains, ['a']);
  assert.deepEqual(planDomainDeletion({ catalog: chain, requested: ['c'] }).added.map(row => [row.domain, row.because.to]), [['b', 'c'], ['a', 'b']]);
});

test('edges that only share a screen do not delete anything, and kinds of one pair are merged', () => {
  const screens = synthetic({ a: [edge('b', 'shared-ui', { customOnly: true }), edge('c', 'ui-import', { customOnly: true })], b: [], c: [] });
  assert.deepEqual(planDomainDeletion({ catalog: screens, requested: ['b'] }).domains, ['b']);
  assert.deepEqual(planDomainDeletion({ catalog: screens, requested: ['c'] }).domains, ['c']);
  const both = synthetic({ a: [edge('b', 'manifest'), edge('b', 'java'), edge('b', 'shared-ui', { customOnly: true })], b: [] });
  assert.deepEqual(planDomainDeletion({ catalog: both, requested: ['b'] }).added[0].because.kinds, ['java', 'manifest']);
});

test('unknown or empty requests are refused instead of guessing', () => {
  assert.throws(() => planDomainDeletion({ catalog, requested: ['board', 'nope'] }), /unknown domain: nope/);
  assert.throws(() => planDomainDeletion({ catalog, requested: [] }), /no domain to delete/);
  assert.deepEqual(planDomainDeletion({ catalog, requested: [' Board ', 'board'] }).requested, ['board']);
});

test('the CLI prints ASCII-only JSON that PowerShell decodes regardless of the console code page', () => {
  const script = join(ROOT, 'scripts/domain-deletion-plan.mjs');
  const result = spawnSync(process.execPath, [script, '--json', 'template'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[\x00-\x7f]*$/u, 'stdout is ASCII');
  assert.deepEqual(JSON.parse(result.stdout).domains, ['system', 'template']);
  const refused = spawnSync(process.execPath, [script, '--json', 'nope'], { encoding: 'utf8' });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /unknown domain: nope/);
  const astral = asciiJson({ text: '스크랩 😀' });
  assert.match(astral, /^[\x00-\x7f]*$/u, 'characters outside the BMP are escaped too');
  assert.equal(JSON.parse(astral).text, '스크랩 😀', 'astral characters survive as surrogate pairs');
});

test('delete-domain.ps1 takes its companions from the plan, not from manifest clusters', () => {
  const script = readFileSync(join(ROOT, 'scripts/delete-domain.ps1'), 'utf8');
  assert.match(script, /domain-deletion-plan\.mjs/u);
  assert.match(script, /& node \$planScript --json @requested/u);
  assert.doesNotMatch(script, /\$manifest\.clusters/u, 'the undirected cluster expansion is gone');
  assert.match(script, /\$toDelete = \[System\.Collections\.Generic\.HashSet\[string\]\]::new\(\[string\[\]\]@\(\$plan\.domains\)\)/u);
});
