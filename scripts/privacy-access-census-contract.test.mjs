/**
 * 개인정보 접근 census 원장(config/governance/privacy-access-census.json)의 pack 태그 계약.
 *
 * PrivacyAccessCensusLinterTest 는 현재 트리의 pack manifest 에 남은 pack 의 항목만 기대한다. 그 판정이
 * 옳으려면 **원장의 pack 태그가 재사용 base 생성기의 실제 제거 계획과 같아야** 한다 — 태그가 틀리면
 * 축소 프로필에서 게이트가 "빠진 pack 인데 클래스가 남았다" 로 red 가 되거나, 반대로 남은 표면을
 * 빠진 것으로 보고 조용히 검사를 생략한다. 여기서는 생성기의 planJavaRemoval 을 그대로 불러
 * rank 누적 프로필마다 "이 항목의 클래스가 사라지는가" 를 태그와 대조한다(시뮬레이터가 아니라 생성기 판정).
 *
 * 투영본(manifest.sourcePolicy.generatedProfile 이 있는 트리)에서는 제거가 이미 끝났으므로 계획 대신
 * "남은 pack 항목의 소스는 있고 빠진 pack 항목의 소스는 없다" 를 확인한다.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { planJavaRemoval, trackedAndUntrackedFiles } from './generate-reusable-base-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = 'config/governance/privacy-access-census.json';
const MANIFEST_PATH = 'config/reusable-base-profiles.json';
const GATE_FILE = 'api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java';
const JAVA_POPULATION_FLOOR = 1000;
const SKIPPED_DIRECTORIES = new Set(['build', 'node_modules', '.git', '.gradle']);

const normalize = (path) => path.split(sep).join('/');
const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

function walkJava(root, directory = root, out = []) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(name)) walkJava(root, path, out);
    } else if (name.endsWith('.java')) {
      out.push(path);
    }
  }
  return out;
}

/** 생성기 copySourceTree 와 같은 모집단 — 저장소에서는 git 추적+미추적, 투영본에서는 파일시스템. */
function javaPopulation(root, projection) {
  if (projection) return walkJava(root);
  return trackedAndUntrackedFiles()
    .filter((rel) => rel.endsWith('.java'))
    .map((rel) => join(root, rel))
    .filter((path) => existsSync(path));
}

/** 원장 항목을 (소스 파일로 확인할) 타입 단위로 편다. */
export function registryTypeEntries(registry) {
  return [
    ...registry.declaredHandlers.map((entry) => ({ section: 'declaredHandlers', type: entry.controller, pack: entry.pack, label: `${entry.controller}#${entry.method}` })),
    ...registry.sensitiveGetExemptions.map((entry) => ({ section: 'sensitiveGetExemptions', type: entry.controller, pack: entry.pack, label: `${entry.controller}#${entry.method}` })),
    ...registry.knownSensitiveResponseTypes.map((entry) => ({ section: 'knownSensitiveResponseTypes', type: entry.type, pack: entry.pack, label: entry.type })),
  ];
}

/** FQN → main 소스 파일. 정확히 하나가 아니면 판정할 수 없으므로 위반이다. */
export function mainSourceOf(root, javaFiles, fqn) {
  const suffix = `/src/main/java/${fqn.replaceAll('.', '/')}.java`;
  return javaFiles.filter((path) => `/${normalize(relative(root, path))}`.endsWith(suffix));
}

/** manifest pack 을 rank 순으로 누적한 합성 프로필 — core=[core], 다음=[core, collaboration] … */
export function rankPrefixProfiles(manifest) {
  const ordered = Object.entries(manifest.packs)
    .sort(([, left], [, right]) => left.rank - right.rank)
    .map(([name]) => name);
  return ordered.map((_, index) => ({ packs: ordered.slice(0, index + 1) }));
}

/** 태그 대조: 항목의 소스는 태그 pack 이 빠진 프로필에서만 사라져야 한다. */
export function evaluatePackTags({ root, registry, prefixPlans, javaFiles }) {
  const violations = [];
  for (const entry of registryTypeEntries(registry)) {
    const sources = mainSourceOf(root, javaFiles, entry.type);
    if (sources.length !== 1) {
      violations.push(`${entry.label}: main 소스 파일이 정확히 하나가 아니다 (${sources.length}건)`);
      continue;
    }
    for (const { profile, plan } of prefixPlans) {
      const shouldRemain = profile.packs.includes(entry.pack);
      const removed = plan.removed.has(sources[0]);
      if (shouldRemain === removed) {
        violations.push(
          `${entry.label} (pack=${entry.pack}) 는 프로필 [${profile.packs.join(',')}] 에서 `
            + (removed ? `제거된다 — ${plan.removalReason.get(sources[0]) ?? '(사유 미상)'}` : '남는다'),
        );
      }
    }
  }
  return violations;
}

/** 게이트 파일은 어떤 프로필에서도 제거되면 안 된다 — 제거되면 원장 분리의 의미가 없다. */
export function evaluateGateSurvival({ root, prefixPlans, gateFile = GATE_FILE }) {
  const gate = join(root, gateFile);
  return prefixPlans
    .filter(({ plan }) => plan.removed.has(gate))
    .map(({ profile, plan }) => `[${profile.packs.join(',')}] 에서 ${gateFile} 가 제거된다 — ${plan.removalReason.get(gate)}`);
}

/** Java 게이트의 컨트롤러 하한 판정과 같은 모집단: 클래스 선언 앞에 @RequestMapping 이 붙은 main 소스. */
export function isRequestMappedController(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const classAt = code.search(/\b(?:class|interface|record|enum)\s+[A-Z]/);
  if (classAt < 0) return false;
  return /@RequestMapping\b/.test(code.slice(0, classAt));
}

let cache;
function context() {
  if (cache) return cache;
  const manifest = readJson(repoRoot, MANIFEST_PATH);
  const registry = readJson(repoRoot, REGISTRY_PATH);
  const projection = Boolean(manifest.sourcePolicy?.generatedProfile);
  const javaFiles = javaPopulation(repoRoot, projection);
  const prefixPlans = projection
    ? []
    : rankPrefixProfiles(manifest).map((profile) => ({ profile, plan: planJavaRemoval(repoRoot, manifest, profile, javaFiles) }));
  cache = { manifest, registry, projection, javaFiles, prefixPlans };
  return cache;
}

test('원장의 pack 어휘는 pack manifest 와 같다(투영본에서는 남은 pack 을 포함한다)', () => {
  const { manifest, registry, projection } = context();
  const manifestPacks = Object.keys(manifest.packs).sort();
  assert.equal(new Set(registry.packs).size, registry.packs.length, 'packs 어휘에 중복이 있다');
  if (projection) {
    assert.deepEqual(manifestPacks.filter((pack) => !registry.packs.includes(pack)), []);
  } else {
    assert.deepEqual([...registry.packs].sort(), manifestPacks);
  }
  for (const entry of registryTypeEntries(registry)) {
    assert.ok(registry.packs.includes(entry.pack), `${entry.label} 의 pack '${entry.pack}' 가 어휘에 없다`);
  }
});

test('파일 모집단이 생성기 판정을 대표할 만큼 크다', () => {
  const { javaFiles, projection } = context();
  // 하한은 저장소 전체 기준이다. 투영본은 축소 제품이라 규모가 작으므로(core 실측 901) 게이트 파일이 모집단에
  //   실제로 들어 있는지로 스캔 붕괴를 판정하고, 남은 규모는 컨트롤러 하한 검사가 따로 본다.
  if (projection) {
    assert.ok(javaFiles.some((path) => normalize(relative(repoRoot, path)) === GATE_FILE), '투영본 모집단에 게이트 파일이 없다');
    return;
  }
  assert.ok(javaFiles.length >= JAVA_POPULATION_FLOOR, `java 모집단 ${javaFiles.length} < ${JAVA_POPULATION_FLOOR}`);
});

test('원장 pack 태그가 생성기의 실제 제거 계획과 일치한다', () => {
  const { registry, projection, prefixPlans, javaFiles, manifest } = context();
  if (projection) {
    const present = new Set(Object.keys(manifest.packs));
    const violations = [];
    for (const entry of registryTypeEntries(registry)) {
      const count = mainSourceOf(repoRoot, javaFiles, entry.type).length;
      if (present.has(entry.pack) && count !== 1) violations.push(`${entry.label}: 남은 pack 인데 소스 ${count}건`);
      if (!present.has(entry.pack) && count !== 0) violations.push(`${entry.label}: 빠진 pack 인데 소스 ${count}건`);
    }
    assert.deepEqual(violations, []);
    return;
  }
  assert.ok(prefixPlans.length >= 2, 'rank 누적 프로필이 둘 이상이어야 태그를 구분할 수 있다');
  assert.deepEqual(evaluatePackTags({ root: repoRoot, registry, prefixPlans, javaFiles }), []);
});

test('게이트 파일은 어떤 프로필에서도 제거되지 않고, 남는 컨트롤러가 하한을 넘는다', () => {
  const { projection, prefixPlans, javaFiles } = context();
  const gateSource = readFileSync(join(repoRoot, GATE_FILE), 'utf8');
  const floor = Number(gateSource.match(/\bCONTROLLER_FLOOR\s*=\s*(\d+)\s*;/)?.[1]);
  assert.ok(Number.isInteger(floor) && floor > 0, 'CONTROLLER_FLOOR 를 게이트 소스에서 읽지 못했다');
  const controllers = javaFiles.filter((path) => normalize(path).includes('/src/main/java/')
    && isRequestMappedController(readFileSync(path, 'utf8')));
  if (projection) {
    assert.ok(existsSync(join(repoRoot, GATE_FILE)));
    assert.ok(controllers.length >= floor, `투영본 컨트롤러 ${controllers.length} < ${floor}`);
    return;
  }
  assert.deepEqual(evaluateGateSurvival({ root: repoRoot, prefixPlans }), []);
  for (const { profile, plan } of prefixPlans) {
    const surviving = controllers.filter((path) => !plan.removed.has(path)).length;
    assert.ok(surviving >= floor, `[${profile.packs.join(',')}] 남는 컨트롤러 ${surviving} < CONTROLLER_FLOOR ${floor}`);
  }
});

test('실제 프로필의 Java 게이트 제거 승인은 계획과 exact 일치한다', () => {
  const { manifest, projection, javaFiles } = context();
  const profiles = Object.entries(manifest.profiles);
  if (projection) {
    // 투영본 manifest 는 자기 프로필 하나만 남기고, 제거는 이미 끝났다 — 승인 목록의 파일이 실제로 없어야 한다.
    for (const [, profile] of profiles) {
      const lingering = (profile.acknowledgedRemovedGates ?? [])
        .map((entry) => entry.file)
        .filter((file) => file.endsWith('.java') && existsSync(join(repoRoot, file)));
      assert.deepEqual(lingering, []);
    }
    return;
  }
  for (const [name, profile] of profiles) {
    const plan = planJavaRemoval(repoRoot, manifest, profile, javaFiles);
    const planned = [...plan.removed]
      .filter((path) => plan.gateSources.has(path))
      .map((path) => normalize(relative(repoRoot, path)))
      .sort();
    const acknowledged = (profile.acknowledgedRemovedGates ?? [])
      .map((entry) => entry.file)
      .filter((file) => file.endsWith('.java'))
      .sort();
    assert.deepEqual(acknowledged, planned, `profile '${name}' 의 Java 게이트 제거 승인이 계획과 다르다`);
    assert.ok(!planned.includes(GATE_FILE), `profile '${name}' 에서 개인정보 census 게이트가 제거된다`);
  }
});

test('부정 증명: 틀린 pack 태그는 생성기 계획과의 대조에서 red 다', (t) => {
  const { registry, projection, prefixPlans, javaFiles } = context();
  if (projection) {
    t.diagnostic('투영본에는 제거 계획이 없어 합성 태그 대조를 저장소에서만 수행한다');
    assert.ok(Object.keys(context().manifest.packs).length >= 1);
    return;
  }
  const retag = (section, predicate, pack) => ({
    ...registry,
    [section]: registry[section].map((entry) => (predicate(entry) ? { ...entry, pack } : entry)),
  });
  const cases = [
    {
      name: 'collaboration 소유 SMS 수신자 조회를 core 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getSmsRecipients', 'core'),
      expect: /getSmsRecipients \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
    {
      name: 'demo 소유 주소록 조회를 survey 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getAddressBook', 'survey'),
      expect: /getAddressBook \(pack=survey\) 는 프로필 \[core,collaboration,survey\] 에서 제거된다/,
    },
    {
      name: 'core 소유 사용자 조회를 demo 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getUsers', 'demo'),
      expect: /getUsers \(pack=demo\) 는 프로필 \[core\] 에서 남는다/,
    },
    {
      name: 'collaboration 대시보드 컨트롤러를 core 로 적는다',
      registry: {
        ...registry,
        sensitiveGetExemptions: [
          ...registry.sensitiveGetExemptions,
          { controller: 'nuri.api.controller.business.main.DashboardApiController', method: 'getDashboard', pack: 'core', reason: '합성' },
        ],
      },
      expect: /DashboardApiController#getDashboard \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
  ];
  for (const redCase of cases) {
    const violations = evaluatePackTags({ root: repoRoot, registry: redCase.registry, prefixPlans, javaFiles });
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }
  const ghost = {
    ...registry,
    knownSensitiveResponseTypes: [...registry.knownSensitiveResponseTypes, { type: 'nuri.example.NoSuchDto', pack: 'core' }],
  };
  assert.ok(evaluatePackTags({ root: repoRoot, registry: ghost, prefixPlans, javaFiles })
    .some((line) => line.startsWith('nuri.example.NoSuchDto: main 소스 파일이 정확히 하나가 아니다')));
});

test('부정 증명: 게이트 주석에 제외 도메인 import 문을 인용하면 투영이 게이트를 지운다', () => {
  const root = mkdtempSync(join(tmpdir(), 'privacy-census-contract-'));
  try {
    const write = (rel, source) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), source, 'utf8');
    };
    write('business-app/src/main/java/nuri/business/service/addressbook/dto/AddressBookDto.java',
      'package nuri.business.service.addressbook.dto;\npublic class AddressBookDto {}\n');
    const manifest = { packs: { core: { rank: 0 }, demo: { rank: 1, backend: { appDomains: ['addressbook'] } } } };
    const gateWith = (javadoc) => `package nuri.api.harness;\n/**\n * ${javadoc}\n */\n@Tag("governance-harness")\nclass PrivacyAccessCensusLinterTest {}\n`;
    const plans = () => rankPrefixProfiles(manifest)
      .map((profile) => ({ profile, plan: planJavaRemoval(root, manifest, profile) }));

    write(GATE_FILE, gateWith('원장은 JSON 에 있다 — 도메인 타입을 참조하지 않는다.'));
    assert.deepEqual(evaluateGateSurvival({ root, prefixPlans: plans() }), [], '대조군: 인용이 없으면 남는다');

    write(GATE_FILE, gateWith(['import', 'nuri.business.service.addressbook.dto.AddressBookDto;'].join(' ')));
    const violations = evaluateGateSurvival({ root, prefixPlans: plans() });
    assert.equal(violations.length, 1);
    assert.match(violations[0], /^\[core\] 에서 .*PrivacyAccessCensusLinterTest\.java 가 제거된다/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('컨트롤러 판정은 클래스 선언 앞의 @RequestMapping 만 센다', () => {
  assert.equal(isRequestMappedController('@RestController\n@RequestMapping("/a")\npublic class A {}'), true);
  assert.equal(isRequestMappedController('@Service\npublic class A {\n  @RequestMapping("/a") void x() {}\n}'), false);
  assert.equal(isRequestMappedController('/** @RequestMapping 설명 */\npublic class A {}'), false);
});
