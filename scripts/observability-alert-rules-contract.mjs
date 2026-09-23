#!/usr/bin/env node
/**
 * 경보 규칙 ↔ 메트릭 원천 결속 계약.
 *
 * [왜 필요한가] Prometheus 경보는 메트릭 이름·라벨이 틀려도 오류를 내지 않는다. 쿼리가 빈 결과를 돌려줄 뿐이라
 *   경보는 **영원히 조용하고**, 그 조용함은 "문제가 없다" 와 구분되지 않는다. 이 저장소는 같은 형태를 이미 겪었다 —
 *   Boot 2 키 이름으로 적힌 prometheus 설정이 아무것도 설정하지 않은 채 설정처럼 보였다(application.yml [W1-12]).
 *
 * [무엇을 보나] config/observability/prometheus-alert-rules.yml 의 각 경보가
 *   1. 형식을 갖추고(expr·for·severity·summary),
 *   2. 참조하는 메트릭이 모두 METRIC_BINDINGS 에 있으며,
 *   3. 그 메트릭의 원천 코드와 **실제 노출 이름·태그를 확인한 테스트**가 주석이 아닌 코드로 존재하고,
 *   4. 쓰는 라벨이 그 메트릭의 라벨이며, 라벨 값 매처(`uri="..."` 등)도 테스트가 확인한 값인지.
 *
 * [한계] PromQL 문법 전체를 해석하지 않는다. 메트릭은 `이름{` 또는 `이름[` 형태로만 인식하고, 라벨은
 *   `by (...)`·`without (...)` 과 `{...}` 매처만 본다. 문법 검사는 `promtool check rules` 로 한다
 *   (docs/04-operations/observability-baseline.md).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PATHS = Object.freeze({
  rules: 'config/observability/prometheus-alert-rules.yml',
  applicationYml: 'api-server/src/main/resources/application.yml',
  rateLimitFilter: 'business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java',
  rateLimitTest: 'business-core/src/test/java/nuri/business/security/filter/RateLimitFilterTest.java',
  loginIntegrationTest: 'api-server/src/test/java/nuri/auth/AuthenticationControllerIntegrationTest.java',
  attachmentScheduler: 'business-core/src/main/java/nuri/business/service/file/AttachmentIntegrityScheduler.java',
  attachmentSchedulerTest: 'business-core/src/test/java/nuri/business/service/file/AttachmentIntegritySchedulerTest.java',
});

/** 템플릿이 약속한 경보. 빠지면 red 다(ADR 없이 예시가 사라지는 것을 막는다). */
export const REQUIRED_ALERTS = Object.freeze(['EgovRateLimitRejectionsSustained', 'EgovLoginFailureSpike',
  'EgovAttachmentIntegrityNoHealthyRun']);

const APPLICATION_TAG_EVIDENCE = [PATHS.applicationYml, 'application: ${spring.application.name'];

/**
 * 경보가 참조할 수 있는 메트릭. 새 메트릭을 경보에 쓰려면 원천과 **노출 이름·태그를 실제로 확인한 테스트**를 함께 적는다.
 * evidence 는 [파일, 코드 조각] 이며 주석을 제거한 원문에 있어야 한다.
 */
export const METRIC_BINDINGS = Object.freeze({
  security_ratelimit_rejected_total: {
    labels: ['application', 'bucket'],
    evidence: [
      APPLICATION_TAG_EVIDENCE,
      [PATHS.rateLimitFilter, 'REJECTION_METRIC = "security.ratelimit.rejected"'],
      [PATHS.rateLimitFilter, 'REJECTION_BUCKET_TAG = "bucket"'],
      [PATHS.rateLimitTest, 'security_ratelimit_rejected_total{bucket=\\"login\\"} 1.0'],
    ],
    labelValues: {},
  },
  nuri_attachment_integrity_runs_total: {
    labels: ['application', 'outcome'],
    evidence: [
      APPLICATION_TAG_EVIDENCE,
      [PATHS.attachmentScheduler, 'metrics.counter("nuri.attachment.integrity.runs", "outcome", outcome)'],
      [PATHS.attachmentSchedulerTest, 'nuri_attachment_integrity_runs_total{outcome=\\"PASS\\"} 1.0'],
    ],
    labelValues: {
      outcome: { PASS: [PATHS.attachmentSchedulerTest, 'nuri_attachment_integrity_runs_total{outcome=\\"PASS\\"} 1.0'] },
    },
  },
  http_server_requests_seconds_count: {
    labels: ['application', 'uri', 'status', 'method', 'outcome', 'exception', 'error'],
    evidence: [
      APPLICATION_TAG_EVIDENCE,
      [PATHS.loginIntegrationTest, 'meterRegistry.find("http.server.requests")'],
    ],
    labelValues: {
      uri: { '/api/v1/auth/login': [PATHS.loginIntegrationTest, '.tag("uri", "/api/v1/auth/login")'] },
      status: { 401: [PATHS.loginIntegrationTest, 'loginRequests("401")'] },
    },
  },
});

/** 문자열·문자 리터럴을 보존하며 Java 주석을 지운다. 주석 속 증거 문구로 계약을 통과시키지 않기 위해서다. */
export function stripJavaComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
    } else if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          out += source[i];
          i += 1;
        }
        out += source[i] ?? '';
        i += 1;
      }
      out += source[i] ?? '';
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

function stripYamlCommentLines(source) {
  return source.split(/\r?\n/).map((line) => (/^\s*#/.test(line) ? '' : line)).join('\n');
}

function codeOf(path, source) {
  if (path.endsWith('.java')) return stripJavaComments(source);
  if (/\.ya?ml$/.test(path)) return stripYamlCommentLines(source);
  return source;
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** 경보 규칙 파일을 규칙 목록으로 읽는다. 이 계약이 쓰는 평면 형태만 인식한다. */
export function parseAlertRules(source) {
  const errors = [];
  const rules = [];
  const lines = stripYamlCommentLines(source).split('\n');
  if (!lines.some((line) => /^groups:\s*$/.test(line))) errors.push(`${PATHS.rules}: 최상위 groups: 가 없습니다.`);
  let current = null;
  for (const line of lines) {
    const alert = line.match(/^\s*-\s+alert:\s*(.+)$/);
    if (alert) {
      current = { alert: unquote(alert[1]) };
      rules.push(current);
      continue;
    }
    if (/^\s*-\s+record:/.test(line)) {
      errors.push(`${PATHS.rules}: record 규칙은 이 계약이 결속을 확인하지 않습니다 — 경보(alert)만 둡니다.`);
      current = null;
      continue;
    }
    if (/^\s*-\s+name:/.test(line)) {
      current = null;
      continue;
    }
    const field = line.match(/^\s*(expr|for|severity|summary|description):\s*(.*)$/);
    if (current && field) {
      if (field[2].trim() === '|' || field[2].trim() === '>') {
        errors.push(`${PATHS.rules}: ${current.alert} 의 ${field[1]} 는 한 줄로 적습니다(블록 스칼라는 계약이 읽지 못합니다).`);
      }
      current[field[1]] = unquote(field[2]);
    }
  }
  return { rules, errors };
}

/** PromQL 에서 `이름{` 또는 `이름[` 형태의 메트릭 이름을 뽑는다. */
export function metricNames(expr) {
  const withoutMatchers = expr.replace(/\{[^}]*\}/g, (block) => `{${' '.repeat(block.length - 2)}}`);
  return [...new Set([...withoutMatchers.matchAll(/([a-zA-Z_:][a-zA-Z0-9_:]*)\s*[{[]/g)].map((m) => m[1]))];
}

/** `by (a, b)`·`without (a)` 의 라벨과 `{k="v"}` 매처를 뽑는다. */
export function labelUsage(expr) {
  const grouping = [...expr.matchAll(/\b(?:by|without)\s*\(([^)]*)\)/g)]
    .flatMap((m) => m[1].split(',').map((label) => label.trim()).filter(Boolean));
  const matchers = [...expr.matchAll(/\{([^}]*)\}/g)]
    .flatMap((m) => [...m[1].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*(=~|!=|!~|=)\s*"([^"]*)"/g)])
    .map((m) => ({ label: m[1], op: m[2], value: m[3] }));
  return { grouping, matchers };
}

export function evaluateAlertRules(files) {
  const errors = [];
  const rulesSource = files[PATHS.rules];
  if (rulesSource == null) return [`${PATHS.rules}: 경보 규칙 파일이 없습니다.`];

  const hasEvidence = ([path, snippet]) => files[path] != null && codeOf(path, files[path]).includes(snippet);
  const requireEvidence = (owner, evidence) => {
    if (!hasEvidence(evidence)) {
      errors.push(`${owner}: 결속 증거가 코드에 없습니다 — ${evidence[0]} 에 \`${evidence[1]}\` (주석은 증거가 아닙니다).`);
    }
  };

  const { rules, errors: parseErrors } = parseAlertRules(rulesSource);
  errors.push(...parseErrors);

  const seen = new Set();
  for (const rule of rules) {
    const owner = `${PATHS.rules}: ${rule.alert}`;
    if (!/^Egov[A-Za-z0-9]+$/.test(rule.alert)) errors.push(`${owner}: 경보 이름은 Egov 로 시작하는 PascalCase 입니다.`);
    if (seen.has(rule.alert)) errors.push(`${owner}: 경보 이름이 중복됩니다.`);
    seen.add(rule.alert);
    if (!rule.expr) errors.push(`${owner}: expr 가 없습니다.`);
    if (!/^\d+[smh]$/.test(rule.for ?? '')) errors.push(`${owner}: for 가 없거나 형식(예: 5m)이 아닙니다 — 순간 튐으로 경보가 울립니다.`);
    if (!['warning', 'critical'].includes(rule.severity)) errors.push(`${owner}: labels.severity 는 warning 또는 critical 입니다.`);
    if (!rule.summary) errors.push(`${owner}: annotations.summary 가 없습니다.`);
    if (!rule.expr) continue;

    const metrics = metricNames(rule.expr);
    if (metrics.length === 0) errors.push(`${owner}: expr 에서 메트릭을 찾지 못했습니다 — 결속을 확인할 수 없는 경보는 두지 않습니다.`);
    const bindings = [];
    for (const metric of metrics) {
      const binding = METRIC_BINDINGS[metric];
      if (!binding) {
        errors.push(`${owner}: 메트릭 ${metric} 이 METRIC_BINDINGS 에 없습니다 — 원천 코드와 노출 이름을 확인한 테스트를 함께 등록하십시오.`);
        continue;
      }
      bindings.push(binding);
      for (const evidence of binding.evidence) requireEvidence(`${owner} (${metric})`, evidence);
    }
    if (bindings.length === 0) continue;

    const { grouping, matchers } = labelUsage(rule.expr);
    for (const label of grouping) {
      if (!bindings.some((binding) => binding.labels.includes(label))) {
        errors.push(`${owner}: 라벨 ${label} 은 참조한 메트릭의 라벨이 아닙니다 — 집계 결과에서 조용히 사라집니다.`);
      }
    }
    for (const { label, op, value } of matchers) {
      const owners = bindings.filter((binding) => binding.labels.includes(label));
      if (owners.length === 0) {
        errors.push(`${owner}: 매처 라벨 ${label} 은 참조한 메트릭의 라벨이 아닙니다.`);
        continue;
      }
      if (op !== '=') {
        errors.push(`${owner}: ${label}${op}"${value}" — 정확 일치(=) 매처만 결속을 확인할 수 있습니다.`);
        continue;
      }
      const evidence = owners.map((binding) => binding.labelValues[label]?.[value]).find(Boolean);
      if (!evidence) {
        errors.push(`${owner}: ${label}="${value}" 는 테스트가 확인한 값이 아닙니다 — 오타면 경보가 영원히 조용합니다. METRIC_BINDINGS.labelValues 에 증거와 함께 등록하십시오.`);
      } else {
        requireEvidence(`${owner} (${label}="${value}")`, evidence);
      }
    }
  }

  for (const required of REQUIRED_ALERTS) {
    if (!seen.has(required)) errors.push(`${PATHS.rules}: 템플릿 기본 경보 ${required} 가 없습니다.`);
  }
  return errors;
}

export function loadRepositoryFiles(root) {
  const files = {};
  for (const path of Object.values(PATHS)) {
    const absolute = join(root, path);
    if (existsSync(absolute)) files[path] = readFileSync(absolute, 'utf8');
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const errors = evaluateAlertRules(loadRepositoryFiles(root));
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('observability alert rules: OK');
}
