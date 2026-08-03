#!/usr/bin/env node
/**
 * 🔐 브랜치 보호 실효성 검증 — GitHub 의 **실제 설정**과 ci.yml 을 대조한다.
 *
 * [왜 이 게이트가 필요한가]
 * 12축 감사 로드맵 Wave 0 은 이 항목을 "다른 모든 게이트의 실효 전제" 로 분류했다.
 * required status check 가 없으면 CI 가 빨개도 main 에 들어갈 수 있고, 그러면 이 저장소가 공들여
 * 만든 하네스 20여 종이 전부 '권고' 로 강등된다.
 *
 * [이 스크립트의 이전 판본이 틀렸던 점 — 2026-08-03 재작성]
 * 종전 구현은 `REQUIRED_SHARD_JOBS` 라는 **로컬 하드코딩 배열**을 ci.yml 과만 대조했다.
 * GitHub 의 ruleset 을 **한 번도 조회하지 않았다.** 그래서:
 *   · 누가 ruleset 에서 required check 를 빼도 이 스크립트는 초록이다.
 *   · 애초에 required check 가 하나도 없어도 초록이다. (실측 2026-08-03: 실제로 하나도 없었다.)
 * 이름은 'verify-branch-protection' 인데 브랜치 보호를 검증하지 않았다 —
 * 감사 보고서가 클러스터 B 로 분류한 "선언 범위와 실제 범위의 괴리" 그 자체다.
 *
 * [판정 규칙]
 *   ① main 에 required status checks 가 **존재**하는가
 *   ② required 로 걸린 컨텍스트가 ci.yml 에 **실재하는 잡**인가 (없으면 영구 pending → 머지 영구 차단)
 *   ③ CRITICAL_JOBS 가 전부 required 에 **포함**되는가 (빠지면 그 게이트는 통과 강제력이 없다)
 *   ④ force-push / 브랜치 삭제가 차단되는가
 *
 * [판정 불가는 통과가 아니다]
 * 토큰이 없어 GitHub 을 조회할 수 없으면 **exit 1** 이다. 조용한 skip 은 이 저장소가 반복해서
 * 당한 false-green 패턴이라 허용하지 않는다. 로컬에서 정적 부분만 보려면 `--allow-offline` 을
 * 명시적으로 넘겨야 하고, 그 경우에도 "권위 있는 검증은 수행되지 않았다" 를 출력한다.
 *
 * [사용]
 *   node scripts/verify-branch-protection.mjs              # gh CLI 또는 GH_TOKEN/GITHUB_TOKEN 필요
 *   node scripts/verify-branch-protection.mjs --allow-offline
 *
 * 필요 권한: ruleset 조회는 저장소 **관리(admin) 읽기** 권한이 필요하다. Actions 의 기본
 * GITHUB_TOKEN 에는 그 권한이 없으므로, CI 에서 돌리려면 별도 PAT 을 시크릿으로 넣어야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ciYmlPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const allowOffline = process.argv.includes('--allow-offline');

/**
 * required status check 로 반드시 걸려 있어야 하는 ci.yml 잡.
 * 이 목록을 줄이는 것은 강제력을 줄이는 것이다 — 줄이려면 사유를 커밋 메시지에 남길 것(§0.7-H2).
 *
 * [2026-08-03 · e2e-tests 제외 — 사용자 결정]
 * 브랜치 보호를 처음 활성화하면서 required 를 이 3종으로 확정했다. e2e-tests 를 뺀 이유는
 * **안정성이 미검증이기 때문**이다 — frontend-build 가 lint 1건으로 죽어 있던 동안 e2e 는
 * 계속 skip 됐고, 2026-08-03 커밋 74eacd539 가 그 lint 를 고친 뒤에야 처음으로 실행됐다.
 * 실행 이력이 사실상 없는 잡을 required 로 걸면 플레이키 1건이 병합을 상시 차단하고,
 * 그 마찰은 곧 "우회"를 정당화한다(오탐 지배 게이트가 SKIP_HARNESS 사용을 정당화한 전례).
 *
 * ⚠ 이것은 **한시적 제외**다. 아래 재편입 조건을 만족하면 다시 넣는다:
 *   · main 기준 e2e-tests 3샤드가 연속 5회 그린(재실행 없이)
 *   · 그때 이 배열에 'e2e-tests' 를 되돌리고 ruleset 의 required 목록도 함께 갱신
 * 조건을 적어 두는 이유는, 사유 없는 제외와 조건부 제외를 다음 사람이 구분할 수 있게 하기 위해서다.
 * 제외 사실 자체는 아래 warn 으로 매 실행 출력된다 — 조용히 빠져 있지 않다.
 */
const CRITICAL_JOBS = ['secret-scan', 'backend-build', 'frontend-build'];

/**
 * 한시적으로 required 에서 제외한 잡. 판정은 하지 않되 **매 실행 가시화**한다.
 * 비어 있는 것이 정상 상태이며, 항목이 있다는 것은 강제력에 구멍이 있다는 뜻이다.
 */
const TEMPORARILY_EXCLUDED_JOBS = [
  { job: 'e2e-tests', since: '2026-08-03', reason: '실행 이력 부재로 안정성 미검증 — 연속 5회 그린 시 재편입' },
];

const fail = [];
const warn = [];

// ── 1) ci.yml 의 실제 잡 이름 -----------------------------------------------------------
if (!fs.existsSync(ciYmlPath)) {
  console.error(`❌ ci.yml 을 찾을 수 없습니다: ${ciYmlPath}`);
  process.exit(1);
}
const ciContent = fs.readFileSync(ciYmlPath, 'utf8');
const jobsMatch = ciContent.match(/^jobs:\s*$/m);
if (!jobsMatch) {
  console.error('❌ ci.yml 에서 jobs: 섹션을 찾을 수 없습니다 — 파서 파손이므로 통과시키지 않습니다.');
  process.exit(1);
}
const definedJobs = new Set();
for (const line of ciContent.slice(jobsMatch.index).split('\n')) {
  const m = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
  if (m) definedJobs.add(m[1]);
}
// vacuity 방지: 잡 파싱이 조용히 붕괴하면 아래 비교가 전부 무의미해진다.
if (definedJobs.size < 3) {
  console.error(`❌ ci.yml 잡 파싱 결과가 ${definedJobs.size}개로 하한(3) 미만입니다 — 들여쓰기/구조 변경 의심.`);
  process.exit(1);
}
console.log(`📋 ci.yml 정의 잡 (${definedJobs.size}): ${[...definedJobs].join(', ')}`);

for (const job of CRITICAL_JOBS) {
  if (!definedJobs.has(job)) {
    fail.push(`ci.yml 에 필수 잡 '${job}' 이 정의되어 있지 않습니다 — required 로 걸어도 영원히 pending 이 됩니다.`);
  }
}

// 한시 제외 항목은 판정하지 않되 **매 실행 노출**한다. 제외가 조용해지는 순간
// 다음 사람은 "이 잡도 강제되고 있다"고 오해한다(선언 범위 ≠ 실제 범위).
for (const { job, since, reason } of TEMPORARILY_EXCLUDED_JOBS) {
  if (!definedJobs.has(job)) continue; // ci.yml 에서 사라졌으면 제외 항목도 무의미
  warn.push(`'${job}' 은 required 에서 **한시 제외** 중입니다 (${since}) — ${reason}`);
}

// ── 2) GitHub 실제 설정 조회 -------------------------------------------------------------
function gh(endpoint) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const args = ['api', endpoint, '-H', 'Accept: application/vnd.github+json'];
  const env = { ...process.env };
  if (token) env.GH_TOKEN = token;
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }));
}

function resolveSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) throw new Error(`origin 리모트에서 owner/repo 를 해석할 수 없습니다: ${url}`);
  return `${m[1]}/${m[2]}`;
}

let requiredContexts = null; // null = 조회 실패, [] = 조회했으나 없음
let protections = { deletion: false, nonFastForward: false, pullRequest: false };

try {
  const slug = resolveSlug();
  console.log(`🔍 ${slug} 의 브랜치 보호 설정을 조회합니다...`);

  const defaultBranch = gh(`repos/${slug}`).default_branch;
  // ruleset 과 classic protection 두 경로를 모두 본다 — 한쪽만 보면 다른 쪽으로 우회된다.
  const contexts = new Set();

  for (const summary of gh(`repos/${slug}/rulesets?includes_parents=true`)) {
    if (summary.enforcement !== 'active') continue;
    const rs = gh(`repos/${slug}/rulesets/${summary.id}`);
    const include = rs.conditions?.ref_name?.include ?? [];
    const appliesToDefault = include.includes('~ALL') || include.includes('~DEFAULT_BRANCH')
      || include.includes(`refs/heads/${defaultBranch}`);
    if (!appliesToDefault) continue;
    for (const rule of rs.rules ?? []) {
      if (rule.type === 'required_status_checks') {
        for (const c of rule.parameters?.required_status_checks ?? []) contexts.add(c.context);
      }
      if (rule.type === 'deletion') protections.deletion = true;
      if (rule.type === 'non_fast_forward') protections.nonFastForward = true;
      if (rule.type === 'pull_request') protections.pullRequest = true;
    }
  }

  try {
    const classic = gh(`repos/${slug}/branches/${defaultBranch}/protection`);
    for (const c of classic.required_status_checks?.contexts ?? []) contexts.add(c);
    if (classic.allow_force_pushes?.enabled === false) protections.nonFastForward = true;
    if (classic.allow_deletions?.enabled === false) protections.deletion = true;
    if (classic.required_pull_request_reviews) protections.pullRequest = true;
  } catch {
    // classic 미설정은 정상(ruleset 만 쓸 수 있다). ruleset 조회가 성공했다면 판정은 성립한다.
  }

  requiredContexts = [...contexts];
} catch (e) {
  const msg = String(e.stderr || e.message || e).split('\n')[0];
  if (allowOffline) {
    warn.push(`GitHub 조회 실패(--allow-offline): ${msg}`);
  } else {
    console.error('❌ GitHub 브랜치 보호 설정을 조회하지 못했습니다.');
    console.error(`   원인: ${msg}`);
    console.error('   ruleset 조회에는 저장소 admin 읽기 권한이 필요합니다(Actions 기본 GITHUB_TOKEN 으로는 불가).');
    console.error('   로컬에서는 `gh auth login`, CI 에서는 PAT 을 GH_TOKEN 시크릿으로 주입하십시오.');
    console.error('   ⚠ 판정 불가를 통과로 넘기지 않습니다 — 그것이 이 저장소가 반복해서 당한 false-green 입니다.');
    process.exit(1);
  }
}

// ── 3) 대조 ------------------------------------------------------------------------------
if (requiredContexts !== null) {
  console.log(`🔒 required status checks (${requiredContexts.length}): ${requiredContexts.join(', ') || '(없음)'}`);

  if (requiredContexts.length === 0) {
    fail.push(
      '기본 브랜치에 required status checks 가 **하나도** 설정되어 있지 않습니다. ' +
      'CI 가 빨개도 머지·푸시가 가능하며, 이 저장소의 하네스 게이트 전체가 강제력 없는 권고로 강등됩니다.'
    );
  }
  for (const ctx of requiredContexts) {
    if (!definedJobs.has(ctx)) {
      fail.push(`required check '${ctx}' 에 대응하는 잡이 ci.yml 에 없습니다 — 영원히 pending 이라 머지가 영구 차단됩니다.`);
    }
  }
  for (const job of CRITICAL_JOBS) {
    if (definedJobs.has(job) && !requiredContexts.includes(job)) {
      fail.push(`ci.yml 의 '${job}' 이 required status check 에 포함되어 있지 않습니다 — 실패해도 머지를 막지 못합니다.`);
    }
  }
  if (!protections.nonFastForward) fail.push('force-push(non_fast_forward) 차단이 없습니다 — 이력 위조·게이트 우회가 가능합니다.');
  if (!protections.deletion) fail.push('브랜치 삭제 차단이 없습니다.');
  if (!protections.pullRequest) warn.push('PR 리뷰 요구가 없습니다 — 단독 운영이면 의도된 선택일 수 있으나, required check 는 직접 push 에도 적용되지 않는 점을 인지하십시오.');
}

// ── 4) 보고 -----------------------------------------------------------------------------
for (const w of warn) console.warn(`⚠️  ${w}`);

if (fail.length > 0) {
  console.error('\n========================================================================');
  console.error('🔐 [BRANCH PROTECTION] 브랜치 보호가 실효를 갖지 못하는 상태입니다.');
  console.error('========================================================================');
  fail.forEach(f => console.error(`❌ ${f}`));
  console.error('\n💡 설정 예시 (owner/repo 는 실제 값으로):');
  console.error('   gh api -X POST repos/OWNER/REPO/rulesets --input ruleset.json');
  console.error('   — required_status_checks 규칙에 ' + CRITICAL_JOBS.join(', ') + ' 를 넣고 enforcement: active 로 둘 것.');
  process.exit(1);
}

if (requiredContexts === null) {
  console.warn('\n⚠️  정적 검사만 수행했습니다 — GitHub 의 실제 설정은 검증되지 않았습니다(--allow-offline).');
  console.warn('   이 실행 결과를 "브랜치 보호가 정상" 의 증거로 사용하지 마십시오.');
  process.exit(0);
}

console.log('\n✅ 브랜치 보호 실효성 확인 — required status checks 가 ci.yml 잡과 정합하고 force-push·삭제가 차단됩니다.');
process.exit(0);
