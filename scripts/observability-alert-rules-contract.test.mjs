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
  return { ...repository, [path]: source.replace(from, to) };
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
    ['attachment metric typo', mutate(PATHS.rules, 'nuri_attachment_integrity_runs_total', 'nuri_attachment_integrity_run_total'), /METRIC_BINDINGS 에 없습니다/],
    ['attachment outcome value typo', mutate(PATHS.rules, 'outcome="PASS"', 'outcome="PASSED"'), /테스트가 확인한 값이 아닙니다/],
    ['attachment scrape proof removed', mutate(PATHS.attachmentSchedulerTest, 'nuri_attachment_integrity_runs_total{outcome=\\"PASS\\"} 1.0', 'UNPROVEN'), /nuri_attachment_integrity_runs_total/],
    ['attachment alert removed', mutate(PATHS.rules, '- alert: EgovAttachmentIntegrityNoHealthyRun', '- alert: EgovAttachmentIntegrity'), /EgovAttachmentIntegrityNoHealthyRun 가 없/],
    ['rules file missing', { ...repository, [PATHS.rules]: undefined }, /경보 규칙 파일이 없습니다/],
  ];
  for (const [name, files, expected] of cases) {
    const errors = evaluateAlertRules(files);
    assert.ok(errors.some((error) => expected.test(error)), `${name} was not detected: ${JSON.stringify(errors)}`);
  }
});

test('evidence inside comments does not satisfy a binding', () => {
  const snippet = 'REJECTION_METRIC = "security.ratelimit.rejected"';
  const files = mutate(PATHS.rateLimitFilter, `public static final String ${snippet};`, `// public static final String ${snippet};\n    public static final String REJECTION_METRIC = "other";`);
  assert.ok(evaluateAlertRules(files).some((error) => error.includes('REJECTION_METRIC')));

  const commentedYml = mutate(PATHS.applicationYml, 'application: ${spring.application.name', '# application: ${spring.application.name');
  assert.ok(evaluateAlertRules(commentedYml).some((error) => error.includes('application.yml')));
});

test('parsers read metric names and labels without confusing matcher values', () => {
  assert.deepEqual(metricNames('sum by (a) (rate(foo_total{uri="/x[1]"}[5m])) / bar[1m]'), ['foo_total', 'bar']);
  assert.deepEqual(labelUsage('sum without (x, y) (m{a="1", b!="2"})'), {
    grouping: ['x', 'y'],
    matchers: [{ label: 'a', op: '=', value: '1' }, { label: 'b', op: '!=', value: '2' }],
  });
  assert.equal(stripJavaComments('String a = "//keep"; // drop\n/* drop */int b;'), 'String a = "//keep"; \nint b;');
});
