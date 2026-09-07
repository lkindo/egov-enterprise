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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');

export const API_DOC_PATH = 'api-docs.json';
export const BOUNDARY_PATH = join('config', 'governance', 'generated-api-boundaries.json');
export const LEDGER_PATH = join('config', 'governance', 'operation-consumer-census.json');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** 닫힌 카테고리 어휘. 새 카테고리 신설은 이 상수 변경이며 diff 에 남는다. */
export const CATEGORIES = Object.freeze({
  /** Next route handler 가 서버 측에서 대신 부른다(BFF). */
  'bff-route-handler': { requiresEvidence: true, countsAsDebt: false },
  /** 부하 테스트·e2e 스크립트·인프라 probe 등 브라우저 밖 소비자가 있다. */
  'non-browser-consumer': { requiresEvidence: true, countsAsDebt: false },
  /** 소비자가 없다. 부채이며 래칫에 걸린다. */
  unwired: { requiresEvidence: false, countsAsDebt: true },
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
 * 기본 operationId 가 **같은 메서드·같은 태그·같은 파라미터 집합**을 갖고 **실제로 소비 중**일 때만
 * 별칭으로 인정한다. 하나라도 어긋나면 별칭이 아니며 원장 등재 대상이 된다.
 */
export function isAliasDuplicate(operation, byOperationId, consumed) {
  const base = baseOperationId(operation.operationId);
  if (base === operation.operationId) return false;
  const target = byOperationId.get(base);
  if (!target) return false;
  return target.method === operation.method
    && target.tag === operation.tag
    && target.parameterKey === operation.parameterKey
    && consumed.has(base);
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
    if (isAliasDuplicate(operation, byOperationId, consumed)) {
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
    if (isAliasDuplicate(operation, byOperationId, consumed)) {
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

export function loadJson(repoRoot, relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

export function runCensus(repoRoot = DEFAULT_REPO_ROOT) {
  return analyze({
    apiDoc: loadJson(repoRoot, API_DOC_PATH),
    boundaries: loadJson(repoRoot, BOUNDARY_PATH),
    ledger: loadJson(repoRoot, LEDGER_PATH),
    repoRoot,
  });
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
      + `unwired=${summary.unwired}/${summary.unwiredMax}\n`,
    );
  }
  if (result.errors.length > 0) {
    process.stderr.write(`❌ operation consumer census failed (${result.errors.length}):\n`);
    for (const error of result.errors) {
      process.stderr.write(`  - [${error.code}] ${error.operationId ?? '(census)'}: ${error.message}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('✅ every documented operation has a consumer or a justified ledger entry\n');
}
