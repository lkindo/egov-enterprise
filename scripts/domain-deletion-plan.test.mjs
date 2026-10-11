import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { asciiJson, planDomainDeletion, treeDeletionCatalog } from './domain-deletion-plan.mjs';

/*
 * 수동 도메인 삭제(delete-domain.ps1)의 동반 삭제 판정 계약. 판정은 카탈로그 requires 간선의 역방향 폐포다.
 * 실제 표만으로는 방향이 갈리지 않는 간선(묶음 선언은 양방향)이 있어 합성 카탈로그로 방향을 따로 증명한다.
 * 삭제 스크립트는 카탈로그 전체를 적재하지 않고 지금 트리에서 같은 간선을 계산한다. 원본 트리에서 두 결과가 같고,
 * 카탈로그가 적재되지 않는 트리(생성물·이미 지운 트리·스캐폴드한 트리)에서도 판정이 선다는 것을 함께 고정한다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = loadProjectComposerCatalog(ROOT);
const SCRIPT = join(ROOT, 'scripts/domain-deletion-plan.mjs');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'config/reusable-base-profiles.json'), 'utf8'));
const APP = 'business-app/src/main/java/nuri/business';

/** manifest 와 고른 기능의 업무 앱 생산 소스만 둔 임시 트리. 화면·권한 원장이 없어 카탈로그는 적재되지 않는다. */
function treeWith({ manifest, domains }) {
  const root = mkdtempSync(join(tmpdir(), 'domain-deletion-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config/reusable-base-profiles.json'), JSON.stringify(manifest));
  for (const domain of domains) for (const layer of ['domain', 'service']) {
    const source = join(ROOT, APP, layer, domain);
    if (existsSync(source)) cpSync(source, join(root, APP, layer, domain), { recursive: true });
  }
  return root;
}

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
  // 행사·포상은 결재를 요구하지만(포상의 결재 참조) 결재는 행사·포상을 요구하지 않는다(DEC-OPS-272).
  operation: ['operation'],
  report: ['report'],
  schedule: ['schedule'],
  // 스크랩은 게시판을 요구하지만 게시판은 스크랩 없이 선다(DEC-OPS-272).
  scrap: ['scrap'],
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

test('a domain whose source is already gone is neither added nor followed', () => {
  // a 는 이미 지운 기능이다. 묶음 선언(manifest)이 남아 있어도 지울 것이 없고, a 를 거쳐 x 를 끌어오지도 않는다.
  const gone = { capabilities: [{ id: 'a', present: false, requires: [edge('b', 'manifest')] }, { id: 'b', requires: [] },
    { id: 'x', requires: [edge('a')] }] };
  assert.deepEqual(planDomainDeletion({ catalog: gone, requested: ['b'] }).domains, ['b']);
  assert.deepEqual(planDomainDeletion({ catalog: gone, requested: ['a'] }).domains, ['a', 'x'], 'an absent domain may still be requested');
});

test('the tree judgement yields exactly the catalog edges that deletion follows', () => {
  const edges = capabilities => [...new Set(capabilities.flatMap(capability => capability.requires.filter(row => !row.customOnly)
    .map(row => `${capability.id}>${row.domain} ${row.kind} ${row.userReason}`)))].sort();
  const tree = treeDeletionCatalog(ROOT);
  // 세 종류가 모두 들어 있다 — 지원 파일(커뮤니티→템플릿), 묶음 requiresDomains(대시보드→알림), Java 참조(스크랩→게시판).
  for (const pair of ['system>template java', 'dashboard>notification manifest', 'scrap>board java']) {
    assert.ok(edges(catalog.capabilities).some(row => row.startsWith(`${pair} `)), pair);
  }
  assert.deepEqual(edges(tree.capabilities), edges(catalog.capabilities));
  assert.deepEqual(tree.capabilities.filter(capability => !capability.present).map(capability => capability.id), []);
  for (const [domain, expected] of Object.entries(SINGLE_DELETIONS)) {
    assert.deepEqual(planDomainDeletion({ catalog: tree, requested: [domain] }).domains, expected, domain);
  }
});

test('a projected collaboration tree plans the same deletions without the full catalog', () => {
  const collaboration = MANIFEST.packs.collaboration.backend.appDomains;
  const root = treeWith({ domains: collaboration, manifest: { packs: { core: MANIFEST.packs.core, collaboration: MANIFEST.packs.collaboration },
    clusters: MANIFEST.clusters.filter(cluster => cluster.pack === 'collaboration') } });
  try {
    const tree = treeDeletionCatalog(root);
    assert.deepEqual(tree.capabilities.map(capability => capability.id), [...collaboration].sort());
    for (const domain of collaboration) {
      assert.deepEqual(planDomainDeletion({ catalog: tree, requested: [domain] }).domains, SINGLE_DELETIONS[domain], domain);
    }
    const result = spawnSync(process.execPath, [SCRIPT, '--json', '--root', root, 'board'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).domains, ['board', 'comment', 'dashboard', 'scrap']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a tree where a deletion already ran and a new domain was scaffolded still plans', () => {
  const gone = new Set(['informalsanction', 'operation']);
  const root = treeWith({ manifest: MANIFEST, domains: Object.keys(SINGLE_DELETIONS).filter(domain => !gone.has(domain)) });
  try {
    // generate-domain.ps1 가 만드는 새 도메인. manifest 에 없으므로 판정 대상이 아니고, 거부 사유도 아니다.
    mkdirSync(join(root, APP, 'domain/product'), { recursive: true });
    writeFileSync(join(root, APP, 'domain/product/Product.java'),
      'package nuri.business.domain.product;\nimport nuri.business.domain.board.entity.Board;\npublic class Product {}\n');
    const tree = treeDeletionCatalog(root);
    assert.deepEqual(tree.capabilities.filter(capability => !capability.present).map(capability => capability.id), [...gone]);
    assert.ok(!tree.capabilities.some(capability => capability.id === 'product'));
    for (const [domain, expected] of Object.entries(SINGLE_DELETIONS)) {
      const domains = gone.has(domain) ? [domain] : expected.filter(name => !gone.has(name));
      assert.deepEqual(planDomainDeletion({ catalog: tree, requested: [domain] }).domains, domains, domain);
    }
    const result = spawnSync(process.execPath, [SCRIPT, '--json', '--root', root, 'note'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).domains, ['note']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
  // 잔존 참조 검사는 지우는 타입의 정규화된 이름으로 찾는다. 기능 이름을 패키지 접두로 찾으면 business-core 의
  // 같은 이름 패키지(nuri.business.service.system.user 등)까지 걸려 실제로 깨지는 소스가 경고 소음에 묻힌다.
  assert.doesNotMatch(script, /nuri\.business\.\$layer\.\$d/u, 'no package-prefix sweep by domain name');
  assert.match(script, /\[void\]\$deletedTypeNames\.Add\("\$package\.\$\(\$file\.BaseName\)"\)/u);
});
