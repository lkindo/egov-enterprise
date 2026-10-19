import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, posix, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { presetIds } from './composition-profiles.mjs';
import { parseModuleReferences } from './frontend-module-graph.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { createFrontendProjector, isFrontendModuleFile, parseMarkerBlocks, planFrontendRemoval } from './reusable-source-frontend.mjs';
import { isCopyableSourceFile, normalize, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';
import { SLOT_CONSUMER_PARTITION_KEYS, SLOT_REGISTRY_CONSUMERS, discoverSlotContributions, hubOfTabSlot, hubTabSlot, renderSlotRegistry,
  slotConsumerFiles, slotConsumerPartition, slotPathKind, slotRegistryPath } from './slot-registry.mjs';
import { readContributionEntries } from './operation-consumer-census.mjs';
import { runInNewContext } from 'node:vm';

// TypeScript 는 frontend 가 잠근 판(pnpm-lock)을 쓴다. 생성물의 tsc 와 같은 컴파일러다.
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const paths = {
  search: 'frontend/src/app/search/SearchClient.tsx',
  monitoring: 'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  maker: 'frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx',
};
const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')]));

// 생성기·정밀 점검과 같은 projector 로 투영한다(슬롯 단계 PR-2). 시작 구성도 해석기의 구성으로 투영한다(11단계 C3).
// transpileModule 은 문자열 단언이 볼 본문을 만드는 데만 쓴다(주석을 걷고 JSX 를 호출로 바꾼다). 투영 뒤의 구문·타입 오류는
// 아래 투영 타입 검사가 생성물과 같은 tsconfig 로 본다(PR-3).
let presetCatalog;
const presetCompositions = new Map();
function presetComposition(id) {
  presetCatalog ??= loadProjectComposerCatalog(resolve(import.meta.dirname, '..'));
  if (!presetCompositions.has(id)) {
    presetCompositions.set(id, resolveProjectRecipe({ schemaVersion: 1, project: { name: 'boundary-probe' }, sourceRef: 'main', selection: { preset: id },
      database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, presetCatalog));
  }
  return presetCompositions.get(id);
}
function projected(source, profile, label) {
  const result = createFrontendProjector({ composition: presetComposition(profile) }).project(label, source);
  return ts.transpileModule(result.source, {
    fileName: label,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, removeComments: true, verbatimModuleSyntax: true },
  }).outputText;
}

// 댓글 및 평가 관리 화면(허브 분해 H6). 댓글과 함께 남고 빠지므로 생성물에서는 없을 수 있다.
const MODERATION = new URL('../frontend/src/app/admin/system/comments/CommentModerationClient.tsx', import.meta.url);
const moderationSource = existsSync(MODERATION) ? readFileSync(MODERATION, 'utf8') : null;

// 기대는 시작 구성 이름이 아니라 그 구성의 기능으로 정한다(11단계 C8) — 시작 구성이 늘어도 규칙이 그대로 맞는다.
function boundaryErrors(source, profile, feature, moderation = moderationSource) {
  const text = projected(source, profile, paths[feature]);
  const domains = new Set(presetComposition(profile).resolvedDomains);
  const errors = [];
  if (feature === 'search') {
    if (!text.includes('userSearchService.searchAssignableUsers(query)') || !text.includes('menuService.getHeadMenus()')) errors.push('core search was removed');
    if (!domains.has('board') && /boardUserService|ArticleResultItem|ArrowRight|MessageSquare|id: ['"]articles['"]/.test(text)) errors.push(`excluded board search leaked into ${profile}`);
    if (domains.has('board') && !text.includes('boardUserService.searchPosts(query)')) errors.push('included board search was removed');
  }
  if (feature === 'monitoring') {
    for (const call of ['auditAdminService.getAuditLogs', 'systemLogAdminService.getSystemLogs', 'systemLogAdminService.getLoginLogs']) {
      if (!text.includes(call)) errors.push(`core monitoring was removed: ${call}`);
    }
    // [허브 분해 H6] 댓글 관리는 댓글 기능의 독립 화면이다 — 감시 허브는 어느 프로필에서도 댓글 코드를 갖지 않는다(마커도 없다).
    if (/commentQueryOptions|commentMutationOptions|handleDeleteComment|useMutation|MessageSquare|Trash2|useToast|useConfirm|tab: ['"]COMMENTS['"]/.test(text)) {
      errors.push('comments returned to the monitoring hub');
    }
    // 그 화면은 댓글과 함께 남고 빠진다(투영 마커가 아니라 파일 소유). 남는 구성에서는 삭제 통제(확인 뒤 대행 삭제)를 지킨다.
    if (domains.has('comment') && moderation !== null) {
      if (!moderation.includes('commentMutationOptions.removeAdmin') || !moderation.includes('await confirm(')) errors.push('comment deletion lost its control');
    }
  }
  if (feature === 'maker') {
    if (!text.includes('boardAdminService.createBoardMaster(') || !text.includes('menuAdminService.createMenu(')) errors.push('included board creation was removed');
    if (!domains.has('community') && /communityUserService|communityOptions|htmlFor: ['"]cmntySn['"]/.test(text)) errors.push(`excluded community ownership leaked into ${profile}`);
    if (domains.has('community') && !text.includes('communityUserService.getCommunityList(')) errors.push('included community selection was removed');
  }
  return errors;
}

for (const profile of presetIds()) {
  test(`${profile} retains shared UI and includes optional axes only with their owning features`, () => {
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
  // 규칙은 공용 파서가 지키므로 블록을 걷는 구성(core)·남기는 구성(demo)·직접 선택 투영(생성기·정밀 점검·도달성 census)이 모두 같은
  // 자리에서 실패한다(11단계 C5 — pack 투영을 걷었다).
  const projectors = {
    core: createFrontendProjector({ composition: presetComposition('core') }),
    demo: createFrontendProjector({ composition: presetComposition('demo') }),
    custom: createFrontendProjector({ composition: { profile: 'custom', resolvedDomains: [], frontend: { removePaths: [] } } }),
  };
  // 토큰은 기능 id 다(11단계 C6). 커뮤니티 블록은 core 에서 걷히고 demo 에서 남는다.
  const block = body => `export default function Page() {\n  // reusable-base:community:start\n${body}\n  // reusable-base:community:end\n  return null;\n}\n`;
  for (const body of ["  redirect('/x');", '  return <Demo />;']) {
    for (const label of ['src/app/demo/page.tsx', 'frontend/src/app/demo/page.tsx']) {
      assert.throws(() => projectors.core.project(label, block(body)), /page 파일의 마커 블록은 redirect 호출이나 return 을 품을 수 없다/,
        'a page block may not carry a redirect or return');
    }
  }
  // 남기는 블록이어도, 직접 선택 투영이어도 같다 — 프로필마다 갈리는 것이 문제다.
  assert.throws(() => projectors.demo.project('src/app/demo/page.tsx', block("  redirect('/x');")), /redirect 호출이나 return/);
  assert.throws(() => projectors.custom.project('src/app/demo/page.tsx', block("  redirect('/x');")), /redirect 호출이나 return/);
  assert.throws(() => parseMarkerBlocks(block("  redirect('/x');"), { label: 'src/app/demo/page.tsx' }), /redirect 호출이나 return/);
  // 대조군: 주석 속 return, page 가 아닌 파일, 근거가 없는 블록은 파서를 통과한다. 구성 투영은 기능 파일에 선언하지 않은 블록을
  // 거부하므로(11단계 C3·C6) 파서 대조군은 공용 파서로 직접 본다.
  assert.doesNotThrow(() => parseMarkerBlocks(block('  // return later'), { label: 'src/app/demo/page.tsx' }));
  assert.doesNotThrow(() => parseMarkerBlocks(block("  redirect('/x');"), { label: 'src/app/demo/DemoClient.tsx' }));
  assert.doesNotThrow(() => parseMarkerBlocks(block('  const x = 1;'), { label: 'src/app/demo/page.tsx' }));
  assert.throws(() => projectors.core.project('src/app/demo/page.tsx', block('  const x = 1;')), /Unclassified composer UI block: src\/app\/demo\/page\.tsx\/community/);
  // next.config 의 리다이렉트 선언은 거버넌스 투영이 정리하므로 마커를 두지 않는다. Next 가 읽는 설정 파일 전부(Next 16 은 .mts 도
  // 읽는다)이고, 투영 판정(isFrontendModuleFile)처럼 확장자 대소문자를 가리지 않는다.
  for (const label of ['next.config.ts', 'next.config.mts', 'frontend/next.config.mts', 'next.config.mjs', 'next.config.js', 'next.config.MTS']) {
    assert.throws(() => projectors.core.project(label, block('  const x = 1;')), /next\.config 는 마커를 둘 수 없다/,
      `${label} cannot carry markers`);
  }
});

test('unscoped optional imports and removed shared service calls are reproducible reds', () => {
  const importLeak = sources.search.replace('/* reusable-base:board:start */', '').replace('/* reusable-base:board:end */', '');
  assert.match(boundaryErrors(importLeak, 'core', 'search').join('\n'), /excluded board search/);
  const deletedCoreSearch = sources.search.replace('userSearchService.searchAssignableUsers(query)', 'Promise.resolve([])');
  assert.match(boundaryErrors(deletedCoreSearch, 'core', 'search').join('\n'), /core search was removed/);
  // [허브 분해 H6] 확인 뒤 대행 삭제 통제는 감시 허브가 아니라 댓글 및 평가 관리 화면에 있다 — 그 화면의 소스를 바꿔 본다.
  if (moderationSource !== null) {
    const missingConfirmation = moderationSource.replace('await confirm(', 'await uncheckedConfirmation(');
    assert.notEqual(missingConfirmation, moderationSource, 'the moderation screen must still confirm before deleting');
    assert.match(boundaryErrors(sources.monitoring, 'collaboration', 'monitoring', missingConfirmation).join('\n'), /lost its control/);
  }
  for (const profile of ['core', 'collaboration']) {
    const leakedCommentHook = `${sources.monitoring}\nconst toast = useToast();\n`;
    assert.match(boundaryErrors(leakedCommentHook, profile, 'monitoring').join('\n'), /comments returned to the monitoring hub/);
  }
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
    // 구성 사이에는 SourceFile 을 나눠 쓴다. 모듈 해석은 프로그램마다 따로 한다 — 해석 결과는 SourceFile 이 아니라 프로그램에 담긴다.
    //   lib·node_modules 는 경로로, 프로젝트 파일은 투영이 바꾸지 않았고 파싱한 원문과 지금 원문이 같을 때만 나눠 쓴다(아래 getSourceFile).
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
  const projector = createFrontendProjector({ composition, files: files.map(path => normalize(relative(frontendRoot, path))) });
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
    /*
     * 같은 경로·같은 원문·같은 파싱 옵션의 SourceFile 은 어느 프로그램에서든 같은 구문 트리이고, 바인더는 이미 바인딩한 파일을
     * 건너뛰며 바인딩 결과는 그 파일과 컴파일 옵션(모든 구성이 같은 tsconfig)으로만 정해진다. 해석·검사는 프로그램마다 새로 하므로
     * 진단 집합은 나눠 쓰지 않을 때와 같다. 투영으로 지운 파일은 캐시보다 먼저 없는 것으로 보고, 투영이 바꾼 파일은 늘 새로 파싱한다.
     * 프로젝트 파일은 대소문자까지 같은 경로로만 찾는다 — 다른 철자로 닿은 import 가 앞 구성의 파일 이름을 물려받지 않게 한다.
     */
    getSourceFile(fileName, setting) {
      if (hidden(fileName)) return undefined;
      const key = keyOf(fileName);
      const options = typeof setting === 'object' ? setting : { languageVersion: setting };
      const parsing = `${options.languageVersion}|${options.impliedNodeFormat}|${options.jsDocParsingMode}`;
      if (key.includes('/node_modules/')) {
        const cacheKey = `${key}|${parsing}`;
        if (!sharedSourceFiles.has(cacheKey)) {
          const text = readFile(fileName);
          if (text === undefined) return undefined;
          sharedSourceFiles.set(cacheKey, { sourceFile: ts.createSourceFile(fileName, text, setting) });
        }
        return sharedSourceFiles.get(cacheKey).sourceFile;
      }
      const text = readFile(fileName);
      if (text === undefined) return undefined;
      if (tree.contents.has(key)) return ts.createSourceFile(fileName, text, setting);
      const cacheKey = `${fileName}|${parsing}`;
      const cached = sharedSourceFiles.get(cacheKey);
      if (cached?.text === text) return cached.sourceFile;
      const sourceFile = ts.createSourceFile(fileName, text, setting);
      sharedSourceFiles.set(cacheKey, { text, sourceFile });
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

/*
 * SourceFile 공유의 대조군. 앞 구성이 나눠 쓰는 바뀌지 않은 파일에 미사용 import 를 주입한 구성은 붉다(투영 내용이 캐시를 이긴다).
 * 바로 다음 구성은 같은 파일을 원문으로 다시 검사해 푸르다(주입한 트리가 캐시를 더럽히지 않는다). 원문 구성 둘은 같은 SourceFile
 * 을 받아야 한다 — 공유가 꺼져 대조가 헛돌지 않는지도 본다.
 */
test('an unused import injected into a shared unchanged file is red and the next configuration stays green', { timeout: 300_000 }, () => {
  const inputs = readProjectionInputs();
  const base = projectedTree({ preset: 'core' }, inputs);
  const probe = base.roots.find(path => !base.contents.has(keyOf(path)) && /(?<!\.d)\.tsx?$/.test(path));
  assert.ok(probe, 'core reaches an unchanged root file to probe');
  const probeTree = contents => ({ ...base, contents, roots: [probe] });
  const injected = new Map([...base.contents, [keyOf(probe), `import * as projectionCacheProbe from 'react';\n${inputs.original(probe)}`]]);
  const runs = [base.contents, injected, base.contents].map(contents => {
    const { program, missingRoots, diagnostics } = typeCheckProjection(probeTree(contents), inputs);
    assert.deepEqual(missingRoots, [], 'the probe is in the projected program');
    return { sourceFile: program.getSourceFile(probe), diagnostics: diagnostics.map(describeDiagnostic) };
  });
  assert.deepEqual(runs[0].diagnostics, [], 'the original probe file type-checks');
  assert.ok(runs[1].diagnostics.some(line => line.startsWith(`${relOf(probe)}:1 TS6133 'projectionCacheProbe'`)),
    `the injected unused import is reported: ${runs[1].diagnostics.join(' | ')}`);
  assert.deepEqual(runs[2].diagnostics, [], 'the next configuration does not inherit the injected file');
  // SourceFile 을 값으로 넘기면 실패 보고가 구문 트리 전체를 그리다 메모리가 바닥난다 — 같은 객체인지를 참거짓으로 넘긴다.
  assert.ok(runs[2].sourceFile === runs[0].sourceFile, 'unchanged project files are shared between configurations');
  assert.ok(runs[1].sourceFile !== runs[0].sourceFile, 'a projected change is parsed afresh');
});

/*
 * 슬롯(슬롯 단계 PR-4). 기능은 core 셸에 마커 블록 대신 기여 파일(src/extensions/<기능 id>/<슬롯>.ts)로 값을 더하고, 셸은 생성
 * 레지스트리(src/extensions/generated-<슬롯>.ts)만 읽는다. 레지스트리는 투영(createFrontendProjector)이 직접 제거 경로에 걸리지 않은
 * 기여로 다시 렌더한다. 이 절은 그 장치가 원본에서 정확하고(parity), 이름이 한 철자이며, 소비자가 정해진 자리에만 있고, 기여 파일이
 * 셸 밖의 일을 몰래 하지 않는지 본다. 뷰·폼·쓰기·URL 을 담는 기여는 그것을 보는 census 를 넓히는 변경과 함께 들인다(설계 §5).
 */
// 슬롯 레지스트리를 import 해도 되는 모듈 표(SLOT_REGISTRY_CONSUMERS)는 scripts/slot-registry.mjs 가 정본이다 — census 도 같은 표를
// 쓴다(허브별 쓰기 귀속). 표에 없는 모듈이 import 하면 붉다 — 범용 플러그인 로더를 막고 grep 경로를 고정한다.
/**
 * 링크 키(href·url·link·moreHref)를 가질 수 있는 슬롯. 셸 링크 슬롯(PR-6)과 통계 패널(허브 분해 H4 — 라우트인 탭)이 링크 슬롯이다.
 * 관리 링크 census 가 그 항목을 본다.
 */
const LINK_SLOTS = new Set(['shell-links', 'stats-panels']);
const LINK_KEYS = new Set(['href', 'url', 'link', 'moreHref']);
/**
 * 슬롯 종류 상한(설계서 16.5). 종류는 SlotMap 의 항목 타입이다 — 허브 탭은 허브마다 슬롯(hub-tabs-<허브>)을 두지만 항목 타입은
 * HubTab<허브> 하나라 한 종류로 센다(GAP-SLOT-001). 같은 항목 타입을 여러 슬롯이 쓰는 것은 허브 탭뿐이다(아래 시험).
 */
const MAX_SLOT_KINDS = 10;
const SLOTS_SOURCE = join(frontendRoot, 'src/extensions/slots.ts');

const repoRel = path => normalize(relative(repoRoot, path));
const frontendRel = path => normalize(relative(frontendRoot, path));

/** SlotMap 인터페이스의 멤버(슬롯 이름 → 항목 타입 원문). 타입 원천에서 읽는다. */
function slotMapMembers(source = readFileSync(SLOTS_SOURCE, 'utf8')) {
  const file = ts.createSourceFile(SLOTS_SOURCE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const map = file.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'SlotMap');
  assert.ok(map, 'slots.ts declares the SlotMap interface');
  return map.members.map(member => ({
    slot: ts.isStringLiteral(member.name) || ts.isIdentifier(member.name) ? member.name.text : `<${ts.SyntaxKind[member.name.kind]}>`,
    type: member.type,
  }));
}

/** SlotMap 인터페이스의 키(슬롯 이름). */
function slotMapKeys(source) {
  return slotMapMembers(source).map(({ slot }) => slot);
}

/** 슬롯의 종류(항목 타입 이름 — 타입 인자는 뺀다)와 타입 인자 원문. 타입 참조가 아니면 원문 그대로를 종류로 본다. */
function slotKindOf(type) {
  if (type && ts.isTypeReferenceNode(type)) {
    return { kind: type.typeName.getText(), args: (type.typeArguments ?? []).map(argument => argument.getText()) };
  }
  return { kind: type?.getText() ?? '?', args: [] };
}

/** shell-links 의 배치(닫힌 목록). 소비 셸이 있는 자리만 둔다. */
const SHELL_LINK_PLACEMENTS = new Set(['header', 'footer', 'error', 'command-center', 'collaboration-hub', 'work-hub', 'work-report']);
/** 아이콘이 있는 목록이라 icon 이 필요한 배치(머리글 아이콘 단추·명령 센터 목록·업무 보고 머리 단추). */
const ICON_PLACEMENTS = new Set(['header', 'command-center', 'work-report']);
/** 글자 탭이라 icon 을 두지 않는 배치(나의 업무 탭 줄). 두면 셸이 버리는 데이터가 된다. */
const ICONLESS_PLACEMENTS = new Set(['work-hub']);
const WORK_HUB_TABS = join(frontendRoot, 'src/components/business/work-hub/work-hub-tabs.tsx');

/** 나의 업무 탭 줄의 core 탭(work-hub-tabs.tsx 의 CORE_TAB). 기여 탭의 id·목적지는 이것과 겹치지 않는다 — id 가 탭 DOM id 가 된다. */
function workHubCoreTab(source = readFileSync(WORK_HUB_TABS, 'utf8')) {
  const match = /const CORE_TAB = \{ id: '([a-z][a-z0-9-]*)', href: '([^']+)'/.exec(source);
  return match ? { id: match[1], href: match[2] } : null;
}

/** 주체 없이 거르는 배치 — 바닥글은 서버 컴포넌트, 오류 화면은 인증 공급자에 기대지 않는 경계다. /admin 아래 page 술어는 늘 거짓이 된다. */
const SUBJECTLESS_PLACEMENTS = new Set(['footer', 'error']);
/** 페이지 게이트가 있는 경로(frontend/src/lib/auth/page-access.ts 의 isGatedPath 와 같은 경계). */
const isGatedPath = href => /^\/admin(?:[/?#]|$)/i.test(href);
/** 앱 안 경로. '//host' 와 '/\host' 는 '/' 로 시작해도 브라우저가 프로토콜 상대 주소(외부)로 읽는다. */
const isInternalPath = href => /^\/(?![/\\])/.test(href);

/**
 * shell-links 항목 규칙(슬롯 단계 PR-6). 셸은 이 값을 그대로 그리므로 기여 원문에서 정적으로 판정한다.
 * - 배치는 header·footer·error 리터럴, href 는 '/' 로 시작하는 앱 안 경로 리터럴('//'·'/\' 로 시작하는 외부 주소는 안 된다),
 *   visibleWhen 은 { page: 자기 href } 하나다.
 * - 바닥글·오류 화면 배치는 주체 없이 거르므로 /admin 밖 목적지만 둔다(그렇지 않으면 항목이 아무 신호 없이 늘 숨는다).
 * - 머리글 배치는 아이콘 단추, 명령 센터 배치는 아이콘이 있는 목록이라 icon 이 필요하다(없으면 빈 단추·빈 칸이 된다). 업무 보고 머리
 *   배치(work-report)도 아이콘 단추라 icon 이 필요하다.
 * - 나의 업무 탭 줄 배치(work-hub)는 글자 탭이라 icon 을 두지 않고, id·목적지가 core 탭(업무 관리)과 겹치지 않는다 — id 가 탭 DOM id
 *   (work-hub-tab-<id>)가 되고 core 탭과 같은 목적지면 탭이 둘이 된다. 두 배치 모두 주체가 있는 소비자라 /admin 목적지를 둘 수 있다.
 * - fill 화면은 바닥글을 숨긴다(globals.css). 바닥글 항목은 같은 기여 안에 같은 목적지의 머리글 짝이 있어야 한다 — 기여 파일 하나가
 *   함께 지워지므로 머리글이 먼저 빠지는 프로필이 없다(종전 셸 접근성 계약의 pack 대조를 대신한다).
 */
function shellLinkViolations(entries, label, { coreTab = workHubCoreTab() } = {}) {
  const violations = [];
  const text = node => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
  const prop = (object, name) => object.properties.find(property => ts.isPropertyAssignment(property)
    && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === name);
  const rows = [];
  for (const element of entries.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      violations.push(`${label}: shell-links 항목은 객체 리터럴이다`);
      continue;
    }
    const id = text(prop(element, 'id')?.initializer) ?? '?';
    const placement = text(prop(element, 'placement')?.initializer);
    const href = text(prop(element, 'href')?.initializer);
    const rule = prop(element, 'visibleWhen')?.initializer;
    const page = rule && ts.isObjectLiteralExpression(rule) && rule.properties.length === 1 ? text(prop(rule, 'page')?.initializer) : undefined;
    if (!SHELL_LINK_PLACEMENTS.has(placement)) violations.push(`${label}: ${id} 의 배치는 ${[...SHELL_LINK_PLACEMENTS].join('·')} 리터럴이다`);
    if (href === undefined || !isInternalPath(href)) {
      violations.push(`${label}: ${id} 의 href 는 '/' 로 시작하는 문자열 리터럴이다('//'·'/\\' 로 시작하면 브라우저가 외부 주소로 읽는다)`);
    }
    if (page === undefined || page !== href) violations.push(`${label}: ${id} 의 visibleWhen 은 { page: 자기 href } 여야 한다`);
    if (SUBJECTLESS_PLACEMENTS.has(placement) && href !== undefined && isGatedPath(href)) {
      violations.push(`${label}: ${id} — ${placement} 배치는 주체 없이 거르므로 /admin 밖 목적지만 둔다`);
    }
    if (ICON_PLACEMENTS.has(placement) && !prop(element, 'icon')) violations.push(`${label}: ${id} — ${placement} 배치는 아이콘이 있는 목록이라 icon 이 필요하다`);
    if (ICONLESS_PLACEMENTS.has(placement) && prop(element, 'icon')) violations.push(`${label}: ${id} — ${placement} 배치는 글자 탭이라 icon 을 두지 않는다`);
    if (placement === 'work-hub' && (!coreTab || id === coreTab.id || href === coreTab.href)) {
      violations.push(`${label}: ${id} — work-hub 배치는 core 탭(업무 관리)의 id·목적지와 겹치지 않는다`);
    }
    rows.push({ id, placement, href });
  }
  for (const row of rows.filter(candidate => candidate.placement === 'footer')) {
    if (!rows.some(candidate => candidate.placement === 'header' && candidate.href === row.href)) {
      violations.push(`${label}: ${row.id} — 바닥글 항목에 같은 목적지의 머리글 짝이 이 기여 안에 없다`);
    }
  }
  return violations;
}

/** 통계 셸이 스스로 두는 탭 id(IntelligenceHubClient 의 CORE_TABS). 기여 탭 id 는 이것과 겹치지 않는다. */
function statsCoreTabIds(source = readFileSync(join(frontendRoot, 'src/app/admin/stats/IntelligenceHubClient.tsx'), 'utf8')) {
  const table = source.match(/const CORE_TABS[\s\S]*?\];/)?.[0] ?? '';
  return [...table.matchAll(/\{ id: '([A-Z][A-Z0-9_]*)'/g)].map(match => match[1]);
}

/**
 * stats-panels 항목 규칙(허브 분해 H4). 셸은 이 값으로 탭·조회·요약 칸을 만들므로 기여 원문에서 정적으로 판정한다.
 * - placement 는 hub-tab·overview-card 리터럴, order 는 숫자 리터럴, id 는 대문자 식별자 리터럴(body 탭은 `?tab=` 값이다)이고
 *   셸 탭 id 와 겹치지 않는다.
 * - hub-tab 의 kind 는 series·body 리터럴이다. series 는 탭이 곧 라우트라 href 가 '/' 로 시작하는 앱 안 경로 리터럴이고 visibleWhen 은
 *   { page: 자기 href } 하나다(셸 링크와 같은 규칙 — 관리 링크 census 가 page 술어를 게이트로 본다). uninstrumented 는 참거짓 리터럴이다.
 * - body 와 overview-card 는 href 를 두지 않는다(라우트가 없다 — body 는 `?tab=` 으로 연다).
 */
function statsPanelViolations(entries, label, { coreTabs = statsCoreTabIds() } = {}) {
  const violations = [];
  const text = node => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
  const prop = (object, name) => object.properties.find(property => ts.isPropertyAssignment(property)
    && ts.isIdentifier(property.name) && property.name.text === name);
  for (const element of entries.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      violations.push(`${label}: stats-panels 항목은 객체 리터럴이다`);
      continue;
    }
    const id = text(prop(element, 'id')?.initializer);
    const name = id ?? '?';
    const placement = text(prop(element, 'placement')?.initializer);
    const kind = text(prop(element, 'kind')?.initializer);
    const order = prop(element, 'order')?.initializer;
    const href = prop(element, 'href') ? text(prop(element, 'href').initializer) ?? null : undefined;
    const rule = prop(element, 'visibleWhen')?.initializer;
    const page = rule && ts.isObjectLiteralExpression(rule) && rule.properties.length === 1 ? text(prop(rule, 'page')?.initializer) : undefined;
    const uninstrumented = prop(element, 'uninstrumented')?.initializer;
    if (placement !== 'hub-tab' && placement !== 'overview-card') violations.push(`${label}: ${name} 의 placement 는 hub-tab·overview-card 리터럴이다`);
    if (id === undefined || !/^[A-Z][A-Z0-9_]*$/.test(id)) violations.push(`${label}: ${name} 의 id 는 대문자 식별자 리터럴이다`);
    else if (coreTabs.includes(id)) violations.push(`${label}: ${name} — 통계 셸 탭과 겹친다`);
    if (!order || !ts.isNumericLiteral(order)) violations.push(`${label}: ${name} 의 order 는 숫자 리터럴이다`);
    const series = placement === 'hub-tab' && kind === 'series';
    if (placement === 'hub-tab' && kind !== 'series' && kind !== 'body') violations.push(`${label}: ${name} 의 kind 는 series·body 리터럴이다`);
    if (series) {
      if (typeof href !== 'string' || !isInternalPath(href)) violations.push(`${label}: ${name} 의 href 는 '/' 로 시작하는 앱 안 경로 리터럴이다`);
      if (page === undefined || page !== href) violations.push(`${label}: ${name} 의 visibleWhen 은 { page: 자기 href } 여야 한다`);
      if (!uninstrumented || (uninstrumented.kind !== ts.SyntaxKind.TrueKeyword && uninstrumented.kind !== ts.SyntaxKind.FalseKeyword)) {
        violations.push(`${label}: ${name} 의 uninstrumented 는 참거짓 리터럴이다`);
      }
    } else if (href !== undefined) {
      violations.push(`${label}: ${name} — 라우트가 없는 항목(body 탭·요약 칸)은 href 를 두지 않는다`);
    }
  }
  return violations;
}

/** HubTabViews 인터페이스의 키(허브 이름). 타입 원천에서 읽는다. */
function hubViewKeys(source = readFileSync(SLOTS_SOURCE, 'utf8')) {
  const file = ts.createSourceFile(SLOTS_SOURCE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const views = file.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'HubTabViews');
  assert.ok(views, 'slots.ts declares the HubTabViews interface');
  return views.members.map(member => (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : '?'));
}

/**
 * 허브 탭 해석 모듈(`src/app/** /*-tabs.ts` 의 TAB_HUB)을 import 없이 평가한다 — 탭 목적지 계약과 같은 방법이다(실행 import 를 두지
 * 않는 모듈이라 생성물에서도 읽힌다). slotHub 가 있는 모듈만 허브 탭 기여를 받는 허브이고, 그 기여 슬롯은 hub-tabs-<slotHub> 다.
 */
function hubTabModules(files = readProjectionInputs().files) {
  const modules = new Map();
  for (const path of files.filter(file => /\/src\/app\/.+-tabs\.ts$/.test(file.replaceAll('\\', '/')))) {
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    assert.doesNotMatch(outputText, /\brequire\(/, `${relOf(path)}: 탭 해석 모듈은 실행 import 를 두지 않는다`);
    const sandbox = { module: { exports: {} } };
    runInNewContext(outputText, { module: sandbox.module, exports: sandbox.module.exports });
    const hub = sandbox.module.exports.TAB_HUB;
    if (hub?.slotHub) modules.set(hub.slotHub, { file: relOf(path), hub });
  }
  return modules;
}

/** 허브 탭 항목의 키(닫힌 목록). 허브는 슬롯 이름이 정하므로 항목에 hub 를 두지 않는다(GAP-SLOT-001). */
const HUB_TAB_KEYS = new Set(['id', 'order', 'label', 'view', 'visibleWhen']);

/**
 * 허브 탭(hub-tabs-<허브>) 항목 규칙(허브 분해 H1, GAP-SLOT-001). 셸은 이 값으로 탭을 그리고 `?tab=` 을 읽으므로 기여 원문에서 정적으로
 * 판정한다. hub 는 슬롯 이름에서 온다.
 * - 슬롯의 허브는 HubTabViews 키다. 항목 키는 id·order·label·view·visibleWhen 뿐이다.
 * - id 는 대문자 식별자 리터럴(`?tab=` 값), order 는 숫자 리터럴, view 는 import 한 이름이나 이름만 담은 객체.
 * - id 는 그 허브 탭 해석의 contributable 이 이 파일을 지목하는 탭이고, 셸 고유 탭(parse(id) 가 기여 없이 받는 값)이 아니다.
 */
function hubTabViolations(entries, label, { file, hub, hubs = hubViewKeys(), modules = hubTabModules() } = {}) {
  const violations = [];
  if (!hubs.includes(hub)) violations.push(`${label}: 허브 탭 슬롯의 허브(${hub})는 ${hubs.join('·')} 가운데 하나다(hub-tabs-<허브>)`);
  const text = node => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
  const prop = (object, name) => object.properties.find(property => ts.isPropertyAssignment(property)
    && ts.isIdentifier(property.name) && property.name.text === name);
  for (const element of entries.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      violations.push(`${label}: 허브 탭 항목은 객체 리터럴이다`);
      continue;
    }
    const id = text(prop(element, 'id')?.initializer);
    const order = prop(element, 'order')?.initializer;
    const view = prop(element, 'view')?.initializer;
    const name = id ?? '?';
    for (const property of element.properties) {
      const key = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : '?';
      if (!HUB_TAB_KEYS.has(key)) violations.push(`${label}: ${name} 의 키 ${key} 는 허브 탭 항목 키(${[...HUB_TAB_KEYS].join('·')})가 아니다`);
    }
    if (id === undefined || !/^[A-Z][A-Z0-9_]*$/.test(id)) violations.push(`${label}: ${name} 의 id 는 \`?tab=\` 값인 대문자 식별자 리터럴이다`);
    if (!order || !ts.isNumericLiteral(order)) violations.push(`${label}: ${name} 의 order 는 숫자 리터럴이다`);
    const named = node => node && ts.isIdentifier(node);
    if (!(named(view) || (view && ts.isObjectLiteralExpression(view) && view.properties.length > 0
      && view.properties.every(property => ts.isPropertyAssignment(property) && named(property.initializer))))) {
      violations.push(`${label}: ${name} 의 view 는 import 한 이름이거나 이름만 담은 객체다`);
    }
    if (id === undefined || !hubs.includes(hub)) continue;
    const tabs = modules.get(hub);
    if (!tabs) {
      violations.push(`${label}: ${name} — 허브 ${hub} 의 탭 해석 모듈(TAB_HUB.slotHub)이 없다`);
      continue;
    }
    if (tabs.hub.parse(id, []) !== null) violations.push(`${label}: ${name} — 허브 ${hub} 의 셸 고유 탭과 겹친다(${tabs.file})`);
    if (tabs.hub.contributable?.[id] !== file) {
      violations.push(`${label}: ${name} — ${tabs.file} 의 TAB_HUB.contributable 이 이 탭을 이 기여 파일로 지목하지 않는다`);
    }
  }
  return violations;
}

/** home-sections 의 배치(닫힌 목록). 업무 홈 셸이 그리는 자리만 둔다. */
const HOME_PLACEMENTS = new Set(['overlay', 'actions', 'cards', 'main', 'status', 'bottom']);
const HOME_SECTION_KEYS = new Set(['id', 'placement', 'order', 'Component', 'prefetch', 'activityNote', 'visibleWhen']);
const HOME_FAILURES = new Set(['boundary', 'section']);

/** frontend 기준 경로의 모듈 원문(확장자를 붙여 찾는다). 없으면 undefined. */
function readFrontendModule(target) {
  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]) {
    const path = join(frontendRoot, candidate);
    if (existsSync(path) && !candidate.endsWith('/')) {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        // 폴더면 다음 후보를 본다.
      }
    }
  }
  return undefined;
}

/** 모듈의 첫 문장이 'use client' 지시문인지. 모듈을 읽을 수 없으면 undefined(판정 불가 — 위반으로 다룬다). */
function startsWithUseClient(source) {
  if (source === undefined) return undefined;
  const first = ts.createSourceFile('module.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).statements[0];
  return Boolean(first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client');
}

/**
 * home-sections 항목 규칙(Phase 2 9단계). 업무 홈은 서버 자식(home-data-boundary.tsx)도 레지스트리를 읽는다 — 그래서 기여가 가리키는 두
 * 이름의 모듈 경계를 정적으로 판정한다.
 * - 규칙 1: prefetch 의 query 는 'use client' 가 없는 모듈에서 가져온다. 'use client' 모듈의 값은 서버에서 클라이언트 참조가 되어,
 *   서버 자식이 조회를 부를 수 없다(미리 채우기가 조용히 빠지거나 서버에서 실패한다).
 * - 규칙 2: Component 는 'use client' 모듈에서 가져온다. ssr:false 래퍼는 서버 컴포넌트에서 쓸 수 없는데(Next), 'use client' 가 없는
 *   모듈의 래퍼는 레지스트리를 통해 서버 그래프에 들어간다.
 * - placement 는 닫힌 배치 리터럴, order 는 숫자 리터럴, prefetch 는 { query: import 한 이름, failure: boundary·section } 배열,
 *   activityNote 는 비지 않은 문자열 리터럴이다. 그 밖의 키는 두지 않는다.
 * importedFrom 은 기여의 import 이름 → 지정자, readModule 은 frontend 기준 경로 → 원문이다.
 */
function homeSectionViolations(entries, label, { file, importedFrom, readModule = readFrontendModule }) {
  const violations = [];
  const text = node => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
  const prop = (object, name) => object.properties.find(property => ts.isPropertyAssignment(property)
    && ts.isIdentifier(property.name) && property.name.text === name);
  const moduleOf = specifier => (specifier?.startsWith('@/') ? `src/${specifier.slice(2)}`
    : specifier?.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), specifier)) : undefined);
  const clientModule = name => {
    const target = moduleOf(importedFrom.get(name));
    return target === undefined ? undefined : startsWithUseClient(readModule(target));
  };
  for (const element of entries.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      violations.push(`${label}: home-sections 항목은 객체 리터럴이다`);
      continue;
    }
    const name = text(prop(element, 'id')?.initializer) ?? '?';
    for (const property of element.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && !HOME_SECTION_KEYS.has(property.name.text)) {
        violations.push(`${label}: ${name} 에 home-sections 가 모르는 키(${property.name.text})가 있다`);
      }
    }
    if (!HOME_PLACEMENTS.has(text(prop(element, 'placement')?.initializer))) {
      violations.push(`${label}: ${name} 의 배치는 ${[...HOME_PLACEMENTS].join('·')} 리터럴이다`);
    }
    const order = prop(element, 'order')?.initializer;
    if (!order || !ts.isNumericLiteral(order)) violations.push(`${label}: ${name} 의 order 는 숫자 리터럴이다`);
    const component = prop(element, 'Component')?.initializer;
    if (!component || !ts.isIdentifier(component)) violations.push(`${label}: ${name} 의 Component 는 import 한 이름이다`);
    else if (clientModule(component.text) !== true) {
      violations.push(`${label}: ${name} 의 Component(${component.text})는 'use client' 모듈에서 가져온다 — 서버 자식도 레지스트리를 읽는다`);
    }
    const note = prop(element, 'activityNote')?.initializer;
    if (note && !text(note)?.trim()) violations.push(`${label}: ${name} 의 activityNote 는 비지 않은 문자열 리터럴이다`);
    const prefetch = prop(element, 'prefetch')?.initializer;
    if (!prefetch) continue;
    if (!ts.isArrayLiteralExpression(prefetch) || prefetch.elements.length === 0) {
      violations.push(`${label}: ${name} 의 prefetch 는 비지 않은 배열이다`);
      continue;
    }
    for (const item of prefetch.elements) {
      const query = ts.isObjectLiteralExpression(item) ? prop(item, 'query')?.initializer : undefined;
      const failure = ts.isObjectLiteralExpression(item) ? text(prop(item, 'failure')?.initializer) : undefined;
      if (!ts.isObjectLiteralExpression(item) || item.properties.length !== 2 || !query || !ts.isIdentifier(query) || !HOME_FAILURES.has(failure)) {
        violations.push(`${label}: ${name} 의 prefetch 항목은 { query: import 한 이름, failure: boundary·section } 이다`);
        continue;
      }
      if (clientModule(query.text) !== false) {
        violations.push(`${label}: ${name} 의 prefetch(${query.text})는 'use client' 가 없는 모듈에서 가져온다 — 서버 자식이 그 값으로 조회한다`);
      }
    }
  }
  return violations;
}

/**
 * 기여 파일 하나의 함정 규칙 위반. `ownPaths` 는 그 기능의 owns.frontend, `foreignPaths` 는 다른 기능의 owns.frontend 합집합이다
 * (둘 다 frontend 기준).
 * - .ts 만, JSX 금지, 최상위 문장은 import 와 default export(defineContributions('<파일 이름>', [...])) 하나뿐이다. 이름 있는 export·
 *   지역 선언·식 문장은 두지 않는다 — 모듈을 읽기만 해도 무언가 하는 기여(최상위 호출)를 막는다.
 * - 항목은 데이터다. 값은 문자열·숫자·참거짓 리터럴, `키: 값` 꼴의 객체, 배열, `as const`, import 한 이름뿐이다. 함수·호출·new·await·
 *   단축·계산·펼침 속성은 둘 수 없다 — 쓰기는 셸이 부르는 자기 기능 모듈에 두고, 기여는 그 이름을 가리키기만 한다.
 * - import 는 중립 모듈(@/extensions/slots, lucide-react, 어떤 기능도 소유하지 않는 @/types/*·@/lib/*)이나 자기 기능 경로 아래만.
 *   다른 기능이 소유한 @/lib·@/types 파일을 가져오면 그 기능이 빠진 구성에서 기여·레지스트리·셸이 연쇄로 지워진다.
 * - 항목마다 id 는 문자열 리터럴, always 사유는 비지 않은 문자열 리터럴, 링크 키는 링크 슬롯에서만.
 */
function contributionViolations({ file, source, owner, slot, ownPaths, foreignPaths, readModule }) {
  const violations = [];
  const label = `frontend/${file}`;
  if (!file.endsWith('.ts')) violations.push(`${label}: 기여는 .ts 여야 한다`);
  const ast = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const walk = node => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) violations.push(`${label}: 기여는 JSX 를 둘 수 없다`);
    ts.forEachChild(node, walk);
  };
  walk(ast);
  const defaults = [];
  const imported = new Set();
  const importedFrom = new Map();
  for (const statement of ast.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const from = ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined;
      const add = name => {
        imported.add(name);
        importedFrom.set(name, from);
      };
      if (clause?.name) add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) add(clause.namedBindings.name.text);
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const element of clause.namedBindings.elements) add(element.name.text);
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      defaults.push(statement);
    } else if (ts.isExportDeclaration(statement)
      || (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))) {
      violations.push(`${label}: 기여는 default export 하나만 둔다(이름 있는 export 금지)`);
    } else {
      violations.push(`${label}: 기여의 최상위 문장은 import 와 default export 하나뿐이다(${ts.SyntaxKind[statement.kind]})`);
    }
  }
  /** 항목 값 하나를 데이터로 검사한다. */
  const value = node => {
    if (ts.isParenthesizedExpression(node)) return value(node.expression);
    if (ts.isAsExpression(node) && ts.isConstTypeReference(node.type)) return value(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)
      || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return;
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return;
    if (ts.isIdentifier(node)) {
      if (!imported.has(node.text)) violations.push(`${label}: 항목 값의 이름 ${node.text} 은 import 한 이름이어야 한다`);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) value(element);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
          violations.push(`${label}: 기여 데이터는 \`키: 값\` 꼴만 쓴다(단축·계산·펼침·메서드·따옴표 키 금지: ${ts.SyntaxKind[ts.isPropertyAssignment(property) ? property.name.kind : property.kind]})`);
          continue;
        }
        const key = property.name.text;
        if (LINK_KEYS.has(key) && !LINK_SLOTS.has(slot)) violations.push(`${label}: 링크 슬롯이 아닌 기여에 링크 키(${key})가 있다`);
        if (key === 'always' && !((ts.isStringLiteral(property.initializer) || ts.isNoSubstitutionTemplateLiteral(property.initializer))
          && property.initializer.text.trim())) {
          violations.push(`${label}: always 술어는 비지 않은 사유 문자열이어야 한다`);
        }
        value(property.initializer);
      }
      return;
    }
    violations.push(`${label}: 기여 항목에는 리터럴·객체·배열과 import 한 이름만 둔다(${ts.SyntaxKind[node.kind]})`);
  };
  const call = defaults.length === 1 && ts.isCallExpression(defaults[0].expression) ? defaults[0].expression : undefined;
  const [slotArgument, entries, ...rest] = call?.arguments ?? [];
  if (!call || !ts.isIdentifier(call.expression) || call.expression.text !== 'defineContributions' || !slotArgument
    || !ts.isStringLiteral(slotArgument) || !entries || !ts.isArrayLiteralExpression(entries) || rest.length > 0) {
    violations.push(`${label}: default export 는 defineContributions('<슬롯>', [...]) 하나여야 한다`);
  } else {
    if (slotArgument.text !== slot) violations.push(`${label}: defineContributions 의 슬롯(${slotArgument.text})이 파일 이름(${slot})과 다르다`);
    for (const element of entries.elements) {
      const id = ts.isObjectLiteralExpression(element) && element.properties.find(property => ts.isPropertyAssignment(property)
        && ts.isIdentifier(property.name) && property.name.text === 'id');
      if (!id || !ts.isStringLiteral(id.initializer)) violations.push(`${label}: 항목마다 id 를 문자열 리터럴로 둔다`);
      value(element);
    }
    if (slot === 'shell-links') violations.push(...shellLinkViolations(entries, label));
    if (hubOfTabSlot(slot) !== null) violations.push(...hubTabViolations(entries, label, { file: label, hub: hubOfTabSlot(slot) }));
    if (slot === 'stats-panels') violations.push(...statsPanelViolations(entries, label));
    if (slot === 'home-sections') violations.push(...homeSectionViolations(entries, label, { file, importedFrom, readModule }));
  }
  const covers = (paths, target) => paths.some(path => {
    const root = path.replace(/\/+$/, '');
    return target === root || target.startsWith(`${root}/`) || target.replace(/\.tsx?$/, '') === root.replace(/\.tsx?$/, '');
  });
  for (const { specifier } of parseModuleReferences(source, label).references) {
    if (specifier === 'lucide-react') continue;
    const target = specifier.startsWith('@/') ? `src/${specifier.slice(2)}`
      : specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), specifier)) : undefined;
    const neutral = target !== undefined && (target.replace(/\.ts$/, '') === 'src/extensions/slots'
      || ((target.startsWith('src/types/') || target.startsWith('src/lib/')) && !covers(foreignPaths, target)));
    const allowed = target !== undefined && (covers(ownPaths, target) || neutral);
    if (!allowed) violations.push(`${label}: 허용되지 않은 import ${specifier} — 중립 모듈이나 기능 ${owner} 의 경로만 쓴다`);
  }
  return violations;
}

test('slot registries: the source registry is the render of its contributions and the full projections are the source itself', () => {
  const inputs = readProjectionInputs();
  const files = inputs.files.map(frontendRel);
  const discovered = discoverSlotContributions(files);
  assert.ok(discovered.size > 0 && [...discovered.values()].every(owners => owners.length > 0), 'every slot has a source contribution');
  for (const [slot, owners] of discovered) {
    const text = inputs.original(join(frontendRoot, slotRegistryPath(slot))).replace(/\r\n/g, '\n');
    assert.equal(text, renderSlotRegistry(slot, owners), `${slotRegistryPath(slot)} is the render of ${owners.join(', ')} (npm run slots:generate)`);
  }
  // 프리셋 demo 와 '기능 22개 전체' 직접 선택은 모든 기능을 남긴다. 투영이 모든 프런트 모듈 파일에서 원본과 같아야 한다(CRLF 정규화).
  const everyFeature = inputs.catalog.capabilities.map(capability => capability.id);
  for (const selection of [{ preset: 'demo' }, { domains: everyFeature }]) {
    const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'slot-parity' }, sourceRef: 'main', selection,
      database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, inputs.catalog);
    const projector = createFrontendProjector({ composition, files });
    assert.deepEqual(projector.directPaths, [], `${JSON.stringify(selection)} removes nothing directly`);
    const changed = inputs.files.filter(isFrontendModuleFile).filter(path => {
      const original = inputs.original(path);
      return projector.project(frontendRel(path), original).source.replace(/\r\n/g, '\n') !== original.replace(/\r\n/g, '\n');
    }).map(repoRel);
    assert.deepEqual(changed, [], `${JSON.stringify(selection)}: the projection of the full product is the source`);
  }
});

/**
 * SlotMap 의 슬롯 종류(항목 타입)와 허브 탭 슬롯 규칙의 위반(GAP-SLOT-001). 종류는 MAX_SLOT_KINDS 이하이고, 항목 타입을 여러 슬롯이 나눠 쓰는
 * 것은 허브 탭(HubTab)뿐이다. 허브 탭 슬롯은 HubTabViews 키마다 정확히 하나(hub-tabs-<허브>)이고 항목 타입은 HubTab<'<허브>'> 다.
 */
function slotKindViolations(source = readFileSync(SLOTS_SOURCE, 'utf8')) {
  const violations = [];
  const members = slotMapMembers(source).map(member => ({ ...member, ...slotKindOf(member.type) }));
  const bySlotKind = new Map();
  for (const { slot, kind } of members) bySlotKind.set(kind, [...(bySlotKind.get(kind) ?? []), slot]);
  if (bySlotKind.size === 0 || bySlotKind.size > MAX_SLOT_KINDS) violations.push(`SlotMap 의 슬롯 종류가 ${bySlotKind.size} 이다(1..${MAX_SLOT_KINDS})`);
  for (const [kind, slots] of bySlotKind) {
    if (slots.length > 1 && kind !== 'HubTab') violations.push(`항목 타입 ${kind} 를 여러 슬롯(${slots.join(', ')})이 쓴다 — 허브 탭만 허브마다 슬롯을 둔다`);
  }
  const hubs = hubViewKeys(source);
  const hubSlots = members.filter(({ slot, kind }) => kind === 'HubTab' || hubOfTabSlot(slot) !== null);
  for (const { slot, kind, args } of hubSlots) {
    const hub = hubOfTabSlot(slot);
    if (hub === null || !hubs.includes(hub)) violations.push(`${slot}: 허브 탭 슬롯 이름은 hub-tabs-<HubTabViews 키> 다`);
    if (kind !== 'HubTab' || args.length !== 1 || args[0] !== `'${hub}'`) violations.push(`${slot}: 항목 타입은 HubTab<'${hub}'> 다(${kind}<${args.join(', ')}>)`);
  }
  const declared = hubSlots.map(({ slot }) => slot).sort();
  const expected = hubs.map(hubTabSlot).sort();
  if (JSON.stringify(declared) !== JSON.stringify(expected)) violations.push(`허브 탭 슬롯(${declared.join(', ')})이 HubTabViews 키(${expected.join(', ')})와 다르다`);
  return violations;
}

test('slot names are one spelling: SlotMap keys, registries and contribution file names are the same set, of at most ten kinds', () => {
  const files = readProjectionInputs().files.map(frontendRel);
  const kinds = files.map(file => slotPathKind(file)).filter(Boolean);
  const registries = [...new Set(kinds.filter(kind => kind.kind === 'registry').map(kind => kind.slot))].sort();
  const contributed = [...new Set(kinds.filter(kind => kind.kind === 'contribution').map(kind => kind.slot))].sort();
  const keys = [...slotMapKeys()].sort();
  assert.deepEqual(slotKindViolations(), [], 'slot kinds and hub tab slots');
  assert.deepEqual(registries, keys, 'every SlotMap key has a generated registry and every registry has a key');
  assert.deepEqual(contributed, keys, 'every SlotMap key has a source contribution file and every contribution file name is a key');
  assert.deepEqual(Object.keys(SLOT_REGISTRY_CONSUMERS).sort(), keys, 'every slot has its consumer row');
  // 허브 탭 슬롯마다 소비자는 그 허브 셸 하나이고, 허브 셸마다 허브 탭 레지스트리는 하나다(GAP-SLOT-001). 셸은 그 허브 탭 해석 모듈을
  // 쓴다 — 허브 탭 해석 모듈과 같은 디렉터리의 셸이다.
  const modules = hubTabModules();
  const shells = hubViewKeys().map(hub => {
    const consumers = slotConsumerFiles(hubTabSlot(hub));
    assert.equal(consumers.length, 1, `${hubTabSlot(hub)}: one consumer`);
    assert.equal(slotConsumerPartition(hubTabSlot(hub)), null, `${hubTabSlot(hub)}: not partitioned`);
    assert.equal(posix.dirname(consumers[0]), posix.dirname(modules.get(hub)?.file ?? ''), `${hubTabSlot(hub)}: the consumer is the shell next to its tab module`);
    return consumers[0];
  });
  assert.equal(new Set(shells).size, shells.length, 'each hub shell consumes one hub tab registry');
  // 대조: 키 하나를 더하면 레지스트리·기여·소비자가 없어 붉다. 슬롯 종류 규칙은 아래 합성 원천으로 붉다.
  const probe = readFileSync(SLOTS_SOURCE, 'utf8').replace("'recipient-picker-sources': RecipientPickerSource;",
    "'recipient-picker-sources': RecipientPickerSource;\n  'probe-slot': RecipientPickerSource;");
  assert.deepEqual(slotMapKeys(probe).sort(), [...keys, 'probe-slot'].sort(), 'the key reader sees an added key');
  assert.match(slotKindViolations(probe).join('\n'), /항목 타입 RecipientPickerSource 를 여러 슬롯\(recipient-picker-sources, probe-slot\)이 쓴다/);
  const source = readFileSync(SLOTS_SOURCE, 'utf8');
  const hubLine = "'hub-tabs-knowledge': HubTab<'knowledge'>;";
  assert.ok(source.includes(hubLine), 'the fixture finds the knowledge hub tab slot');
  assert.match(slotKindViolations(source.replace(hubLine, "'hub-tabs-knowledge': HubTab<'collaboration'>;")).join('\n'),
    /hub-tabs-knowledge: 항목 타입은 HubTab<'knowledge'> 다/);
  assert.match(slotKindViolations(source.replace(hubLine, '')).join('\n'), /허브 탭 슬롯\(.*\)이 HubTabViews 키\(.*hub-tabs-knowledge.*\)와 다르다/);
  assert.match(slotKindViolations(source.replace(hubLine, `${hubLine}\n  'hub-tabs-wiki': HubTab<'wiki'>;`)).join('\n'),
    /hub-tabs-wiki: 허브 탭 슬롯 이름은 hub-tabs-<HubTabViews 키> 다/);
  const extraKinds = Array.from({ length: MAX_SLOT_KINDS }, (_, index) => `  'probe-${index}': Probe${index};`).join('\n');
  assert.match(slotKindViolations(source.replace(hubLine, `${hubLine}\n${extraKinds}`)).join('\n'), /슬롯 종류가 \d+ 이다\(1\.\.10\)/);
});

/** 통계 패널(stats-panels) 항목 타입이 두는 배치(placement 리터럴). slots.ts 의 통계 타입 구간에서 읽는다. */
function statsPanelPlacements(source = readFileSync(SLOTS_SOURCE, 'utf8')) {
  const start = source.indexOf('interface StatsHubTabBase');
  const end = source.indexOf('export type StatsPanel =');
  assert.ok(start >= 0 && end > start, 'slots.ts declares the stats panel types before the StatsPanel union');
  return [...new Set([...source.slice(start, end).matchAll(/readonly placement: '([a-z][a-z0-9-]*)'/gu)].map(match => match[1]))].sort();
}

/**
 * 소비자를 값별로 나눈 슬롯의 기여 항목 가운데 표에 그 값의 소비자가 없는 항목(10단계 10a). 판독기는 축 3 의 항목 단위 판독기 하나다.
 * files 는 frontend 기준 경로 → 원문, table 은 소비자 표다.
 */
function partitionViolations(files, table = SLOT_REGISTRY_CONSUMERS) {
  const violations = [];
  for (const [file, source] of files) {
    const kind = slotPathKind(file);
    if (kind?.kind !== 'contribution') continue;
    const partition = slotConsumerPartition(kind.slot, table);
    if (!partition) continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const entry of readContributionEntries(ts, ast)) {
      const value = entry[partition.key];
      if (typeof value !== 'string' || !Object.hasOwn(partition.consumers, value) || partition.consumers[value].length === 0) {
        violations.push(`frontend/${kind.file} ${entry.id}: ${partition.key} '${value}' 를 그리는 소비자가 없다(소비자 없는 배치)`);
      }
    }
  }
  return violations.sort();
}

test('partitioned consumer rows: the values are the slot type values, and every contribution item names a value with consumers', () => {
  const inputs = readProjectionInputs();
  const files = new Map(inputs.files.map(file => [frontendRel(file), inputs.original(file)])
    .filter(([file]) => slotPathKind(file)?.kind === 'contribution'));
  assert.deepEqual(partitionViolations(files), [], 'every item of a partitioned slot is drawn by a consumer of its value');
  // 허브 탭은 허브마다 슬롯이라(GAP-SLOT-001) 나누지 않는다 — 나눈 슬롯은 stats-panels 하나다.
  assert.deepEqual(Object.keys(SLOT_CONSUMER_PARTITION_KEYS).sort(), ['stats-panels']);
  assert.deepEqual(Object.keys(slotConsumerPartition('stats-panels').consumers).sort(), statsPanelPlacements(),
    'stats-panels: one row per placement of the stats panel types');
  assert.deepEqual(statsPanelPlacements(), ['hub-tab', 'overview-card']);
  // 대조: 요약 칸의 소비자 행을 지운 표 — 게시판의 '누적 게시물' 칸을 그리는 소비자가 없다.
  const withoutOverview = { ...SLOT_REGISTRY_CONSUMERS, 'stats-panels': { 'hub-tab': SLOT_REGISTRY_CONSUMERS['stats-panels']['hub-tab'] } };
  const board = 'src/extensions/board/stats-panels.ts';
  if (files.has(board)) {
    assert.deepEqual(partitionViolations(new Map([[board, files.get(board)]]), withoutOverview),
      [`frontend/${board} TOTAL_POSTS: placement 'overview-card' 를 그리는 소비자가 없다(소비자 없는 배치)`]);
  }
  // 대조: 모르는 배치·배치 없는 항목. 나누지 않은 슬롯(허브 탭)의 항목은 판정 대상이 아니다.
  const synthetic = new Map([
    ['src/extensions/probe/stats-panels.ts', "export default [{ id: 'A', placement: 'bogus', visibleWhen: { always: '시험' } },\n"
      + "  { id: 'B', visibleWhen: { always: '시험' } }];\n"],
    ['src/extensions/probe/hub-tabs-collaboration.ts', "export default [{ id: 'C', visibleWhen: { always: '시험' } }];\n"],
  ]);
  assert.deepEqual(partitionViolations(synthetic), [
    "frontend/src/extensions/probe/stats-panels.ts A: placement 'bogus' 를 그리는 소비자가 없다(소비자 없는 배치)",
    "frontend/src/extensions/probe/stats-panels.ts B: placement 'null' 를 그리는 소비자가 없다(소비자 없는 배치)",
  ]);
});

/** 원본(또는 생성물)의 허브 탭 기여 항목 (허브, id, 파일). 허브는 슬롯 이름(hub-tabs-<허브>)에서 온다. 생성물에서 투영으로 빠진 기여는 없다. */
function hubTabContributionRows(inputs = readProjectionInputs()) {
  const rows = [];
  for (const kind of inputs.files.map(frontendRel).map(file => slotPathKind(file))
    .filter(row => row?.kind === 'contribution' && hubOfTabSlot(row.slot) !== null)) {
    const label = `frontend/${kind.file}`;
    const ast = ts.createSourceFile(label, inputs.original(join(frontendRoot, kind.file)), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const entry of readContributionEntries(ts, ast)) rows.push(`${hubOfTabSlot(kind.slot)}:${entry.id}:${label}`);
  }
  return rows.sort();
}

test('hub tab modules: contributable names exactly the hub tab contributions, and the hub rules redden', () => {
  const inputs = readProjectionInputs();
  const modules = hubTabModules();
  assert.deepEqual([...modules.keys()].sort(), [...hubViewKeys()].sort(), 'every hub in HubTabViews has one tab module with TAB_HUB.slotHub');
  // 생성물에서는 투영으로 빠진 기여 파일이 원장에 있다 — contributable 이 그 파일을 지목해도 된다(탭 목적지 계약이 '빠진 기여' 로 가른다).
  const ledgerPath = join(repoRoot, 'reusable-projection-ledger.json');
  const removed = existsSync(ledgerPath) ? new Set(JSON.parse(readFileSync(ledgerPath, 'utf8')).removedFiles ?? []) : new Set();
  const declared = [...modules].flatMap(([hub, { hub: tabHub }]) => Object.entries(tabHub.contributable ?? {})
    .filter(([, path]) => !removed.has(path)).map(([tab, path]) => `${hub}:${tab}:${path}`)).sort();
  assert.deepEqual(hubTabContributionRows(inputs), declared, 'hub tab contributions and TAB_HUB.contributable are the same (hub, tab, file) set');
  assert.ok(removed.size > 0 || declared.length > 0, 'the source has contributed hub tabs');
  // 대조: 합성 기여로 규칙마다 붉음을 본다. 허브는 기여 파일 이름(슬롯)이 정한다.
  const fixture = (entry, slot = 'hub-tabs-collaboration') =>
    `import { X } from '@/app/x';\nimport { defineContributions } from '@/extensions/slots';\nexport default defineContributions('${slot}', [\n${entry}\n]);\n`;
  const entry = ({ id = 'MESSAGES', order = '10', view = '{ Component: X }', extra = '' } = {}) =>
    `  {\n    id: '${id}',${extra}\n    order: ${order},\n    label: '쪽지',\n    view: ${view},\n    visibleWhen: { always: '사유' },\n  }`;
  const violations = (source, file = 'frontend/src/extensions/note/hub-tabs-collaboration.ts') => {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const call = ast.statements.find(ts.isExportAssignment).expression;
    const hub = hubOfTabSlot(slotPathKind(file).slot);
    return hubTabViolations(call.arguments[1], file, { file, hub, modules }).join('\n');
  };
  assert.equal(violations(fixture(entry())), '', 'the source shape is green');
  assert.match(violations(fixture(entry(), 'hub-tabs-nowhere'), 'frontend/src/extensions/note/hub-tabs-nowhere.ts'),
    /허브 탭 슬롯의 허브\(nowhere\)는 .* 가운데 하나다/);
  // 다른 허브(지식 허브 — 허브 분해 H2)의 슬롯에 기여하면 그 허브의 contributable 이 이 탭을 지목하지 않는다.
  assert.match(violations(fixture(entry(), 'hub-tabs-knowledge'), 'frontend/src/extensions/note/hub-tabs-knowledge.ts'),
    /MESSAGES — .*knowledge-tabs\.ts 의 TAB_HUB\.contributable 이 이 탭을 이 기여 파일로 지목하지 않는다/);
  // 종전 꼴의 hub 키는 항목 키가 아니다 — 슬롯 이름과 어긋난 hub 가 조용히 남지 않는다.
  assert.match(violations(fixture(entry({ extra: "\n    hub: 'knowledge'," }))), /MESSAGES 의 키 hub 는 허브 탭 항목 키/);
  assert.match(violations(fixture(entry({ id: 'messages' }))), /messages 의 id 는 `\?tab=` 값인 대문자 식별자 리터럴이다/);
  assert.match(violations(fixture(entry({ order: "'10'" }))), /MESSAGES 의 order 는 숫자 리터럴이다/);
  assert.match(violations(fixture(entry({ view: '{ Component: X, other: 1 }' }))), /view 는 import 한 이름이거나 이름만 담은 객체다/);
  assert.match(violations(fixture(entry({ id: 'COMMUNITY' }))), /COMMUNITY — .*contributable 이 이 탭을 이 기여 파일로 지목하지 않는다/);
  assert.match(violations(fixture(entry()), 'frontend/src/extensions/mail/hub-tabs-collaboration.ts'), /MESSAGES — .*contributable 이 이 탭을 이 기여 파일로 지목하지 않는다/);
  const coreTabs = new Map([...modules].map(([hub, row]) => [hub, { ...row, hub: { ...row.hub, parse: raw => (raw === 'MESSAGES' ? raw : null) } }]));
  const ast = ts.createSourceFile('x.ts', fixture(entry()), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.match(hubTabViolations(ast.statements.find(ts.isExportAssignment).expression.arguments[1], 'x.ts',
    { file: 'frontend/src/extensions/note/hub-tabs-collaboration.ts', hub: 'collaboration', modules: coreTabs }).join('\n'),
  /MESSAGES — 허브 collaboration 의 셸 고유 탭과 겹친다/);
});

/*
 * 기여 폐포(허브 분해 H1). 레지스트리는 슬롯마다 하나라서, 기여 하나가 연쇄로 지워지면 그 레지스트리를 읽는 모든 셸이 함께 사라진다
 * (허브 하나의 실수가 모든 허브를 지운다). 그래서 기여에서 import 로 닿는 파일의 소유 기능은 기여 기능이 요구하는 기능(폐포, 화면 계열
 * 포함) 안이어야 한다. 판정은 투영 연쇄 계획의 간선(planFrontendRemoval)을 쓴다 — 두 번째 판정기는 없다. 레지스트리는 구성마다 다시
 * 렌더되므로 따라가지 않는다. 소유도 생성기의 제거 규칙(카탈로그 frontendRules)을 그대로 쓴다 — 파일을 덮는 규칙이 하나라도 기여
 * 기능의 폐포에서 빠지면 그 파일은 지워진다. 첫 일치 기능 하나만 보면 겹친 경로(게시판 접두 + 커뮤니티 정확 경로)에서 커뮤니티 누락을 놓친다.
 */
function featureRules(catalog) {
  const covering = file => catalog.frontendRules.filter(({ path }) => {
    const root = path.replace(/\/+$/, '');
    return file === root || file.startsWith(`${root}/`) || file.replace(/\.tsx?$/, '') === root.replace(/\.tsx?$/, '');
  });
  // project-composer-recipe.mjs 의 includeRule 과 같다: any 는 하나라도, 나머지는 모두 남아야 규칙이 남는다.
  const kept = (rule, included) => (rule.mode === 'any' ? rule.domains.some(domain => included.has(domain)) : rule.domains.every(domain => included.has(domain)));
  const requires = new Map(catalog.capabilities.map(capability => [capability.id, capability.requires.map(edge => edge.domain)]));
  const closureOf = ids => {
    const closure = new Set(ids);
    for (const current of closure) for (const next of requires.get(current) ?? []) closure.add(next);
    return closure;
  };
  return { covering, kept, closureOf };
}

// 시작 파일에서 import 간선으로 닿는 파일 전부. 레지스트리는 구성마다 다시 렌더되므로 따라가지 않는다.
function reachedWithoutRegistries(start, edges) {
  const reached = new Set([start]);
  for (const path of reached) for (const { to } of edges.get(path) ?? []) {
    if (slotPathKind(frontendRel(to))?.kind === 'registry') continue;
    reached.add(to);
  }
  return reached;
}

function contributionClosureViolations({ catalog, edges, files }) {
  const { covering, kept, closureOf } = featureRules(catalog);
  const violations = [];
  for (const kind of files.map(frontendRel).map(file => slotPathKind(file)).filter(row => row?.kind === 'contribution')) {
    const start = join(frontendRoot, kind.file);
    const allowed = closureOf([kind.owner]);
    const reached = reachedWithoutRegistries(start, edges);
    for (const path of reached) {
      for (const rule of covering(frontendRel(path)).filter(row => !kept(row, allowed))) {
        const owner = `${rule.domains.join('·')}${rule.mode === 'any' ? '(하나 이상)' : ''}`;
        violations.push(`frontend/${kind.file} → ${relOf(path)}: 소유 ${owner} 는 ${kind.owner} 가 요구하는 기능 밖이다`);
      }
    }
  }
  return [...new Set(violations)].sort();
}

test('contribution closure: what a contribution imports belongs to the features its own feature requires', () => {
  const inputs = readProjectionInputs();
  const { edges } = planFrontendRemoval({ frontendRoot, files: inputs.files, directPaths: [], readSource: inputs.original });
  assert.deepEqual(contributionClosureViolations({ catalog: inputs.catalog, edges, files: inputs.files }), []);
  // 대조: 쪽지 탭 뷰가 스크랩 서비스를 가져오면 쪽지 폐포 밖이라 붉다(쪽지만 고른 구성에서 기여·레지스트리·두 허브 셸이 함께 지워진다).
  const view = join(frontendRoot, 'src/app/note/NoteCollaborationTab.tsx');
  const scrapService = join(frontendRoot, 'src/services/business/user/ScrapService.ts');
  const leaked = new Map(edges);
  leaked.set(view, [...(edges.get(view) ?? []), { to: scrapService }]);
  assert.match(contributionClosureViolations({ catalog: inputs.catalog, edges: leaked, files: inputs.files }).join('\n'),
    /frontend\/src\/extensions\/note\/hub-tabs-collaboration\.ts → frontend\/src\/services\/business\/user\/ScrapService\.ts: 소유 scrap 는 note 가 요구하는 기능 밖이다/);
  // 대조: 겹친 경로는 덮는 규칙 모두가 남아야 남는다. 게시판 접두와 커뮤니티 정확 경로가 함께 덮는 파일에 게시판 기여가 닿으면,
  // 첫 일치 기능(게시판)만 보던 판정은 통과시켰지만 게시판만 고른 구성에서 그 파일은 지워진다.
  const boardContribution = join(frontendRoot, 'src/extensions/board/stats-panels.ts');
  const communityPage = join(frontendRoot, 'src/app/admin/community/boards/page.tsx');
  if (existsSync(boardContribution) && existsSync(communityPage)) {
    const overlapped = new Map(edges);
    overlapped.set(boardContribution, [...(edges.get(boardContribution) ?? []), { to: communityPage }]);
    assert.match(contributionClosureViolations({ catalog: inputs.catalog, edges: overlapped, files: inputs.files }).join('\n'),
      /frontend\/src\/extensions\/board\/stats-panels\.ts → frontend\/src\/app\/admin\/community\/boards\/page\.tsx: 소유 community 는 board 가 요구하는 기능 밖이다/);
  }
});

/*
 * 슬롯 셸 경계(2026-10-16 알림 카드 바로 승인, DEC-OPS-328). 레지스트리를 읽는 셸은 그 슬롯에 기여하는 기능의 코드에 import 로 닿지
 * 않는다 — 닿으면 그 기능을 뺀 구성에서 연쇄로 셸이 지워진다(알림 드로어가 결재 코드를 가져오면 알림만 고른 구성의 머리글이 사라진다).
 * 셸 자신을 덮는 기능이 요구하는 기능은 셸과 함께 남으므로 예외다. 판정은 기여 폐포와 같은 간선·소유 규칙을 쓴다.
 */
function slotConsumerImportViolations({ catalog, edges, files }) {
  const { covering, kept, closureOf } = featureRules(catalog);
  const contributions = discoverSlotContributions(files.map(frontendRel));
  const violations = [];
  for (const slot of Object.keys(SLOT_REGISTRY_CONSUMERS)) {
    const contributors = new Set(contributions.get(slot) ?? []);
    for (const consumer of slotConsumerFiles(slot)) {
      const start = join(repoRoot, consumer);
      const allowed = closureOf(covering(frontendRel(start)).flatMap(rule => rule.domains));
      for (const path of reachedWithoutRegistries(start, edges)) {
        for (const rule of covering(frontendRel(path)).filter(row => !kept(row, allowed))) {
          const leaked = rule.domains.filter(domain => contributors.has(domain));
          if (leaked.length > 0) violations.push(`${consumer} → ${relOf(path)}: ${slot} 에 기여하는 ${leaked.join('·')} 의 파일이다`);
        }
      }
    }
  }
  return [...new Set(violations)].sort();
}

test('slot consumers do not import what a contributing feature owns', () => {
  const inputs = readProjectionInputs();
  const { edges } = planFrontendRemoval({ frontendRoot, files: inputs.files, directPaths: [], readSource: inputs.original });
  assert.deepEqual(slotConsumerImportViolations({ catalog: inputs.catalog, edges, files: inputs.files }), []);
  // 대조: 알림 드로어(알림 소유)가 결재의 바로 승인 모듈을 가져오면 notification-actions 에 기여하는 결재의 파일이라 붉다.
  const drawer = join(frontendRoot, 'src/app/components/ui/app-notification-drawer.tsx');
  const approvalAction = join(frontendRoot, 'src/queries/approval-notification-action.ts');
  if (existsSync(drawer) && existsSync(approvalAction)) {
    const leaked = new Map(edges);
    leaked.set(drawer, [...(edges.get(drawer) ?? []), { to: approvalAction }]);
    assert.match(slotConsumerImportViolations({ catalog: inputs.catalog, edges: leaked, files: inputs.files }).join('\n'),
      /frontend\/src\/app\/components\/ui\/app-notification-drawer\.tsx → frontend\/src\/queries\/approval-notification-action\.ts: notification-actions 에 기여하는 informalsanction 의 파일이다/);
  }
});

test('only the listed consumers import a slot registry, each from outside the slot root, and each slot has a contribution', () => {
  const inputs = readProjectionInputs();
  const plan = planFrontendRemoval({ frontendRoot, files: inputs.files, directPaths: [], readSource: inputs.original });
  const importers = new Map();
  for (const [path, edges] of plan.edges) for (const { to } of edges) {
    const kind = slotPathKind(frontendRel(to));
    if (kind?.kind !== 'registry') continue;
    if (!importers.has(kind.slot)) importers.set(kind.slot, new Set());
    importers.get(kind.slot).add(repoRel(path));
  }
  const contributions = discoverSlotContributions(inputs.files.map(frontendRel));
  for (const slot of Object.keys(SLOT_REGISTRY_CONSUMERS)) {
    const consumers = slotConsumerFiles(slot);
    assert.deepEqual([...(importers.get(slot) ?? [])].sort(), [...consumers].sort(), `${slot}: registry importers are exactly the consumer table`);
    assert.ok(consumers.length > 0 && consumers.every(file => !file.startsWith('frontend/src/extensions/')), `${slot}: a consumer outside the slot root`);
    assert.ok((contributions.get(slot) ?? []).length > 0, `${slot}: at least one source contribution`);
  }
  assert.deepEqual([...importers.keys()].filter(slot => !Object.hasOwn(SLOT_REGISTRY_CONSUMERS, slot)), [], 'no unlisted slot is consumed');
});

test('contribution files hold data only: .ts, no JSX, one defineContributions default export, neutral or own imports, reasons and no links', () => {
  const inputs = readProjectionInputs();
  const paths = new Map(inputs.catalog.capabilities.map(capability => [capability.id, capability.frontend.paths]));
  const foreignOf = owner => [...paths].filter(([id]) => id !== owner).flatMap(([, list]) => list);
  const contributions = inputs.files.map(frontendRel).map(file => slotPathKind(file)).filter(kind => kind?.kind === 'contribution');
  assert.ok(contributions.length > 0, 'the source has contributions');
  const ids = new Map();
  for (const { file, owner, slot } of contributions) {
    assert.ok(paths.has(owner), `${file}: the owner directory is a feature`);
    const source = inputs.original(join(frontendRoot, file));
    assert.deepEqual(contributionViolations({ file, source, owner, slot, ownPaths: paths.get(owner), foreignPaths: foreignOf(owner) }), [], file);
    for (const [, id] of source.matchAll(/^\s*id: '([^']+)'/gm)) {
      assert.ok(!ids.has(`${slot}:${id}`), `${slot}: id ${id} is unique within the slot (${ids.get(`${slot}:${id}`)}, ${file})`);
      ids.set(`${slot}:${id}`, file);
    }
  }
  // 대조: 함정마다 실제 기여를 바꿔 붉게 만든다. 아래 치환은 수신자 피커 출처 기여의 모양에 맞춘 것이다.
  const { file, owner, slot } = contributions.find(row => row.slot === 'recipient-picker-sources');
  const original = inputs.original(join(frontendRoot, file));
  const check = (source, target = file) => contributionViolations({ file: target, source, owner, slot, ownPaths: paths.get(owner),
    foreignPaths: foreignOf(owner) }).join('\n');
  const withSource = replacement => original.replace(/source: \w+,/, replacement);
  assert.notEqual(withSource('source: X,'), original, 'the fixture finds the source property');
  assert.match(check(original, file.replace(/\.ts$/, '.tsx')), /\.ts 여야 한다/);
  assert.match(check(`${original}\nconst view = <div />;\n`), /JSX/);
  assert.match(check(`import { boardUserService } from '@/services/business/user/board/BoardUserService';\n${original}`), /허용되지 않은 import @\/services\/business\/user\/board/);
  assert.match(check(`import x from 'react';\n${original}`), /허용되지 않은 import react/);
  // 다른 기능이 소유한 @/lib·@/types 파일은 중립이 아니다 — 그 기능이 빠진 구성에서 셸까지 연쇄로 지워진다.
  assert.match(check(`import * as survey from '@/lib/api/survey';\n${original}`), /허용되지 않은 import @\/lib\/api\/survey/);
  assert.match(check(`import type { Community } from '@/types/business/community';\n${original}`), /허용되지 않은 import @\/types\/business\/community/);
  assert.match(check(`import { useNotifications } from '@/lib/hooks/use-notifications';\n${original}`), /허용되지 않은 import @\/lib\/hooks\/use-notifications/);
  // 대조: 어떤 기능도 소유하지 않은 중립 모듈과 `as const`·음수 리터럴은 통과한다.
  assert.equal(check(`import { X } from 'lucide-react';\nimport type { Y } from '@/types/recipient-address-book';\nimport { canPermission } from '@/lib/auth/permissions';\n${
    original.replace("channels: ['mail', 'sms'],", "channels: ['mail', 'sms'] as const,\n    order: -1,")}`), '');
  // 최상위 문장과 항목 값은 데이터만 — 읽기만 해도 쓰거나, 항목에 함수를 숨기는 기여를 막는다.
  assert.match(check(`import { apiClient } from '@/lib/api/client';\n${original}\nvoid apiClient.delete('/api/v1/address-books/1');\n`), /최상위 문장은 import 와 default export 하나뿐이다\(ExpressionStatement\)/);
  const serviceWrite = withSource('source: { listBooks: async () => { await addressbookUserService.deleteAddressBook(1); return []; }, listContacts: async () => [] },');
  const ownService = "import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';\n";
  assert.doesNotMatch(check(`${ownService}${original}`), /허용되지 않은/, 'the own service import itself is allowed');
  assert.match(check(`${ownService}${serviceWrite}`), /import 한 이름만 둔다\(ArrowFunction\)/);
  assert.match(check(`${ownService}${withSource('source: addressbookUserService.source,')}`), /import 한 이름만 둔다\(PropertyAccessExpression\)/);
  assert.match(check(`import { make } from '@/lib/auth/permissions';\n${withSource('source: make(),')}`), /import 한 이름만 둔다\(CallExpression\)/);
  assert.match(check(withSource('source: LOCAL_SOURCE,')), /이름 LOCAL_SOURCE 은 import 한 이름이어야 한다/);
  // always 사유 함정은 술어를 always 로 바꾼 기여에 건다 — 실제 기여의 술어는 권한·화면일 수 있다(PR-5). 치환이 일어났는지 함께 본다.
  const withAlways = original.replace(/visibleWhen: \{[^}]*\}/, "visibleWhen: { always: '시험용 사유' }");
  assert.notEqual(withAlways, original, 'the fixture replaces a visibleWhen predicate');
  assert.equal(check(withAlways), '', 'an always predicate with a reason passes');
  // `키: 값` 꼴만 — 단축·계산·따옴표 키는 always 사유와 링크 키 검사를 비켜 간다.
  assert.match(check(`const always = '';\n${withAlways.replace(/always: '[^']*'/, 'always')}`), /최상위 문장은[\s\S]*단축·계산·펼침·메서드·따옴표 키 금지: ShorthandPropertyAssignment/);
  assert.match(check(withAlways.replace(/always: '[^']*'/, "['always']: ''")), /키 금지: ComputedPropertyName/);
  assert.match(check(original.replace("label: '주소록',", "'href': '/admin/memo',\n    label: '주소록',")), /키 금지: StringLiteral/);
  assert.match(check(original.replace("label: '주소록',", "...{ href: '/admin/memo' },\n    label: '주소록',")), /키 금지: SpreadAssignment/);
  assert.match(check(original.replace("defineContributions('recipient-picker-sources', [", "defineContributions('recipient-picker-sources', [\n  ...[],")), /import 한 이름만 둔다\(SpreadElement\)/);
  assert.match(check(withAlways.replace(/always: '[^']*'/, "always: '  '")), /always 술어는 비지 않은 사유/);
  assert.match(check(original.replace(/visibleWhen:/, "href: '/admin/memo',\n    visibleWhen:")), /링크 키\(href\)/);
  assert.match(check(original.replace(/defineContributions\('[^']+'/, "defineContributions('shell-links'")), /파일 이름\(.+\)과 다르다/);
  assert.match(check(`${original}\nexport const extra = 1;\n`), /이름 있는 export 금지/);
  assert.match(check(original.replace(/id: '([^']+)'/, 'id: ID')), /id 를 문자열 리터럴로/);
});

test('shell links: the page predicate is the href, subjectless placements stay outside /admin, header links have an icon and footer links a header twin', () => {
  const inputs = readProjectionInputs();
  const paths = new Map(inputs.catalog.capabilities.map(capability => [capability.id, capability.frontend.paths]));
  const shell = inputs.files.map(frontendRel).map(file => slotPathKind(file)).find(kind => kind?.kind === 'contribution' && kind.slot === 'shell-links');
  assert.ok(shell, 'the source has a shell-links contribution');
  const check = source => contributionViolations({ file: shell.file, source, owner: shell.owner, slot: 'shell-links', ownPaths: paths.get(shell.owner),
    foreignPaths: [] }).join('\n');
  assert.equal(check(inputs.original(join(frontendRoot, shell.file))), '', 'the source shell-links contribution keeps the rules');
  // 합성 기여로 규칙마다 붉음을 본다. id 는 줄 머리에 둔다(위 유일성 검사의 정규식 모양).
  const fixture = (...entries) => "import { Info } from 'lucide-react';\nimport { defineContributions } from '@/extensions/slots';\n"
    + `export default defineContributions('shell-links', [\n${entries.join(',\n')}\n]);\n`;
  const entry = (id, placement, href, extra = '', page = href) =>
    `  {\n    id: '${id}',\n    placement: '${placement}',\n    order: 1,\n    href: '${href}',\n    label: '${id}',\n${extra}    visibleWhen: { page: '${page}' },\n  }`;
  const icon = '    icon: Info,\n';
  const header = entry('h', 'header', '/help', icon);
  assert.equal(check(fixture(header, entry('f', 'footer', '/help'), entry('e', 'error', '/help'))), '', 'a footer link with its header twin and an error link are green');
  assert.match(check(fixture(entry('f', 'footer', '/help'))), /f — 바닥글 항목에 같은 목적지의 머리글 짝이 이 기여 안에 없다/);
  assert.match(check(fixture(header, entry('h2', 'header', '/admin/system/menus', icon), entry('f', 'footer', '/admin/system/menus'))),
    /f — footer 배치는 주체 없이 거르므로 \/admin 밖 목적지만 둔다/);
  assert.match(check(fixture(entry('e', 'error', '/admin/system/menus'))), /e — error 배치는 주체 없이 거르므로 \/admin 밖/);
  // 대조: 머리글 배치는 주체를 알므로 /admin 목적지를 둘 수 있다(관리 링크 census 가 page 술어를 게이트로 본다).
  assert.equal(check(fixture(entry('h', 'header', '/admin/system/menus', icon))), '');
  assert.match(check(fixture(header, entry('f', 'footer', '/help').replace("visibleWhen: { page: '/help' }", "visibleWhen: { permissions: ['NOTI_READ'] }"))),
    /f 의 visibleWhen 은 \{ page: 자기 href \} 여야 한다/);
  assert.match(check(fixture(entry('h', 'header', '/help', icon, '/help/policies/PRIVACY'))), /h 의 visibleWhen 은 \{ page: 자기 href \} 여야 한다/);
  assert.match(check(fixture(entry('h', 'header', '/help'))), /h — header 배치는 아이콘이 있는 목록이라 icon 이 필요하다/);
  assert.match(check(fixture(entry('s', 'sidebar', '/help'))), /s 의 배치는 header·footer·error·command-center·collaboration-hub·work-hub·work-report 리터럴이다/);
  // 나의 업무 탭 줄(work-hub)은 글자 탭이고 core 탭과 id·목적지가 겹치지 않는다. 업무 보고 머리(work-report)는 아이콘 단추다.
  assert.deepEqual(workHubCoreTab(), { id: 'job', href: '/smart-toolkit/dept-job' }, 'the core tab of the work hub strip is read');
  assert.equal(check(fixture(entry('report', 'work-hub', '/smart-toolkit/work-report'), entry('m', 'work-report', '/admin/operation/memo-reports', icon))), '');
  assert.match(check(fixture(entry('report', 'work-hub', '/smart-toolkit/work-report', icon))), /report — work-hub 배치는 글자 탭이라 icon 을 두지 않는다/);
  assert.match(check(fixture(entry('job', 'work-hub', '/smart-toolkit/work-report'))), /job — work-hub 배치는 core 탭\(업무 관리\)의 id·목적지와 겹치지 않는다/);
  assert.match(check(fixture(entry('jobs', 'work-hub', '/smart-toolkit/dept-job'))), /jobs — work-hub 배치는 core 탭\(업무 관리\)의 id·목적지와 겹치지 않는다/);
  assert.match(check(fixture(entry('m', 'work-report', '/admin/operation/memo-reports'))), /m — work-report 배치는 아이콘이 있는 목록이라 icon 이 필요하다/);
  // 명령 센터 배치도 아이콘이 필요하다. 협업 허브 머리 배치는 글자 단추라 아이콘이 없어도 되고, 둘 다 주체가 있어 /admin 목적지를 둔다.
  assert.match(check(fixture(entry('c', 'command-center', '/admin/collaboration'))), /c — command-center 배치는 아이콘이 있는 목록이라 icon 이 필요하다/);
  assert.equal(check(fixture(entry('c', 'command-center', '/admin/collaboration', icon), entry('m', 'collaboration-hub', '/admin/collaboration/mail-send'))), '');
  assert.match(check(fixture(entry('m', 'collaboration-hub', '/admin/collaboration/mail-send', '', '/admin/collaboration'))),
    /m 의 visibleWhen 은 \{ page: 자기 href \} 여야 한다/);
  assert.match(check(fixture(entry('h', 'header', 'help', icon))), /h 의 href 는 '\/' 로 시작하는 문자열 리터럴이다/);
  // '/' 로 시작해도 프로토콜 상대 주소는 외부 링크다. 원문 '/\\x' 의 값은 '/\x' 이고 브라우저는 '//x' 로 읽는다.
  assert.match(check(fixture(entry('h', 'header', '//example.org', icon))), /h 의 href 는 '\/' 로 시작하는 문자열 리터럴이다/);
  assert.match(check(fixture(entry('h', 'header', '/\\\\example.org', icon))), /h 의 href 는 '\/' 로 시작하는 문자열 리터럴이다/);
});

test('stats panels: route tabs carry their page predicate, body tabs and overview cards carry no link, and ids stay off the shell tabs', () => {
  const inputs = readProjectionInputs();
  const paths = new Map(inputs.catalog.capabilities.map(capability => [capability.id, capability.frontend.paths]));
  const panels = inputs.files.map(frontendRel).map(file => slotPathKind(file)).filter(kind => kind?.kind === 'contribution' && kind.slot === 'stats-panels');
  assert.ok(panels.length > 0, 'the source has stats-panels contributions');
  assert.deepEqual(statsCoreTabIds().sort(), ['DASHBOARD', 'SYSTEM_STATS', 'USER_STATS'], 'the shell tab table is read');
  const check = (source, panel = panels[0]) => contributionViolations({ file: panel.file, source, owner: panel.owner, slot: 'stats-panels',
    ownPaths: paths.get(panel.owner), foreignPaths: [] }).join('\n');
  for (const panel of panels) assert.equal(check(inputs.original(join(frontendRoot, panel.file)), panel), '', panel.file);
  // 합성 기여로 규칙마다 붉음을 본다. id 는 줄 머리에 둔다(유일성 검사의 정규식 모양).
  const fixture = (...entries) => "import { Box } from 'lucide-react';\nimport { defineContributions } from '@/extensions/slots';\n"
    + `export default defineContributions('stats-panels', [\n${entries.join(',\n')}\n]);\n`;
  const series = ({ id = 'POSTS', href = '/admin/stats/board', page = href, uninstrumented = 'false', extra = '' } = {}) =>
    `  {\n    id: '${id}',\n    placement: 'hub-tab',\n    kind: 'series',\n    order: 30,\n    href: '${href}',\n    label: 'x',\n    title: 'x',\n    icon: Box,\n`
    + `    uninstrumented: ${uninstrumented},\n${extra}    visibleWhen: { page: '${page}' },\n  }`;
  const card = (extra = '') => `  {\n    id: 'CARD',\n    placement: 'overview-card',\n    order: 30,\n    title: 'x',\n    field: 'totalPosts',\n${extra}    visibleWhen: { always: '시험' },\n  }`;
  const body = (extra = '') => `  {\n    id: 'BODY',\n    placement: 'hub-tab',\n    kind: 'body',\n    order: 60,\n    label: 'x',\n    title: 'x',\n    icon: Box,\n${extra}    visibleWhen: { always: '시험' },\n  }`;
  assert.equal(check(fixture(series(), body(), card())), '', 'a series tab with its page predicate, a body tab and a card are green');
  assert.match(check(fixture(series({ page: '/admin/stats' }))), /POSTS 의 visibleWhen 은 \{ page: 자기 href \} 여야 한다/);
  assert.match(check(fixture(series({ href: 'admin/stats/board' }))), /POSTS 의 href 는 '\/' 로 시작하는 앱 안 경로 리터럴이다/);
  assert.match(check(fixture(series({ uninstrumented: 'flag' }))), /POSTS 의 uninstrumented 는 참거짓 리터럴이다/);
  assert.match(check(fixture(series({ id: 'DASHBOARD' }))), /DASHBOARD — 통계 셸 탭과 겹친다/);
  assert.match(check(fixture(series({ id: 'posts' }))), /posts 의 id 는 대문자 식별자 리터럴이다/);
  assert.match(check(fixture(body("    href: '/admin/stats/board',\n"))), /BODY — 라우트가 없는 항목\(body 탭·요약 칸\)은 href 를 두지 않는다/);
  assert.match(check(fixture(card("    href: '/admin/stats',\n"))), /CARD — 라우트가 없는 항목/);
  assert.match(check(fixture(body().replace("kind: 'body'", "kind: 'table'"))), /BODY 의 kind 는 series·body 리터럴이다/);
  assert.match(check(fixture(card().replace("placement: 'overview-card'", "placement: 'sidebar'"))), /CARD 의 placement 는 hub-tab·overview-card 리터럴이다/);
});

test('home sections: closed placements, a client Component, a server-readable prefetch and data-only notes', () => {
  const inputs = readProjectionInputs();
  const paths = new Map(inputs.catalog.capabilities.map(capability => [capability.id, capability.frontend.paths]));
  const sections = inputs.files.map(frontendRel).map(file => slotPathKind(file)).filter(kind => kind?.kind === 'contribution' && kind.slot === 'home-sections');
  assert.deepEqual(sections.map(row => row.owner).sort(), ['board', 'dashboard', 'informalsanction', 'note', 'promotion'], 'the work home contributions are read');
  const foreignOf = owner => [...paths].filter(([id]) => id !== owner).flatMap(([, list]) => list);
  const check = (source, row, readModule) => contributionViolations({ file: row.file, source, owner: row.owner, slot: 'home-sections',
    ownPaths: paths.get(row.owner), foreignPaths: foreignOf(row.owner), readModule }).join('\n');
  for (const row of sections) assert.equal(check(inputs.original(join(frontendRoot, row.file)), row), '', row.file);
  // 합성 기여로 규칙마다 붉음을 본다. 게시판 기여의 실제 모양 위에서 바꾼다.
  const board = sections.find(row => row.owner === 'board');
  const original = inputs.original(join(frontendRoot, board.file)).replace(/\r\n/g, '\n');
  const swap = (from, to) => {
    assert.ok(original.includes(from), `the fixture finds ${from}`);
    return original.replace(from, to);
  };
  assert.match(check(swap("placement: 'actions'", "placement: 'sidebar'"), board), /board-new-post 의 배치는 overlay·actions·cards·main·status·bottom 리터럴이다/);
  assert.match(check(swap("activityNote: '공지사항과", "activityNote: '  ',\n    note: '공지사항과"), board), /board-lists 의 activityNote 는 비지 않은 문자열 리터럴이다/);
  assert.match(check(swap("failure: 'boundary' }],\n    visibleWhen: { permissions: ['DASHBOARD_READ'] },\n  },\n  {\n    id: 'board-notice-total'",
    "failure: 'later' }],\n    visibleWhen: { permissions: ['DASHBOARD_READ'] },\n  },\n  {\n    id: 'board-notice-total'"), board),
  /board-task-total 의 prefetch 항목은 \{ query: import 한 이름, failure: boundary·section \} 이다/);
  // H-R6: 기여는 기능 경로·중립 모듈만 import 한다 — 게시판 ID 원천(@/config)은 컴포넌트가 쓴다.
  assert.match(check(`import { TASK_BOARD_ID } from '@/config/board-ids';\n${original}`, board), /허용되지 않은 import @\/config\/board-ids/);
  // H-R7·H-R8: 모듈 경계. 읽기 대역으로 지시문만 바꾼다(실제 모듈은 그대로 둔다).
  const flip = target => path => {
    const text = readFrontendModule(path);
    if (text === undefined || !path.startsWith(target)) return text;
    return text.startsWith("'use client'") ? text.replace("'use client';", '') : `'use client';\n${text}`;
  };
  assert.match(check(original, board, flip('src/queries/board-home-query')),
    /board-new-post 의 prefetch\(boardHomeQuery\)는 'use client' 가 없는 모듈에서 가져온다/);
  assert.match(check(original, board, flip('src/app/components/dashboard/BoardHome')),
    /board-new-post 의 Component\(BoardNewPostAction\)는 'use client' 모듈에서 가져온다/);
  assert.match(check(original, board, () => undefined), /Component\(BoardNewPostAction\)는 'use client' 모듈에서 가져온다/,
    'an unreadable module is not judged client-safe');
});

test('a configuration without the contributing feature renders an empty registry, which the projection type check sees as a root', () => {
  const inputs = readProjectionInputs();
  for (const preset of TYPE_CHECK_PRESETS) {
    const tree = projectedTree({ preset }, inputs);
    for (const [slot, owners] of discoverSlotContributions(inputs.files.map(frontendRel))) {
      const registry = join(frontendRoot, slotRegistryPath(slot));
      const kept = owners.filter(owner => !tree.removed.has(keyOf(join(frontendRoot, `src/extensions/${owner}/${slot}.ts`))));
      assert.equal(tree.removed.has(keyOf(registry)), false, `${preset}: the registry survives (it is re-rendered, not cascaded away)`);
      if (kept.length === owners.length) continue;
      assert.equal(tree.contents.get(keyOf(registry)), renderSlotRegistry(slot, kept), `${preset}: ${slot} is rendered from ${kept.join(', ') || 'nothing'}`);
      assert.ok(tree.roots.includes(registry), `${preset}: the re-rendered registry is a type-check root`);
    }
  }
});
