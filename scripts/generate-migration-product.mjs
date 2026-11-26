#!/usr/bin/env node
/** Export the migration CLI development product without online modules, UI or inherited approvals. */
import { randomBytes } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adoptionScope, containedFile, createPendingAdoptionReview } from './adoption-review.mjs';
import { MIGRATION_DURATION_PROFILE_PATH, migrationProvenanceDigest, verifySourceMigrationProfileProvenance } from './migration-profile-provenance.mjs';
import { MIGRATION_CATALOG, readValidatedProjectedColumnCatalog } from './reusable-migration-catalog.mjs';
import { projectGeneratedDocs } from './reusable-source-docs.mjs';

export const MIGRATION_PRODUCT_INPUTS = Object.freeze([
  'build.gradle', 'gradle.properties', 'gradle', 'gradlew', 'gradlew.bat', '.gitattributes', '.nvmrc',
  'config/dependency-check/suppressions.xml', 'migration-tool/build.gradle', 'migration-tool/src',
  'config/governance/migration-execution.example.json', 'db_columns.json',
  // Actual inputs of the packaged workspace integration drill; UI/server/AI remain separate products.
  'tools/migration-workspace/engine.mjs', 'tools/migration-workspace/store.mjs', 'tools/migration-workspace/inputs.mjs',
  'config/migration-test-duration-profile.json', 'scripts/migration-test-shard.mjs', 'scripts/migration-profile-provenance.mjs',
  'scripts/verify.mjs', 'scripts/verification-record.mjs', 'scripts/heavy-run-queue.mjs', 'scripts/heavy-run-pipes.mjs',
  'scripts/migration-verification-contract.test.mjs', 'scripts/required-checks-contract.mjs',
  'scripts/adoption-review.mjs', 'scripts/adoption-execute.mjs', 'scripts/adoption-execute.test.mjs',
  'scripts/adoption-execute-fixtures.mjs',
  'scripts/release-images.mjs',
  'scripts/verify-reusable-artifact.mjs', 'scripts/reusable-layout.mjs', 'scripts/governance-review.mjs', 'scripts/e2e-shard-plan.mjs',
  'scripts/ci-change-scope.mjs', 'scripts/vendor-evidence-inputs.mjs', 'scripts/read-regular-file.mjs', 'scripts/composition-profiles.mjs',
  '.github/workflows/migration-tool.yml',
]);

/**
 * 독립 이관 제품에 함께 싣는 문서(DEC-OPS-428). 생성 애플리케이션 프로젝트는 이관 도구를 싣지 않으므로(ADR-0062) 도구의 계약·복구 절차·
 * 방법론은 이 제품으로만 나간다. 생성 프로젝트에서 뺀 이관 문서(이관 제거 원장)는 여기 있어야 한다 — 계약이 대조한다.
 * 기관 도입 검토 가이드와 ADR-0018 은 생성 프로젝트에도 남지만, 이 제품의 승인 원장·실행 descriptor 절차라 함께 싣는다.
 */
export const MIGRATION_PRODUCT_DOCS = Object.freeze([
  'docs/02-architecture/legacy-migration-tool-design.md',
  'docs/03-guides/legacy-non-data-migration-guide.md',
  'docs/03-guides/governance-review-lifecycle.md',
  'docs/04-operations/migration-recovery-runbook.md',
  'docs/archived/legacy-standardization-migration-design.md',
  'docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md',
  'docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md',
  'docs/02-architecture/decisions/ADR-0029-legacy-standardization-migration.md',
  'docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md',
]);

export function generateMigrationProduct({ sourceRoot, outputRoot, dbBundle } = {}) {
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
  const projectedCatalog = dbBundle
    ? readValidatedProjectedColumnCatalog({ sourceRoot, dbBundle: resolve(sourceRoot, dbBundle) })
    : null;
  // Fail before creating any output. The adopter's new Git history cannot prove
  // ancestry in this producer, so establish that boundary here and bind the bytes.
  const profileText = readFileSync(containedFile(sourceRoot, MIGRATION_DURATION_PROFILE_PATH), 'utf8');
  const durationProfileProvenance = verifySourceMigrationProfileProvenance(JSON.parse(profileText), sourceRoot);
  const contractPath = 'scripts/migration-verification-contract.test.mjs';
  const sourceContract = readFileSync(containedFile(sourceRoot, contractPath), 'utf8').replace(/\r\n/g, '\n');
  const provenanceImport = "import { verifySourceMigrationProfileProvenance } from './migration-profile-provenance.mjs';";
  const provenanceCall = '  verifySourceMigrationProfileProvenance(profile, provenanceRoot);';
  for (const anchor of [provenanceImport, provenanceCall]) {
    if (sourceContract.split(anchor).length !== 2) throw new Error('migration product provenance seam must occur exactly once');
  }
  const generatedContract = sourceContract.replace(provenanceImport,
    "import { verifyExportedMigrationProfileProvenance } from './migration-profile-provenance.mjs';").replace(provenanceCall,
    `  verifyExportedMigrationProfileProvenance(profile, provenanceRoot, '${migrationProvenanceDigest(durationProfileProvenance)}');`);
  const copy = path => {
    const source = join(sourceRoot, path);
    const stat = lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error('product inputs cannot contain symlinks');
    if (stat.isDirectory()) { for (const child of readdirSync(source).sort()) copy(`${path}/${child}`); return; }
    const file = containedFile(sourceRoot, path);
    mkdirSync(dirname(join(outputRoot, path)), { recursive: true });
    // Keep the verified profile snapshot if another operator changes the source
    // while the rest of the product is being copied.
    if (path === MIGRATION_DURATION_PROFILE_PATH) writeFileSync(join(outputRoot, path), profileText);
    else copyFileSync(file, join(outputRoot, path));
  };
  for (const input of MIGRATION_PRODUCT_INPUTS) copy(input);
  for (const doc of MIGRATION_PRODUCT_DOCS) copy(doc);
  const write = (path, body) => { mkdirSync(dirname(join(outputRoot, path)), { recursive: true }); writeFileSync(join(outputRoot, path), body); };
  if (projectedCatalog) write(MIGRATION_CATALOG, projectedCatalog.text);
  write(contractPath, generatedContract);
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
    environmentApproval: 'pending', onlineGovernance: 'not-applicable', durationProfileProvenance,
    ...(projectedCatalog ? { targetCatalog: { tables: projectedCatalog.tables, source: 'db-bundle' } } : {}) }, null, 2)}\n`);
  write('README.md', '# eGov migration tool\n\n독립 CLI 소스 산출물이다. 생성 성공은 기술 검증이나 운영 이관 승인이 아니다.\n\n'
    + 'Node 22, JDK 21, Docker가 필요하다. 프론트엔드와 npm 설치는 필요하지 않다.\n\n'
    + '```sh\nnode scripts/verify.mjs migration\nnode --test scripts/adoption-execute.test.mjs\n'
    + 'node scripts/governance-review.mjs --product migration-tool --mode report\n```\n\n'
    + '`discover → plan → validate → load` 절차와 기존 plan·endpoint·driver·schema·freeze 검증이 유지된다. '
    + '타깃 표준 카탈로그(`db_columns.json`)는 기본으로 원본 전체 스키마를 싣고, 생성 앱 대상 이관 시에는 원본 저장소의 '
    + '`npm run migration:export -- --db-bundle <DB번들경로>` 로 포함하거나 '
    + '`java -Dmigration.db-columns-path=<외부경로/db_columns.json> -jar <JAR> --command=plan ...` 형태로 외부 투영본을 전달한다. '
    + '직접 `--mapping ... --mode=dry-run|commit` 실행은 거부된다. 접속정보는 환경 변수로 주입한다.\n\n'
    + '기관의 소스/대상·mapping·복구·실행 artifact 증거를 검토한 뒤 `config/governance/migration-adoption-review.json`에 기록한다. '
    + '원본 기관 승인은 복사되지 않는다. `adoption:check -- --execution PATH --environment ID`는 '
    + '기술 검증과 승인 확인만 수행한다. 실제 실행은 명시한 `--execute`가 필요하며 기존 load 안전장치를 그대로 통과해야 한다.\n\n'
    + '`.github/workflows/migration-tool.yml`과 `.githooks/pre-push`는 독립 모듈 검사만 실행한다. '
    + '새 저장소의 required check 설정은 기관에서 이 워크플로에 연결해야 한다.\n\n'
    + '검증 시간 프로필의 출처 커밋 존재·조상 관계는 export 전에 원본 저장소에서 검사한다. '
    + '독립 제품의 계약은 생성 시 고정된 검증 기록과 profile·lock의 무결성을 대조한다. '
    + '이 기록은 외부 발행자 서명이나 새 저장소에서 원본 Git 조상 관계를 독립 증명한 결과가 아니다. '
    + '기관이 프로필을 갱신하면 새 측정 근거와 검증 기록·계약의 결속도 함께 검토해야 한다.\n'
    + '\n## 문서\n\n'
    + '- [이관 도구 설계](docs/02-architecture/legacy-migration-tool-design.md) — 명령·계약·검증 경계\n'
    + '- [승인형 이관과 부분 적재 복구](docs/04-operations/migration-recovery-runbook.md) — 실패·재개·대사·전체 복구 절차\n'
    + '- [비데이터 객체 이관 가이드](docs/03-guides/legacy-non-data-migration-guide.md) — 도구가 옮기지 않는 권한·메뉴·첨부 실물 등\n'
    + '- [기관 도입 검토와 실행 승인](docs/03-guides/governance-review-lifecycle.md#4-독립-migration-tool-도입) — 승인 원장의 네 통제와 실행 descriptor(§4, 승인 필드의 계약은 §3). '
    + '이 제품의 명령은 `npm run verify`·`npm run review:status`·`npm run review:adoption`·`npm run adoption:check` 다\n'
    + '- [표준화 이관의 채택 전 진단과 방법론](docs/archived/legacy-standardization-migration-design.md)\n'
    + '- 결정: [ADR-0008](docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md) · '
    + '[ADR-0018](docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md) · '
    + '[ADR-0029](docs/02-architecture/decisions/ADR-0029-legacy-standardization-migration.md) · '
    + '[ADR-0031](docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md)\n\n'
    + '이 제품에 싣지 않는 절차와 기록:\n\n'
    + '- 전체 복구(이관 전 DB·첨부·키 백업 세트의 복원과 검증)는 대상 온라인 애플리케이션 저장소의 '
    + '`docs/04-operations/backup-and-restore-runbook.md`(번들 PostgreSQL·첨부 볼륨 전용)를 따른다. '
    + '관리형·외부 DB 이면 DB 는 기관이 승인한 DB 공급자 절차로, 첨부는 그 저장소의 절차로, 암호화 키는 백업 시점의 key-id/version 에 대응하는 기관 비밀 관리 절차로 각각 복구하고, 셋이 같은 백업 시점의 세트인지(DB 가 가리키는 첨부가 있고 그 키로 암호문이 풀리는지) 확인한 뒤에만 전환한다. '
    + '복구 런북은 복원할 세트와 전환 조건만 정한다.\n'
    + '- 원천 DB 벤더별 구현 상태와 load 경계는 이관 도구 설계의 「Source adapter와 discovery 범위」 표에, 벤더별 실측 요지는 복구 런북의 「전체 롤백과 cutover」에 있다(CUBRID 는 설계 표에만 있다). '
    + '실측 기록 원문과 남은 범위(원본의 GAP-MIG-001)는 원본 저장소의 `docs/04-operations/readiness-followups.md`·`.agent/memory/known-gaps.md` 에 있고, '
    + '이 제품을 내보낼 당시 원본 저장소의 HEAD 는 `migration-product-lock.json` 의 `durationProfileProvenance.producerCommit` 이다'
    + '(내보낼 때 커밋하지 않은 수정이 있었다면 그 SHA 로 재현되지 않는다).\n\n'
    + '원본 저장소에만 있는 문서·결정 기록·소스를 가리키던 링크는 글자만 남겼다. 수치와 실측은 원본 저장소 환경의 것이다.\n');
  // 제품에 없는 대상을 가리키는 문서 링크를 글자로 남기고, 끊긴 링크가 남으면 내보내기를 멈춘다(DEC-OPS-428).
  projectGeneratedDocs(outputRoot);
  if (process.platform !== 'win32') { chmodSync(join(outputRoot, 'gradlew'), 0o755); chmodSync(join(outputRoot, '.githooks/pre-push'), 0o755); }
  return { outputRoot, scope };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    const parsed = {};
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index];
      const value = argv[index + 1];
      if (!['--output', '--db-bundle'].includes(flag) || !value || value.startsWith('--') || Object.hasOwn(parsed, flag)) {
        throw new Error('usage: [--output PATH] [--db-bundle PATH]');
      }
      parsed[flag] = value;
    }
    const result = generateMigrationProduct({
      sourceRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
      outputRoot: parsed['--output'],
      dbBundle: parsed['--db-bundle'],
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
