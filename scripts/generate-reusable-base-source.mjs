#!/usr/bin/env node
/**
 * 검증된 DB bundle과 현재 릴리스 소스를 결합해 reusable-base 소스 트리를 만든다.
 * 장기 template 브랜치를 만들거나 현재 working tree를 수정하지 않는다.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  ftruncateSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base', 'source');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function fail(message) {
  throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`${command} 실행 실패(exit ${result.status}): ${result.stderr?.toString('utf8').trim() ?? ''}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

function git(args) {
  return run('git', args).toString('utf8').trim();
}

function parseArgs(argv) {
  const args = { profile: undefined, dbBundle: undefined, output: undefined, allowDirty: false, allowNonReleaseRef: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile') args.profile = argv[++index];
    else if (arg === '--db-bundle') args.dbBundle = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if (!args.profile || !args.dbBundle) fail('--profile과 --db-bundle이 필요하다.');
  return args;
}

function normalize(path) {
  return path.split(sep).join('/');
}

function safeOutputPath(requested, profile, shortSha) {
  const output = resolve(requested ?? join(OUTPUT_ROOT, `${profile}-${shortSha}`));
  const rel = relative(resolve(OUTPUT_ROOT), output);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail(`산출물 경로는 ${OUTPUT_ROOT} 아래여야 한다: ${output}`);
  }
  if (existsSync(output)) fail(`기존 산출물을 덮어쓰지 않는다: ${output}`);
  return output;
}

function trackedAndUntrackedFiles() {
  return run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((path) => !normalize(path).split('/').includes('build'));
}

function copySourceTree(output) {
  for (const rel of trackedAndUntrackedFiles()) {
    const source = join(ROOT, rel);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    const target = join(output, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  const gradlew = join(output, 'gradlew');
  if (existsSync(gradlew)) {
    // Windows 디렉터리 산출물에서는 실행 비트를 표현하지 못한다. 릴리스 archive 단계가
    // git index(100755)의 gradlew 모드를 보존해야 한다.
    statSync(gradlew);
  }
}

function walk(root, predicate, out = []) {
  if (!existsSync(root)) return out;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
}

function removePath(path, removed) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const file of walk(path, () => true)) removed.add(file);
    rmSync(path, { recursive: true });
  } else {
    removed.add(path);
    rmSync(path);
  }
}

/**
 * 게이트 술어 — 메타 게이트({@code HarnessBaselineIntegrityTest#isGateSource})와 **같은 모집단**을 본다.
 * 여기가 좁으면 투영이 게이트를 지우고도 "제거 0건" 이라고 보고한다(= 조용한 손실).
 */
const GATE_FILE_PATTERN =
  /(?:LinterTest|ArchTest|MatrixTest|GuardrailIntegrationTest|ValidationIntegrationTest|Archunit\w*|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules)\.java$/;
const GATE_TAGS = ['@Tag("governance-harness")', '@Tag("schema-validation")', '@ArchTag("architecture-gate")'];
/** frontend 거버넌스 계약이 사는 곳 — census·guard·cross-stack 계약이 전부 이 아래다. */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';

/**
 * 하네스 baseline 미러 상수 — 전부 메타 게이트({@code HarnessBaselineIntegrityTest})의 동명 선언과
 * **같은 값이어야 한다**. 어긋나면 투영본 매니페스트가 메타 게이트의 actual 과 달라져 산출물이
 * 통째로 red 가 된다(2026-09-12 실측: 신설 136 · 누락 54 · 소멸 54).
 */
const HARNESS_SCAN_ROOTS = [
  'api-server/src/test/java',
  'business-app/src/test/java',
  'business-core/src/test/java',
  'business-core/src/testFixtures/java',
  'foundation/src/test/java',
  'migration-tool/src/test/java',
];
const ARCH_RULE_FILE_PATTERN =
  /(?:AttachmentSourceRegistryLinterTest|InputContractMirrorLinterTest|ArchTest|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules|Archunit\w*)\.java$/;
const GATE_REGISTRIES = [
  'config/governance/authorization-policies.json',
  'config/governance/gates.json',
  'config/governance/zdm-waivers.json',
  'config/security/false-positive-review.json',
];
const GATE_HOOKS = ['.githooks/pre-push', '.githooks/pre-commit'];

function isJavaGateSource(path, source) {
  const normalized = normalize(path);
  if (normalized.includes('/harness/') || GATE_FILE_PATTERN.test(normalized)) return true;
  // 태그는 문자열 리터럴이므로 **리터럴은 보존한 채 주석만** 지운다(javadoc 인용의 오탐 차단).
  return GATE_TAGS.some((tag) => stripJavaComments(source).includes(tag));
}

function javaType(path) {
  const source = readFileSync(path, 'utf8');
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return packageName ? `${packageName}.${basename(path, '.java')}` : undefined;
}

function importedJavaTypes(path) {
  const source = readFileSync(path, 'utf8');
  return [...source.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)].map((match) => match[1]);
}

function referencedRemovedJavaType(path, removedTypes) {
  const source = readFileSync(path, 'utf8');
  const imported = importedJavaTypes(path).find((type) => removedTypes.has(type));
  if (imported) return imported;
  // 의존은 **코드에서만** 판정한다 — 주석·문자열 리터럴 속 클래스 이름은 참조가 아니다.
  //   (census·정규식이 게이트 이름을 문자열로 열거하는 관용 때문에 오탐이 연쇄한다.)
  const code = stripJavaCommentsAndStringLiterals(source);
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  for (const type of removedTypes) {
    if (!type) continue;
    if (code.includes(type)) return type;
    if (!packageName || !type.startsWith(`${packageName}.`)) continue;
    const simpleName = type.slice(packageName.length + 1);
    if (new RegExp(`\\b${simpleName}\\b`).test(code)) return type;
  }
  return undefined;
}

function pruneJava(output, manifest, profile) {
  const allowedPacks = new Set(profile.packs);
  const excludedDomains = Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.backend?.appDomains ?? []);
  const allBefore = walk(output, (path) => path.endsWith('.java'));
  const pathToType = new Map(allBefore.map((path) => [path, javaType(path)]));
  /*
    투영이 무엇을 게이트로 지웠는지는 **지우기 전에** 판정해야 한다 — 파일이 사라진 뒤에는
    소스를 읽을 수 없어 "몇 개 지웠다" 조차 말할 수 없다(그게 종전의 조용한 손실이다).
  */
  const gateSources = new Set(allBefore.filter((path) => isJavaGateSource(path, readFileSync(path, 'utf8'))));
  const removed = new Set();
  const removalReason = new Map();

  for (const domain of excludedDomains) {
    for (const sourceSet of ['main', 'test']) {
      for (const layer of ['domain', 'service']) {
        removePath(
          join(output, 'business-app', 'src', sourceSet, 'java', 'nuri', 'business', layer, domain),
          removed,
        );
      }
    }
    for (const path of removed) {
      if (!removalReason.has(path)) removalReason.set(path, `제외 domain ${domain} 직접 제거`);
    }
  }

  const removedTypes = new Set([...removed].map((path) => pathToType.get(path)).filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of allBefore) {
      if (removed.has(path) || !existsSync(path)) continue;
      const dangling = referencedRemovedJavaType(path, removedTypes);
      if (!dangling) continue;
      const rel = normalize(relative(output, path));
      if (rel.startsWith('foundation/') || rel.startsWith('business-core/')) {
        fail(`필수 모듈이 제외 domain을 참조한다: ${rel} -> ${dangling}`);
      }
      if (!rel.startsWith('business-app/') && !rel.startsWith('api-server/')) {
        fail(`자동 소유권을 판정할 수 없는 Java 참조: ${rel} -> ${dangling}`);
      }
      removed.add(path);
      removalReason.set(path, `${dangling} 참조`);
      removedTypes.add(pathToType.get(path));
      changed = true;
    }
  }

  for (const path of removed) if (existsSync(path)) rmSync(path);
  for (const path of walk(output, (candidate) => candidate.endsWith('.java'))) {
    const dangling = referencedRemovedJavaType(path, removedTypes);
    if (dangling) fail(`Java projection dangling import: ${normalize(relative(output, path))} -> ${dangling}`);
  }
  const removedGates = [...removed]
    .filter((path) => gateSources.has(path))
    .map((path) => ({
      file: normalize(relative(output, path)),
      reason: removalReason.get(path) ?? '(사유 미상)',
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
  return { excludedDomains: excludedDomains.sort(), removedFiles: removed.size, removedGates };
}

function resolveFrontendImport(frontendRoot, importer, specifier, knownFiles) {
  let base;
  if (specifier.startsWith('@/')) base = join(frontendRoot, 'src', specifier.slice(2));
  else if (specifier.startsWith('./') || specifier.startsWith('../')) base = resolve(dirname(importer), specifier);
  else return undefined;
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  return candidates.find((path) => knownFiles.has(path) || (existsSync(path) && statSync(path).isFile()));
}

function importedFrontendFiles(frontendRoot, path, knownFiles) {
  const source = readFileSync(path, 'utf8');
  const specifiers = [
    ...source.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1]);
  return specifiers.map((specifier) => resolveFrontendImport(frontendRoot, path, specifier, knownFiles)).filter(Boolean);
}

function stripExcludedFrontendPackBlocks(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const knownPacks = new Set(Object.keys(manifest.packs));
  const allowedPacks = new Set(profile.packs);
  const excludedPacks = new Set([...knownPacks].filter((packName) => !allowedPacks.has(packName)));
  let changedFiles = 0;
  let strippedBlocks = 0;

  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const source = readFileSync(path, 'utf8');
    const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const projected = [];
    let openMarker;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const markers = [...line.matchAll(/reusable-base:([a-z0-9_-]+):(start|end)/g)];
      if (markers.length > 1) {
        fail(`frontend pack marker는 한 줄에 하나만 허용한다: ${normalize(relative(frontendRoot, path))}:${index + 1}`);
      }
      const marker = markers[0];
      if (!marker) {
        if (!openMarker?.strip) projected.push(line);
        continue;
      }

      const [, packName, boundary] = marker;
      if (!knownPacks.has(packName)) {
        fail(`알 수 없는 frontend pack marker: ${packName} (${normalize(relative(frontendRoot, path))}:${index + 1})`);
      }
      if (boundary === 'start') {
        if (openMarker) {
          fail(`frontend pack marker 중첩은 허용하지 않는다: ${normalize(relative(frontendRoot, path))}:${index + 1}`);
        }
        openMarker = { packName, line: index + 1, strip: excludedPacks.has(packName) };
        if (!openMarker.strip) projected.push(line);
        continue;
      }

      if (!openMarker || openMarker.packName !== packName) {
        fail(`짝이 맞지 않는 frontend pack marker: ${packName} (${normalize(relative(frontendRoot, path))}:${index + 1})`);
      }
      if (!openMarker.strip) projected.push(line);
      else strippedBlocks += 1;
      openMarker = undefined;
    }

    if (openMarker) {
      fail(`닫히지 않은 frontend pack marker: ${openMarker.packName} (${normalize(relative(frontendRoot, path))}:${openMarker.line})`);
    }
    const nextSource = projected.join('');
    if (nextSource !== source) {
      writeFileSync(path, nextSource, 'utf8');
      changedFiles += 1;
    }
  }

  return { excludedPacks: [...excludedPacks].sort(), strippedBlocks, changedFiles };
}

function pruneFrontend(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const allowedPacks = new Set(profile.packs);
  const directPaths = Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.frontend?.removePaths ?? []);
  const sourceFiles = walk(frontendRoot, (path) => SOURCE_EXTENSIONS.includes(extname(path)));
  const knownFiles = new Set(sourceFiles);
  const removed = new Set();
  for (const rel of directPaths) removePath(join(frontendRoot, rel), removed);
  // 선언된 removePaths 는 manifest 에 의도가 남는다. 문제는 **연쇄로 딸려 가는 것**이라 나눠 센다.
  const directRemoved = new Set(removed);

  let changed = true;
  while (changed) {
    changed = false;
    for (const path of sourceFiles) {
      if (removed.has(path) || !existsSync(path)) continue;
      if (!importedFrontendFiles(frontendRoot, path, knownFiles).some((dependency) => removed.has(dependency))) continue;
      removed.add(path);
      changed = true;
    }
  }
  for (const path of removed) if (existsSync(path)) rmSync(path);

  for (const critical of ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/login/page.tsx']) {
    if (!existsSync(join(frontendRoot, critical))) fail(`frontend 필수 진입점이 projection에서 제거됐다: ${critical}`);
  }
  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const dangling = importedFrontendFiles(frontendRoot, path, knownFiles).filter((dependency) => removed.has(dependency));
    if (dangling.length) fail(`frontend projection dangling import: ${normalize(relative(frontendRoot, path))}`);
  }
  const removedGates = [...removed]
    .map((path) => normalize(relative(output, path)))
    .filter((rel) => rel.startsWith(FRONTEND_GATE_DIR))
    .sort((left, right) => left.localeCompare(right));
  return {
    directPaths: directPaths.sort(),
    removedFiles: removed.size,
    cascadedFiles: removed.size - directRemoved.size,
    removedGates,
  };
}

/**
 * 제거된 거버넌스 게이트를 **말하고**, manifest 의 명시적 승인과 exact 대조한다.
 *
 * <p>[왜] 투영은 제외 domain 을 지우면서 그 domain 을 문자열로 품은 하네스 린터까지 연쇄로 지운다.
 * 그 뒤 {@code writeHarnessBaseline} 이 **살아남은 것만으로** baseline 을 다시 써서, 파생 제품의
 * 메타 게이트는 사라진 게이트를 처음부터 없었던 것으로 본다 — 즉 "게이트 삭제 차단" 게이트가
 * 자기 자신의 삭제를 기록하지 못한 채 재동결된다(H2 가 금지하는 신호 은폐와 같은 구조).
 *
 * <p>여기서 막는 것은 삭제 자체가 아니라 **조용한** 삭제다. 정당한 제거는 manifest 의
 * {@code profiles.<name>.acknowledgedRemovedGates} 에 파일 경로를 적고 사유를 커밋에 남긴다 —
 * 그러면 게이트가 사라지는 변경에서 서로 다른 두 파일이 함께 움직여 diff 에 의도가 드러난다.
 * 승인 목록은 **양방향**이다: 등재하지 않은 제거도, 제거되지 않는데 남은 등재(부실 승인)도 red 다.
 */
/**
 * 생성기 **규칙**으로 제거되는 게이트 묶음 — 프로필 선택이 아니라 투영 방식 자체가 원인이라 파일 단위
 * 승인 대신 규칙 단위 승인을 받는다. 파일 단위로 두면 migration 검증이 하나 늘 때마다 세 프로필의
 * 매니페스트가 함께 흔들려 소음만 남고 신호가 죽는다.
 */
const GATE_REMOVAL_RULES = {
  'historical-migration-tests':
    '투영 DB 번들이 원본 V2 체인을 V1 baseline 으로 대체해 역사적 migration 검증이 검사 대상을 잃는다',
};

function assertRemovedGatesAcknowledged(profileName, profile, java, frontend, ruleRemovals) {
  const removedGates = [
    ...java.removedGates.map((gate) => ({ ...gate, side: 'backend' })),
    ...frontend.removedGates.map((file) => ({ file, reason: 'frontend pack 제외/연쇄', side: 'frontend' })),
  ].sort((left, right) => left.file.localeCompare(right.file));
  const activeRules = Object.entries(ruleRemovals ?? {}).filter(([, files]) => files.length > 0);
  const ruleGateCount = activeRules.reduce((total, [, files]) => total + files.length, 0);

  const total = removedGates.length + ruleGateCount;
  console.log(`[base-source] 투영에서 제거된 거버넌스 게이트: ${total}건`);
  for (const [rule, files] of activeRules) {
    console.log(`  - (규칙) ${rule}: ${files.length}건 — ${GATE_REMOVAL_RULES[rule] ?? '(사유 미등록)'}`);
  }
  for (const gate of removedGates) console.log(`  - ${gate.file}  <- ${gate.reason}`);

  /*
    승인은 **사유를 포함한 객체**로만 받는다. 파일 경로만 나열하면 목록이 곧 서랍이 되고,
    다음 사람이 "이건 왜 빠져도 되는가" 를 판정할 근거가 manifest 밖(커밋 메시지)에만 남는다.
  */
  const acknowledgedEntries = profile.acknowledgedRemovedGates ?? [];
  for (const entry of acknowledgedEntries) {
    if (typeof entry?.file !== 'string' || !entry.file || typeof entry?.reason !== 'string' || !entry.reason.trim()) {
      fail(
        `profile '${profileName}' 의 acknowledgedRemovedGates 항목은 { file, reason } 이어야 한다: ` +
          JSON.stringify(entry),
      );
    }
  }
  const acknowledgedRules = profile.acknowledgedGateRemovalRules ?? [];
  for (const entry of acknowledgedRules) {
    if (typeof entry?.rule !== 'string' || !GATE_REMOVAL_RULES[entry.rule]
        || typeof entry?.reason !== 'string' || !entry.reason.trim()) {
      fail(
        `profile '${profileName}' 의 acknowledgedGateRemovalRules 항목은 { rule, reason } 이어야 하고 `
          + `rule 은 생성기가 아는 규칙(${Object.keys(GATE_REMOVAL_RULES).join(', ')})이어야 한다: `
          + JSON.stringify(entry),
      );
    }
  }
  const acknowledgedRuleIds = acknowledgedRules.map((entry) => entry.rule);
  const unacknowledgedRules = activeRules.map(([rule]) => rule).filter((rule) => !acknowledgedRuleIds.includes(rule));
  const staleRules = acknowledgedRuleIds.filter(
    (rule) => !activeRules.some(([active]) => active === rule),
  );
  if (unacknowledgedRules.length) {
    fail(
      `profile '${profileName}' 이 승인하지 않은 규칙으로 거버넌스 게이트를 제거한다: `
        + unacknowledgedRules.map((rule) => `${rule}(${ruleRemovals[rule].length}건)`).join(', ')
        + `\nconfig/reusable-base-profiles.json 의 profiles.${profileName}.acknowledgedGateRemovalRules 에 `
        + '{ rule, reason } 으로 등재할 것.',
    );
  }
  if (staleRules.length) {
    fail(
      `profile '${profileName}' 의 acknowledgedGateRemovalRules 에 더 이상 적용되지 않는 규칙이 남아 있다: `
        + staleRules.join(', '),
    );
  }

  const acknowledged = acknowledgedEntries.map((entry) => entry.file);
  const actual = removedGates.map((gate) => gate.file);
  const unacknowledged = actual.filter((file) => !acknowledged.includes(file));
  const stale = acknowledged.filter((file) => !actual.includes(file));
  if (unacknowledged.length) {
    fail(
      `profile '${profileName}' 이 승인하지 않은 거버넌스 게이트를 제거한다 (${unacknowledged.length}건):\n` +
        unacknowledged.map((file) => `  - ${file}`).join('\n') +
        `\n정당한 제거라면 config/reusable-base-profiles.json 의 profiles.${profileName}.acknowledgedRemovedGates 에 등재하고 사유를 커밋에 남길 것.`,
    );
  }
  if (stale.length) {
    fail(
      `profile '${profileName}' 의 acknowledgedRemovedGates 에 더 이상 제거되지 않는 항목이 남아 있다 (${stale.length}건):\n` +
        stale.map((file) => `  - ${file}`).join('\n') +
        '\n승인 목록은 실제 제거와 exact 일치해야 한다 — 낡은 승인은 다음 제거를 조용히 통과시킨다.',
    );
  }
  return {
    files: removedGates,
    rules: activeRules.map(([rule, files]) => ({ rule, reason: GATE_REMOVAL_RULES[rule], count: files.length, files })),
    total,
  };
}

function installDatabaseBundle(output, dbBundle) {
  const migrationTarget = join(output, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
  if (existsSync(migrationTarget)) rmSync(migrationTarget, { recursive: true });
  mkdirSync(migrationTarget, { recursive: true });
  const migrationSource = join(dbBundle, 'db', 'migration');
  for (const file of readdirSync(migrationSource)) {
    copyFileSync(join(migrationSource, file), join(migrationTarget, file));
  }
}

/**
 * ZDM waiver registry 를 **투영본에 실재하는 migration** 으로 가지친다.
 *
 * <p>[왜] 투영본은 원본 V2 체인을 검증된 V1 번들로 통째로 교체한다(installDatabaseBundle).
 * 그러면 {@code zdm-waivers.json} 의 legacyDebt·waivers 가 **존재하지 않는 migration** 을 지목하게
 * 되고 {@code ZeroDowntimeMigrationLinterTest} 가 fail-closed 로 red 가 된다(2026-09-12 실측).
 *
 * <p>지우는 것은 **이미 사라진 파일에 대한 승인 기록**뿐이다 — 그 승인이 보호하던 대상이 투영본에
 * 존재하지 않으므로 보호가 줄지 않는다. adopter 가 새로 추가하는 migration 은 종전대로 전부 감사된다
 * (전방 보호 무변경). 본체 저장소의 registry 는 손대지 않는다.
 *
 * <p>가지친 결과는 {@code __registry.config/governance/zdm-waivers.json} 해시로 baseline 에 실린다 —
 * 즉 이 가지치기도 매니페스트에 흔적을 남긴다.
 */
function pruneZeroDowntimeWaivers(output) {
  const registryRelative = 'config/governance/zdm-waivers.json';
  const registryPath = join(output, ...registryRelative.split('/'));
  if (!existsSync(registryPath)) fail(`ZDM waiver registry 가 투영본에 없다: ${registryRelative}`);

  const raw = readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(raw);
  const survives = (entry) => {
    const relative = typeof entry?.path === 'string' ? entry.path : '';
    return relative !== '' && existsSync(join(output, ...relative.split('/')));
  };

  const before = {
    legacyDebt: (registry.legacyDebt ?? []).length,
    waivers: (registry.waivers ?? []).length,
  };
  registry.legacyDebt = (registry.legacyDebt ?? []).filter(survives);
  registry.waivers = (registry.waivers ?? []).filter(survives);
  const removed = {
    legacyDebt: before.legacyDebt - registry.legacyDebt.length,
    waivers: before.waivers - registry.waivers.length,
  };

  if (removed.legacyDebt || removed.waivers) {
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const serialized = `${JSON.stringify(registry, null, 2)}\n`.replaceAll('\n', eol);
    writeFileSync(registryPath, serialized, 'utf8');
    console.log(
      `[base-source] ZDM waiver registry 가지치기: legacyDebt ${before.legacyDebt}→${registry.legacyDebt.length},`
        + ` waivers ${before.waivers}→${registry.waivers.length} (번들에 없는 migration 지목분 제거)`,
    );
  }
  return { ...removed, remaining: { ...{ legacyDebt: registry.legacyDebt.length, waivers: registry.waivers.length } } };
}

/**
 * 역사적 migration 검증을 제거한다 — 투영본은 원본 V2 체인을 검증된 V1 번들로 교체하므로 그것들이
 * 검사할 대상이 사라진다.
 *
 * <p>⚠ **이 42개는 전부 게이트 소스다**(`@Tag("schema-validation")` 실측 42/42). 그래서 제거 사실을
 * 승인 census 에 합류시켜야 한다 — 종전에는 이 함수가 {@code assertRemovedGatesAcknowledged} **뒤에**
 * 돌아, census 가 "제거된 게이트 0건" 이라고 말하면서 게이트 42개가 사라졌다(2026-09-12 실측).
 * 조용한 손실을 막으려고 만든 census 자신에 남아 있던 같은 구멍이다.
 */
function pruneHistoricalMigrationTests(output) {
  const schemaTestRoot = join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema');
  const tests = walk(schemaTestRoot, (path) => /MigrationIntegrationTest\.java$/.test(path));
  for (const path of tests) rmSync(path);
  return {
    count: tests.length,
    files: tests.map((path) => normalize(relative(output, path))).sort((a, b) => a.localeCompare(b)),
  };
}

function adaptOwnershipGuardBaseline(output) {
  const mainTypes = new Set(
    walk(output, (path) => path.endsWith('.java') && normalize(path).includes('/src/main/java/'))
      .map((path) => basename(path, '.java')),
  );
  const path = join(
    output,
    'api-server',
    'src',
    'test',
    'java',
    'nuri',
    'api',
    'harness',
    'OwnershipGuardBaselineLinterTest.java',
  );
  let descriptor;
  try {
    descriptor = openSync(path, 'r+');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  try {
    const source = readFileSync(descriptor, 'utf8');
    const block = /private static final Set<String> FROZEN_CENSUS = new TreeSet<>\(Arrays\.asList\(([\s\S]*?)\)\);/;
    const match = source.match(block);
    if (!match) fail('generated ownership guard baseline 블록을 찾지 못했다.');
    const entries = [...match[1].matchAll(/"([A-Za-z0-9_$]+#[^"]+)"/g)]
      .map((item) => item[1])
      .filter((entry) => mainTypes.has(entry.split('#')[0]));
    if (entries.length === 0) fail('generated ownership guard baseline이 비었다.');
    const replacement = 'private static final Set<String> FROZEN_CENSUS = new TreeSet<>(Arrays.asList(\n'
      + entries.map((entry, index) => `            "${entry}"${index === entries.length - 1 ? '' : ','}`).join('\n')
      + '));';
    const bytes = Buffer.from(source.replace(block, replacement), 'utf8');
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
    ftruncateSync(descriptor, bytes.length);
  } finally { closeSync(descriptor); }
}

function adaptGeneratedHarness(output) {
  const replacements = [
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema', 'SchemaValidationIntegrationTest.java'),
      from: '.isGreaterThanOrEqualTo(20);',
      to: '.isGreaterThanOrEqualTo(2);',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'EntitySchemaConformanceLinterTest.java'),
      from: 'if (files.size() < 20)',
      to: 'if (files.size() < 2)',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SeedLocationLinterTest.java'),
      from: 'private static final int MIGRATION_SQL_FLOOR = 25;',
      to: 'private static final int MIGRATION_SQL_FLOOR = 3;',
    },
    /*
      투영본은 역사적 migration 검증 42개를 통째로 제거한다(pruneHistoricalMigrationTests —
      그 테스트들이 검증하는 V2 체인이 V1 번들로 교체되므로 남겨 두면 전부 red 다). 그래서 이
      동결 census 의 모집단이 42 → 0 이 된다. 수치를 낮추는 것이 아니라 **사실을 따라가는** 것이며,
      adopter 가 migration 검증을 새로 만들면 0 을 넘어 red 가 되어 다시 동결을 요구한다.
      DisplayName 도 함께 고친다 — 0건을 세면서 "42개" 라고 말하면 화면이 사실과 다른 말을 한다.
    */
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SharedPostgresMigrationHarnessContractTest.java'),
      from: 'private static final int EXPECTED_MIGRATION_TEST_COUNT = 42;',
      to: 'private static final int EXPECTED_MIGRATION_TEST_COUNT = 0;',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SharedPostgresMigrationHarnessContractTest.java'),
      from: '@DisplayName("42개 migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")',
      to: '@DisplayName("migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")',
    },
    /*
      legacy debt census 는 **역사적 V2 migration 안의 자유형 ignore marker** 인벤토리다(43파일·188건).
      투영본은 그 migration 을 V1 번들로 교체하므로 인벤토리가 사실상 0 이 되고, pruneZeroDowntimeWaivers
      가 registry 도 같은 상태로 맞춘다. 동결 수치를 사실에 맞춰 내리는 것이며 — 0 을 넘는 자유형 marker 가
      새로 들어오면 다시 red 다. 빈 census 의 해시는 sha256('') 이다.
    */
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'ZeroDowntimeMigrationLinterTest.java'),
      from: '"ee36a95c7e73bd0db853130e11ec5398e6a266ce934277b61d1d504106b54b69";',
      to: '"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'ZeroDowntimeMigrationLinterTest.java'),
      from: 'private static final int LEGACY_DEBT_FILE_COUNT = 43;',
      to: 'private static final int LEGACY_DEBT_FILE_COUNT = 0;',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'ZeroDowntimeMigrationLinterTest.java'),
      from: 'private static final int LEGACY_DEBT_IGNORE_COUNT = 188;',
      to: 'private static final int LEGACY_DEBT_IGNORE_COUNT = 0;',
    },
  ];
  /*
    ⚠ 조정 대상이 **이미 제거됐을 수 있다.** 하네스 린터는 자기가 검사하는 코드와 서로의
    FQN 을 문자열로 품고 있어, 어떤 domain 을 제외하면 pruneJava 의 전이 제거가 린터까지
    끌고 간다(core 프로필 실측: harness 39개 중 11개 제거).

    종전에는 readFileSync 가 그대로 ENOENT 를 던져 **생성이 통째로 죽었다** — 그것도
    "no such file or directory" 라는, 원인을 짐작할 수 없는 메시지로. core 프로필 생성이
    그 때문에 불가능했다.

    없는 파일은 건너뛰되 **조용히 넘기지 않는다** — 무엇을 건너뛰었는지 로그로 남긴다.
    파일이 있는데 조정 지점을 못 찾는 것은 종전대로 fail 이다(하한을 낮추지 못한 채
    투영본이 나가면 축소된 프로필에서 그 하네스가 영구 red 다).
  */
  const skipped = [];
  for (const replacement of replacements) {
    /*
      ⚠ `existsSync` 로 먼저 확인하고 읽으면 **TOCTOU 경쟁**이다(CodeQL js/file-system-race,
      7.7 blocking — 실제로 이 자리에서 잡혔다). 확인과 사용 사이에 대상이 바뀔 수 있으므로
      **읽기를 시도하고 ENOENT 만 골라 처리**한다. 다른 오류(권한·I/O)는 그대로 던져
      조용한 건너뜀으로 위장되지 않게 한다.
    */
    let source;
    try {
      source = readFileSync(replacement.path, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      skipped.push(normalize(relative(output, replacement.path)));
      continue;
    }
    if (!source.includes(replacement.from)) fail(`generated harness 조정 지점을 찾지 못했다: ${replacement.from}`);
    writeFileSync(replacement.path, source.replace(replacement.from, replacement.to), 'utf8');
  }
  if (skipped.length) {
    console.log(`[base-source] harness 조정 건너뜀(투영에서 제거됨) ${skipped.length}건: ${skipped.join(', ')}`);
  }
  adaptOwnershipGuardBaseline(output);
}

function skipJavaLiteral(source, open, quote) {
  for (let index = open + 1; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source[index] === quote) return index;
  }
  return source.length - 1;
}

/**
 * **타입 의존 판정용** 소스 — 주석에 더해 문자열 리터럴의 *내용*까지 지운다.
 *
 * `stripJavaComments` 는 리터럴을 **보존**한다(해시·본문 동결에는 그게 맞다). 그러나
 * "이 파일이 저 타입에 의존하는가" 를 볼 때 리터럴 속 이름은 참조가 아니다 — census·정규식이
 * 클래스 이름을 문자열로 열거하는 것은 이 저장소의 흔한 관용이다.
 *
 * 실제 피해(2026-09-12 core 프로필 실측): `HarnessBaselineIntegrityTest` 가
 * `Pattern.compile("(?:…|InputContractMirrorLinterTest|…)")` 라는 **정규식 문자열** 하나 때문에
 * 제거 대상으로 판정됐고, 그 클래스에 얹힌 공용 유틸을 쓰던 린터 6개가 뒤따라 빠졌다.
 * 하네스 11개 중 **7개가 이 오탐 하나에서** 비롯됐다 — 그중에는 메서드 인가·인가 배선 동기화·
 * 시큐리티 체인 우회 차단 같은 보안 게이트가 포함된다.
 *
 * 리터럴은 빈 껍데기로 바꿔 자리만 남긴다 — 완전히 지우면 토큰이 붙어 새 식별자가 생긴다.
 */
function stripJavaCommentsAndStringLiterals(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const close = skipJavaLiteral(source, index, char);
      output += char === '"' ? '""' : "''";
      index = close + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

/**
 * 주석만 제거하고 문자열 리터럴은 보존한다 — 메타 게이트의
 * {@code HarnessBaselineIntegrityTest#stripCommentsPreservingStrings} 와 **동일해야 한다**.
 * 블록 주석을 공백 한 칸으로 바꾸는 것도 그 동등성의 일부다(지워 버리면 앞뒤 토큰이 붙어
 * 없던 식별자가 생기고, 상수 해시·__sourceHash 가 메타 게이트와 달라진다).
 */
function stripJavaComments(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const close = skipJavaLiteral(source, index, char);
      output += source.slice(index, close + 1);
      index = close + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      output += ' ';
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

function findJavaStatementEnd(source, from) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") index = skipJavaLiteral(source, index, char);
    else if ('({['.includes(char)) depth += 1;
    else if (')}]'.includes(char)) depth -= 1;
    else if (char === ';' && depth <= 0) return index;
  }
  return -1;
}

function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function extractHarnessConstants(source) {
  const code = stripJavaComments(source);
  /*
    ⚠ 이 정규식은 메타 게이트의 CONST_DECL 과 **한 글자도 어긋나면 안 된다**.
    DEC-OPS-027(2026-09-01)이 숫자·boolean 을 편입했는데(anti-vacuity 플로어·census·부채 동결이
    전부 숫자다) 이 생성기는 따라가지 않아, 투영본 매니페스트에 숫자 상수 키가 통째로 빠져 있었다
    — 메타 게이트가 '신설 감지' 로 red 가 된다. 동등성은 harness-baseline-mirror 계약이 강제한다.
  */
  const declaration = /static\s+final\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*(?:String|Set|List|Collection|Map|Pattern|int|long|short|byte|double|float|boolean|char)\s*(?:<[^=;]*>)?\s*(?:\[\s*\])?\s+([A-Za-z_$][\w$]*)\s*=/g;
  const result = new Map();
  for (const match of code.matchAll(declaration)) {
    const end = findJavaStatementEnd(code, match.index + match[0].length);
    if (end < 0) continue;
    const rhs = code.slice(match.index + match[0].length, end);
    const normalized = rhs.replaceAll(/\s+/g, ' ').trim();
    const literalCount = [...rhs.matchAll(/"(?:\\.|[^"\\])*"/g)].length;
    result.set(match[1], `${literalCount}:${shortHash(normalized)}`);
  }
  return result;
}

/**
 * 메타 게이트가 실행 시점에 만드는 {@code actual} 맵을 **그대로 재현**한다.
 *
 * <p>[왜 거울이어야 하는가] 투영본에서는 게이트가 일부 제거되므로 저장소에 커밋된 매니페스트를
 * 그대로 쓸 수 없어 생성기가 다시 쓴다. 그런데 그 계산이 메타 게이트와 조금이라도 어긋나면
 * **산출물이 통째로 red** 가 된다 — 2026-09-12 demo 투영본 실측에서 신설 136 · 누락 54 · 소멸 54.
 * 원인은 DEC-OPS-027 이 넓힌 census(ArchUnit 계층·게이트 태그·__sourceHash·__registry.*·
 * testFixtures·migration-tool·숫자 상수)를 이 생성기가 따라가지 않은 것이었다.
 *
 * <p>드리프트 재발은 {@code scripts/harness-baseline-mirror-contract.test.mjs} 가 막는다 —
 * **저장소 자신에 대해** 이 함수의 출력이 커밋된 매니페스트와 정확히 같아야 하며, 메타 게이트가
 * 바뀌면 그 계약이 main 에서 즉시 red 가 된다(산출물 생성 시점까지 기다리지 않는다).
 */
export function computeHarnessBaselineEntries(root) {
  const gateSources = new Map();
  for (const rel of HARNESS_SCAN_ROOTS) {
    const dir = join(root, ...rel.split('/'));
    // 메타 게이트는 스캔 루트 부재를 fail 로 본다(조용한 skip 은 false-green). 같은 판정을 쓴다.
    if (!existsSync(dir)) fail(`하네스 스캔 루트를 찾을 수 없다: ${rel}`);
    const module = rel.split('/')[0];
    for (const path of walk(dir, (candidate) => candidate.endsWith('.java'))) {
      const source = readFileSync(path, 'utf8');
      if (!isJavaGateSource(path, source)) continue;
      const className = `${module}/${basename(path, '.java')}`;
      /*
        메타 게이트도 이 생성기도 키를 `module/단순명` 으로 만든다 — 같은 이름의 게이트가 두 루트에
        있으면 **뒤가 앞을 덮어써** 한쪽의 동결이 조용히 사라진다. 통과시키지 않는다.
      */
      if (gateSources.has(className)) {
        fail(
          `게이트 클래스명 충돌: ${className} — ${normalize(relative(root, gateSources.get(className).path))}`
            + ` 와 ${normalize(relative(root, path))} 가 같은 동결 키를 갖는다(한쪽의 동결이 사라진다).`,
        );
      }
      gateSources.set(className, { path, source });
    }
  }

  const entries = new Map();
  const classes = [];
  for (const [className, { path, source }] of gateSources) {
    classes.push(className);
    const code = stripJavaComments(source);
    for (const [name, value] of extractHarnessConstants(source)) {
      entries.set(`${className}.${name}`, value);
    }
    // ArchUnit·표적 의미 게이트는 규칙이 상수 밖(메서드 본문)에 살아 소스 전체를 동결한다.
    if (ARCH_RULE_FILE_PATTERN.test(basename(path))) {
      entries.set(`${className}.__sourceHash`, shortHash(code.replaceAll('\r\n', '\n')));
    }
  }
  entries.set('__harness.classes', [...classes].sort().join(','));

  for (const hook of GATE_HOOKS) {
    const hookPath = join(root, ...hook.split('/'));
    entries.set(
      `__hooks.${basename(hook)}`,
      existsSync(hookPath) ? shortHash(readFileSync(hookPath, 'utf8').replaceAll('\r\n', '\n')) : 'MISSING',
    );
  }
  for (const registry of GATE_REGISTRIES) {
    const registryPath = join(root, ...registry.split('/'));
    entries.set(
      `__registry.${registry}`,
      existsSync(registryPath)
        ? shortHash(readFileSync(registryPath, 'utf8').replaceAll('\r\n', '\n'))
        : 'MISSING',
    );
  }
  return entries;
}

function writeHarnessBaseline(output) {
  const entries = computeHarnessBaselineEntries(output);
  const lines = [
    '# 자동 산출 — reusable-base source projection 기준.',
    '# 남은 게이트/동결 목록을 생성 시점에 고정한다.',
    ...[...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`),
    '',
  ];
  writeFileSync(
    join(output, 'api-server', 'src', 'test', 'resources', 'harness', 'baseline-manifest.properties'),
    lines.join('\n'),
    'utf8',
  );
}

function writeProjectedManifest(output, manifest, profileName, profile, dbLock) {
  const allowedPacks = new Set(profile.packs);
  const packs = Object.fromEntries(
    Object.entries(manifest.packs).filter(([packName]) => allowedPacks.has(packName)),
  );
  const ownedDomains = new Set(Object.values(packs).flatMap((pack) => pack.backend?.appDomains ?? []));
  const projected = {
    ...manifest,
    sourcePolicy: {
      ...manifest.sourcePolicy,
      generatedProfile: profileName,
    },
    profiles: {
      [profileName]: profile,
    },
    packs,
    clusters: (manifest.clusters ?? []).filter(
      (cluster) => allowedPacks.has(cluster.pack) &&
        [...(cluster.domains ?? []), ...(cluster.requiresDomains ?? [])].every((domain) => ownedDomains.has(domain)),
    ),
    sharedTableContracts: (manifest.sharedTableContracts ?? [])
      .filter((contract) => allowedPacks.has(contract.ownerPack))
      .map((contract) => ({
        ...contract,
        consumers: (contract.consumers ?? []).filter((consumer) => ownedDomains.has(consumer)),
      })),
    databaseSnapshot: {
      ...manifest.databaseSnapshot,
      source: `generated/${profileName}`,
      checkedAt: dbLock.generatedAt,
      physicalTableCountExcludingFlyway: dbLock.tables.length,
      physicalSequenceCount: dbLock.sequences.length,
      physicalStandaloneSequenceCount: Object.values(packs)
        .flatMap((pack) => pack.database.sequences ?? []).length,
    },
  };
  writeFileSync(
    join(output, 'config', 'reusable-base-profiles.json'),
    `${JSON.stringify(projected, null, 2)}\n`,
    'utf8',
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const profile = manifest.profiles?.[args.profile];
  if (!profile) fail(`지원하지 않는 profile: ${args.profile}`);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 source artifact는 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 source artifact는 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  const dbBundle = resolve(args.dbBundle);
  const dbLockPath = join(dbBundle, 'profile-lock.json');
  if (!existsSync(dbLockPath)) fail(`DB bundle lock이 없다: ${dbLockPath}`);
  const dbLock = JSON.parse(readFileSync(dbLockPath, 'utf8'));
  if (dbLock.profile !== args.profile) fail(`DB bundle profile ${dbLock.profile} != source profile ${args.profile}`);
  if (dbLock.sourceCommit !== sourceCommit) fail(`DB bundle commit ${dbLock.sourceCommit} != source commit ${sourceCommit}`);

  const output = safeOutputPath(args.output, args.profile, sourceCommit.slice(0, 12));
  mkdirSync(output, { recursive: true });
  console.log(`[base-source] ${args.profile}: tracked source tree를 투영한다.`);
  copySourceTree(output);
  const java = pruneJava(output, manifest, profile);
  const packBlocks = stripExcludedFrontendPackBlocks(output, manifest, profile);
  const frontend = { ...pruneFrontend(output, manifest, profile), packBlocks };
  // ⚠ 규칙 기반 제거는 **승인 검사보다 먼저** 해야 한다 — 뒤에 두면 census 가 "0건" 이라고 말한 뒤
  //   게이트 42개가 사라진다(2026-09-12 실측으로 드러난 이 census 자신의 구멍).
  const removedHistoricalMigrationTests = pruneHistoricalMigrationTests(output);
  const removedGates = assertRemovedGatesAcknowledged(args.profile, profile, java, frontend, {
    'historical-migration-tests': removedHistoricalMigrationTests.files,
  });
  installDatabaseBundle(output, dbBundle);
  const zdmWaivers = pruneZeroDowntimeWaivers(output);
  writeProjectedManifest(output, manifest, args.profile, profile, dbLock);
  adaptGeneratedHarness(output);
  writeHarnessBaseline(output);

  const lock = {
    schemaVersion: 1,
    profile: args.profile,
    packs: profile.packs,
    sourceCommit,
    sourceReleaseTag: releaseTag ?? null,
    localDevelopmentBuild: !releaseTag || Boolean(dirty),
    generatedAt: new Date().toISOString(),
    java,
    frontend,
    removedGates,
    removedHistoricalMigrationTests: removedHistoricalMigrationTests.count,
    zdmWaivers,
    databaseLock: dbLock,
  };
  writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  writeFileSync(
    join(output, 'REUSABLE_BASE.md'),
    `# Reusable Base — ${args.profile}\n\n` +
      `릴리스 \`${releaseTag ?? sourceCommit.slice(0, 12)}\`에서 생성된 일회성 산출물이다. ` +
      `\`template/reusable-base\` 장기 브랜치가 아니다.\n\n` +
      `- packs: ${profile.packs.join(', ')}\n` +
      `- 제외 backend domains: ${java.excludedDomains.join(', ') || '(없음)'}\n` +
      `- 제거 Java files: ${java.removedFiles}\n` +
      `- 제거 frontend files: ${frontend.removedFiles}` +
        ` (선언 ${frontend.removedFiles - frontend.cascadedFiles} · 연쇄 ${frontend.cascadedFiles})\n` +
      `- 제거된 거버넌스 게이트: ${removedGates.total}건` +
        (removedGates.total
          ? `\n${[
            ...removedGates.rules.map((rule) => `  - (규칙) ${rule.rule}: ${rule.count}건 — ${rule.reason}`),
            ...removedGates.files.map((gate) => `  - ${gate.file} <- ${gate.reason}`),
          ].join('\n')}\n\n`
          : '\n\n') +
      `DB migration은 신규 빈 PostgreSQL 전용이다. 운영/공유 DB 축소에 사용하지 않는다.\n`,
    'utf8',
  );
  console.log(`[base-source] PASS: ${normalize(relative(ROOT, output))}`);
  console.log(`[base-source] removed java=${java.removedFiles}, frontend=${frontend.removedFiles}`);
}

/* 계약 테스트가 이 모듈을 import 해도 생성이 시작되면 안 된다(부작용 있는 import 금지). */
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`[base-source] FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
