import { parseWorkflowJobs } from './required-checks-contract.mjs';

export const GRADLE_DEPENDENCY_ACTION =
  'gradle/actions/dependency-submission@9c971963bec38e04b3d30dcc455b5382be2fdbfb';
export const DEPENDENCY_SCOPE_CONDITION =
  "github.event_name == 'pull_request' && (needs.change-scope.outputs.backend == 'true' || needs.change-scope.outputs.frontend == 'true')";

function normalize(content) {
  return content.replace(/\r\n/g, '\n');
}

function stepByName(job, name) {
  const marker = `      - name: ${name}`;
  const start = job.indexOf(marker);
  if (start < 0) return '';
  const next = job.indexOf('\n      - ', start + marker.length);
  return job.slice(start, next < 0 ? job.length : next);
}

function requireMatch(errors, content, pattern, message) {
  if (!pattern.test(content)) errors.push(message);
}

function rejectMatch(errors, content, pattern, message) {
  if (pattern.test(content)) errors.push(message);
}

function validateActionStep(errors, step, mode, label) {
  requireMatch(errors, step, new RegExp(`^        uses: ${GRADLE_DEPENDENCY_ACTION}(?:\\s+#.*)?$`, 'm'),
    `${label} must use the pinned Gradle dependency action`);
  requireMatch(errors, step, new RegExp(`^          dependency-graph: ${mode}$`, 'm'),
    `${label} must use dependency-graph: ${mode}`);
  requireMatch(errors, step, /^          dependency-graph-continue-on-failure: false$/m,
    `${label} must fail closed`);
  requireMatch(errors, step, /^          cache-disabled: true$/m,
    `${label} must disable cross-trust Gradle caching`);
  rejectMatch(errors, step, /^        (?:continue-on-error|if|shell):/m,
    `${label} cannot be bypassed by step controls`);
}

export function validateDependencySubmissionContract({ producerContent, publisherContent, ciContent }) {
  const errors = [];
  const producer = normalize(producerContent);
  const publisher = normalize(publisherContent);
  const ci = normalize(ciContent);

  rejectMatch(errors, `${producer}\n${publisher}`, /^\s*pull_request_target:/m,
    'dependency graph workflows must not use pull_request_target');
  requireMatch(errors, producer, /^name: Gradle Dependency Graph Producer$/m,
    'producer workflow name must remain stable for workflow_run binding');
  requireMatch(errors, producer, /^  pull_request:$/m,
    'producer must run for pull requests, including public forks');

  const producerHeader = producer.split(/^jobs:\s*$/m)[0];
  requireMatch(errors, producerHeader, /^permissions:\n  contents: read$/m,
    'producer default token must be contents: read');

  const producerJobs = parseWorkflowJobs(producer);
  const prJob = producerJobs.get('generate-pr-snapshot') ?? '';
  const trustedJob = producerJobs.get('submit-trusted-snapshot') ?? '';
  requireMatch(errors, prJob, /^    if: github\.event_name == 'pull_request'$/m,
    'PR graph job must be bound only to pull_request');
  requireMatch(errors, prJob, /^    permissions:\n      contents: read$/m,
    'untrusted PR graph job must be explicitly read-only');
  rejectMatch(errors, prJob, /contents: write|secrets\./,
    'untrusted PR graph job cannot receive write permission or secrets');

  const prStep = stepByName(prJob, 'Generate read-only PR dependency graph artifact');
  validateActionStep(errors, prStep, 'generate-and-upload', 'PR graph producer');
  requireMatch(errors, prStep,
    /^          GITHUB_DEPENDENCY_GRAPH_JOB_CORRELATOR: egov-gradle-dependency-graph$/m,
    'PR graph producer must share the trusted snapshot correlator');
  requireMatch(errors, prStep,
    /^          DEPENDENCY_GRAPH_RUNTIME_INCLUDE_CONFIGURATIONS: \(compileClasspath\|runtimeClasspath\)$/m,
    'PR graph producer must classify Gradle runtime scopes');
  requireMatch(errors, prStep, /^          artifact-retention-days: 1$/m,
    'PR graph artifact retention must stay bounded to one day');
  requireMatch(errors, prStep, /^          validate-wrappers: true$/m,
    'PR graph producer must validate Gradle wrappers');

  // 이벤트 이름만으로는 부족하다 — workflow_dispatch 가 임의 브랜치를 지정할 수 있어
  // ref 가드가 없으면 그 브랜치의 빌드가 contents:write 로 돈다. 두 조건을 함께 동결한다.
  requireMatch(errors, trustedJob,
    /^    if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'$/m,
    'write-capable graph submission must exclude pull_request and non-main refs');
  requireMatch(errors, trustedJob, /^    permissions:\n      contents: write$/m,
    'trusted main/manual graph job needs only contents: write');
  const trustedStep = stepByName(trustedJob, 'Generate and submit trusted dependency graph');
  validateActionStep(errors, trustedStep, 'generate-and-submit', 'trusted graph submission');
  requireMatch(errors, trustedStep,
    /^          GITHUB_DEPENDENCY_GRAPH_JOB_CORRELATOR: egov-gradle-dependency-graph$/m,
    'trusted graph producer must share the PR snapshot correlator');
  requireMatch(errors, trustedStep,
    /^          DEPENDENCY_GRAPH_RUNTIME_INCLUDE_CONFIGURATIONS: \(compileClasspath\|runtimeClasspath\)$/m,
    'trusted graph producer must classify Gradle runtime scopes');

  requireMatch(errors, publisher, /^  workflow_run:\n    workflows: \["Gradle Dependency Graph Producer"\]\n    types: \[completed\]$/m,
    'publisher must consume only completed producer workflow runs');
  requireMatch(errors, publisher, /^permissions:\n  actions: read\n  contents: write$/m,
    'publisher permissions must be exactly actions: read and contents: write');
  const publisherJob = parseWorkflowJobs(publisher).get('submit-pr-snapshot') ?? '';
  requireMatch(errors, publisherJob,
    /^    if: >-\n      github\.event\.workflow_run\.event == 'pull_request' &&\n      github\.event\.workflow_run\.conclusion == 'success'$/m,
    'publisher must accept only successful pull_request producer runs');
  rejectMatch(errors, publisherJob, /actions\/checkout@|^\s+run:|secrets\./m,
    'write-capable publisher cannot checkout or run untrusted content');
  const publisherUses = [...publisherJob.matchAll(/^\s+uses: ([^\s#]+)(?:\s+#.*)?$/gm)].map(match => match[1]);
  if (publisherUses.length !== 1 || publisherUses[0] !== GRADLE_DEPENDENCY_ACTION) {
    errors.push('publisher must execute only the pinned Gradle download-and-submit action');
  }
  const publisherStep = stepByName(publisherJob, 'Download and submit the triggering PR dependency graph');
  validateActionStep(errors, publisherStep, 'download-and-submit', 'PR graph publisher');

  const secretJob = parseWorkflowJobs(ci).get('secret-scan') ?? '';
  const readinessStep = stepByName(secretJob, 'Require complete dependency snapshots');
  const reviewStep = stepByName(secretJob, 'Block newly introduced high-risk runtime dependencies');
  requireMatch(errors, readinessStep,
    new RegExp(`^        if: ${DEPENDENCY_SCOPE_CONDITION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
    'snapshot readiness step must use the exact dependency review scope condition');
  requireMatch(errors, readinessStep, /^          GITHUB_TOKEN: \$\{\{ github\.token \}\}$/m,
    'snapshot readiness step needs the read-only workflow token');
  requireMatch(errors, readinessStep, /^          BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}$/m,
    'snapshot readiness step must compare the exact PR base SHA');
  requireMatch(errors, readinessStep, /^          HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}$/m,
    'snapshot readiness step must compare the exact PR head SHA');
  requireMatch(errors, readinessStep, /^          SNAPSHOT_WAIT_SECONDS: "600"$/m,
    'snapshot readiness wait must be explicitly bounded');
  requireMatch(errors, readinessStep, /^        run: node scripts\/dependency-snapshot-readiness\.mjs$/m,
    'snapshot readiness step must run the fail-closed verifier exactly');
  rejectMatch(errors, readinessStep, /^        (?:continue-on-error|shell):/m,
    'snapshot readiness step cannot be advisory or use a shell override');
  if (!readinessStep || !reviewStep || secretJob.indexOf(readinessStep) >= secretJob.indexOf(reviewStep)) {
    errors.push('snapshot readiness must complete before dependency review');
  }
  requireMatch(errors, reviewStep, /^          retry-on-snapshot-warnings: true$/m,
    'dependency review must retain snapshot warning retries');
  requireMatch(errors, reviewStep, /^          retry-on-snapshot-warnings-timeout: 60$/m,
    'dependency review must retain a final bounded race retry');

  return errors;
}
