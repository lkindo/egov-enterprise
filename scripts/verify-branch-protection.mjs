#!/usr/bin/env node
/**
 * 🔐 브랜치 보호 실효성 검증 — 저장소 명세, CI 워크플로, GitHub 실제 설정을 함께 대조한다.
 *
 * required check 이름은 `.github/required-checks.json` 한 곳에서만 정의한다. 매트릭스 잡은
 * workflow job ID(`e2e-tests`)와 실제 check context(`e2e-tests (1/3)`)가 다르므로 명세가
 * 둘을 명시적으로 연결한다. GitHub 설정은 명세와 집합이 정확히 같아야 한다.
 *
 * 판정 불가를 통과로 처리하지 않는다. 로컬 정적 검사만 필요할 때에만 `--allow-offline`을
 * 명시하며, 그 결과는 브랜치 보호의 권위 있는 증거로 사용할 수 없다.
 *
 * 사용:
 *   node scripts/verify-branch-protection.mjs
 *   node scripts/verify-branch-protection.mjs --allow-offline
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  compareRequiredChecks,
  validateStaticContract,
} from './required-checks-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, '.github', 'required-checks.json');
const ciYmlPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const allowOffline = process.argv.includes('--allow-offline');
const failures = [];
const warnings = [];

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ ${label}을 읽지 못했습니다: ${filePath}`);
    console.error(`   원인: ${error.message}`);
    process.exit(1);
  }
}

if (!fs.existsSync(ciYmlPath)) {
  console.error(`❌ ci.yml을 찾을 수 없습니다: ${ciYmlPath}`);
  process.exit(1);
}

const manifest = readJson(manifestPath, 'required check 명세');
const ciContent = fs.readFileSync(ciYmlPath, 'utf8');
const staticErrors = validateStaticContract({ manifest, ciContent });
if (staticErrors.length > 0) {
  console.error('❌ required check 명세와 ci.yml이 정합하지 않습니다.');
  staticErrors.forEach(error => console.error(`   - ${error}`));
  process.exit(1);
}

const expectedContexts = manifest.requiredChecks.map(({ context }) => context);
console.log(`📋 required check 명세 (${expectedContexts.length}): ${expectedContexts.join(', ')}`);

function gh(endpoint) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const args = ['api', endpoint, '-H', 'Accept: application/vnd.github+json'];
  const env = { ...process.env };
  if (token) env.GH_TOKEN = token;
  return JSON.parse(execFileSync('gh', args, {
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

function ghOptional404(endpoint) {
  try {
    return gh(endpoint);
  } catch (error) {
    const stderr = String(error.stderr || '');
    if (/\(HTTP 404\)/.test(stderr)) return null;
    throw error;
  }
}

function resolveSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) throw new Error(`origin 리모트에서 owner/repo를 해석할 수 없습니다: ${url}`);
  return `${match[1]}/${match[2]}`;
}

let requiredChecks = null;
const protections = {
  deletion: false,
  nonFastForward: false,
  pullRequest: false,
  strictStatusChecks: false,
};

try {
  const slug = resolveSlug();
  console.log(`🔍 ${slug}의 '${manifest.branch}' 브랜치 보호 설정을 조회합니다...`);
  const defaultBranch = gh(`repos/${slug}`).default_branch;
  if (defaultBranch !== manifest.branch) {
    failures.push(`repository default branch '${defaultBranch}' does not match protected branch SSOT '${manifest.branch}'`);
  }
  const protectedBranch = manifest.branch;
  const checks = [];
  const effectiveRules = gh(`repos/${slug}/rules/branches/${encodeURIComponent(protectedBranch)}`);
  const sourceRulesetIds = new Set();

  for (const rule of effectiveRules) {
    if (rule.ruleset_id) sourceRulesetIds.add(rule.ruleset_id);
    if (rule.type === 'required_status_checks') {
      for (const check of rule.parameters?.required_status_checks ?? []) {
        checks.push({
          context: check.context,
          integrationId: check.integration_id ?? null,
        });
      }
      if (rule.parameters?.strict_required_status_checks_policy === true) {
        protections.strictStatusChecks = true;
      }
    }
    if (rule.type === 'deletion') protections.deletion = true;
    if (rule.type === 'non_fast_forward') protections.nonFastForward = true;
    if (rule.type === 'pull_request') protections.pullRequest = true;
  }

  for (const rulesetId of sourceRulesetIds) {
    const ruleset = gh(`repos/${slug}/rulesets/${rulesetId}`);
    if (ruleset.target !== 'branch' || ruleset.enforcement !== 'active') {
      failures.push(`effective rule source ${rulesetId} is not an active branch ruleset`);
    }
    if (!Array.isArray(ruleset.bypass_actors)) {
      failures.push(`ruleset ${rulesetId} bypass actors are not visible — write permission is required to prove no bypass`);
    } else if (ruleset.bypass_actors.length > 0) {
      failures.push(`ruleset ${rulesetId} has ${ruleset.bypass_actors.length} bypass actor(s)`);
    }
  }

  const classic = ghOptional404(`repos/${slug}/branches/${encodeURIComponent(protectedBranch)}/protection`);
  if (classic) {
    const classicChecks = classic.required_status_checks?.checks ?? [];
    if (classicChecks.length > 0) {
      for (const check of classicChecks) {
        checks.push({
          context: check.context,
          integrationId: check.app_id > 0 ? check.app_id : null,
        });
      }
    } else {
      for (const context of classic.required_status_checks?.contexts ?? []) {
        checks.push({ context, integrationId: null });
      }
    }
    if (classic.required_status_checks?.strict === true) protections.strictStatusChecks = true;
    if (classic.allow_force_pushes?.enabled === false) protections.nonFastForward = true;
    if (classic.allow_deletions?.enabled === false) protections.deletion = true;
    if (classic.required_pull_request_reviews) protections.pullRequest = true;
  }

  requiredChecks = checks;
} catch (error) {
  const message = String(error.stderr || error.message || error).split('\n')[0];
  if (allowOffline) {
    warnings.push(`GitHub 조회 실패(--allow-offline): ${message}`);
  } else {
    console.error('❌ GitHub 브랜치 보호 설정을 조회하지 못했습니다.');
    console.error(`   원인: ${message}`);
    console.error('   ruleset 조회에는 저장소 admin 읽기 권한이 필요합니다.');
    console.error('   로컬에서는 `gh auth login`, CI에서는 PAT을 GH_TOKEN으로 주입하십시오.');
    console.error('   판정 불가를 통과로 넘기지 않습니다. 정적 검사만 하려면 --allow-offline을 명시하십시오.');
    process.exit(1);
  }
}

if (requiredChecks !== null) {
  const display = requiredChecks.map(check => `${check.context}@${check.integrationId ?? 'any'}`);
  console.log(`🔒 GitHub required checks (${requiredChecks.length}): ${display.join(', ') || '(없음)'}`);
  failures.push(...compareRequiredChecks(expectedContexts, requiredChecks, manifest.integrationId));
  if (!protections.strictStatusChecks) {
    failures.push('required status checks가 strict 모드가 아닙니다 — 최신 main 검증 없이 병합될 수 있습니다.');
  }
  if (!protections.nonFastForward) {
    failures.push('force-push(non_fast_forward) 차단이 없습니다.');
  }
  if (!protections.deletion) failures.push('기본 브랜치 삭제 차단이 없습니다.');
  if (!protections.pullRequest) failures.push('PR 경유 규칙이 없습니다.');
}

for (const warning of warnings) console.warn(`⚠️  ${warning}`);

if (failures.length > 0) {
  console.error('\n========================================================================');
  console.error('🔐 [BRANCH PROTECTION] 저장소 명세와 실제 보호 설정이 다릅니다.');
  console.error('========================================================================');
  failures.forEach(failure => console.error(`❌ ${failure}`));
  console.error(`\n💡 required check 원본: ${path.relative(repoRoot, manifestPath)}`);
  process.exit(1);
}

if (requiredChecks === null) {
  console.warn('\n⚠️  정적 검사만 통과했습니다. GitHub 실제 설정은 검증되지 않았습니다(--allow-offline).');
  console.warn('   이 결과를 "브랜치 보호 정상"의 증거로 사용하지 마십시오.');
  process.exit(0);
}

console.log('\n✅ required check 명세·CI 매핑·GitHub ruleset과 force-push/삭제/PR 보호가 모두 정합합니다.');
