import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PATHS,
  evaluateAlertRules,
  labelUsage,
  loadRepositoryFiles,
  metricNames,
  stripJavaComments,
} from './observability-alert-rules-contract.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repository = loadRepositoryFiles(root);

function mutate(path, from, to) {
  const source = repository[path];
  assert.ok(source?.includes(from), `fixture anchor missing in ${path}: ${from}`);
  return { ...repository, [path]: source.replaceAll(from, to) };
}

test('the repository alert rules are bound to real metric sources', () => {
  assert.deepEqual(evaluateAlertRules(repository), []);
});

test('every way an alert can go silently dark is red', () => {
  const cases = [
    ['Java metric renamed', mutate(PATHS.rateLimitFilter, 'REJECTION_METRIC = "security.ratelimit.rejected"', 'REJECTION_METRIC = "security.ratelimit.denied"'), /REJECTION_METRIC/],
    ['bucket tag renamed', mutate(PATHS.rateLimitFilter, 'REJECTION_BUCKET_TAG = "bucket"', 'REJECTION_BUCKET_TAG = "limit"'), /REJECTION_BUCKET_TAG/],
    ['Prometheus name proof removed', mutate(PATHS.rateLimitTest, 'security_ratelimit_rejected_total{bucket=\\"login\\"} 1.0', 'security_ratelimit_rejected{bucket=\\"login\\"}'), /RateLimitFilterTest/],
    ['alert typo in metric name', mutate(PATHS.rules, 'rate(security_ratelimit_rejected_total[5m])', 'rate(security_rate_limit_rejected_total[5m])'), /METRIC_BINDINGS 에 없습니다/],
    ['alert typo in uri value', mutate(PATHS.rules, 'uri="/api/v1/auth/login"', 'uri="/api/v1/login"'), /테스트가 확인한 값이 아닙니다/],
    ['alert groups by a label the metric lacks', mutate(PATHS.rules, 'sum by (application, bucket)', 'sum by (application, ip)'), /라벨 ip/],
    ['login uri proof removed', mutate(PATHS.loginIntegrationTest, '.tag("uri", "/api/v1/auth/login")', '.tag("uri", "UNKNOWN")'), /uri="\/api\/v1\/auth\/login"/],
    ['regex matcher cannot be bound', mutate(PATHS.rules, 'status="401"', 'status=~"4.."'), /정확 일치/],
    ['for removed', mutate(PATHS.rules, 'for: 10m', 'for: now'), /for 가 없거나/],
    ['severity dropped', mutate(PATHS.rules, 'severity: warning', 'severity: page'), /severity/],
    ['required alert removed', mutate(PATHS.rules, '- alert: EgovLoginFailureSpike', '- alert: EgovLoginFailures'), /EgovLoginFailureSpike 가 없습니다/],
    ['attachment metric typo', mutate(PATHS.rules, 'nuri_attachment_integrity_healthy_age_seconds', 'nuri_attachment_integrity_healthy_age_second'), /METRIC_BINDINGS 에 없습니다/],
    ['finite durable status value typo', mutate(PATHS.rules, 'status="FAILED"', 'status="FAIL"'), /테스트가 확인한 값이 아닙니다/],
    ['attachment scrape proof removed', mutate(PATHS.attachmentSchedulerTest, 'nuri_attachment_integrity_healthy_age_seconds 0.0', 'UNPROVEN'), /nuri_attachment_integrity_healthy_age_seconds/],
    ['attachment alert removed', mutate(PATHS.rules, '- alert: EgovAttachmentIntegrityNoHealthyRun', '- alert: EgovAttachmentIntegrity'), /EgovAttachmentIntegrityNoHealthyRun 가 없/],
    ['durable queue metric renamed', mutate(PATHS.durableMetrics, 'JOBS = "nuri.durable.work.jobs"', 'JOBS = "nuri.durable.work.workitems"'), /JOBS/],
    ['durable scrape proof removed', mutate(PATHS.durableWorkTest, 'nuri_durable_work_jobs{status=\\"FAILED\\"}', 'UNPROVEN'), /nuri_durable_work_jobs/],
    ['durable alert removed', mutate(PATHS.rules, '- alert: EgovDurableWorkFailed', '- alert: EgovDurableWork'), /EgovDurableWorkFailed 가 없/],
    ['rules file missing', { ...repository, [PATHS.rules]: undefined }, /경보 규칙 파일이 없습니다/],
    ['enabled gauge detached', mutate(PATHS.attachmentMetrics, 'Gauge.builder(ENABLED, this', 'Gauge.builder("different", this'), /Gauge.builder/],
    ['durable finite statuses changed', mutate(PATHS.durableMetrics, 'List.of("PENDING", "RUNNING", "RETRY", "SUCCEEDED", "FAILED")', 'List.of("PENDING", "UNKNOWN")'), /List.of/],
    ['due age proof removed', mutate(PATHS.durableWorkTest, 'nuri_durable_work_oldest_due_age_seconds{status=\\"RUNNING\\"}', 'UNPROVEN'), /RUNNING/],
    ['query failure proof removed', mutate(PATHS.durableWorkTest, 'nuri_durable_work_observation_healthy 0.0', 'UNPROVEN'), /nuri_durable_work_observation_healthy/],
    ['timed fixture missing', { ...repository, [PATHS.promtoolFixtures]: undefined }, /timed promtool fixtures are missing/],
    ['wrong rule fixture binding', mutate(PATHS.promtoolFixtures, '"prometheus-alert-rules.yml"', '"different.yml"'), /exact current rule file/],
    ['quiet and firing case removed', mutate(PATHS.promtoolFixtures, 'alertname: "EgovAttachmentIntegrityDisabled"', 'alertname: "EgovUnknownAlert"'), /requires both quiet and firing/],
    ['replica sum replaces committed state max', mutate(PATHS.rules, 'max by (application) (nuri_durable_work_jobs{status="FAILED"}) > 0', 'sum by (application) (nuri_durable_work_jobs{status="FAILED"}) > 0'), /query expectation drifted/],
  ];
  for (const [name, files, expected] of cases) {
    const errors = evaluateAlertRules(files);
    assert.ok(errors.some((error) => expected.test(error)), `${name} was not detected: ${JSON.stringify(errors)}`);
  }
});

test('each state-based alert has quiet and firing promtool timings bound to the actual rule expression', () => {
  assert.deepEqual(evaluateAlertRules(repository), []);
  const gauges = repository[PATHS.promtoolFixtures];
  assert.match(gauges, /26h3m/);
  assert.match(gauges, /26h6m/);
  assert.match(gauges, /97200\+60x10/);
  assert.match(gauges, /old-failed/);
  assert.match(gauges, /future-lease/);
  assert.match(gauges, /query-failure/);
  assert.match(gauges, /stopped-observation/);
  assert.match(gauges, /instance=\\"a\\"/);
});

test('evidence inside comments does not satisfy a binding', () => {
  const snippet = 'REJECTION_METRIC = "security.ratelimit.rejected"';
  const files = mutate(PATHS.rateLimitFilter, `public static final String ${snippet};`, `// public static final String ${snippet};\n    public static final String REJECTION_METRIC = "other";`);
  assert.ok(evaluateAlertRules(files).some((error) => error.includes('REJECTION_METRIC')));

  const commentedYml = mutate(PATHS.applicationYml, 'application: ${spring.application.name', '# application: ${spring.application.name');
  assert.ok(evaluateAlertRules(commentedYml).some((error) => error.includes('application.yml')));
});

test('timed alert checks must execute the pinned promtool through required CI', () => {
  for (const [file, from, to] of [
    [PATHS.promtoolRunner, "'test', 'rules', '/rules/prometheus-alert-rules.test.yml'", "'check', 'rules', '/rules/prometheus-alert-rules.test.yml'"],
    [PATHS.promtoolRunner, '2659f4c2ebb718e7695cb9b25ffa7d6be64db013daba13e05c875451cf51b0d3', '0'.repeat(64)],
    [PATHS.requiredCi, 'run: npm run verify:alerts', 'run: echo alert-validation'],
    [PATHS.packageJson, '"verify:alerts": "node scripts/run-prometheus-alert-tests.mjs"', '"verify:alerts": "echo unchecked"'],
  ]) assert.ok(evaluateAlertRules(mutate(file, from, to)).some(error => error.includes('promtool execution binding')));
});

test('parsers read metric names and labels without confusing matcher values', () => {
  assert.deepEqual(metricNames('sum by (a) (rate(foo_total{uri="/x[1]"}[5m])) / bar[1m]'), ['foo_total', 'bar']);
  assert.deepEqual(labelUsage('sum without (x, y) (m{a="1", b!="2"})'), {
    grouping: ['x', 'y'],
    matchers: [{ label: 'a', op: '=', value: '1' }, { label: 'b', op: '!=', value: '2' }],
  });
  assert.equal(stripJavaComments('String a = "//keep"; // drop\n/* drop */int b;'), 'String a = "//keep"; \nint b;');
});
