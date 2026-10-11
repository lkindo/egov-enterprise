import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { createFrontendProjector, isFrontendModuleFile, parsePackMarkerBlocks, planFrontendRemoval } from './reusable-source-frontend.mjs';
import { isCopyableSourceFile, normalize, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

// TypeScript 는 frontend 가 잠근 판(pnpm-lock)을 쓴다. 생성물의 tsc 와 같은 컴파일러다.
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const manifest = JSON.parse(readFileSync(new URL('../config/reusable-base-profiles.json', import.meta.url), 'utf8'));
const paths = {
  search: 'frontend/src/app/search/SearchClient.tsx',
  monitoring: 'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  maker: 'frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx',
};
const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')]));

// 생성기·정밀 점검과 같은 projector 로 투영한다(슬롯 단계 PR-2). transpileModule 은 문자열 단언이 볼 본문을 만드는 데만 쓴다
// (주석을 걷고 JSX 를 호출로 바꾼다). 투영 뒤의 구문·타입 오류는 아래 투영 타입 검사가 생성물과 같은 tsconfig 로 본다(PR-3).
function projected(source, profile, label) {
  const result = createFrontendProjector({ manifest, profile: manifest.profiles[profile] }).project(label, source);
  return ts.transpileModule(result.source, {
    fileName: label,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, removeComments: true, verbatimModuleSyntax: true },
  }).outputText;
}

function boundaryErrors(source, profile, feature) {
  const text = projected(source, profile, paths[feature]);
  const errors = [];
  if (feature === 'search') {
    if (!text.includes('userSearchService.searchAssignableUsers(query)') || !text.includes('menuService.getHeadMenus()')) errors.push('core search was removed');
    if (profile === 'core' && /boardUserService|ArticleResultItem|ArrowRight|MessageSquare|id: ['"]articles['"]/.test(text)) errors.push('excluded board search leaked into core');
    if (profile !== 'core' && !text.includes('boardUserService.searchPosts(query)')) errors.push('included board search was removed');
  }
  if (feature === 'monitoring') {
    for (const call of ['auditAdminService.getAuditLogs', 'systemLogAdminService.getSystemLogs', 'systemLogAdminService.getLoginLogs']) {
      if (!text.includes(call)) errors.push(`core monitoring was removed: ${call}`);
    }
    if (profile === 'core' && /commentQueryOptions|commentMutationOptions|handleDeleteComment|useRef|useMutation|MessageSquare|Trash2|useToast|useConfirm|tab: ['"]COMMENTS['"]/.test(text)) errors.push('excluded comments leaked into core');
    if (profile !== 'core' && (!text.includes('commentMutationOptions.removeAdmin') || !text.includes('await confirm('))) errors.push('included comment deletion lost its control');
  }
  if (feature === 'maker') {
    if (!text.includes('boardAdminService.createBoardMaster(') || !text.includes('menuAdminService.createMenu(')) errors.push('included board creation was removed');
    if (profile !== 'demo' && /communityUserService|communityOptions|htmlFor: ['"]cmntySn['"]/.test(text)) errors.push('excluded community ownership leaked into collaboration');
    if (profile === 'demo' && !text.includes('communityUserService.getCommunityList(')) errors.push('included community selection was removed');
  }
  return errors;
}

for (const profile of ['core', 'collaboration', 'demo']) {
  test(`${profile} retains shared UI and includes optional axes only with their declared packs`, () => {
    for (const [feature, source] of Object.entries(sources)) {
      // The maker belongs to collaboration; its internal demo boundary is checked here
      // even for core as a string fixture, while the artifact route inventory rejects it in core.
      assert.deepEqual(boundaryErrors(source, profile, feature), [], feature);
    }
  });
}

/*
 * 화면의 라우트 종류(page·리다이렉트)는 page 파일 본문의 redirect 호출·return 과 next.config 선언으로 판정한다. 마커 블록이 그
 * 근거를 품으면 종류가 프로필마다 갈려, 원본 원장으로 계산한 화면 생존 기대값과 투영 뒤 본문을 보는 거버넌스 투영이 어긋난다.
 */
test('a page marker block cannot carry a redirect call or a return, and next.config cannot carry markers', () => {
  // 규칙은 공용 파서가 지키므로 블록을 걷는 프로필(core)·남기는 프로필(demo)·직접 선택 투영이 모두 같은 자리에서 실패한다.
  const projectors = {
    core: createFrontendProjector({ manifest, profile: manifest.profiles.core }),
    demo: createFrontendProjector({ manifest, profile: manifest.profiles.demo }),
    custom: createFrontendProjector({ manifest, profile: { packs: ['core'], frontendRemovePaths: [] }, composition: { profile: 'custom', resolvedDomains: [] } }),
  };
  const knownPacks = new Set(Object.keys(manifest.packs));
  const block = body => `export default function Page() {\n  // reusable-base:demo:start\n${body}\n  // reusable-base:demo:end\n  return null;\n}\n`;
  for (const body of ["  redirect('/x');", '  return <Demo />;']) {
    for (const label of ['src/app/demo/page.tsx', 'frontend/src/app/demo/page.tsx']) {
      assert.throws(() => projectors.core.project(label, block(body)), /page 파일의 pack 마커 블록은 redirect 호출이나 return 을 품을 수 없다/,
        'a page block may not carry a redirect or return');
    }
  }
  // 남기는 블록이어도, 직접 선택 투영이어도 같다 — 프로필마다 갈리는 것이 문제다.
  assert.throws(() => projectors.demo.project('src/app/demo/page.tsx', block("  redirect('/x');")), /redirect 호출이나 return/);
  assert.throws(() => projectors.custom.project('src/app/demo/page.tsx', block("  redirect('/x');")), /redirect 호출이나 return/);
  assert.throws(() => parsePackMarkerBlocks(block("  redirect('/x');"), { knownPacks, label: 'src/app/demo/page.tsx' }), /redirect 호출이나 return/);
  // 대조군: 주석 속 return, page 가 아닌 파일, 근거가 없는 블록은 통과한다.
  assert.doesNotThrow(() => projectors.core.project('src/app/demo/page.tsx', block('  // return later')));
  assert.doesNotThrow(() => projectors.core.project('src/app/demo/DemoClient.tsx', block("  redirect('/x');")));
  assert.doesNotThrow(() => projectors.core.project('src/app/demo/page.tsx', block('  const x = 1;')));
  // next.config 의 리다이렉트 선언은 거버넌스 투영이 정리하므로 마커를 두지 않는다. Next 가 읽는 설정 파일 전부(Next 16 은 .mts 도
  // 읽는다)이고, 투영 판정(isFrontendModuleFile)처럼 확장자 대소문자를 가리지 않는다.
  for (const label of ['next.config.ts', 'next.config.mts', 'frontend/next.config.mts', 'next.config.mjs', 'next.config.js', 'next.config.MTS']) {
    assert.throws(() => projectors.core.project(label, block('  const x = 1;')), /next\.config 는 pack 마커를 둘 수 없다/,
      `${label} cannot carry pack markers`);
  }
});

test('unscoped optional imports and removed shared service calls are reproducible reds', () => {
  const importLeak = sources.search.replace('/* reusable-base:collaboration:start */', '').replace('/* reusable-base:collaboration:end */', '');
  assert.match(boundaryErrors(importLeak, 'core', 'search').join('\n'), /excluded board search/);
  const deletedCoreSearch = sources.search.replace('userSearchService.searchAssignableUsers(query)', 'Promise.resolve([])');
  assert.match(boundaryErrors(deletedCoreSearch, 'core', 'search').join('\n'), /core search was removed/);
  const missingConfirmation = sources.monitoring.replace('await confirm(', 'await uncheckedConfirmation(');
  assert.match(boundaryErrors(missingConfirmation, 'collaboration', 'monitoring').join('\n'), /lost its control/);
  const leakedCommentHook = `${sources.monitoring}\nconst toast = useToast();\n`;
  assert.match(boundaryErrors(leakedCommentHook, 'core', 'monitoring').join('\n'), /excluded comments/);
});

/*
 * 투영 타입 검사(슬롯 단계 PR-3). 생성물의 tsc 결과는 생성을 시작하고 7~9분 뒤에야 나온다. 그 자리에서만 드러나던 결함 — 마커를
 * 걷은 뒤 남는 미사용 import(TS6133), 마커 블록 안에서만 내보내던 이름을 블록 밖 importer 가 쓰는 경우(TS2305·TS2339) — 를 운영
 * 계약 단계에서 잡는다. 투영은 생성기·정밀 점검과 같은 함수(createFrontendProjector·planFrontendRemoval)와 같은 파일 모집단
 * (Git 이 보는 파일 중 생성기가 복사하는 것)으로 한다 — 두 번째 판정기는 없다.
 * 프로그램은 생성물의 tsc 와 같은 tsconfig 파일 집합으로 메모리 안에서 만든다(noEmit). 진단은 투영으로 내용이 바뀐 생존 파일과,
 * 연쇄 계획의 간선(타입 전용 포함)을 거슬러 그 파일에 닿는 생존 파일 전부에서 모은다. 바뀐 파일의 타입은 바뀌지 않은 중간 파일을
 * 거쳐 다시 나가므로 직접 importer 만 보면 두 단계 떨어진 오류를 놓친다. 나머지 파일은 내용도 타입도 원본과 같아 frontend-build 의
 * tsc 가 본다. demo 도 원본과 같다.
 */
const repoRoot = resolve(import.meta.dirname, '..');
const frontendRoot = join(repoRoot, 'frontend');
const configFileName = join(frontendRoot, 'tsconfig.json');
const keyOf = ts.sys.useCaseSensitiveFileNames
  ? path => resolve(path).replaceAll('\\', '/')
  : path => resolve(path).replaceAll('\\', '/').toLowerCase();
const relOf = path => normalize(relative(repoRoot, path));
const nextBuildDir = keyOf(join(frontendRoot, '.next'));
// 생성물에는 .next 가 없다. 개발 컴퓨터의 .next/types 는 원본 트리의 라우트 검증기(validator.ts)라, 보이면 투영으로 지운 화면을
// import 하는 거짓 TS2307 이 난다. 그래서 투영으로 지운 파일과 함께 .next 아래 전부를 없는 것으로 본다.
const hiddenFromProjection = (key, removed) => key === nextBuildDir || key.startsWith(`${nextBuildDir}/`) || removed.has(key);
/*
 * 검사할 구성. 프리셋 둘(core·collaboration)은 늘 본다. 직접 선택은 기능 하나씩 투영해 보고, 앞선 구성이 보지 않은 검사 단위를
 * 만드는 선택만 타입 검사한다. 검사 단위는 루트 파일과, 그 파일에서 간선을 따라 닿는 바뀐 파일들의 투영 내용의 조합이다 — 같은
 * 조합이면 같은 진단이 나온다. 한 pack 안에서 소유가 갈리는 마커(업무 홈·머리글·통계 화면)와, 축소 구성에서만 살아남는 파일이 새
 * 단위를 만든다. CI 의 직접 선택 생성({mail, schedule}·{board, survey})이 보지 않는 조합도 여기서 본다. 수신자 피커의 주소록 출처가
 * 레지스트리 기여가 되면(PR-4) 그 레지스트리 파일의 변형도 같은 규칙으로 들어온다. 이름으로 고른 구성은 프리셋과 같은 단위만 만들
 * 수 있어 신호를 더하지 못한다.
 */
const TYPE_CHECK_PRESETS = ['core', 'collaboration'];

let projectionInputs;
function readProjectionInputs() {
  if (projectionInputs) return projectionInputs;
  const { config, error } = ts.readConfigFile(configFileName, ts.sys.readFile);
  assert.equal(error, undefined, 'frontend/tsconfig.json 을 읽을 수 있어야 한다');
  const originals = new Map();
  const catalog = loadProjectComposerCatalog(repoRoot);
  projectionInputs = {
    tsconfig: config,
    catalog,
    // 정밀 점검과 같은 모집단이다(compositionDeepPlan).
    files: trackedAndUntrackedFiles().map(normalize).filter(file => file.startsWith('frontend/') && isCopyableSourceFile(file, repoRoot))
      .map(file => join(repoRoot, file)),
    // tsconfig 범위(원본 트리). 투영은 파일을 더하지 않으므로 투영 트리의 범위는 이것과 생존 파일의 교집합이다.
    scope: new Set(ts.parseJsonConfigFileContent(config, ts.sys, frontendRoot, { incremental: false }, configFileName).fileNames.map(keyOf)),
    original: path => {
      if (!originals.has(path)) originals.set(path, readFileSync(path, 'utf8'));
      return originals.get(path);
    },
    trees: new Map(),
    // 구성 사이에는 lib·node_modules 의 SourceFile 만 나눠 쓴다(모듈 해석 캐시는 나누지 않는다).
    sharedSourceFiles: new Map(),
  };
  return projectionInputs;
}

/**
 * 한 구성의 투영 결과: 지운 파일(키), 투영으로 바뀐 생존 파일의 내용, 검사 루트(바뀐 생존 파일 ∪ 간선을 거슬러 그 파일에 닿는 생존
 * 파일, tsconfig 범위 안), 검사 단위(루트마다 '루트 ← 닿는 바뀐 파일#내용 요약').
 */
function projectedTree(selection, inputs) {
  const cacheKey = JSON.stringify(selection);
  if (inputs.trees.has(cacheKey)) return inputs.trees.get(cacheKey);
  const { files, original, scope, catalog } = inputs;
  const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'projection-type-check' }, sourceRef: 'main', selection,
    database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalog);
  const projector = createFrontendProjector({ manifest, profile: composerProfile(manifest, composition), composition });
  const projectedSources = new Map(files.filter(isFrontendModuleFile)
    .map(path => [path, projector.project(normalize(relative(frontendRoot, path)), original(path)).source]));
  const plan = planFrontendRemoval({ frontendRoot, files, directPaths: projector.directPaths, readSource: path => projectedSources.get(path) });
  const survives = path => !plan.removed.has(path);
  const changed = [...projectedSources].filter(([path, source]) => source !== original(path) && survives(path)).map(([path]) => path);
  const dependentsOf = new Map();
  for (const [path, edges] of plan.edges) {
    if (!survives(path)) continue;
    for (const { to } of edges) {
      if (!dependentsOf.has(to)) dependentsOf.set(to, []);
      dependentsOf.get(to).push(path);
    }
  }
  // Set 은 순회 중에 더한 원소도 돈다 — 간선을 거스른 닫힘이다.
  const closure = new Set(changed);
  for (const path of closure) for (const dependent of dependentsOf.get(path) ?? []) closure.add(dependent);
  // tsconfig 범위 밖(e2e·scripts 등)은 생성물의 tsc 도 보지 않는다.
  const roots = [...closure].filter(path => scope.has(keyOf(path)));
  const variants = new Map(changed.map(path => [path, `${relOf(path)}#${createHash('sha256').update(projectedSources.get(path)).digest('hex').slice(0, 12)}`]));
  // 루트에서 바뀐 파일로 가는 길은 닫힘 안에만 있다(길 위의 파일은 모두 그 바뀐 파일에 닿는다).
  const units = roots.map(root => {
    const reached = new Set([root]);
    for (const path of reached) for (const { to } of plan.edges.get(path) ?? []) if (closure.has(to)) reached.add(to);
    return `${relOf(root)} <- ${[...reached].filter(path => variants.has(path)).map(path => variants.get(path)).sort().join(' ')}`;
  });
  const tree = {
    removed: new Set([...plan.removed].map(keyOf)),
    contents: new Map(changed.map(path => [keyOf(path), projectedSources.get(path)])),
    changed,
    roots,
    units,
  };
  inputs.trees.set(cacheKey, tree);
  return tree;
}

const describeDiagnostic = diagnostic => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
  if (!diagnostic.file) return `TS${diagnostic.code} ${message}`;
  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  return `${relOf(diagnostic.file.fileName)}:${line + 1} TS${diagnostic.code} ${message}`;
};

/** 투영 트리를 메모리 안 호스트로 보여 주고 생성물과 같은 tsconfig 로 프로그램을 만든다. 디스크는 바꾸지 않는다. */
function typeCheckProjection(tree, { tsconfig, sharedSourceFiles }) {
  const hidden = path => hiddenFromProjection(keyOf(path), tree.removed);
  const fileExists = path => !hidden(path) && (tree.contents.has(keyOf(path)) || ts.sys.fileExists(path));
  const readFile = path => (hidden(path) ? undefined : tree.contents.get(keyOf(path)) ?? ts.sys.readFile(path));
  const parsed = ts.parseJsonConfigFileContent(tsconfig, {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists,
    readFile,
    readDirectory: (...args) => ts.sys.readDirectory(...args).filter(path => !hidden(path)),
  }, frontendRoot, { incremental: false }, configFileName);
  const host = {
    ...ts.createCompilerHost(parsed.options),
    fileExists,
    readFile,
    directoryExists: path => !hidden(path) && ts.sys.directoryExists(path),
    getDirectories: path => ts.sys.getDirectories(path).filter(name => !hidden(join(path, name))),
    getSourceFile(fileName, setting) {
      const key = keyOf(fileName);
      const options = typeof setting === 'object' ? setting : { languageVersion: setting };
      const cacheKey = key.includes('/node_modules/')
        ? `${key}|${options.languageVersion}|${options.impliedNodeFormat}|${options.jsDocParsingMode}` : undefined;
      if (cacheKey && sharedSourceFiles.has(cacheKey)) return sharedSourceFiles.get(cacheKey);
      const text = readFile(fileName);
      if (text === undefined) return undefined;
      const sourceFile = ts.createSourceFile(fileName, text, setting);
      if (cacheKey) sharedSourceFiles.set(cacheKey, sourceFile);
      return sourceFile;
    },
  };
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host, configFileParsingDiagnostics: parsed.errors });
  const roots = tree.roots.map(path => program.getSourceFile(path));
  const missingRoots = tree.roots.filter((path, index) => !roots[index]).map(relOf);
  const diagnostics = [
    ...program.getConfigFileParsingDiagnostics(), ...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics(),
    ...roots.filter(Boolean).flatMap(file => [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)]),
  ];
  // .next 아래가 프로그램에 들어오면 그 파일의 진단까지 보여 준다(거짓 TS2307 의 근거).
  const leakedBuildFiles = program.getSourceFiles().filter(file => keyOf(file.fileName).startsWith(`${nextBuildDir}/`))
    .flatMap(file => [relOf(file.fileName), ...program.getSemanticDiagnostics(file).map(describeDiagnostic)]);
  return { program, missingRoots, diagnostics, leakedBuildFiles };
}

function assertProjectionTypeChecks(t, label, tree, inputs, started) {
  const { program, missingRoots, diagnostics, leakedBuildFiles } = typeCheckProjection(tree, inputs);
  assert.deepEqual(leakedBuildFiles, [], `${label}: the projected program must not see .next (the original tree's route validator)`);
  assert.ok(tree.changed.length > 0 && tree.roots.length > 0, `${label}: the projection changes files, so the check has roots`);
  assert.deepEqual(missingRoots, [], `${label}: every root in the tsconfig scope must be in the projected program`);
  assert.deepEqual(diagnostics.map(describeDiagnostic), [], `${label}: projected TypeScript errors`);
  t.diagnostic(`${label}: 검사 루트 ${tree.roots.length}개(바뀐 생존 파일 ${tree.changed.length}개와 그 파일에 닿는 파일), `
    + `프로그램 파일 ${program.getSourceFiles().length}개, ${Math.round(performance.now() - started)}ms (TypeScript ${ts.version})`);
}

test('the projection type check hides the .next build folder, which the generated tree does not have', () => {
  for (const path of ['.next', '.next/types/routes.d.ts', '.next/dev/types/validator.ts', '.NEXT/types/routes.d.ts']) {
    const visible = !hiddenFromProjection(keyOf(join(frontendRoot, path)), new Set());
    // 대소문자를 가리는 디스크에서 .NEXT 는 다른 폴더다.
    assert.equal(visible, path.startsWith('.NEXT') && ts.sys.useCaseSensitiveFileNames, `${path} must be hidden from the projected tree`);
  }
  assert.equal(hiddenFromProjection(keyOf(join(frontendRoot, '.next-env.d.ts')), new Set()), false, 'only the .next folder itself is hidden');
});

for (const preset of TYPE_CHECK_PRESETS) {
  test(`${preset} projection has no TypeScript error in changed survivors and the files that reach them`, { timeout: 300_000 }, t => {
    const started = performance.now();
    const inputs = readProjectionInputs();
    assertProjectionTypeChecks(t, preset, projectedTree({ preset }, inputs), inputs, started);
  });
}

test('direct selections that reach a check unit no earlier configuration checked have no TypeScript error', { timeout: 600_000 }, async t => {
  const inputs = readProjectionInputs();
  const checked = new Set(TYPE_CHECK_PRESETS.flatMap(preset => projectedTree({ preset }, inputs).units));
  const domains = inputs.catalog.capabilities.map(capability => capability.id);
  assert.ok(domains.length > 0, 'the catalog lists selectable features');
  const representatives = [];
  for (const domain of domains) {
    const started = performance.now();
    const label = `{${domain}}`;
    const tree = projectedTree({ domains: [domain] }, inputs);
    const fresh = tree.units.filter(unit => !checked.has(unit));
    if (!fresh.length) continue;
    for (const unit of tree.units) checked.add(unit);
    representatives.push(label);
    await t.test(label, st => {
      assertProjectionTypeChecks(st, label, tree, inputs, started);
      st.diagnostic(`${label}: 새 검사 단위 ${fresh.length}개 — ${fresh.map(unit => unit.split(' <- ')[0]).join(', ')}`);
    });
  }
  // 지금은 한 pack 안에서 소유가 갈리는 마커와 축소 구성에서만 남는 파일이 프리셋에 없는 단위를 만든다. 단위 판정이 늘 '이미 봤다'
  // 로 무너지면 직접 선택은 하나도 검사되지 않으므로 그 붕괴를 여기서 잡는다.
  assert.ok(representatives.length > 0, 'some direct selection reaches a check unit the presets do not');
  t.diagnostic(`직접 선택 ${domains.length}개 투영, 타입 검사 ${representatives.length}개: ${representatives.join(' ')}`);
});
