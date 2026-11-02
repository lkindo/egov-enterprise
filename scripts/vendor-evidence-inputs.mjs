/**
 * 벤더 인증 입력의 정본 계산(ADR-0047 D-9·D-14). 낡음 판정(project-composer-vendor-evidence.mjs)과 CI 분류기(ci-change-scope.mjs)가 같은 목록을 읽는다.
 *
 * 분류기는 의존성 설치 전에 돌고 이관 제품에도 복사되므로 Node 내장만 쓴다. 분류기 입력이라 생성기 경로 표에 넣지 않는다 — 바뀌면 미지 경로라 전수다.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const VENDOR_LEDGER = 'config/db-vendors.json';
const SQL_LEDGER = 'config/governance/vendor-sql-ledger.json';
const TEST_LEDGER = 'config/governance/vendor-test-ledger.json';
const REMOVED_ASSETS = 'config/governance/vendor-removed-assets.json';
const VENDOR_JOB_WORKFLOW = '.github/workflows/ci.yml';
const VENDOR_JOB_HEADER = '  reusable-vendor:';
const SCHEMA_TESTS = 'api-server/src/test/java/nuri/api/schema';
const ENTITY_ROOTS = Object.freeze(['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java']);
/** 중립 모델을 만드는 명령. 이 명령이 가져오는 모듈은 원장이 빼지 않는 한 입력이다. */
const MODEL_ENTRY = 'scripts/generate-reusable-base-db.mjs';
const TOOL_IMPORT = /(?:\bfrom\s+|\bimport\s*\(?\s*)['"]\.\/([^'"]+\.mjs)['"]/g;
// 벤더 값으로 매핑되거나, 벤더별 SQL 을 고르거나, SQL·JPQL·QueryDSL 을 담거나 잠금을 거는 코드. 벤더 SQL 원장은 린터 규칙에 걸린 구문만 적으므로 원장만으로는 쿼리를 다 찾지 못한다.
// Hibernate 가 번역하는 JPQL·QueryDSL 도 Oracle 에서만 깨진 실례가 있다(설계서 §17). 표지 없는 파생 쿼리와 서비스 코드는 입력이 아니다(설계서 §7).
// 표지가 지워지면 경로가 집합에서 빠져 해시가 바뀌므로 표지 제거도 놓치지 않는다.
const VENDOR_SENSITIVE = /@(?:(?:jakarta\.persistence|org\.hibernate\.annotations)\.)?(?:Entity|Embeddable|MappedSuperclass|Converter|FilterDefs?)\b|@(?:org\.springframework\.data\.jpa\.repository\.)?(?:Query|Lock)\b|\bcom\.querydsl\b|\bcreateQuery\b|\bAttributeConverter\b|\bVendorSqlDialect\b|\bnativeQuery\b|\bcreateNative\w*Query\b|\b(?:NamedParameter)?JdbcTemplate\b|\bJdbcClient\b/;

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const inputFailure = (path, error) => new Error(`인증 입력을 읽지 못했다: ${path} (${error.code ?? error.message})`);

export function gitOutput(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args[0]} 실패: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}

/** 입력은 커밋이 말하는 파일이다. 무시 파일(application-local.yml 등)을 읽으면 같은 커밋이 체크아웃마다 다른 값이 되고 개인 설정이 판정에 들어간다. */
const committableFiles = root => gitOutput(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const filesUnder = (listed, directory) => listed.filter(path => path.startsWith(`${directory}/`));
const isVendorSensitivePath = path => path.endsWith('.java') && ENTITY_ROOTS.some(root => path.startsWith(`${root}/`));

/** 선언 한 줄이 파일 하나를 덮는가. 폴더는 '/' 로 끝나고, * 는 마지막 칸에 하나만 쓴다. */
function declaredInputCovers(declared, path) {
  if (declared.endsWith('/')) return path.startsWith(declared);
  if (!declared.includes('*')) return path === declared;
  const directory = posix.dirname(declared);
  const [before, after, ...rest] = posix.basename(declared).split('*');
  if (rest.length || directory.includes('*')) throw new Error(`인증 입력은 마지막 칸의 * 하나만 쓴다: ${declared}`);
  if (posix.dirname(path) !== directory) return false;
  const name = posix.basename(path);
  return name.length >= before.length + after.length && name.startsWith(before) && name.endsWith(after);
}

/** 선언 한 줄을 파일로 푼다. 빈 폴더와 맞는 파일이 없는 이름은 오타일 수 있어 멈춘다. 경로가 틀린 파일은 해시를 읽을 때 멈춘다. */
function expandDeclaredInput(listed, declared) {
  if (!declared.endsWith('/') && !declared.includes('*')) return [declared];
  const files = listed.filter(path => declaredInputCovers(declared, path));
  if (!files.length) throw new Error(declared.endsWith('/') ? `인증 입력 폴더가 비었다: ${declared}` : `맞는 인증 입력이 없다: ${declared}`);
  return files;
}

export function readVendorInput(root, path) {
  try { return readFileSync(join(root, path), 'utf8'); }
  catch (error) { throw inputFailure(path, error); }
}

const sensitiveJavaFiles = (root, listed) => ENTITY_ROOTS.flatMap(directory => filesUnder(listed, directory))
  .filter(path => path.endsWith('.java') && VENDOR_SENSITIVE.test(readVendorInput(root, path)));

const replacedSchemaTests = tests => new Set(tests.tests.filter(row => row.category === 'replacement').map(row => `${SCHEMA_TESTS}/${row.test}`));

/** 벤더 시험 폴더는 빼는 것만 원장에 적힌다. 새 파일과 지원 코드는 기본으로 입력이다. */
function vendorTestFiles(listed, tests) {
  const replaced = replacedSchemaTests(tests);
  return filesUnder(listed, SCHEMA_TESTS).filter(path => !replaced.has(path));
}

/** 모델을 만드는 도구도 빼는 것만 원장에 적힌다. 뺀 파일이 혼자 가져오는 모듈은 따라 빠진다. 더는 닿지 않는 제외 항목은 근거가 낡았다는 뜻이라 멈춘다. */
function modelToolFiles(root, ledger, isOtherVendor) {
  const excluded = ledger.evidenceInputs.excludedModelTools ?? {};
  const seen = new Set();
  const visit = path => {
    if (seen.has(path)) return;
    seen.add(path);
    if (Object.hasOwn(excluded, path) || isOtherVendor(path)) return;
    for (const match of readVendorInput(root, path).matchAll(TOOL_IMPORT)) visit(posix.join('scripts', match[1]));
  };
  visit(MODEL_ENTRY);
  const stale = Object.keys(excluded).filter(path => !seen.has(path));
  if (stale.length) throw new Error(`인증 입력 제외 목록의 도구가 모델 명령에서 닿지 않는다: ${stale.join(', ')}`);
  return [...seen].filter(path => !Object.hasOwn(excluded, path) && !isOtherVendor(path));
}

/**
 * 벤더의 입력 파일 목록. 선언과 원장에서 도출한 파일을 합친다. 벤더 하나의 구현을 고친 변경이 다른 벤더의 증거를 낡게 하지 않게, 다른 벤더가 선언한 파일은
 * 표지로 잡혀도 뺀다(포트 구현은 모두 VendorSqlDialect 를 담는다). 이 모듈과 시험은 입력이 아니다. 판정 코드를 고쳐도 벤더 동작은 바뀌지 않는다.
 * 원장·시험 원장이 경로를 직접 적은 파일이 무시 파일이면 값이 커밋을 말하지 못하므로 멈춘다.
 */
export function vendorEvidenceInputs(root, ledger, vendorId) {
  const vendor = ledger.vendors.find(row => row.id === vendorId);
  if (!vendor) throw new Error(`모르는 벤더: ${vendorId}`);
  const tests = readJson(root, TEST_LEDGER);
  const listed = committableFiles(root);
  const declared = paths => paths.flatMap(path => expandDeclaredInput(listed, path));
  const own = declared(vendor.evidenceInputs);
  const others = new Set(ledger.vendors.filter(row => row.id !== vendorId).flatMap(row => row.evidenceInputs));
  const isOtherVendor = path => others.has(path) && !own.includes(path);
  const sensitive = sensitiveJavaFiles(root, listed).filter(path => !isOtherVendor(path));
  const inputs = [...new Set([...declared(ledger.evidenceInputs.paths), ...own, ...modelToolFiles(root, ledger, isOtherVendor), ...readJson(root, SQL_LEDGER).locations.map(row => row.path),
    ...vendorTestFiles(listed, tests), ...tests.representativeE2e.specs.map(row => `frontend/${row.spec}`), ...sensitive])].sort();
  const known = new Set(listed);
  const ignored = inputs.filter(path => !known.has(path) && existsSync(join(root, path)));
  if (ignored.length) throw new Error(`인증 입력이 git 이 무시하는 파일이다: ${ignored.join(', ')}`);
  return inputs;
}

/**
 * CI 벤더 잡의 선택 계획. `ci: true` 인 벤더만 고른다(다른 벤더는 모든 생성의 번역 게이트만 받는다). 입력 계산은 저장소의 Java 를 모두 읽으므로 처음 물을 때 한 번만 한다.
 * PR 은 대표 E2E·증거와 같은 레이아웃을 돈다. 다른 레이아웃은 main 과 삭제 전수가 본다.
 */
export function vendorCiPlan(root, { inputsOf = (ledger, vendorId) => vendorEvidenceInputs(root, ledger, vendorId) } = {}) {
  const ledger = readJson(root, VENDOR_LEDGER);
  const tests = readJson(root, TEST_LEDGER);
  const vendors = ledger.vendors.filter(vendor => vendor.ci === true);
  const removedAssets = new Set(readJson(root, REMOVED_ASSETS).assets);
  const memo = new Map();
  const inputs = vendorId => {
    if (!memo.has(vendorId)) {
      try { memo.set(vendorId, { files: new Set(inputsOf(ledger, vendorId)) }); }
      catch (error) { memo.set(vendorId, { failure: error.message }); }
    }
    return memo.get(vendorId);
  };
  return { ledger, tests, removedAssets, vendors: vendors.map(vendor => vendor.id), pullRequestLayout: tests.representativeE2e.layout, inputs };
}

/** 워크플로의 벤더 잡 정의. 다른 잡을 고친 변경은 이 잡을 돌릴 이유가 없고, 분류 출력과 집계의 결속은 늘 도는 계약이 본다. */
function vendorJobDefinition(workflow) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.indexOf(VENDOR_JOB_HEADER);
  if (start < 0) return '';
  const next = lines.findIndex((line, index) => index > start && /^ {2}\S/.test(line));
  return lines.slice(start, next < 0 ? lines.length : next).join('\n');
}

/**
 * 변경 파일 하나가 벤더 하나의 잡을 고르는가. 결과: none | changed | deleted. deleted 는 전수로 닫는다 — 지워진 파일은 어느 입력이었는지 머리 트리로 알 수 없다.
 * head 는 머리의 내용이고 없으면 null 이다. 표지를 지운 변경은 머리 내용에 표지가 없으므로 readBase 로 비교 기준을 본다. 기준을 읽지 못한 지워진 Java 는 입력으로 본다.
 * 입력 계산이 실패하면(선언한 폴더가 비었거나 가져오는 도구가 없는 트리) 어느 파일이 입력인지 알 수 없어 전수로 닫는다.
 */
export function vendorInputChange(plan, vendorId, file, { head, readBase }) {
  // 비교 기준을 읽지 못하면 정의가 달라 보여 켜진다.
  if (file === VENDOR_JOB_WORKFLOW) return head !== null && vendorJobDefinition(head) === vendorJobDefinition(readBase() ?? '') ? 'none' : 'changed';
  const { ledger, tests, removedAssets } = plan;
  const vendor = ledger.vendors.find(row => row.id === vendorId);
  const excluded = ledger.evidenceInputs.excludedModelTools ?? {};
  const covers = paths => paths.some(path => declaredInputCovers(path, file));
  const owned = covers(vendor.evidenceInputs);
  if (!owned && ledger.vendors.some(row => row.id !== vendorId && covers(row.evidenceInputs))) return 'none';
  const { files, failure } = plan.inputs(vendorId);
  if (failure) return 'deleted';
  const declared = owned || files.has(file) || covers(ledger.evidenceInputs.paths) || covers(ledger.evidenceInputs.ciOnly ?? [])
    || (file.startsWith(`${SCHEMA_TESTS}/`) && !replacedSchemaTests(tests).has(file));
  const sensitivePath = isVendorSensitivePath(file);
  if (head !== null) return declared || (sensitivePath && (VENDOR_SENSITIVE.test(head) || VENDOR_SENSITIVE.test(readBase() ?? ''))) ? 'changed' : 'none';
  // 제거 원장이 가리키는 자산이 사라지면 원장이 낡아 벤더 생성만 멈춘다.
  if (declared || removedAssets.has(file)) return 'deleted';
  if (sensitivePath) {
    const base = readBase();
    return base === null || VENDOR_SENSITIVE.test(base) ? 'deleted' : 'none';
  }
  // 모델 명령이 가져오던 도구는 지워지면 머리 트리의 사슬에서 사라진다. 시험과 원장이 뺀 도구만 입력이 아니다.
  return /^scripts\/[^/]+\.mjs$/.test(file) && !file.endsWith('.test.mjs') && !Object.hasOwn(excluded, file) ? 'deleted' : 'none';
}
