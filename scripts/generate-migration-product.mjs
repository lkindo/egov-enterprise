#!/usr/bin/env node
/** Export the migration CLI development product without online modules, UI or inherited approvals. */
import { randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adoptionScope, containedFile, createPendingAdoptionReview } from './adoption-review.mjs';

export const MIGRATION_PRODUCT_INPUTS = Object.freeze([
  'build.gradle', 'gradle.properties', 'gradle', 'gradlew', 'gradlew.bat', '.gitattributes', '.nvmrc',
  'config/dependency-check/suppressions.xml', 'migration-tool/build.gradle', 'migration-tool/src',
  'config/governance/migration-execution.example.json',
  'scripts/verify.mjs', 'scripts/migration-verification-contract.test.mjs', 'scripts/required-checks-contract.mjs',
  'scripts/adoption-review.mjs', 'scripts/adoption-execute.mjs', 'scripts/adoption-execute.test.mjs',
  'scripts/verify-reusable-artifact.mjs', 'scripts/reusable-layout.mjs', 'scripts/governance-review.mjs', 'scripts/e2e-shard-plan.mjs',
  'scripts/ci-change-scope.mjs', 'scripts/read-regular-file.mjs',
  '.github/workflows/migration-tool.yml',
]);

export function generateMigrationProduct({ sourceRoot, outputRoot } = {}) {
  sourceRoot = realpathSync(sourceRoot);
  const base = resolve(sourceRoot, 'build/migration-product');
  outputRoot = resolve(outputRoot ?? join(base, `source-${randomBytes(8).toString('hex')}`));
  const back = relative(base, outputRoot);
  if (!back || back === '..' || back.startsWith(`..${sep}`) || isAbsolute(back) || existsSync(outputRoot)) {
    throw new Error('export requires a new child directory under build/migration-product');
  }
  // Check each existing ancestor before writing through it (including Windows junctions).
  for (let parent = dirname(outputRoot); ; parent = dirname(parent)) {
    if (existsSync(parent) && realpathSync(parent) !== resolve(parent)) throw new Error('export parent may not be redirected');
    if (parent === sourceRoot) break;
    if (dirname(parent) === parent) throw new Error('export parent escapes the source workspace');
  }
  const copy = path => {
    const source = join(sourceRoot, path);
    const stat = lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error('product inputs cannot contain symlinks');
    if (stat.isDirectory()) { for (const child of readdirSync(source).sort()) copy(`${path}/${child}`); return; }
    const file = containedFile(sourceRoot, path);
    mkdirSync(dirname(join(outputRoot, path)), { recursive: true });
    copyFileSync(file, join(outputRoot, path));
  };
  for (const input of MIGRATION_PRODUCT_INPUTS) copy(input);
  const write = (path, body) => { mkdirSync(dirname(join(outputRoot, path)), { recursive: true }); writeFileSync(join(outputRoot, path), body); };
  write('settings.gradle', "rootProject.name = 'egov-migration-tool'\ninclude 'migration-tool'\n");
  write('package.json', `${JSON.stringify({ name: 'egov-migration-tool', private: true, engines: { node: '>=22.0.0' },
    scripts: { verify: 'node scripts/verify.mjs migration',
      'test:operational-contracts': 'node --test scripts/migration-verification-contract.test.mjs scripts/adoption-execute.test.mjs',
      'review:status': 'node scripts/governance-review.mjs --product migration-tool --mode report',
      'review:adoption': 'node scripts/governance-review.mjs --product migration-tool --mode adoption',
      'adoption:check': 'node scripts/adoption-execute.mjs' } }, null, 2)}\n`);
  write('.githooks/pre-push', '#!/bin/sh\nset -e\nnode --test scripts/adoption-execute.test.mjs\nnode scripts/verify.mjs migration\n');
  write('.gitignore', '.gradle/\n**/build/\nnode_modules/\n.env\n.env.*\nexecution/\n');
  write('config/governance/migration-adoption-review.json', `${JSON.stringify(createPendingAdoptionReview({ product: 'migration-tool', profile: null }), null, 2)}\n`);
  // Reuse the same module CI and contract. The exported product adds its execution-boundary tests.
  const workflowPath = '.github/workflows/migration-tool.yml';
  // [2026-09-22] 줄바꿈을 정규화한 뒤 변형한다. `.gitattributes` 의 `* text=auto` 와 Windows
  //   core.autocrlf=true 가 체크아웃에서 CRLF 로 바꾸므로, 아래 `'on:\n'` 치환이 **조용히 no-op** 이
  //   되어 산출물의 CI 워크플로에 push·pull_request 트리거가 통째로 빠진 채 생성됐다(실측).
  const sourceWorkflow = readFileSync(join(outputRoot, workflowPath), 'utf8').replace(/\r\n/g, '\n');
  const producerCachePolicy = '          cache-read-only: true';
  if (sourceWorkflow.split(producerCachePolicy).length !== 2) {
    throw new Error('producer migration workflow must declare its sole Gradle cache reader');
  }
  // 위 사고가 재발하면 산출물이 아니라 생성이 멈추게 한다 — 캐시 정책 가드와 같은 모양이다.
  const triggerAnchor = 'on:\n';
  if (sourceWorkflow.split(triggerAnchor).length !== 2) {
    throw new Error('producer migration workflow must declare exactly one `on:` trigger block');
  }
  // This exported repository has one verification job and no producer CI writer.
  write(workflowPath, sourceWorkflow.replace(producerCachePolicy, '          cache-read-only: false').replace(
    triggerAnchor, 'on:\n  push:\n    branches: [main, master]\n  pull_request:\n').replace(
    '      - name: Verify the independent migration module',
    '      - name: Verify institution execution boundary\n        run: node --test scripts/adoption-execute.test.mjs\n\n      - name: Verify the independent migration module'));
  const scope = adoptionScope(outputRoot, { product: 'migration-tool', profile: null });
  write('migration-product-lock.json', `${JSON.stringify({ schemaVersion: 1, product: 'migration-tool',
    generatedAt: new Date().toISOString(), sourceScope: scope, technicalValidation: 'not-executed',
    environmentApproval: 'pending', onlineGovernance: 'not-applicable' }, null, 2)}\n`);
  write('README.md', '# eGov migration tool\n\n독립 CLI 소스 산출물이다. 생성 성공은 기술 검증이나 운영 이관 승인이 아니다.\n\n'
    + 'Node 22, JDK 21, Docker가 필요하다. 프론트엔드와 npm 설치는 필요하지 않다.\n\n'
    + '```sh\nnode scripts/verify.mjs migration\nnode --test scripts/adoption-execute.test.mjs\n'
    + 'node scripts/governance-review.mjs --product migration-tool --mode report\n```\n\n'
    + '`discover → plan → validate → load` 절차와 기존 plan·endpoint·driver·schema·freeze 검증이 유지된다. '
    + '직접 `--mapping ... --mode=dry-run|commit` 실행은 거부된다. 접속정보는 환경 변수로 주입한다.\n\n'
    + '기관의 소스/대상·mapping·복구·실행 artifact 증거를 검토한 뒤 `config/governance/migration-adoption-review.json`에 기록한다. '
    + '원본 기관 승인은 복사되지 않는다. `adoption:check -- --execution PATH --environment ID`는 '
    + '기술 검증과 승인 확인만 수행한다. 실제 실행은 명시한 `--execute`가 필요하며 기존 load 안전장치를 그대로 통과해야 한다.\n\n'
    + '`.github/workflows/migration-tool.yml`과 `.githooks/pre-push`는 독립 모듈 검사만 실행한다. '
    + '새 저장소의 required check 설정은 기관에서 이 워크플로에 연결해야 한다.\n');
  if (process.platform !== 'win32') { chmodSync(join(outputRoot, 'gradlew'), 0o755); chmodSync(join(outputRoot, '.githooks/pre-push'), 0o755); }
  return { outputRoot, scope };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2 && !(process.argv.length === 4 && process.argv[2] === '--output')) throw new Error('usage: [--output PATH]');
    const result = generateMigrationProduct({ sourceRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'), outputRoot: process.argv[3] });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
