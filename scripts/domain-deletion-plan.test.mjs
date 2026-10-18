import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { asciiJson, planDomainDeletion, planDomainFrontendPaths, planDomainJavaFiles, treeDeletionCatalog } from './domain-deletion-plan.mjs';
import { stripJavaCommentsAndStringLiterals } from './reusable-source-java.mjs';
import { MODULES_DIRECTORY } from './composer-modules.mjs';

/*
 * 수동 도메인 삭제(delete-domain.ps1)의 동반 삭제 판정 계약. 판정은 카탈로그 requires 간선의 역방향 폐포다.
 * 실제 표만으로는 방향이 갈리지 않는 간선(묶음 선언은 양방향)이 있어 합성 카탈로그로 방향을 따로 증명한다.
 * 삭제 스크립트는 카탈로그 전체를 적재하지 않고 지금 트리에서 같은 간선을 계산한다. 원본 트리에서 두 결과가 같고,
 * 카탈로그가 적재되지 않는 트리(생성물·이미 지운 트리·스캐폴드한 트리)에서도 판정이 선다는 것을 함께 고정한다.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = loadProjectComposerCatalog(ROOT);
const SCRIPT = join(ROOT, 'scripts/domain-deletion-plan.mjs');
const APP = 'business-app/src/main/java/nuri/business';

/**
 * 기능 파일과 고른 기능의 업무 앱 생산 소스만 둔 임시 트리. 화면·권한 원장이 없어 카탈로그는 적재되지 않는다.
 * 기능 파일(매니페스트 v2)은 `modules` 가 주어지면 그 기능의 파일만(생성물처럼 — 생성기는 config/modules 를 구성으로 투영한다,
 * 11단계 C3), 아니면 원본 것을 모두 둔다(원본 트리·이미 지운 트리). 기능 집합은 기능 파일이 정한다. `edit` 로 기능 파일을 고친다.
 * `api` 면 api-server 생산 소스도 둔다 — api-server 디렉터리 소유 간선(DEC-OPS-280)도 카탈로그 없이 계산된다.
 */
function treeWith({ domains, modules, api = false, edit = () => {} }) {
  const root = mkdtempSync(join(tmpdir(), 'domain-deletion-'));
  mkdirSync(join(root, MODULES_DIRECTORY), { recursive: true });
  const kept = name => !modules || ['_schema.json', 'core.json', 'presets.json'].includes(name) || modules.includes(name.replace(/\.json$/, ''));
  for (const name of readdirSync(join(ROOT, MODULES_DIRECTORY)).filter(name => name.endsWith('.json') && kept(name))) {
    const value = JSON.parse(readFileSync(join(ROOT, MODULES_DIRECTORY, name), 'utf8'));
    edit(value);
    writeFileSync(join(root, MODULES_DIRECTORY, name), JSON.stringify(value));
  }
  for (const domain of domains) for (const layer of ['domain', 'service']) {
    const source = join(ROOT, APP, layer, domain);
    if (existsSync(source)) cpSync(source, join(root, APP, layer, domain), { recursive: true });
  }
  if (api) cpSync(join(ROOT, 'api-server/src/main/java'), join(root, 'api-server/src/main/java'), { recursive: true });
  return root;
}

const edge = (domain, kind = 'java', extra = {}) => ({ domain, kind, userReason: `${domain} 이 필요합니다.`, ...extra });
const synthetic = capabilities => ({ capabilities: Object.entries(capabilities).map(([id, requires]) => ({ id, requires })) });

// 단독 삭제마다 함께 지워지는 도메인. 바뀌면 delete-domain 이 지우는 범위가 바뀐 것이다.
const SINGLE_DELETIONS = {
  addressbook: ['addressbook'],
  // 커뮤니티 사용자 API(게시판 목록)는 게시판 타입을 참조한다 — api-server 디렉터리 소유 간선(DEC-OPS-280).
  //   실시간 대시보드는 게시판을 포트로 읽는다(Phase 2 9단계) — 게시판을 지워도 남는다.
  board: ['board', 'comment', 'community', 'scrap'],
  comment: ['board', 'comment', 'community', 'scrap'],
  community: ['community'],
  dashboard: ['dashboard'],
  event: ['event'],
  help: ['help'],
  // 포상은 결재를 요구하지만(포상의 결재 참조) 결재는 포상을 요구하지 않는다(DEC-OPS-272). 행사는 결재와 무관하다(DEC-OPS-273).
  informalsanction: ['informalsanction', 'reward'],
  isg: ['isg'],
  mail: ['mail'],
  memoreport: ['memoreport'],
  note: ['note'],
  // 실시간 대시보드→알림은 화면 의존(customOnly)이라 단독 삭제가 따라가지 않는다. 단독 삭제는 프런트를 지우지 않는다.
  notification: ['notification'],
  promotion: ['promotion'],
  report: ['report'],
  reward: ['reward'],
  schedule: ['schedule'],
  // 스크랩은 게시판을 요구하지만 게시판은 스크랩 없이 선다(DEC-OPS-272).
  scrap: ['scrap'],
  // 시연 화면은 프런트 전용 기능이라 지울 백엔드가 없다(DEC-OPS-273). 화면은 pack 단위로만 지운다.
  showcase: ['showcase'],
  sms: ['sms'],
  survey: ['survey'],
  // 템플릿 배정 구현은 템플릿 기능의 서비스이고 커뮤니티는 그 포트를 선택 주입으로 받는다(DEC-OPS-280). 템플릿을 지워도 커뮤니티는 선다.
  template: ['template'],
};

test('every single deletion of the real catalog removes exactly the frozen set', () => {
  assert.deepEqual(catalog.capabilities.map(capability => capability.id).sort(), Object.keys(SINGLE_DELETIONS).sort(),
    'the frozen table covers every selectable domain');
  for (const [domain, expected] of Object.entries(SINGLE_DELETIONS)) {
    assert.deepEqual(planDomainDeletion({ catalog, requested: [domain] }).domains, expected, domain);
  }
});

test('each companion names the requirement that pulled it in with the user sentence of that pair', () => {
  const plan = planDomainDeletion({ catalog, requested: ['informalsanction'] });
  assert.deepEqual(plan.added, [{ domain: 'reward', because: { from: 'reward', to: 'informalsanction', kinds: ['java'],
    userReason: '포상 데이터가 결재 문서 표를 참조합니다.' } }]);
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
  // 실제 표에 있는 세 종류 — 묶음(게시판↔댓글), 업무 앱 Java 참조(스크랩→게시판), api-server 디렉터리 소유 기능의 Java 참조
  // (커뮤니티→게시판, DEC-OPS-280). 다른 기능 디렉터리의 지원 파일 간선은 실례가 없어 아래 합성 트리로 본다. 묶음 requiresDomains 의
  //   실례였던 대시보드 묶음은 업무 홈 이행에서 걷었다(Phase 2 9단계).
  for (const pair of ['board>comment manifest', 'scrap>board java', 'community>board java']) {
    assert.ok(edges(catalog.capabilities).some(row => row.startsWith(`${pair} `)), pair);
  }
  assert.deepEqual(edges(tree.capabilities), edges(catalog.capabilities));
  // 프런트 전용 기능만 백엔드 디렉터리가 없다.
  assert.deepEqual(tree.capabilities.filter(capability => !capability.present).map(capability => capability.id), ['showcase']);
  for (const [domain, expected] of Object.entries(SINGLE_DELETIONS)) {
    assert.deepEqual(planDomainDeletion({ catalog: tree, requested: [domain] }).domains, expected, domain);
  }
});

// 다른 기능 디렉터리에 있는 지원 파일은 그 기능을 요구한다. 실례(커뮤니티가 쓰던 템플릿 배정 구현)는 DEC-OPS-280 에서 포트로
// 바뀌어 사라졌으므로 합성 선언으로 규칙을 본다 — 실례만 바꾸고 단언을 지우면 이 간선 규칙의 red 가 사라진다.
test('a support file declared in another feature directory makes its consumer require that feature', () => {
  // 판정은 기능 파일(매니페스트 v2)의 지원 파일 선언을 읽는다. 함께 지울 Java(planDomainJavaFiles)도 같은 선언을 쓴다(11단계 C3).
  const root = treeWith({ domains: ['mail', 'note'],
    edit: value => { if (value.id === 'note') value.backend.supportFiles = [`${APP}/service/mail/MailService.java`]; } });
  try {
    const tree = treeDeletionCatalog(root);
    assert.deepEqual(tree.capabilities.find(capability => capability.id === 'note').requires.map(edge => `${edge.domain} ${edge.kind}`), ['mail java']);
    assert.deepEqual(planDomainDeletion({ catalog: tree, requested: ['mail'] }).domains, ['mail', 'note']);
    assert.deepEqual(planDomainDeletion({ catalog: tree, requested: ['note'] }).domains, ['note']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a projected collaboration tree plans the same deletions without the full catalog', () => {
  const collaboration = catalog.presets.find(preset => preset.id === 'collaboration').domains;
  const root = treeWith({ domains: collaboration, modules: collaboration });
  try {
    const tree = treeDeletionCatalog(root);
    // 생성물의 기능 파일은 구성의 것만 있다(생성기 투영, 11단계 C3). 없는 기능은 삭제 계획을 내지 않는다.
    assert.deepEqual(tree.capabilities.map(capability => capability.id), [...collaboration].sort());
    assert.equal(readdirSync(join(root, MODULES_DIRECTORY)).length, collaboration.length + 3, 'feature files plus core, presets and the schema');
    assert.throws(() => planDomainDeletion({ catalog: tree, requested: ['survey'] }), /unknown domain: survey/);
    // 커뮤니티는 이 트리에 없다(demo pack) — 원본 표에서 트리에 있는 기능만 함께 지워진다.
    for (const domain of collaboration) {
      assert.deepEqual(planDomainDeletion({ catalog: tree, requested: [domain] }).domains,
        SINGLE_DELETIONS[domain].filter(name => collaboration.includes(name)), domain);
    }
    const result = spawnSync(process.execPath, [SCRIPT, '--json', '--root', root, 'board'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).domains, ['board', 'comment', 'scrap']);
    assert.deepEqual(JSON.parse(result.stdout).javaFiles, [], 'a tree with only app sources has nothing to delete outside them');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// 지우는 타입을 참조하는 api-server 생산 파일. 컨트롤러는 기능 이름과 다른 패키지에 있을 수 있어(행사·외부인사·포상은
// controller/business/operation, 결재는 controller/business/approval) 디렉터리 이름으로는 찾지 못한다.
const API_MAIN = 'api-server/src/main/java/nuri/api/controller/business/';
const API_MAIN_DELETIONS = {
  event: ['operation/EventApiController.java', 'operation/ExternalHrApiController.java'],
  reward: ['operation/RewardManageApiController.java'],
  informalsanction: ['approval/ApprovalApiController.java',
    'approval/dto/ApprovalConfirmRequest.java', 'approval/dto/ApprovalDraftRequest.java',
    'approval/dto/ApprovalResubmissionRequest.java', 'operation/RewardManageApiController.java'],
};

function treeJava(root) {
  return ['foundation', 'business-core', 'business-app', 'api-server'].flatMap(module => {
    const directory = join(root, module, 'src');
    return existsSync(directory) ? readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.java'))
      .map(entry => join(entry.parentPath, entry.name).slice(root.length + 1).split('\\').join('/')) : [];
  });
}

test('files outside the domain directories go with the types they reference, judged like the generator', () => {
  const java = treeJava(ROOT);
  for (const [domain, expected] of Object.entries(API_MAIN_DELETIONS)) {
    const plan = planDomainDeletion({ catalog, requested: [domain] });
    const files = planDomainJavaFiles(ROOT, plan.domains).map(row => row.file);
    assert.deepEqual(files.filter(file => file.startsWith('api-server/src/main/')), expected.map(file => API_MAIN + file).sort(), domain);
    // 독립 대조: 남는 Java 코드(주석·문자열 제외)에 지우는 패키지 이름이 하나도 없다. 남기면 컴파일이 깨진다.
    const deleted = new RegExp(`\\bnuri\\.business\\.(?:domain|service)\\.(?:${plan.domains.join('|')})\\b`, 'u');
    const inDomainDirectory = file => plan.domains.some(name => ['domain', 'service'].some(layer =>
      new RegExp(`^business-app/src/(?:main|test)/java/nuri/business/${layer}/${name}/`, 'u').test(file)));
    const dangling = java.filter(file => !inDomainDirectory(file) && !files.includes(file))
      .filter(file => deleted.test(stripJavaCommentsAndStringLiterals(readFileSync(join(ROOT, file), 'utf8'))));
    assert.deepEqual(dangling, [], `${domain}: no surviving source references a deleted package`);
  }
});

test('a tree where a deletion already ran and a new domain was scaffolded still plans', () => {
  const gone = new Set(['informalsanction', 'reward']);
  const root = treeWith({ domains: Object.keys(SINGLE_DELETIONS).filter(domain => !gone.has(domain)), api: true });
  try {
    // generate-domain.ps1 가 만드는 새 도메인. 기능 파일이 없으므로 판정 대상이 아니고, 거부 사유도 아니다.
    mkdirSync(join(root, APP, 'domain/product'), { recursive: true });
    writeFileSync(join(root, APP, 'domain/product/Product.java'),
      'package nuri.business.domain.product;\nimport nuri.business.domain.board.entity.Board;\npublic class Product {}\n');
    const tree = treeDeletionCatalog(root);
    assert.deepEqual(tree.capabilities.filter(capability => !capability.present).map(capability => capability.id), [...gone, 'showcase']);
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
  const result = spawnSync(process.execPath, [script, '--json', 'informalsanction'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^[\x00-\x7f]*$/u, 'stdout is ASCII');
  assert.deepEqual(JSON.parse(result.stdout).domains, ['informalsanction', 'reward']);
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
  // api-server 파일은 plan.javaFiles(생성기 Java 투영)로 지운다. 기능 이름의 controller 디렉터리를 추측하지 않는다.
  assert.doesNotMatch(script, /controller\/business\/\$d/u, 'no controller directory guessed from the domain name');
  assert.match(script, /foreach \(\$row in @\(\$plan\.javaFiles\)\)/u);
  assert.match(script, /\$toDelete = \[System\.Collections\.Generic\.HashSet\[string\]\]::new\(\[string\[\]\]@\(\$plan\.domains\)\)/u);
  // 잔존 참조 검사는 지우는 타입의 정규화된 이름으로 찾는다. 기능 이름을 패키지 접두로 찾으면 business-core 의
  // 같은 이름 패키지(nuri.business.service.system.user 등)까지 걸려 실제로 깨지는 소스가 경고 소음에 묻힌다.
  assert.doesNotMatch(script, /nuri\.business\.\$layer\.\$d/u, 'no package-prefix sweep by domain name');
  assert.match(script, /\[void\]\$deletedTypeNames\.Add\("\$package\.\$\(\$file\.BaseName\)"\)/u);
  // 화면은 기능 파일의 화면 소유(plan.frontendPaths)로 지운다(11단계 C5). v1 manifest 의 pack 경로를 읽지 않는다.
  assert.match(script, /\$frontendRelPaths = @\(\$plan\.frontendPaths/u);
  assert.doesNotMatch(script, /reusable-base-profiles|\$manifest|frontend\.removePaths/u, 'no v1 manifest or pack removal paths');
});

// 11단계 C5: 수동 삭제의 화면은 지우는 기능의 화면 소유다. 함께 소유한 화면은 소유한 기능을 모두 지울 때만 빠진다.
test('manual deletion removes the screens the deleted features own, shared screens only with all their owners', () => {
  const owned = planDomainFrontendPaths(ROOT, ['event']);
  assert.ok(owned.includes('frontend/src/app/admin/operation/events'));
  assert.ok(!owned.includes('frontend/src/app/admin/operation/rewards'), 'another feature keeps its own screen');
  assert.ok(!owned.includes('frontend/src/app/admin/operation/error.tsx'), 'a shared screen stays while one owner remains');
  assert.ok(planDomainFrontendPaths(ROOT, ['event', 'reward']).includes('frontend/src/app/admin/operation/error.tsx'),
    'a shared screen goes with all its owners');
  for (const path of planDomainFrontendPaths(ROOT, ['survey'])) assert.ok(existsSync(join(ROOT, path)), path);
});
