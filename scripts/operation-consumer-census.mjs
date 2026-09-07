#!/usr/bin/env node
/**
 * operation-consumer-census
 *
 * 문서화된 모든 OpenAPI operation 에 **소비자가 있는지**를 센다.
 *
 * [왜 필요한가 — 2026-09-07 실측]
 * 저장소에는 백엔드 도달성 게이트가 이미 있다. `UnreachableServiceLinter` 는 `@Service`/`@Repository`
 * 가 생산 코드 어디에서도 참조되지 않으면 red 이고, `HandlerReachesServiceLinter` 는 핸들러가 서비스에
 * 닿는지 본다. 그런데 두 게이트 모두 **백엔드 안쪽만** 본다 — 컨트롤러가 서비스를 부르면 통과다.
 *
 * 그래서 다음이 어떤 게이트에도 걸리지 않았다: 인터넷 서비스 안내(ISG) 도메인은 엔티티·리포지토리·
 * 서비스·DTO·컨트롤러 5본·테스트 17건이 완비돼 있고 생성 계약(zod/operations)에도 실려 있는데,
 * **프런트 호출부가 저장소 전체에 0** 이었다. 화면이 없으니 등록 경로도 없어 `tb_intrn_svc` 는
 * 구조적으로 항상 비어 있었고, 그 사이 결함 3건(항상 빈 목록을 반환하는 스텁, DTO↔엔티티 어휘
 * 불일치, 설명 상한 1000 vs 컬럼 4000)이 **노출되지 않았기에 드러나지 않았다**.
 *
 * `generated-api-boundaries` census 도 이 축을 못 본다 — 그것은 "호출부가 있는 것 중 생성 경로를
 * 쓰는 비율"을 재므로, 호출부가 0 이면 애초에 분모에서 빠진다(실측: adoption 100% 인데 미소비 60건).
 *
 * [이 게이트는 두 축을 함께 잰다 — 2026-09-07]
 *
 * <p><b>축 1 (operation 소비)</b>: 각 operation 을 부르는 생산 TypeScript 모듈이 존재하는가.
 *
 * <p><b>축 2 (화면 도달성)</b>: 그 호출부를 감싼 **서비스 메서드를 화면이 실제로 부르는가**.
 * 축 1 만으로는 부족하다는 것이 실측으로 드러났다 — `deleteRespondent` 는
 * `SurveyAdminService.deleteRespondent()` 가 생성 실행기를 부르므로 축 1 을 통과하지만, 그
 * 서비스 메서드를 부르는 곳은 <b>자기 단위 테스트뿐</b>이다(app/·components/ 호출부 0).
 * 즉 백엔드에서 {@code UnreachableServiceLinter} 가 닫았던 "유일한 참조가 단위 테스트" 패턴이
 * 프런트 서비스 계층에서 한 겹 아래로 내려가 있었다(DEC-OPS-050 이 그 한계를 기록했고 이 축이 닫는다).
 *
 * <p>축 2 는 예외 목록을 두지 않는다 — 77건을 원장에 적으면 그 목록이 곧 서랍이 된다(H2).
 * 대신 <b>단조 감소 래칫</b>(`expected.screenOrphanMax`) 하나로 신규 유입만 막고, 실패 시 전체
 * 목록을 출력해 불투명해지지 않게 한다(status-color-guard 와 같은 설계).
 *
 * [규칙] 모든 operation 은 다음 셋 중 정확히 하나다.
 *   1. consumed      — 프런트 호출부가 있다(generated-api-boundaries 레코드).
 *   2. alias-derived — springdoc 이 다중 `@RequestMapping` 경로 때문에 만든 `_N` 접미 중복이고,
 *                      **기본 operationId 가 소비 중**이다. 기계 파생이므로 목록에 넣지 않는다.
 *   3. ledger        — 원장에 사유와 함께 등재돼 있다.
 * 셋 다 아니면 위반이다(fail-closed).
 *
 * [서랍 방지] 원장은 자유 목록이 아니다.
 *   · 카테고리는 닫힌 어휘다.
 *   · `bff-route-handler` · `non-browser-consumer` 는 evidence 파일이 **실재하고 경로 접미를
 *     포함**해야 한다 — 기계로 검증되므로 이름만 붙일 수 없다.
 *   · `unwired`(진짜 부채)는 **단조 감소 래칫**(`expected.unwiredMax`)에 걸린다. 늘리려면 상한을
 *     올려야 하고 그 변경은 diff 에 남는다.
 *   · 소비되기 시작했거나 사라진 operation 의 원장 항목은 stale 로 red 다 — 예외가 눌러앉지 못한다.
 *
 * Usage:
 *   node scripts/operation-consumer-census.mjs
 *   node scripts/operation-consumer-census.mjs --json
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');

export const API_DOC_PATH = 'api-docs.json';
export const BOUNDARY_PATH = join('config', 'governance', 'generated-api-boundaries.json');
export const LEDGER_PATH = join('config', 'governance', 'operation-consumer-census.json');
export const FRONTEND_SOURCE_ROOT = join('frontend', 'src');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** 닫힌 카테고리 어휘. 새 카테고리 신설은 이 상수 변경이며 diff 에 남는다. */
export const CATEGORIES = Object.freeze({
  /** Next route handler 가 서버 측에서 대신 부른다(BFF). */
  'bff-route-handler': { requiresEvidence: true, countsAsDebt: false },
  /** 부하 테스트·e2e 스크립트·인프라 probe 등 브라우저 밖 소비자가 있다. */
  'non-browser-consumer': { requiresEvidence: true, countsAsDebt: false },
  /** 소비자가 없다. 부채이며 래칫에 걸린다. */
  unwired: { requiresEvidence: false, countsAsDebt: true },
  /**
   * 다른 네임스페이스가 같은 일을 하고 화면은 그쪽을 쓴다 — "아무도 안 만든 기능" 과는 다르다.
   *
   * <p>기록만으로 통과시키지 않는다: `supersededBy` 에 적은 operation 이 **실재하고 실제로
   * 소비 중**이어야 한다(기계 검증). 대체자가 없거나 그 자신도 죽어 있으면 red 이므로
   * 이 카테고리는 `unwired` 를 피하는 도피처가 되지 못한다.
   */
  'superseded-surface': { requiresEvidence: false, countsAsDebt: false, requiresSupersededBy: true },
});

/** `/api/v1/auth/login` → `/auth/login`. BFF·부하 테스트는 base URL 을 따로 들고 접미만 쓴다. */
export function pathSuffix(path) {
  return path.replace(/^\/api\/v\d+/u, '');
}

/** springdoc 충돌 접미(`_1`)를 떼어 기본 operationId 를 얻는다. */
export function baseOperationId(operationId) {
  return operationId.replace(/_\d+$/u, '');
}

export function readOperations(apiDoc) {
  const operations = [];
  for (const [path, methods] of Object.entries(apiDoc.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods ?? {})) {
      if (!HTTP_METHODS.has(method)) continue;
      if (typeof operation?.operationId !== 'string' || operation.operationId === '') {
        throw new Error(`operation without operationId: ${method.toUpperCase()} ${path}`);
      }
      operations.push({
        operationId: operation.operationId,
        method: method.toUpperCase(),
        path,
        tag: (operation.tags ?? ['(untagged)'])[0],
        parameterKey: (operation.parameters ?? [])
          .map((parameter) => `${parameter.in}:${parameter.name}`)
          .sort()
          .join('|'),
      });
    }
  }
  return operations;
}

/**
 * 별칭 판정. `_N` 접미만으로는 부족하다 — 서로 다른 핸들러의 이름 충돌일 수도 있다.
 * 기본 operationId 가 **같은 메서드·같은 태그·같은 파라미터 집합**을 가져야 하고, 그 기본이
 * **소비 중이거나 원장에 사유와 함께 등재돼** 있어야 한다.
 *
 * <p>원장 등재까지 인정하는 이유: 별칭은 같은 핸들러의 다른 경로일 뿐 <b>새 표면이 아니다</b>.
 * 기본 쪽에 이미 판단과 사유가 적혀 있는데 별칭을 따로 적게 하면 같은 사유가 두 벌로 복제되고,
 * 한쪽만 갱신되는 순간 원장이 스스로 모순된다.
 */
export function isAliasDuplicate(operation, byOperationId, consumed, ledgered = new Set()) {
  const base = baseOperationId(operation.operationId);
  if (base === operation.operationId) return false;
  const target = byOperationId.get(base);
  if (!target) return false;
  return target.method === operation.method
    && target.tag === operation.tag
    && target.parameterKey === operation.parameterKey
    && (consumed.has(base) || ledgered.has(base));
}

export function analyze({ apiDoc, boundaries, ledger, repoRoot = DEFAULT_REPO_ROOT }) {
  const errors = [];
  const operations = readOperations(apiDoc);
  const byOperationId = new Map(operations.map((operation) => [operation.operationId, operation]));
  const consumed = new Set(
    (boundaries.records ?? [])
      .map((record) => record.operationId)
      .filter((operationId) => typeof operationId === 'string' && operationId !== ''),
  );

  const entries = ledger.entries ?? [];
  const ledgerByOperationId = new Map();
  for (const entry of entries) {
    if (ledgerByOperationId.has(entry.operationId)) {
      errors.push({ code: 'DUPLICATE_LEDGER_ENTRY', operationId: entry.operationId, message: 'ledger lists the same operation twice' });
      continue;
    }
    ledgerByOperationId.set(entry.operationId, entry);
  }

  const classified = { consumed: [], alias: [], ledger: [], unclassified: [] };
  for (const operation of operations) {
    if (consumed.has(operation.operationId)) {
      classified.consumed.push(operation);
      continue;
    }
    if (isAliasDuplicate(operation, byOperationId, consumed, ledgerByOperationId)) {
      classified.alias.push(operation);
      continue;
    }
    if (ledgerByOperationId.has(operation.operationId)) {
      classified.ledger.push(operation);
      continue;
    }
    classified.unclassified.push(operation);
    errors.push({
      code: 'UNCONSUMED_OPERATION',
      operationId: operation.operationId,
      message: `${operation.method} ${operation.path} has no frontend consumer and no ledger entry`
        + ' — wire a consumer or register it with a category and reason',
    });
  }

  // 원장 항목 검증 — stale·위조 예외를 막는다.
  let debtCount = 0;
  for (const entry of entries) {
    const operation = byOperationId.get(entry.operationId);
    if (!operation) {
      errors.push({ code: 'STALE_LEDGER_ENTRY', operationId: entry.operationId, message: 'operation no longer exists in api-docs.json' });
      continue;
    }
    if (consumed.has(entry.operationId)) {
      errors.push({
        code: 'RESOLVED_LEDGER_ENTRY',
        operationId: entry.operationId,
        message: 'operation now has a frontend consumer — remove the ledger entry',
      });
      continue;
    }
    if (isAliasDuplicate(operation, byOperationId, consumed, ledgerByOperationId)) {
      errors.push({
        code: 'DERIVABLE_LEDGER_ENTRY',
        operationId: entry.operationId,
        message: 'alias duplicates are derived mechanically — remove the ledger entry',
      });
      continue;
    }
    const category = CATEGORIES[entry.category];
    if (!category) {
      errors.push({ code: 'UNKNOWN_CATEGORY', operationId: entry.operationId, message: `unknown category '${entry.category ?? ''}'` });
      continue;
    }
    if (typeof entry.note !== 'string' || entry.note.trim() === '') {
      errors.push({ code: 'MISSING_NOTE', operationId: entry.operationId, message: 'every ledger entry must state why in `note`' });
    }
    if (category.countsAsDebt) debtCount += 1;

    if (category.requiresSupersededBy) {
      const replacements = Array.isArray(entry.supersededBy) ? entry.supersededBy : [];
      if (replacements.length === 0) {
        errors.push({
          code: 'MISSING_SUPERSEDED_BY',
          operationId: entry.operationId,
          message: `category '${entry.category}' must name the operations that took over in supersededBy`,
        });
      } else {
        // 대체자가 실재하고 실제로 소비 중이어야 한다 — 죽은 표면으로 죽은 표면을 정당화하지 못한다.
        const missing = replacements.filter((id) => !byOperationId.has(id));
        const dead = replacements.filter((id) => byOperationId.has(id) && !consumed.has(id));
        if (missing.length > 0) {
          errors.push({
            code: 'UNKNOWN_SUPERSEDED_BY',
            operationId: entry.operationId,
            message: `supersededBy names operations that do not exist: ${missing.join(', ')}`,
          });
        }
        if (dead.length > 0) {
          errors.push({
            code: 'DEAD_SUPERSEDED_BY',
            operationId: entry.operationId,
            message: `supersededBy names operations that are themselves unconsumed: ${dead.join(', ')}`,
          });
        }
      }
    }

    if (!category.requiresEvidence) continue;

    const evidence = Array.isArray(entry.evidence) ? entry.evidence : [];
    if (evidence.length === 0) {
      errors.push({ code: 'MISSING_EVIDENCE', operationId: entry.operationId, message: `category '${entry.category}' requires at least one evidence file` });
      continue;
    }
    const suffix = pathSuffix(operation.path);
    const proven = evidence.some((relativePath) => {
      if (typeof relativePath !== 'string' || relativePath.includes('..')) return false;
      const absolute = resolve(repoRoot, relativePath);
      if (!absolute.startsWith(resolve(repoRoot))) return false;
      if (!existsSync(absolute)) return false;
      return readFileSync(absolute, 'utf8').includes(suffix);
    });
    if (!proven) {
      errors.push({
        code: 'UNPROVEN_EVIDENCE',
        operationId: entry.operationId,
        message: `no evidence file exists that references '${suffix}' — the category claim is not backed`,
      });
    }
  }

  const expectedMax = ledger.expected?.unwiredMax;
  if (typeof expectedMax !== 'number' || !Number.isInteger(expectedMax) || expectedMax < 0) {
    errors.push({ code: 'INVALID_RATCHET', operationId: null, message: 'expected.unwiredMax must be a non-negative integer' });
  } else if (debtCount > expectedMax) {
    errors.push({
      code: 'UNWIRED_RATCHET',
      operationId: null,
      message: `unwired operations ${debtCount} exceed the frozen maximum ${expectedMax}`,
    });
  }

  const expectedTotal = ledger.expected?.operationCount;
  if (typeof expectedTotal === 'number' && expectedTotal !== operations.length) {
    errors.push({
      code: 'OPERATION_COUNT_DRIFT',
      operationId: null,
      message: `expected.operationCount=${expectedTotal}, actual=${operations.length}`,
    });
  }

  return {
    summary: {
      operationCount: operations.length,
      consumed: classified.consumed.length,
      aliasDerived: classified.alias.length,
      ledgered: classified.ledger.length,
      unwired: debtCount,
      unwiredMax: expectedMax ?? null,
      unclassified: classified.unclassified.length,
    },
    classified,
    errors,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 축 2 — 서비스 메서드 → 화면 도달성
// ───────────────────────────────────────────────────────────────────────────

const toPosix = (value) => value.split('\\').join('/');

export const isServiceFile = (file) => toPosix(file).includes('/services/');
export const isTestFile = (file) => /__tests__|\.test\.|\.spec\./u.test(toPosix(file));

function listSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) listSourceFiles(full, out);
    else if (/\.(ts|tsx)$/u.test(full)) out.push(toPosix(full));
  }
  return out;
}

/**
 * 함수형 노드에서 사람이 부르는 이름을 뽑는다.
 *
 * <p>이름 기반 정규식만 쓰면 <b>클래스 프로퍼티 화살표 함수</b>를 소유자로 잡지 못해 호출부가
 * 엉뚱한 선언(생성자의 {@code super(...)})에 귀속된다 — 1차 시도에서 실제로 그 오탐이 나왔다.
 * AST 로 네 가지 형태(메서드·함수 선언·프로퍼티 초기화·변수 초기화)를 모두 인식한다.
 */
function functionLikeName(ts, node, sourceFile) {
  const isFn = (init) => init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
  if (ts.isMethodDeclaration(node) && node.name) return node.name.getText(sourceFile);
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.getText(sourceFile);
  if (ts.isPropertyDeclaration(node) && isFn(node.initializer)) return node.name.getText(sourceFile);
  if (ts.isPropertyAssignment(node) && isFn(node.initializer)) return node.name.getText(sourceFile);
  if (ts.isVariableDeclaration(node) && isFn(node.initializer)) return node.name.getText(sourceFile);
  return null;
}

/** 해당 라인을 감싸는 **가장 안쪽** 함수형 노드의 이름. 없으면 null(귀속 실패). */
export function owningMethodAt(ts, sourceFile, line) {
  const position = ts.getPositionOfLineAndCharacter(sourceFile, Math.max(0, line - 1), 0);
  let best = null;
  const visit = (node) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    if (start <= position && position <= end) {
      const name = functionLikeName(ts, node, sourceFile);
      if (name && (!best || end - start < best.width)) best = { name, width: end - start };
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return best?.name ?? null;
}

/**
 * 화면 소비 판정은 **두 호출 형태를 모두 인정**한다.
 *
 * <ol>
 *   <li><b>멤버 호출</b> — `.<메서드명>(`. 서비스 인스턴스를 통해 부르는 일반적인 형태다.</li>
 *   <li><b>직접 호출</b> — `<메서드명>(`. 서비스가 메서드를 `.bind()` 로 재수출하고 화면이
 *       named import 로 받아 점 없이 부르는 형태다.</li>
 * </ol>
 *
 * <p>[2026-09-07 정정] 처음에는 멤버 호출만 봤고, 그래서 `deptScheduleService` 의 7메서드처럼
 * <b>화면이 실제로 부르는데 고아로 집계되는 거짓 양성</b>이 생겼다. 그 서비스는 클래스 메서드를
 * 모듈 레벨 named export 로 다시 내보내고 화면은 `getDeptScheduleMonthList({...})` 처럼 부른다.
 * 게이트가 실제와 다른 사실을 주장하면 래칫 수치 자체가 거짓이 되므로 두 형태를 함께 본다.
 *
 * <p>판정은 여전히 백엔드 {@code UnreachableServiceLinter} 를 따라 <b>의도적으로 관대</b>하다 —
 * 흔한 이름은 다른 모듈의 동명 심볼과 겹쳐 통과할 수 있으나 그것은 <b>놓치는 방향</b>이라
 * 거짓 red 를 만들지 않는다.
 */
export function analyzeScreenReachability({ boundaries, repoRoot = DEFAULT_REPO_ROOT, ts }) {
  const sourceRoot = resolve(repoRoot, FRONTEND_SOURCE_ROOT);
  if (!existsSync(sourceRoot)) return { orphans: [], unattributed: [], methodCount: 0 };

  const files = listSourceFiles(sourceRoot);
  const consumerText = files
    .filter((file) => !isServiceFile(file) && !isTestFile(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  const parsed = new Map();
  const readSource = (absolute) => {
    if (!parsed.has(absolute)) {
      const text = readFileSync(absolute, 'utf8');
      parsed.set(absolute, ts.createSourceFile(absolute, text, ts.ScriptTarget.Latest, true));
    }
    return parsed.get(absolute);
  };

  const methods = new Map();
  const unattributed = [];
  for (const record of boundaries.records ?? []) {
    const file = toPosix(record.file ?? '');
    if (!record.operationId || !isServiceFile(file) || isTestFile(file)) continue;
    const absolute = resolve(repoRoot, file);
    if (!existsSync(absolute)) continue;
    const owner = owningMethodAt(ts, readSource(absolute), record.line);
    if (!owner) {
      unattributed.push({ file, line: record.line, operationId: record.operationId });
      continue;
    }
    const key = `${file}#${owner}`;
    if (!methods.has(key)) methods.set(key, { file, method: owner, operationIds: new Set() });
    methods.get(key).operationIds.add(record.operationId);
  }

  const orphans = [];
  for (const entry of methods.values()) {
    const escaped = entry.method.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    // 멤버 호출(`svc.method(`) 또는 직접 호출(`method(` — .bind() 재수출을 named import 로 받은 형태).
    const memberCall = new RegExp(`\\.${escaped}\\s*\\(`, 'u');
    const directCall = new RegExp(`(?<![.\\w$])${escaped}\\s*\\(`, 'u');
    if (memberCall.test(consumerText) || directCall.test(consumerText)) continue;
    orphans.push({ ...entry, operationIds: [...entry.operationIds].sort() });
  }
  orphans.sort((a, b) => a.file.localeCompare(b.file) || a.method.localeCompare(b.method));
  return { orphans, unattributed, methodCount: methods.size };
}

export function loadJson(repoRoot, relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

export function runCensus(repoRoot = DEFAULT_REPO_ROOT) {
  const boundaries = loadJson(repoRoot, BOUNDARY_PATH);
  const ledger = loadJson(repoRoot, LEDGER_PATH);
  const result = analyze({
    apiDoc: loadJson(repoRoot, API_DOC_PATH),
    boundaries,
    ledger,
    repoRoot,
  });

  // 축 2 — TypeScript 는 프런트 워크스페이스에만 있으므로 여기서 지연 로드한다.
  const ts = createRequire(resolve(repoRoot, 'frontend', 'package.json'))('typescript');
  const reachability = analyzeScreenReachability({ boundaries, repoRoot, ts });

  const orphanMax = ledger.expected?.screenOrphanMax;
  if (typeof orphanMax !== 'number' || !Number.isInteger(orphanMax) || orphanMax < 0) {
    result.errors.push({
      code: 'INVALID_SCREEN_RATCHET',
      operationId: null,
      message: 'expected.screenOrphanMax must be a non-negative integer',
    });
  } else if (reachability.orphans.length > orphanMax) {
    // 목록을 함께 실어 red 가 불투명해지지 않게 한다 — 예외 파일을 만들지 않는 대신의 장치다.
    const listed = reachability.orphans
      .map((entry) => `${entry.method} (${entry.operationIds.join(', ')}) — ${entry.file}`)
      .join('\n      ');
    result.errors.push({
      code: 'SCREEN_REACHABILITY_RATCHET',
      operationId: null,
      message: `service methods with no screen caller ${reachability.orphans.length} exceed the frozen maximum ${orphanMax}\n      ${listed}`,
    });
  }
  if (reachability.unattributed.length > 0) {
    // 귀속 실패는 통과가 아니라 red 다 — 못 본 것을 본 것처럼 세지 않는다.
    result.errors.push({
      code: 'UNATTRIBUTED_CALL_SITE',
      operationId: null,
      message: `${reachability.unattributed.length} generated call site(s) could not be attributed to an enclosing function`,
    });
  }

  result.summary.serviceMethods = reachability.methodCount;
  result.summary.screenOrphans = reachability.orphans.length;
  result.summary.screenOrphanMax = orphanMax ?? null;
  result.reachability = reachability;
  return result;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH;
if (isDirectRun) {
  const result = runCensus();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  } else {
    const { summary } = result;
    process.stdout.write(
      `operation consumer census: total=${summary.operationCount} consumed=${summary.consumed} `
      + `alias-derived=${summary.aliasDerived} ledgered=${summary.ledgered} `
      + `unwired=${summary.unwired}/${summary.unwiredMax}\n`
      + `screen reachability: service methods=${summary.serviceMethods} `
      + `no-screen-caller=${summary.screenOrphans}/${summary.screenOrphanMax}\n`,
    );
  }
  if (result.errors.length > 0) {
    process.stderr.write(`❌ operation consumer census failed (${result.errors.length}):\n`);
    for (const error of result.errors) {
      process.stderr.write(`  - [${error.code}] ${error.operationId ?? '(census)'}: ${error.message}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(
    '✅ every documented operation has a consumer or a justified ledger entry,'
    + ' and no new service method lost its screen caller\n',
  );
}
