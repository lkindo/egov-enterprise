/**
 * 소스 투영의 게이트 단계 — 제거된 거버넌스 게이트의 승인 대조, 투영본에 맞춘 하네스·ZDM 원장·원본 Atlas 조정.
 */
import { closeSync, existsSync, ftruncateSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { stripJavaComments } from './reusable-source-java.mjs';
import { fail, normalize, readTextIfPresent, walk } from './reusable-source-tree.mjs';

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
  'upstream-atlas':
    '원본 Atlas 는 원본 저장소의 운영 사실을 담은 채 로그인 전에 응답되고, 투영본만으로는 다시 만들 수 없어 생성물에서 걷는다',
};

/**
 * 제거된 게이트와 승인 목록의 대조 결과를 출력·실패 없이 돌려준다. 생성기의 승인 대조와 정밀 점검(plan/deep)이
 * 같은 판정을 쓴다. `removedGateFiles` 는 프로필 선택으로 지워지는 게이트 파일(정렬), `ruleRemovals` 는 규칙별 파일 목록이다.
 */
export function removedGateAcknowledgement(profile, removedGateFiles, ruleRemovals) {
  /*
    승인은 **사유를 포함한 객체**로만 받는다. 파일 경로만 나열하면 목록이 곧 서랍이 되고,
    다음 사람이 "이건 왜 빠져도 되는가" 를 판정할 근거가 manifest 밖(커밋 메시지)에만 남는다.
  */
  const validEntry = (entry) => typeof entry?.file === 'string' && entry.file && typeof entry?.reason === 'string' && entry.reason.trim();
  const validRule = (entry) => typeof entry?.rule === 'string' && GATE_REMOVAL_RULES[entry.rule]
    && typeof entry?.reason === 'string' && entry.reason.trim();
  // 배열이 아닌 값(문자열·객체)은 그 값 하나를 형식이 틀린 항목으로 본다. 대조가 TypeError 로 멈추면 무엇이 틀렸는지 말하지 못한다.
  const listOf = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
  const activeRules = Object.entries(ruleRemovals ?? {}).filter(([, files]) => files.length > 0);
  const acknowledgedEntries = listOf(profile.acknowledgedRemovedGates);
  const acknowledgedRules = listOf(profile.acknowledgedGateRemovalRules);
  const acknowledgedRuleIds = acknowledgedRules.filter(validRule).map((entry) => entry.rule);
  const acknowledged = acknowledgedEntries.filter(validEntry).map((entry) => entry.file);
  return {
    activeRules,
    invalidEntries: acknowledgedEntries.filter((entry) => !validEntry(entry)),
    invalidRules: acknowledgedRules.filter((entry) => !validRule(entry)),
    unacknowledgedRules: activeRules.map(([rule]) => rule).filter((rule) => !acknowledgedRuleIds.includes(rule)),
    staleRules: acknowledgedRuleIds.filter((rule) => !activeRules.some(([active]) => active === rule)),
    unacknowledged: removedGateFiles.filter((file) => !acknowledged.includes(file)),
    stale: acknowledged.filter((file) => !removedGateFiles.includes(file)),
  };
}

export function assertRemovedGatesAcknowledged(profileName, profile, java, frontend, ruleRemovals) {
  const removedGates = [
    ...java.removedGates.map((gate) => ({ ...gate, side: 'backend' })),
    ...frontend.removedGates.map((file) => ({ file, reason: 'frontend pack 제외/연쇄', side: 'frontend' })),
  ].sort((left, right) => left.file.localeCompare(right.file));
  const { activeRules, invalidEntries, invalidRules, unacknowledgedRules, staleRules, unacknowledged, stale } =
    removedGateAcknowledgement(profile, removedGates.map((gate) => gate.file), ruleRemovals);
  const ruleGateCount = activeRules.reduce((total, [, files]) => total + files.length, 0);

  const total = removedGates.length + ruleGateCount;
  console.log(`[base-source] 투영에서 제거된 거버넌스 게이트: ${total}건`);
  for (const [rule, files] of activeRules) {
    console.log(`  - (규칙) ${rule}: ${files.length}건 — ${GATE_REMOVAL_RULES[rule] ?? '(사유 미등록)'}`);
  }
  for (const gate of removedGates) console.log(`  - ${gate.file}  <- ${gate.reason}`);

  if (invalidEntries.length) {
    fail(
      `profile '${profileName}' 의 acknowledgedRemovedGates 항목은 { file, reason } 이어야 한다: ` +
        JSON.stringify(invalidEntries[0]),
    );
  }
  if (invalidRules.length) {
    fail(
      `profile '${profileName}' 의 acknowledgedGateRemovalRules 항목은 { rule, reason } 이어야 하고 `
        + `rule 은 생성기가 아는 규칙(${Object.keys(GATE_REMOVAL_RULES).join(', ')})이어야 한다: `
        + JSON.stringify(invalidRules[0]),
    );
  }
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

/**
 * 프리셋의 Java 연쇄 제거(게이트 제외)와 manifest 의 {@code profiles.<name>.acknowledgedJavaCascade} 의 대조(설계서 C4).
 *
 * <p>[왜] 연쇄 제거는 선언이 아니라 타입 참조로 정해진다. 잘못 들어간 import 한 줄이 core 컨트롤러나 동작 시험을 조용히
 * 지울 수 있고(DEC-OPS-084·085 는 이런 손실을 손으로 찾았다), 소유는 코드에서 도출되므로 그 import 가 기대치까지 함께
 * 움직인다. 그래서 기대치는 커밋된 경로 목록이다 — 연쇄가 바뀌는 변경에서 목록이 함께 움직여 diff 에 의도가 남는다.
 * 사유는 기계적("<타입> 참조")이라 목록에 적지 않고 생성물 lock 의 {@code java.cascadeRemoved} 에 남긴다.
 * 승인 목록은 양방향이다. 직접 선택 구성은 기대치가 없어 대조하지 않는다.
 */
export function javaCascadeAcknowledgement(profile, cascadeFiles) {
  const value = profile.acknowledgedJavaCascade;
  // 배열이 아닌 값(문자열 하나 포함)은 그 값 하나를 형식이 틀린 항목으로 본다 — 1개짜리 목록으로 받아 주지 않는다.
  const absent = value === undefined || value === null;
  const listed = Array.isArray(value) ? value : [];
  const valid = listed.filter((file) => typeof file === 'string' && file.endsWith('.java'));
  return {
    invalidEntries: absent ? [] : Array.isArray(value) ? listed.filter((file) => !valid.includes(file)) : [value],
    duplicates: valid.filter((file, index) => valid.indexOf(file) !== index),
    unacknowledged: cascadeFiles.filter((file) => !valid.includes(file)),
    stale: valid.filter((file) => !cascadeFiles.includes(file)),
  };
}

export function assertJavaCascadeAcknowledged(profileName, profile, java) {
  const files = java.cascadeRemoved.map((entry) => entry.file);
  const { invalidEntries, duplicates, unacknowledged, stale } = javaCascadeAcknowledgement(profile, files);
  console.log(`[base-source] 선언이 아니라 연쇄로 지운 Java(게이트 제외): ${files.length}건`);
  const where = `config/reusable-base-profiles.json 의 profiles.${profileName}.acknowledgedJavaCascade`;
  if (invalidEntries.length) fail(`${where} 항목은 .java 경로 문자열이어야 한다: ${JSON.stringify(invalidEntries[0])}`);
  if (duplicates.length) fail(`${where} 에 중복 항목이 있다: ${duplicates.join(', ')}`);
  if (unacknowledged.length) {
    const reasons = new Map(java.cascadeRemoved.map((entry) => [entry.file, entry.reason]));
    fail(
      `profile '${profileName}' 이 승인하지 않은 Java 파일을 연쇄로 지운다 (${unacknowledged.length}건):\n`
        + unacknowledged.map((file) => `  - ${file}  <- ${reasons.get(file)}`).join('\n')
        + `\n잘못 들어간 import 인지 먼저 보고, 정당한 연쇄라면 ${where} 에 적는다.`,
    );
  }
  if (stale.length) {
    fail(
      `${where} 에 더 이상 연쇄로 지워지지 않는 파일이 남아 있다 (${stale.length}건):\n`
        + stale.map((file) => `  - ${file}`).join('\n')
        + '\n승인 목록은 실제 연쇄와 exact 일치해야 한다 — 낡은 승인은 다음 연쇄를 조용히 통과시킨다.',
    );
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
export function pruneZeroDowntimeWaivers(output) {
  const registryRelative = 'config/governance/zdm-waivers.json';
  const registryPath = join(output, ...registryRelative.split('/'));
  const raw = readTextIfPresent(registryPath);
  if (raw === undefined) fail(`ZDM waiver registry 가 투영본에 없다: ${registryRelative}`);
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
export function isHistoricalAuthorizationRehearsal(name, source) {
  const markers = {
    'AuthorityReferenceFkIntegrationTest.java': ['fromVersion("2.99")', 'fk_tb_role_hierarchy_tb_authrt_info_higher'],
    'AuthorizationContractIntegrationTest.java': ['fromVersion("2.99")', 'assertLegacyTablesRemain(', 'AuthorizationCutoverTestSupport.execute('],
    'AuthorizationGrantExpansionIntegrationTest.java': ['migrate("2.97")', 'migrate("2.98")'],
  };
  if (!Object.hasOwn(markers, name)) return false;
  const code = stripJavaComments(source).replace(/\s+/g, '');
  if (!markers[name].every(marker => code.includes(marker))) {
    fail(`Historical authorization fixture changed scope; removal requires review: ${name}`);
  }
  return true;
}

/** 규칙으로 걷는 과거 마이그레이션 검증을 고른다(지우지 않는다). 생성기와 정밀 점검(plan/deep)이 같이 쓴다. */
export const HISTORICAL_SCHEMA_TEST_DIR = 'api-server/src/test/java/nuri/api/schema';
export function selectHistoricalMigrationTests(paths, readSource) {
  return paths.filter(path => /MigrationIntegrationTest\.java$/.test(path)
    || isHistoricalAuthorizationRehearsal(basename(path), readSource(path)));
}

export function pruneHistoricalMigrationTests(output) {
  const schemaTestRoot = join(output, ...HISTORICAL_SCHEMA_TEST_DIR.split('/'));
  const tests = selectHistoricalMigrationTests(walk(schemaTestRoot, path => path.endsWith('.java')), path => readFileSync(path, 'utf8'));
  for (const path of tests) rmSync(path);
  return {
    count: tests.length,
    files: tests.map((path) => normalize(relative(output, path))).sort((a, b) => a.localeCompare(b)),
  };
}

/*
 * 원본 Governance & Harness Atlas 와 그 생성·검증 도구. Atlas HTML 은 원본의 결정·gap·운영 사실을
 * 담고 프록시가 인증 전에 응답하는 정적 파일이다. 생성기는 원본 공용 메모리와 문서를 읽으므로
 * 생성물 안에서 다시 만들어도 원본 사실이 되살아난다. 그래서 고치지 않고 통째로 걷는다.
 */
export const UPSTREAM_ATLAS = Object.freeze({
  assets: Object.freeze([
    'frontend/public/governance_harness_atlas.html',
    'frontend/atlas',
    'scripts/build-atlas.mjs',
    'scripts/atlas-catalog.mjs',
  ]),
  gates: Object.freeze([
    'frontend/src/__tests__/cross-stack/governance-atlas-contract.test.ts',
    'scripts/atlas-catalog.test.mjs',
    'scripts/atlas-generation.test.mjs',
  ]),
  aliases: Object.freeze(['atlas:build', 'atlas:check']),
});

/**
 * 원본 Atlas 를 걷기 전에 빠진 자산·검사와 package.json 별칭을 찾아 생성기 실패 문장으로 돌려준다(지우지 않는다).
 * `has(path)` 는 그 파일·폴더가 투영본에 있는지 답한다. 생성기와 정밀 점검(plan/deep)이 같이 쓴다.
 */
export function missingUpstreamAtlasAssets(has) {
  return [...UPSTREAM_ATLAS.assets, ...UPSTREAM_ATLAS.gates].filter(file => !has(file))
    .map(file => `Upstream Atlas asset is missing; review the Atlas removal rule: ${file}`);
}
export function missingUpstreamAtlasAliases(scripts) {
  return UPSTREAM_ATLAS.aliases.filter(alias => !Object.hasOwn(scripts ?? {}, alias))
    .map(alias => `Upstream Atlas alias is missing; review the Atlas removal rule: ${alias}`);
}

export function pruneUpstreamAtlas(output) {
  const missingAssets = missingUpstreamAtlasAssets(file => existsSync(join(output, file)));
  if (missingAssets.length) fail(missingAssets[0]);
  for (const file of [...UPSTREAM_ATLAS.assets, ...UPSTREAM_ATLAS.gates]) rmSync(join(output, file), { recursive: true });
  const path = join(output, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  const missingAliases = missingUpstreamAtlasAliases(pkg.scripts);
  if (missingAliases.length) fail(missingAliases[0]);
  for (const alias of UPSTREAM_ATLAS.aliases) delete pkg.scripts[alias];
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  return { files: [...UPSTREAM_ATLAS.gates].sort((a, b) => a.localeCompare(b)) };
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

export function adaptGeneratedHarness(output) {
  const replacements = [
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
      투영본은 공용 support를 사용하는 역사적 migration 검증 49개를 제거한다(pruneHistoricalMigrationTests —
      그 테스트들이 검증하는 V2 체인이 V1 번들로 교체되므로 남겨 두면 전부 red 다). 그래서 이
      동결 census 의 모집단이 49 → 0 이 된다. 수치를 낮추는 것이 아니라 **사실을 따라가는** 것이며,
      adopter 가 migration 검증을 새로 만들면 0 을 넘어 red 가 되어 다시 동결을 요구한다.
      DisplayName 도 함께 고친다 — 0건을 세면서 "49개" 라고 말하면 화면이 사실과 다른 말을 한다.
    */
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SharedPostgresMigrationHarnessContractTest.java'),
      from: 'private static final int EXPECTED_MIGRATION_TEST_COUNT = 59;',
      to: 'private static final int EXPECTED_MIGRATION_TEST_COUNT = 0;',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SharedPostgresMigrationHarnessContractTest.java'),
      from: '@DisplayName("59개 migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")',
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

