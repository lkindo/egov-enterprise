#!/usr/bin/env node
/**
 * 벤더 인증 증거(ADR-0047 D-9, 설계서 §7). 입력 파일 집합의 해시, 낡은 증거 판정(regen --check 의 VENDOR_EVIDENCE_STALE), 증거 기록 명령을 둔다.
 *
 * 증거 형식과 certified 조건은 원장 적재(project-composer-vendors.mjs)가 본다. 낡음 판정을 나눈 이유는 입력이 저장소 파일이라 생성 작업마다 읽을 수 없고
 * 생성물에서는 입력이 투영돼 값이 달라지기 때문이다. 해시는 경로와 내용을 함께 넣어 파일이 빠지거나 표지가 지워져도 값이 바뀐다.
 *
 * 사용: node scripts/project-composer-vendor-evidence.mjs --vendor <id> --version <원장의 엔진 버전> --artifact <생성물 경로>
 * 원본 저장소에서, 같은 커밋으로 만들고 전체 검증을 통과한 생성물을 준다. 일회용 DB 를 띄워 통합 시험·차등 시험·대표 E2E 를 돌리고 원장에 그 엔진의 증거를 쓴다.
 * status 는 바꾸지 않는다. 승격은 별도 변경이다.
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VENDOR_ENGINES } from './project-composer-vendor-engine.mjs';
import { VENDOR_EVIDENCE_SCOPE, VENDOR_LEDGER_PATH, loadVendorLedger, vendorEvidenceProblems } from './project-composer-vendors.mjs';
import { artifactStepEnvironment, runCommand, vendorInputPath, vendorIntegrationStep } from './verify-reusable-artifact.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_LOCK = 'reusable-base-lock.json';
const SQL_LEDGER = 'config/governance/vendor-sql-ledger.json';
const TEST_LEDGER = 'config/governance/vendor-test-ledger.json';
const SCHEMA_TESTS = 'api-server/src/test/java/nuri/api/schema';
const ENTITY_ROOTS = Object.freeze(['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java']);
// 벤더 값으로 매핑되거나 벤더별 SQL 을 고르는 코드. 표지가 지워지면 경로가 집합에서 빠져 해시가 바뀌므로 표지 제거도 놓치지 않는다.
const VENDOR_SENSITIVE = /@(?:jakarta\.persistence\.)?(?:Entity|Embeddable|MappedSuperclass|Converter)\b|\bAttributeConverter\b|\bVendorSqlDialect\b/;
const HASH_PREFIX = 'egov-vendor-evidence-inputs-v1\0';
/** 벤더 프로젝트의 보고서 폴더. 생성물 도구가 쓰고 이 명령이 읽는다. build 아래라 커밋되지 않는다. */
export const vendorEvidenceReportDirectory = engineId => `build/reports/vendor-evidence/${engineId}`;

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const inputFailure = (path, error) => new Error(`인증 입력을 읽지 못했다: ${path} (${error.code ?? error.message})`);

function listFiles(root, directory) {
  let entries;
  try { entries = readdirSync(join(root, directory), { withFileTypes: true }); }
  catch (error) { throw inputFailure(directory, error); }
  return entries.flatMap(entry => {
    const path = posix.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : [path];
  });
}

/** 선언 한 줄을 파일로 푼다. 빈 폴더와 맞는 파일이 없는 이름은 오타일 수 있어 멈춘다. 경로가 틀린 파일은 해시를 읽을 때 멈춘다. */
function expandDeclaredInput(root, declared) {
  if (declared.endsWith('/')) {
    const files = listFiles(root, declared.slice(0, -1));
    if (!files.length) throw new Error(`인증 입력 폴더가 비었다: ${declared}`);
    return files;
  }
  if (!declared.includes('*')) return [declared];
  const directory = posix.dirname(declared);
  const [before, after, ...rest] = posix.basename(declared).split('*');
  if (rest.length || directory.includes('*')) throw new Error(`인증 입력은 마지막 칸의 * 하나만 쓴다: ${declared}`);
  const files = listFiles(root, directory).filter(path => posix.dirname(path) === directory)
    .filter(path => { const name = posix.basename(path); return name.length >= before.length + after.length && name.startsWith(before) && name.endsWith(after); });
  if (!files.length) throw new Error(`맞는 인증 입력이 없다: ${declared}`);
  return files;
}

const sensitiveJavaFiles = root => ENTITY_ROOTS.flatMap(directory => listFiles(root, directory))
  .filter(path => path.endsWith('.java') && VENDOR_SENSITIVE.test(readFileSync(join(root, path), 'utf8')));

/** 벤더 시험 폴더는 빼는 것만 원장에 적힌다. 새 파일과 지원 코드는 기본으로 입력이다. */
function vendorTestFiles(root, tests) {
  const replaced = new Set(tests.tests.filter(row => row.category === 'replacement').map(row => `${SCHEMA_TESTS}/${row.test}`));
  return listFiles(root, SCHEMA_TESTS).filter(path => !replaced.has(path));
}

/**
 * 벤더의 입력 파일 목록. 선언과 원장에서 도출한 파일을 합친다. 벤더 하나의 구현을 고친 변경이 다른 벤더의 증거를 낡게 하지 않게, 다른 벤더가 선언한 파일은
 * 표지로 잡혀도 뺀다(포트 구현은 모두 VendorSqlDialect 를 담는다). 이 모듈과 시험은 입력이 아니다. 판정 코드를 고쳐도 벤더 동작은 바뀌지 않는다.
 */
export function vendorEvidenceInputs(root, ledger, vendorId) {
  const vendor = ledger.vendors.find(row => row.id === vendorId);
  if (!vendor) throw new Error(`모르는 벤더: ${vendorId}`);
  const tests = readJson(root, TEST_LEDGER);
  const declared = paths => paths.flatMap(path => expandDeclaredInput(root, path));
  const own = declared(vendor.evidenceInputs);
  const others = new Set(ledger.vendors.filter(row => row.id !== vendorId).flatMap(row => row.evidenceInputs));
  const sensitive = sensitiveJavaFiles(root).filter(path => !others.has(path) || own.includes(path));
  return [...new Set([...declared(ledger.evidenceInputs.paths), ...own, ...readJson(root, SQL_LEDGER).locations.map(row => row.path), ...vendorTestFiles(root, tests),
    ...tests.representativeE2e.specs.map(row => `frontend/${row.spec}`), ...sensitive])].sort();
}

/** 줄 끝을 맞춘다. 체크아웃 설정이 다른 기계의 같은 커밋은 같은 값이어야 한다. */
export function vendorEvidenceHash(root, ledger, vendorId) {
  const hash = createHash('sha256').update(HASH_PREFIX);
  for (const path of vendorEvidenceInputs(root, ledger, vendorId)) {
    let text;
    try { text = readFileSync(join(root, path), 'utf8'); }
    catch (error) { throw inputFailure(path, error); }
    hash.update(path).update('\0').update(text.replace(/\r\n/g, '\n')).update('\0');
  }
  return hash.digest('hex');
}

const certifiedVendors = ledger => ledger.vendors.filter(vendor => vendor.id !== 'postgresql' && vendor.status === 'certified');

/**
 * 낡은 certified 를 문장으로 돌려준다. preview 의 증거는 보지 않는다 — 입력을 바꾼 PR 은 증거를 갱신하거나 preview 로 내릴 수 있다.
 * 생성물은 입력이 투영돼 값이 원본과 다르므로 보지 않는다. 생성물의 인증은 원본 증거이고, 작업마다 전체 검증이 따로 돈다.
 */
export function vendorEvidenceStaleErrors(root = ROOT) {
  if (existsSync(join(root, GENERATED_LOCK))) return [];
  const ledger = loadVendorLedger(root);
  return certifiedVendors(ledger).flatMap(vendor => {
    const current = vendorEvidenceHash(root, ledger, vendor.id);
    return vendor.engines.flatMap(({ version, engine, evidence }) => [
      ...(evidence.inputHash === current ? [] : [`${vendor.id} ${version}: 인증 입력이 증거 뒤에 바뀌었다(실행 ${evidence.runId}, 기록 ${evidence.inputHash.slice(0, 12)}, 현재 ${current.slice(0, 12)}).`]),
      ...(evidence.image === VENDOR_ENGINES[engine].image ? [] : [`${vendor.id} ${version}: 증거의 이미지가 현재 엔진 이미지와 다르다(기록 ${evidence.image}, 현재 ${VENDOR_ENGINES[engine].image}).`]),
    ]);
  });
}

function gitOutput(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args[0]} 실패: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}

const refuse = message => new Error(`증거를 기록하지 않는다: ${message}`);

function readReport(artifact, file) {
  try { return JSON.parse(readFileSync(join(artifact, file), 'utf8')); }
  catch (error) { throw refuse(`보고서를 읽지 못했다: ${file} (${error.code ?? error.message})`); }
}

/** 원본 트리가 깨끗해야 입력 해시가 커밋을 말한다. 원장만 예외다. 앞 엔진의 증거가 아직 커밋 전일 수 있다. */
function assertCleanSource(root, git) {
  const dirty = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean).filter(entry => entry.slice(3) !== VENDOR_LEDGER_PATH);
  if (dirty.length) throw refuse(`커밋하지 않은 변경이 있다: ${dirty.slice(0, 5).map(entry => entry.slice(3)).join(', ')}`);
}

/** 컨테이너를 띄우기 전에 멈출 수 있는 것을 먼저 본다. 19c 는 기동만 25분까지 걸린다. */
function assertArtifactFits(root, artifact, vendorId, commit) {
  const lock = readReport(artifact, GENERATED_LOCK);
  if (lock.vendorProjection?.vendor !== vendorId) throw refuse(`${vendorId} 로 생성한 프로젝트가 아니다.`);
  if (lock.sourceCommit !== commit) throw refuse(`생성물의 커밋(${lock.sourceCommit})이 현재 커밋(${commit})과 다르다.`);
  const { layout, requiredDomains } = readJson(root, TEST_LEDGER).representativeE2e;
  if (lock.layout !== layout) throw refuse(`대표 묶음은 ${layout} 생성물에서만 돈다(현재 ${lock.layout}).`);
  const present = new Set(lock.composition?.resolvedDomains ?? []);
  const missing = requiredDomains.filter(domain => !present.has(domain));
  if (missing.length) throw refuse(`대표 묶음에 필요한 기능이 이 구성에 없다: ${missing.join(', ')}`);
  const verification = readReport(artifact, 'build/reports/reusable-base/full.json');
  if (verification.result !== 'passed' || verification.sourceCommit !== commit) throw refuse('생성물 전체 검증이 이 커밋에서 통과한 기록이 없다.');
  return { lock, verification };
}

/** 보고서가 이 엔진의 것인지 본다. 다른 엔진의 통과를 19c 증거로 쓰지 않는다(설계서 §7). */
function assertReportEngine(report, name, engineId, image) {
  if (report.engine !== engineId) throw refuse(`${name} 보고서의 엔진(${report.engine})이 ${engineId} 가 아니다.`);
  if (image !== undefined && report.image !== image) throw refuse(`${name} 보고서의 이미지(${report.image})가 ${image} 가 아니다.`);
}

/** 도구 보고서를 원장 증거로 옮긴다. 판정은 vendorEvidenceProblems 하나다. */
export function buildVendorEvidence({ runId, commit, recordedAt, inputHash, engineId, specs, lock, verification, integration, differential, e2e }) {
  const { image, imageOrigin } = VENDOR_ENGINES[engineId];
  assertReportEngine(integration, '통합 시험', engineId, image);
  assertReportEngine(differential, '차등 시험', engineId);
  assertReportEngine(e2e, '대표 E2E', engineId, image);
  if (e2e.specs !== specs) throw refuse(`대표 E2E 의 시험 파일 수(${e2e.specs})가 원장의 ${specs} 개와 다르다.`);
  return {
    runId, commit, recordedAt, inputHash, modelHash: lock.vendorProjection.inputSha256, image, imageOrigin, scope: VENDOR_EVIDENCE_SCOPE,
    composition: { profile: lock.profile, layout: lock.layout, compositionHash: lock.composition?.compositionHash },
    steps: {
      verification: { result: verification.result },
      schemaParity: integration.schemaParity,
      seedParity: integration.seedParity,
      hibernateValidate: integration.hibernateValidate,
      integration: integration.integration,
      conformance: {
        catalog: integration.catalog,
        differential: { checks: differential.checks, rows: differential.rows, differences: differential.differences?.length, unbalanced: differential.unbalanced?.length, intentFailures: differential.intentFailures?.length },
      },
      representativeE2e: { specs: e2e.specs, expected: e2e.expected, unexpected: e2e.unexpected, flaky: e2e.flaky, skipped: e2e.skipped },
    },
  };
}

const koreanTimestamp = now => new Date(now + 9 * 3_600_000).toISOString().replace('Z', '+09:00');

/** 시험을 돌리고 증거를 원장에 쓴다. 실행 중 입력이 바뀌면 그 결과는 어느 커밋의 증거도 아니다. */
export function recordVendorEvidence({ root = ROOT, artifact, vendorId, version, run = runCommand, git = gitOutput, now = Date.now }) {
  if (existsSync(join(root, GENERATED_LOCK))) throw refuse('생성물이 아니라 원본 저장소에서 실행한다.');
  const ledger = loadVendorLedger(root);
  const row = ledger.vendors.find(vendor => vendor.id === vendorId)?.engines.find(engine => engine.version === version);
  if (!row) throw refuse(`원장에 ${vendorId} ${version} 엔진이 없다.`);
  const definition = Object.hasOwn(VENDOR_ENGINES, row.engine ?? '') ? VENDOR_ENGINES[row.engine] : undefined;
  if (!definition?.integration || (definition.vendor ?? row.engine) !== vendorId) throw refuse(`${vendorId} ${version} 는 통합 시험을 돌릴 수 있는 엔진이 아니다.`);
  assertCleanSource(root, git);
  const commit = git(root, ['rev-parse', 'HEAD']).trim();
  const inputHash = vendorEvidenceHash(root, ledger, vendorId);
  const artifactRoot = resolve(artifact);
  const { lock, verification } = assertArtifactFits(root, artifactRoot, vendorId, commit);

  const reports = vendorEvidenceReportDirectory(row.engine);
  // 앞선 실행의 보고서가 이번 실행의 증거가 되지 않게 지운다.
  rmSync(join(artifactRoot, reports), { recursive: true, force: true });
  mkdirSync(join(artifactRoot, reports), { recursive: true });
  const options = { root: artifactRoot, env: artifactStepEnvironment() };
  const integrationStep = vendorIntegrationStep(vendorId, lock.layout);
  run(integrationStep.command, [...integrationStep.args, '--engine', row.engine, '--report', `${reports}/integration.json`], options);
  run('node', ['scripts/project-composer-vendor-differential.mjs', '--input', vendorInputPath(vendorId), '--vendor', vendorId, '--engine', row.engine, '--report', `${reports}/differential.json`], options);
  run('node', ['scripts/run-isolated-e2e.mjs', '--representative', `--vendor-engine=${row.engine}`], options);

  assertCleanSource(root, git);
  if (git(root, ['rev-parse', 'HEAD']).trim() !== commit || vendorEvidenceHash(root, ledger, vendorId) !== inputHash) throw refuse('실행 중 인증 입력이 바뀌었다.');
  const evidence = buildVendorEvidence({
    runId: `${row.engine}-${commit.slice(0, 12)}-${randomBytes(4).toString('hex')}`, commit, recordedAt: koreanTimestamp(now()), inputHash, engineId: row.engine,
    specs: readJson(root, TEST_LEDGER).representativeE2e.specs.length, lock, verification,
    integration: readReport(artifactRoot, `${reports}/integration.json`),
    differential: readReport(artifactRoot, `${reports}/differential.json`),
    e2e: readReport(artifactRoot, `${reports}/representative-e2e.json`),
  });
  const problems = vendorEvidenceProblems(evidence);
  if (problems.length) throw refuse(`결과가 인증 조건에 모자란다: ${problems.join(', ')}`);
  row.evidence = evidence;
  writeFileSync(join(root, VENDOR_LEDGER_PATH), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  return evidence;
}

export function parseEvidenceArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = { '--vendor': 'vendorId', '--version': 'version', '--artifact': 'artifact' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error('사용법: node scripts/project-composer-vendor-evidence.mjs --vendor <id> --version <엔진 버전> --artifact <생성물 경로>');
    args[key] = argv[index + 1];
  }
  if (!args.vendorId || !args.version || !args.artifact) throw new Error('--vendor, --version, --artifact 가 모두 필요하다.');
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const evidence = recordVendorEvidence(parseEvidenceArgs(process.argv.slice(2)));
    console.log(`[vendor-evidence] 기록: ${evidence.runId}. ${VENDOR_LEDGER_PATH} 를 커밋한다. status 는 그대로다.`);
  } catch (error) {
    console.error(`[vendor-evidence] ${error.message}`);
    process.exitCode = 1;
  }
}
