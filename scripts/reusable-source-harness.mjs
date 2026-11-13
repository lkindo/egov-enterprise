/**
 * 소스 투영의 하네스 단계 — 투영본의 기준선 매니페스트와 투영본 하네스 프로필 census.
 * 기준선 매니페스트는 하네스 기준선 도구(harness-baseline-manifest.mjs)의 계산 하나로 쓴다 — 생성물의 메타 게이트가 같은 도구로 대조한다.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { MODULES_DIRECTORY, PRESETS_FILE, detectGeneratedComposition } from './composer-modules.mjs';
import { MANIFEST_PATH, renderHarnessBaselineManifest } from './harness-baseline-manifest-format.mjs';
import { computeHarnessBaselineEntries } from './harness-baseline-manifest.mjs';
import { planJavaRemoval, stripJavaComments } from './reusable-source-java.mjs';
import { ROOT, fail, git, normalize, trackedAndUntrackedFiles, walk } from './reusable-source-tree.mjs';
import { COMPOSER_SELECTION_PATH, verifyProjectComposition } from './project-composer-recipe.mjs';
import { computeReusableHarnessCensus } from './reusable-harness-census.mjs';
export { projectedWriteHandlerCounts, projectedMigrationTestCount } from './reusable-harness-census.mjs';

/** 생성물에 기록된 구성(거버넌스 투영이 쓴 스냅숏)의 권한 코드. 스냅숏을 다시 검증한다 — 임의의 코드 목록을 믿지 않는다. */
function projectedPermissionCodes(output) {
  const selectionPath = join(output, COMPOSER_SELECTION_PATH);
  if (!existsSync(selectionPath)) fail(`Projected composition snapshot is missing: ${COMPOSER_SELECTION_PATH}`);
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  return verifyProjectComposition(selection.composition, selection.catalog).permissionCodes;
}

// `ownership`·`profile` 은 생성기가 투영에 쓴 기능 소유(composerOwnership)와 프로필(composerProfile)이다. 원본에서 같은 판정으로
// 계획을 다시 세워 생성물의 Java 와 대조한다(독립 계획). pack 을 보지 않는다(11단계 C3).
// 활성 구성은 생성물 표지(config/modules/presets.json 의 active)에서 읽고, 기록은 그 파일의 해시(presetsSha256)에 결속한다(11단계 C5) —
// 생성물 하네스(ReusableHarnessProfile)가 같은 표지·lock·기록을 대조한다. `schemaTables` 는 DB 번들 lock 의 물리 테이블 수다.
export function writeReusableHarnessProfile(output, { ownership, profile, schemaTables }) {
  const generated = detectGeneratedComposition(output);
  if (!generated.projection) fail('Harness profile requires the generated composition marker (config/modules/presets.json active)');
  if (!Number.isInteger(schemaTables) || schemaTables <= 0) fail('Harness profile requires the DB bundle table count');
  const profileName = generated.profile;
  const javaFiles = trackedAndUntrackedFiles().filter(path => path.endsWith('.java')).map(path => join(ROOT, path));
  const plan = planJavaRemoval(ROOT, ownership, profile, javaFiles);
  const production = javaFiles.filter(path => /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\//.test(normalize(relative(ROOT, path))));
  const retained = [];
  const removed = [];
  const sources = new Map();
  for (const path of production) {
    const relativePath = normalize(relative(ROOT, path));
    const source = stripJavaComments(readFileSync(path, 'utf8'));
    const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    if (!packageName) fail(`Projected source package missing: ${relativePath}`);
    const row = { path: relativePath, type: `${packageName}.${basename(path, '.java')}` };
    if (plan.removed.has(path)) removed.push({ ...row, reason: plan.removalReason.get(path) });
    else { retained.push(row); sources.set(relativePath, source); }
  }
  const actual = walk(output, path => path.endsWith('.java'))
    .map(path => normalize(relative(output, path)))
    .filter(path => /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\//.test(path)).sort();
  const expected = retained.map(row => row.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`Projected Java source inventory differs from independent removal plan: missing=${expected.filter(path => !actual.includes(path))}, unknown=${actual.filter(path => !expected.includes(path))}`);
  }
  const activeType = target => {
    if (target.startsWith('EXTERNAL#')) return true;
    const type = target.split('#')[0];
    const rows = [...retained, ...removed].filter(row => row.type === type || row.type.split('.').at(-1) === type);
    if (rows.length !== 1) fail(`Ambiguous/unregistered harness policy type: ${type}`);
    return sources.has(rows[0].path);
  };
  const authorization = JSON.parse(readFileSync(join(ROOT, 'config/governance/authorization-policies.json'), 'utf8'));
  const census = computeReusableHarnessCensus(output, { sources, authorization, activeType, schemaTables,
    productionSources: retained.length, permissionCatalog: projectedPermissionCodes(output).length });
  const snapshot = { schemaVersion: 2, profile: profileName, domains: generated.domains,
    excludedDomains: plan.excludedDomains.sort(), sourceCommit: git(['rev-parse', 'HEAD']),
    presetsSha256: createHash('sha256').update(readFileSync(join(output, MODULES_DIRECTORY, PRESETS_FILE))).digest('hex'),
    census, retained: retained.sort((a, b) => a.path.localeCompare(b.path)), removed: removed.sort((a, b) => a.path.localeCompare(b.path)) };
  writeFileSync(join(output, 'config/governance/reusable-harness-profile.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

// 머리 주석만 생성기의 것이고 경로·키 순서·줄 형식은 매니페스트 도구와 같은 형식 모듈이다 — 생성물에서 처음 `--write` 해도
// 줄이 자리를 옮기지 않는다(도구는 기존 머리 주석을 그대로 둔다).
export function writeHarnessBaseline(output, projection) {
  writeReusableHarnessProfile(output, projection);
  const header = [
    '# 자동 산출 — reusable-base source projection 기준.',
    '# 남은 게이트/동결 목록을 생성 시점에 고정한다.',
  ];
  writeFileSync(
    join(output, ...MANIFEST_PATH.split('/')),
    renderHarnessBaselineManifest(computeHarnessBaselineEntries(output), header),
    'utf8',
  );
}

