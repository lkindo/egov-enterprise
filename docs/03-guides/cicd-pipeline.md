# CI/CD 파이프라인 가이드

본 프로젝트는 GitHub Actions 를 사용하여 자동화된 CI/CD 파이프라인을 운영합니다.

> 이 문서는 주로 품질 CI 흐름을 설명하는 파생 가이드다. 워크플로우 단계와 트리거의 정본은 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), 릴리스 발행은 [`.github/workflows/release.yml`](../../.github/workflows/release.yml), required context는 [`.github/required-checks.json`](../../.github/required-checks.json), 로컬 훅은 [`.githooks/README.md`](../../.githooks/README.md)가 소유한다. 과거 실행 통계로 현재 상태를 추정하지 않고 대상 커밋의 required checks를 직접 확인한다.

---

## 📋 목차

1. [워크플로우 개요](#워크플로우-개요)
2. [백엔드 빌드](#백엔드-빌드)
3. [프론트엔드 빌드](#프론트엔드-빌드)
4. [E2E 테스트](#e2e-테스트)
5. [보안 스캔](#보안-스캔)
6. [캐싱 전략](#캐싱-전략)
7. [로컬 테스트](#로컬-테스트)
8. [릴리스 프런트엔드 런타임 인계](#릴리스-프런트엔드-런타임-인계)
9. [시큐어코딩 정적 분석 (SAST)](#시큐어코딩-정적-분석-sast)

---

## 워크플로우 개요

### 구조

```
push/PR / workflow_dispatch
    │
    └─ change-scope (PR·main/master push: 같은 영향 분류 / 비교 불가·수동: 전수)
        ├─ sast-scope (Java·JavaScript/TypeScript CodeQL security-extended, 한 runner 슬롯에서 순차 실행)
        │   └─ secure-coding (High/Critical 차단, 언어별 결과 집계)
        ├─ secret-scan (frontend-scope 완료 뒤 운영 계약·snapshot readiness·PR runtime 의존성 review·비밀 스캔)
        ├─ backend-scope (backend=true: 온라인 4모듈 빌드·테스트·커버리지·OpenAPI 신선도)
        ├─ backend-schema-scope (schema=true: backend와 병렬 PostgreSQL schema-validation)
        ├─ migration-test-scope (migration=true: 123개 이관 테스트 클래스를 3개 matrix로 정확히 분배)
        │   └─ migration-scope (세 결과 집계·JaCoCo 병합·bootJar·85/70 커버리지)
        ├─ reusable-base (frontend-scope 완료 뒤 영향받는 core·collaboration·demo profile×layout 동시 생성·기술 검증)
        ├─ reusable-custom (core 영향 시 custom composition 두 layout을 profile과 병렬 검증)
        ├─ backend-build (온라인·스키마·이관·재사용 profile·custom 결과를 집계)
        ├─ frontend-scope (codegen·typecheck·lint·audit·Next build·bundle budget)
        ├─ frontend-coverage-scope (frontend-scope와 병렬로 전체 Vitest coverage)
        ├─ frontend-build (두 frontend source를 각각 집계하는 안정 required context)
        ├─ mutation-scope (mutation=true, 상류 빌드 대기 없이 제품 PIT 10개 배치·최대 5개 동시 실행)
        ├─ mutation-scope-migration (mutation-migration-tool=true, 상류 빌드 대기 없이 이관 PIT 4개를 한 슬롯에서 실행)
        │   └─ mutation-test (두 소스를 각각 fail-closed로 집계하는 안정 required aggregate)
        └─ e2e-tests (e2e=true, 상류 빌드 대기 없이 내부 2 shard)
            ├─ 전체 API·브라우저 모집단 분배 + 실행 목록/결과 대조
            ├─ e2e-merge-reports (비필수 리포트 병합)
            └─ e2e-test (항상 완료되는 안정 required aggregate)
```

Gradle PR 의존성 그래프는 write token으로 PR 코드를 실행하지 않도록 다음 신뢰 경계로 분리한다.

```
dependency-submission.yml (pull_request, contents:read)
    └─ Gradle graph 생성·artifact upload
        └─ dependency-submission-publish.yml (workflow_run, actions:read + contents:write)
            └─ checkout/run 없이 공식 Gradle action으로 artifact 제출
                └─ secret-scan: base/head snapshot을 최대 600초 확인
                    └─ runtime High 이상 신규 의존성 review
```

`workflow_run` publisher는 해당 workflow 파일이 기본 브랜치에 존재한 뒤부터 활성화된다. 따라서 정적 계약 검증만으로 public fork 경로의 운영 집행을 완료로 보지 않으며, 기본 브랜치 반영 후 고위험 runtime 의존성 probe PR로 artifact 제출·readiness·차단을 확인한다. `push`와 `workflow_dispatch`에서는 producer workflow의 trusted job이 그래프를 직접 제출한다.

> **CI와 로컬 피드백의 경계**: pre-commit/pre-push는 빠른 범위별 피드백이며 일부 계약 검사를 선행할 수 있지만 우회 가능하다. required CI 6개가 병합 권위를 소유하며 현재 커밋의 실제 check 상태로 판정한다. `backend-build`·`frontend-build`·`e2e-test`·`mutation-test`·`secure-coding`은 scope가 선택되면 source 성공만, 선택되지 않으면 명시적 skip만 허용하는 안정 aggregate라 docs-only SHA에서도 완료 상태가 남는다.
> - **계약 드리프트 (HARD, CI FAIL)**: `backend-build` 의 `git diff --exit-code api-docs.json`(커밋된 스펙이 실제 DTO/컨트롤러와 어긋나면 실패) 과 `frontend-build` 의 `codegen:verify`/`codegen:verify:zod`(스펙 대비 생성 타입·Zod 미갱신 시 실패).
> - **스키마 무결성 (HARD, CI FAIL)**: classifier가 schema 영향으로 판정하면 `Real PostgreSQL Schema Validation (Testcontainers + Flyway + validate)`이 Flyway 전량 적용 + Hibernate `ddl-auto:validate`로 물리 정합성을 검증한다. `:foundation:test --no-build-cache`를 재실행하는 `Cache-bypass regression gate (foundation, main only)`는 같은 schema 조건에 더해 `refs/heads/main`에서만 실행한다.
> - **프론트엔드 정적 품질 (HARD, CI FAIL)**: ESLint error 0건과 `frontend/package.json`의 warning 상한을 함께 강제한다(`pnpm run lint`). 의존성 감사는 `pnpm audit --json` 단일 조회를 정책 evaluator가 판정해 Critical 전체와 운영 의존성 High를 차단하고, 개발 전용 High는 warning으로 남기며 형식·네트워크 오류는 실패 처리한다.
> - **변경 영향별 뮤테이션 (HARD, CI FAIL)**: PIT 스코프 14개 각각에 `STRICT_MUTATION=true`를 주입해 Mutation Score 75%를 강제한다. 제품 10개는 `mutation-scope`, 이관 4개는 `mutation-scope-migration`이 소유하며 독립된 영향 출력으로 선택한다. 이관 출력은 더 이상 온라인 `mutation`의 부분집합이 아니다([ADR-0022](../02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md)). `mutation-test`는 소스마다 기대 실행·명시적 skip을 fail-closed로 집계한다. 로컬 PIT는 `STRICT_MUTATION` 미설정 시 threshold 0의 리포트 전용이다.
> - **OWASP Dependency-Check 분리**: 기존 의존성 전수 검사는 별도의 주간·수동 워크플로우(`.github/workflows/dependency-check.yml`)가 담당한다. 모듈 리포트 누락은 실패하지만 scan step 자체는 `continue-on-error`라 취약점 outcome은 PR 차단이 아니며, required 증분 review와 같은 강도로 해석하지 않는다.

제품·이관 PIT job의 실행 상한은 모두 30분이다. 종전 결합 `migration-validate-verify`가 60분 상한에서도
취소된 뒤 빠른 단위 테스트가 식별자·정렬 경계의 변이를 보완했고, 2026-09-29 성공 보고서의 validate·verify
모집단과 점수를 근거로 두 scope를 분리했다. 상한 확대 대신 각 scope의 75%를 독립 적용한다.
[JUnit 5 PIT 플러그인](https://github.com/pitest/pitest-junit5-plugin/blob/1.2.1/src/main/java/org/pitest/junit5/JUnit5TestUnit.java)은
커버리지 측정과 개별 변이 실행에서 클래스 초기화를 다시 수행하므로,
DB 초기화 비용이 짧은 시험의 시간 예산을 넘을 수 있다. 이 설명이 각 CI 타임아웃의 원인을 확정하지는 않는다.
메타데이터 시험의 `getColumns()` 모형도 조회마다 독립된 ResultSet을 만들고,
행 밖·EOF·닫힘 상태의 getter는 SQLException을 발생시켜 실제 JDBC 계약을 지킨다.
현재 [PIT 설정](../02-architecture/pitest-mutation-testing.md)은 엔진 `1.25.9`를 고정하고
history 입출력·기본 증분 분석·CI history 전용 캐시를 사용하지 않는다.
선택한 스코프의 변이를 이전 결과 재사용 없이 재계산하므로 반복 실행 비용이 늘 수 있다.
대상 클래스·DB 시험·75% 임계값·전체 결과의 실패 집계는 유지한다.
작업별 시간 표현식은 [GitHub의 matrix 지원](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability)을 사용하며
기존 required-checks 계약이 다른 범위 확대·상한 변경·삭제·주석 대체·중복 키를 실패로 확인한다.

> **브랜치 보호 SSOT와 live 경계**: `.github/required-checks.json`이 보호·릴리스 기준 브랜치, 안정 required context 6개, 원본 job/matrix, 신뢰할 GitHub Actions integration ID와 review policy 목표를 정의한다. `scripts/verify-branch-protection.mjs`는 required check·strict/provider/bypass뿐 아니라 approval 수, code-owner, last-push, stale review, thread resolution을 live ruleset과 exact-match한다. 저장소 명세가 바뀌어도 원격 설정은 자동 변경되지 않으므로 `verify:ops`가 green이기 전에는 적용 완료로 보지 않는다. 현재 외부 drift는 [공용 gap 인덱스](../../.agent/memory/known-gaps.md)를 따른다.

E2E와 두 PIT source는 `change-scope`만 선행 조건으로 가진다. 각 job이 필요한 코드와 실행 환경을 직접 빌드하며, backend/frontend artifact를 기다리지 않는다. frontend build/bundle과 unit/coverage도 서로 산출물을 소비하지 않으므로 분류 직후 별도 source로 시작하고 `frontend-build`가 둘을 모두 집계한다. `migration-test-scope`도 분류 직후 세 leaf를 시작하고 `migration-scope`가 세 결과와 증거를 합친다. `backend-build`는 온라인 `backend-scope`, 병렬 `backend-schema-scope`, 집계된 `migration-scope`, 영향받는 재사용 profile×layout과 core 영향 시 별도 custom×layout 결과를 각각 검사한다. E2E/PIT가 먼저 성공해도 선택된 다른 required 검사의 실패를 상쇄하지 못한다. CodeQL은 소스 변경에서 Java·JavaScript/TypeScript 양언어 분석을 유지한다.

이관 테스트 분할의 입력은 [duration profile](../../config/migration-test-duration-profile.json)이다. 성공한 Linux run의
JUnit XML에서 발견한 123개 소스 테스트 클래스를 정확히 덮고, 측정 시간을 LPT 방식으로 41개씩 나눈다. 각 leaf는
실제 XML 클래스 census와 manifest를 확인한 뒤 `.exec`를 보존한다. aggregate는 세 manifest의 좌표·클래스·측정
commit, 각 leaf의 XML census, 정확히 세 개의 비어 있지 않은 `.exec`를 다시 확인한다. 그 후에만 기존 LINE 85%·
BRANCH 70% 게이트를 병합 데이터로 실행한다. 프로필에 없는 새 테스트나 stale 테스트, leaf 누락, 빈 실행 데이터는
모두 실패한다. 로컬 `verify:migration`과 주간 workflow는 환경변수가 없으므로 기존 전체 테스트 경로를 유지한다.

PIT 분류는 production/test Java뿐 아니라 `src/testFixtures/**`, `src/main/resources/**`, `src/test/resources/**`를 포함한다. 온라인 4모듈의 의존 관계는 한 범위로 유지하며 개별 Java 파일별 시험 선택은 하지 않는다. 이관 전용 소스·리소스·build 변경은 이관 build/PIT를 선택하고 온라인 build/PIT·frontend·schema·E2E를 선택하지 않는다. 공용 Gradle 입력과 양쪽 ID 생성 의미 계약(`IdGenerationUtil`, `Constants`, `StandardIdGenerator`)은 두 모듈을 선택한다. 미지 입력·빈 비교는 전수이며 루트 `db_columns.json`도 기존 전수 fallback을 유지한다. 정확한 경계는 [분류기](../../scripts/ci-change-scope.mjs)와 [회귀 계약](../../scripts/ci-change-scope.test.mjs)이 소유한다.

제품 PIT는 종전 대상의 정확한 합집합을 10개 scope로 실행하고 `mutation-scope`의 `max-parallel: 5`를 사용한다. [전체 실행 36550933968](https://github.com/lkindo/egov-enterprise/actions/runs/36550933968)에서 3개 제한이 후속 scope를 최대 6분 58초 대기시켰기 때문이다. [실행 36569461799](https://github.com/lkindo/egov-enterprise/actions/runs/36569461799)의 실측 339·334·307·289·273·234초 순으로 여섯 긴 scope를 먼저 선언하고 54~61초 foundation scope를 뒤에 둔다. 이 LPT 순서는 모집단·테스트·75% 게이트를 바꾸지 않고, 짧은 작업 뒤에 긴 인증 범위가 밀리는 대기만 줄인다. `business-app` 세 분할과 이관 네 분할은 기존 성공 보고서에서 각 집합이 75%를 넘는 것을 확인했으며, 새 required 실행의 성공과 시간은 별도로 확인한다. 관측값을 관리 설정의 runner 상한으로 해석하지 않는다.

동시 20개 runner를 사용하는 전체 변경에서는 [실행 36575378891](https://github.com/lkindo/egov-enterprise/actions/runs/36575378891)처럼
E2E와 재사용 검증이 5분 이상 배정을 기다릴 수 있다. `sast-scope`의 두 언어와
`mutation-scope-migration`의 네 scope는 각각 `max-parallel: 1`로 입장을 제한해 초기 슬롯을 임계 작업에
남긴다. 이는 검증 삭제나 nightly 이관이 아니며 CodeQL 양언어, 이관 PIT 네 모집단과 각 75% 판정을 모두
같은 required 실행에서 끝낸다. 해당 실행의 실제 작업 합계가 약 7분 20초와 4분 12초였다는 근거로 선택했으며,
각 job의 30/40분 안전 상한과 fail-fast 비활성화도 유지한다. 후속 [실행 36579753346](https://github.com/lkindo/egov-enterprise/actions/runs/36579753346)에서
재사용 여덟 job은 즉시 시작했지만 migration 3번 shard가 5분 20초 기다렸다. 다음
[실행 36583969340](https://github.com/lkindo/egov-enterprise/actions/runs/36583969340)에서 `reusable-base`를
다섯 개로 제한하자 migration 대기는 줄었지만 뒤로 밀린 `demo/single-module`이 7분 52초 걸려 전체가
14분 42초가 됐다. 따라서 profile별 상한은 두지 않는다. 여섯 profile 전체와 `secret-scan`을
`frontend-scope` 완료 뒤 시작해 초기 슬롯은 세 migration shard에 주고, frontend가 반납한 슬롯에서는
profile을 함께 실행한다. reusable source는 `!cancelled()`와 분류 성공 검사를 써 취소에는 반응하면서
frontend 실패·skip에서도 선택된 검증을 실행한다. `secret-scan`은 `always()`를 유지한다. 검사 모집단·
required context·실패 판정은 바뀌지 않는다.

PR과 **main/master push는 같은 영향 분류**를 적용한다. PR은 base/head, push는 이전/현재 SHA를 비교하며 수동 실행·비교 기준 부재·미지 또는 빈 변경은 전수로 돌아간다. 따라서 문서 전용 fast path는 기본 브랜치에도 적용된다. 전수 로컬 `localGate`·`jacocoRootCoverageVerification`은 유지하며, 릴리스는 대상 커밋의 required 성공과 릴리스 고유 증거를 확인한다. 주간 취약점 감사·부하·DR 검증은 각각의 별도 워크플로우와 격리 환경에서 실행한다.

[PR #699](https://github.com/lkindo/egov-enterprise/pull/699)의 [Linux run 35579358480](https://github.com/lkindo/egov-enterprise/actions/runs/35579358480)에서 E2E 본 테스트 135개와 VRT가 통과했다. 두 shard의 Playwright wall time은 135.458/155.931초, GitHub E2E step은 150/171초, job은 623/454초다. workflow 생성부터 `e2e-test` required 완료까지는 695초(11분 35초)로, [이전 전체 PR 35558688331](https://github.com/lkindo/egov-enterprise/actions/runs/35558688331)의 1,984초(33분 4초)보다 짧았다. 상류 잡 대기·runner 배정·준비를 포함한 두 실행의 관측 비교이며 본 테스트 자체나 전체 CI가 같은 비율로 단축됐다는 뜻은 아니다. 최종 커밋의 required 결과와 전체 소요시간 비교는 [PR #699 검증 기록](https://github.com/lkindo/egov-enterprise/pull/699)이 정본이다. [측정 근거와 한계](../02-architecture/testing-process-redesign.md#9-측정유지와-다음-판단)에 표적 PIT 검사와 전체 범위의 차이도 기록한다.

실행 job `e2e-tests`·`mutation-scope`·`mutation-scope-migration`의 상태 조건은 `!cancelled()`로 두어 기존 선택 범위를 보존하면서 취소에 반응하게 하고, 결과 집계와 cleanup의 `always()`는 유지한다. GitHub는 취소할 때 job 조건을 재평가하므로 실행 job의 `always()`는 취소 후에도 참이 될 수 있다([공식 취소 동작](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation)).

### 정기 검토와 기관 도입의 분리

[ADR-0018](../02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)에 따라
URL·route·UI quality·KRDS·화면 용어의 일반 검토 일정은 기술 CI의 유효기간으로 쓰지 않는다.
`secret-scan`의 실제 시계 보고 step과 [주간·수동 워크플로](../../.github/workflows/governance-review.yml)가
예정·기한 경과·미검토를 보고하고 artifact로 남긴다. 실제 위반·승인 근거·drift 검사와 required context 6개는 유지한다.

기관 온라인 배포와 독립 이관에는 각각 환경·현재 소스 범위·근거·UTC 유효기간을 결속하는 별도 preflight를 사용한다.
기관 기본 `pending`은 참조 제품의 CI·릴리스를 일괄 차단하지 않는다. `verify:migration`은 이관 모듈의
테스트·bootJar를 검증하며 UI 검토 날짜를 요구하지 않는다. 실행 방법과 증거 한계는
[검토 수명 가이드](governance-review-lifecycle.md)를 따른다.

E2E duration profile의 120일 경과도 `performanceEvidence` 보고로 분리한다. 성공한 E2E job의 run·commit provenance,
현재 spec과의 exact 모집단, 양수 duration·미래 시각 검사는 계속 차단한다. 오래된 측정으로 계획한
shard가 현재 런타임에서도 균형이 맞는다는 뜻은 아니다.

### 재사용 프로필과 독립 이관 검증

`reusable-base`는 영향받는 core·collaboration·demo profile과 두 layout matrix에서 `node scripts/verify-reusable-base.mjs --profile <profile>`을
실행한다. 각 호출은 새 격리 PostgreSQL과 DB·소스 번들을 생성하고 산출물의 거버넌스 무결성·활성 원장·
Java 컴파일·하네스·실 DB 스키마·프런트 타입·lint·build를 검사한다. pack 소유가 manifest로 증명된
`business-app` 도메인과 프런트 제거 경로만 해당 pack을 포함하는 profile로 줄이고, 공용·미분류 입력은 6개
matrix 전부로 돌아간다. core가 선택되면 custom composition의 두 layout은 `reusable-custom`에서 profile 검증과
병렬 실행한다. 문서 전용 변경은 둘 다 명시적으로 skip하며 실패·취소·예상 밖 skip은 `backend-build`의 독립
집계에서 통과하지 않는다. 원본 제품 회귀 테스트는 기존 실행 경로에 남는다.

로컬 진입점은 `npm run base:verify -- --profile core`이며 [생성 가이드](reusable-base-guide.md)를 따른다.
개발·CI driver의 lock에는 `localDevelopmentBuild`를 남기므로 기술 검증 성공만으로 공식 릴리스 자산이 되지 않는다.
생성물의 runtime 시나리오·기관 운영 승인은 별도다.

[migration-tool workflow](../../.github/workflows/migration-tool.yml)는 매주 월요일 03:23 KST(일요일 18:23 UTC)와 수동 실행에서 독립 이관 테스트·bootJar·커버리지를 검증한다. 일반 PR/push의 이관 검증 소유자는 `ci.yml`의 `migration-scope` 하나다. `migration:export`로 만든 별도 제품의 자체 workflow는 push/PR 전수 검증을 유지하며, 새 저장소의 required
체크 설정은 기관이 연결한다. 실제 기관 배포·이관은 `adoption:check`가 기술 검사 전후에 승인과 실행 대상을
확인하며, 명시적 `--execute`에서만 기존 deploy/load를 호출한다. 참조 CI에서 실제 기관 작업을 실행하지 않는다.

### 실행 트리거

- **Push**: `main`, `master` 브랜치, PR과 같은 영향 분류·fail-closed fallback 적용
- **Pull Request**: base 브랜치 제한 없이 모든 PR, 변경 범위 분류와 fail-closed fallback 적용
- **Workflow Dispatch**: GitHub UI / CLI 에서 수동 실행 지원 (`workflow_dispatch`)
- **Concurrency**: main 밖의 ref(PR 등)는 연속 푸시 시 이전 실행을 자동 중단한다(`ci-${{ github.ref }}`). main 은 커밋마다 따로 끝까지 검증한다(`ci-main-${{ github.sha }}`, 취소 없음) — push 범위가 직전 main SHA 와의 차이라, 앞 실행이 취소되거나 대기 중에 교체되면 그 커밋의 코드가 어떤 main 실행에서도 검사되지 않는다(GAP-CI-001·DEC-OPS-178). [required-check 계약](../../scripts/required-checks-contract.test.mjs)이 이 형태를 고정한다.

---

## 백엔드 빌드

### Gradle 설정

`backend-scope`와 `backend-schema-scope`는 `change-scope` 직후 병렬로 시작한다. 전자는 Gradle cache writer로
온라인 빌드·커버리지를, 후자는 읽기 전용 cache로 물리 PostgreSQL 검증을 담당한다. action 참조는 workflow의
검증된 commit SHA로 고정한다. 캐시 옵션과 wrapper 다운로드 재시도는 [ci.yml](../../.github/workflows/ci.yml)이 정본이다.

### 실행 명령어

```bash
# 1. main에서 schema 영향이 있을 때 foundation cache-bypass 재실행
./gradlew :foundation:test --no-build-cache

# 2. 선택된 온라인 4모듈 빌드·테스트 (OpenAPI 정적 추출 포함)
repo_root="$(git rev-parse --show-toplevel)"
./gradlew onlineBuild jacocoOnlineCoverageVerification \
  "-Dopenapi.export.path=$repo_root/api-docs.json" --warning-mode fail

# 3. 물리 PostgreSQL 17 스키마 실측 검증 (Testcontainers + Flyway + Hibernate validate)
./gradlew :api-server:schemaValidationTest

# 4. 계약 드리프트 검증 (백엔드 스펙 신선도 확인)
git diff --exit-code -- "$repo_root/api-docs.json"

# 5. migration=true인 별도 job: 이관 테스트·bootJar·85/70 커버리지
node scripts/verify.mjs migration
```

온라인·이관 커버리지는 각각 LINE 85%·BRANCH 70%이며 같은 제외 목록을 쓴다. 선택된 모듈의 클래스·현재 Test task의 실행 데이터가 없으면 실패한다. 전체 제품 로컬 검증은 기존 `jacocoRootCoverageVerification`을 계속 사용하므로, 모듈 분리가 전수 진입점을 축소하지 않는다.

### 생성 아티팩트

| 이름 | 경로 |
|------|------|
| `openapi-spec` | `api-docs.json` |
| 온라인 JaCoCo 보고서 | `build/reports/jacoco/online` |
| 이관 JaCoCo 보고서 | `build/reports/jacoco/migration` |
| `openapi-spec-changed` | `api-docs.json` (변경 감지 시) |

업로드 조건과 보존 기간은 현재 workflow가 정본이다.

---

## 프론트엔드 빌드

### Node.js 설정

Node 버전은 workflow의 `NODE_VERSION`, pnpm은 `version: 9`를 사용한다. `pnpm/action-setup`·`actions/setup-node`의 정확한 commit SHA와 캐시 옵션은 [ci.yml](../../.github/workflows/ci.yml)의 `frontend-scope`를 따른다. pnpm 캐시는 `frontend/pnpm-lock.yaml`에 결속한다.

### 실행 명령어

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run test:form-validation # 폼 census·검증 계약과 red proof
pnpm run codegen:verify        # 계약 드리프트 게이트 (spec ↔ 생성 타입)
pnpm run codegen:verify:zod    # 계약 드리프트 게이트 (spec ↔ Zod)
pnpm run type-check:e2e        # Next build가 제외하는 E2E 타입
pnpm run lint                  # ESLint error 규칙 0건 게이트
node ../scripts/frontend-audit-policy.mjs # pnpm audit JSON 단일 조회·정책 판정
pnpm run build
pnpm run bundle:check
pnpm run test:coverage
```

프론트 의존성 감사 정책은 다음과 같다.

| 결과 | CI 판정 |
|---|---|
| Critical advisory | 운영/개발 구분 없이 차단 |
| High + 운영 의존성 | 차단 |
| High + 개발 전용 의존성 | GitHub warning, 비차단 |
| JSON 형식·severity/count 불일치, 실행/네트워크 오류 | fail-closed |

### 생성 아티팩트

`frontend-scope`는 `next-build-cache` artifact를 업로드하지 않는다. 해당 업로드는 소비자가 없고 유효한 빌드 재사용 효과도 없어 2026-09-01 제거됐다. Next production build·bundle budget은 `frontend-scope`, 전체 Vitest coverage는 `frontend-coverage-scope`에서 병렬 실행하고 안정 context `frontend-build`가 둘 다 성공해야 통과한다.

---

## E2E 테스트

### Playwright Sharding

`1/2`·`2/2`은 내부 실행 job label이다. 브랜치 보호에는 shard 개수와 무관한 안정 context `e2e-test` 하나만 노출한다. 실제 spec 배정은 Playwright의 개수 기반 `--shard`가 아니라 [duration profile](../../frontend/e2e/shard-duration-profile.json)을 [planner](../../scripts/e2e-shard-plan.mjs)가 LPT 방식으로 균형 분배한다. 현재 profile은 Linux run `35579358480`·commit `56aa75d7cafb30b242244a3867b776f3fc806151`의 성공한 E2E 두 shard에서 본 테스트 duration을 파일별로 합산한 실측값이며 총 548,848ms다. 50개 spec·135개 본 테스트(API 36·browser 99)가 각각 한 번 실행됐으며 setup 4회는 제외했다. 이전 실측과 그 전 선언 수 배분 추정의 출처는 `source.previousSource` 이력에 남긴다. 현재 값은 workers 2 조건의 단일 실행 표본이며 전체 CI 성공이나 향후 실제 shard 균형을 보장하지 않는다. 새·삭제 spec, 잘못된 source 증거, 누락·중복 또는 15% 초과 예상 편차는 운영 계약이 실패 처리한다.

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1/2, 2/2]
```

첫 shard의 계획만 보려면 `node scripts/e2e-shard-plan.mjs --shard 1/2`를 실행한다. 이 명령은 서버·DB를 기동하지 않는다.

### 실행 흐름

1. Buildx가 해당 checkout의 `api-server/Dockerfile`을 빌드해 `API_IMAGE_REF` 태그로 로컬 Docker에 적재한다. GitHub Actions layer cache를 사용하고 registry에 push하지 않는다. Compose는 `up --no-build -d db api`로 그 이미지를 사용한다.
2. run ID·attempt·shard별 Compose namespace로 DB/API를 기동하고 API health와 보호된 metrics 응답을 확인한다. 프론트엔드는 같은 회차의 임시 JWT 설정으로 production build한다.
3. 격리 runner의 `--ci-compose` 경로가 DB 연결·Compose 자원 소유권·Next 연결을 검증하고 자체 Next 프로세스를 관리한다. 기존 개발 DB나 이미 실행 중인 서버를 재사용하지 않는다.
4. planner가 배정한 spec을 `api-contract`와 `full-suite` 프로젝트에서 실행한다. 실행 전 두 프로젝트 전체 목록 JSON을 수집하고 `playwright-result-contract.mjs --inventory ... --report ... --ci-shard ...`가 이벤트 기반 선택을 다시 계산해 해당 테스트 좌표와 결과를 대조한다. 실제 테스트 ID·project 누락, 예상 밖 skip, flaky를 성공으로 처리하지 않는다.
5. PR의 검토된 화면 수정은 [spec 소유 매핑](../02-architecture/testing-process-redesign.md#54-pr의-검증된-화면-변경만-spec-단위로-선별한다)에 따라 실행한다. main과 공통·미지·신규·삭제 입력은 전수 fallback이다. `/tmp/e2e-impact-plan.json`은 선택 사유와 목록의 진단 자료이며 결과 검증의 권위로 읽지 않는다. 실패 시 trace·screenshot·브라우저 로그·API/JVM 로그를 대조하고 생성 자원은 해당 실행의 소유권 범위에서 회수한다.

정확한 shell 명령과 artifact 경로는 [ci.yml](../../.github/workflows/ci.yml)의 E2E job이 정본이다. 로컬 검증은 `npm run verify:e2e`로 같은 격리 경계를 통과한다. 목록 확인과 타입 검사는 서비스 없이 실행할 수 있다.

### 리포트 병합

- **스펙 구성**: planner의 재귀 spec discovery와 duration profile exact census가 현재 실행 모집단의 정본이다. 계층 정의는 [testing-guide.md](./testing-guide.md) §E2E를 따른다.
- **Playwright projects는 3개다**: `setup`(`*.setup.ts`), `api-contract`(`contracts/**/*.spec.ts`), `full-suite`(`journeys/`와 `quality/`의 spec). 두 본 테스트 프로젝트는 서로 겹치지 않으며 `setup`에 의존한다. 브라우저 프로젝트 이름은 기존 snapshot 소비를 위해 유지한다.
- **Sharding (병렬 실행)**: 내부 2개 job은 비용 병렬화를 위한 구현 세부사항이고 required context는 `e2e-test` 하나다. 성공한 Linux E2E 한 표본의 파일별 실측 합과 provenance를 profile에 반영했다. 후속 실행에서 실제 shard 시간 균형과 표본 변동을 확인한다. 단순 파일 수 균등이나 수동 목록은 사용하지 않는다.

#### 병합 리포트 생성 (`ci.yml`)

병렬 VM 간 파일 시스템은 격리되어 있으므로 각 shard의 blob을 업로드한 뒤 `e2e-merge-reports`에서 내려받아 병합한다. 정확한 action SHA와 shell은 [ci.yml](../../.github/workflows/ci.yml)이 소유한다.

| 단계 | 현재 계약 |
|---|---|
| Shard 업로드 | `frontend/blob-report/` → `playwright-report-shard-${{ strategy.job-index }}`, 30일 보존. slash가 있는 `matrix.shard`를 artifact 이름에 쓰지 않는다. |
| 다운로드 | `playwright-report-shard-*`를 `frontend/playwright-reports`의 shard별 디렉터리로 받는다. `merge-multiple: true`를 사용하지 않는다. |
| 평탄화·병합 | shard 접두사를 붙여 파일명 충돌을 피한 뒤 `playwright merge-reports --reporter html ./playwright-reports` 실행 |
| 최종 업로드 | `frontend/playwright-report` → `playwright-report-merged`, 30일 보존 |

E2E JSON 결과는 [playwright-result-contract.mjs](../../scripts/playwright-result-contract.mjs)가 배정 spec과 사전 목록의 테스트 ID·project별 실제 실행을 확인한다. HTML 병합은 비필수 보조 job이며, E2E 성공 권위는 `e2e-tests`와 required `e2e-test`에 남는다.

---

## 보안 스캔

### PR 증분 의존성 검사

| 통제 | 트리거·경로 | 집행 의미 |
|---|---|---|
| Gradle dependency graph | PR read-only producer → trusted `workflow_run` publisher | write token을 가진 job은 PR 코드를 checkout하거나 실행하지 않는다. |
| Snapshot readiness | `secret-scan`, backend/migration/frontend 영향 PR | GitHub compare API의 base/head snapshot warning이 사라질 때까지 최대 600초 기다리고, 미완전·비재시도 API 오류·시간 초과를 실패 처리한다. 실패 시 **어느 쪽 SHA가 비었는지 분류하고 해소 명령을 함께 출력**한다. |
| Dependency review | readiness 성공 뒤 `actions/dependency-review-action` | 새 runtime 의존성의 High 이상을 required `secret-scan`에서 차단한다. |
| Frontend audit policy | `frontend-scope` | lockfile을 한 번 조회해 Critical 전체·운영 High를 차단하고 개발 High만 warning으로 남긴다. |

#### 스냅샷이 없을 때 무엇을 해야 하는가

`dependency-review-action`은 단독으로는 이 축을 막지 못한다 — retry timeout이 지나면 `Retry timeout exceeded. Proceeding...`을 찍고 **실패하지 않고 진행한다**. 그래서 fail-closed 판정은 앞 단계의 readiness 스크립트가 전담한다.

readiness가 실패하면 로그에 축과 해소 절차가 함께 나온다. 두 축은 대응이 다르다.

| 축 | 경고 형태 | 기다리면 해소되나 | 해소 |
|---|---|---|---|
| base(main) 부재 | `The number of snapshots compared for the base SHA (0) and the head SHA (1) do not match.` | **아니오** | `gh workflow run dependency-submission.yml --ref main` 뒤 `secret-scan` 재실행 |
| head(PR) 부재 | `No snapshots were found for the head SHA <sha>.` 또는 base(1)/head(0) count 형태 | PR 직후 2분 이내는 정상. 제한 시간까지 남으면 **아니오** | producer 실행 상태를 조회해 원인별로 승인·재실행·재push |

> ⚠ head 부재를 **PR 브랜치 dispatch**로 해소하지 않는다. `submit-trusted-snapshot`은 `contents: write`로 지정한 ref의 Gradle 빌드를 실행하므로, PR 브랜치를 지정하면 "write 토큰 잡은 PR 코드를 실행하지 않는다"는 이 설계의 신뢰 경계가 깨진다. 그 경계는 2026-08-29부터 `github.ref == 'refs/heads/main'` 가드로 집행되며 계약이 양방향 동결한다.

head 부재의 하위 원인(producer 미실행·빌드 실패·concurrency 취소·fork 승인 대기·publisher 실패·artifact 만료)은 **전부 같은 경고 문자열**을 내므로 문자열만으로 갈리지 않는다. 스크립트가 원인을 단정하지 않고 조회 명령을 안내하는 이유이며, 조회에 필요한 `actions: read`를 `secret-scan`에 부여하지 않은 것은 그 잡이 PR 코드를 실행하기 때문이다.

구성의 회귀 방지는 [`dependency-submission-contract.mjs`](../../scripts/dependency-submission-contract.mjs)와 운영 계약 catalog가 담당한다. public fork에서의 live 증거가 확보되기 전 상태는 [GAP-DEP-001](../../.agent/memory/known-gaps.md)에서 추적한다.

### OWASP Dependency-Check (주간·수동 전수 스캔)

기존 의존성 전수 CVE 검사는 주간·수동 워크플로우(`.github/workflows/dependency-check.yml`)로 분리돼 있다. Gradle 설정의 `failBuildOnCVSS = 7`과 달리 workflow의 scan step은 외부 NVD 가용성을 고려해 `continue-on-error`이며 PR required check가 아니다. 단, 애플리케이션 모듈 리포트가 생성되지 않은 실행은 후속 검증 단계가 실패한다. 이 outcome 차이와 대응 SLA는 GAP-DEP-001의 별도 정책 정렬 과제다.

#### 설정 (`build.gradle`)

```groovy
dependencyCheck {
    failBuildOnCVSS = 7  // High 이상만 실패
    skipConfigurations = [
        'compileOnly',
        'testCompileOnly',
        'annotationProcessor',
        'testAnnotationProcessor'
    ]
    formats = ['HTML', 'JUNIT', 'XML']
    outputDirectory = layout.buildDirectory.dir('reports').get().asFile
    suppressionFile = file('config/dependency-check/suppressions.xml').absolutePath
}
```

#### Suppression 규칙

테스트 전용 의존성 및 알려진 오탐 제외:

```xml
<!-- PostgreSQL (Testcontainers) -->
<suppress>
    <notes>Testcontainers is only used for integration testing</notes>
    <packageUrl regex="true">^pkg:maven/org\.testcontainers/.*$</packageUrl>
    <vulnerabilityName>.*</vulnerabilityName>
</suppress>

<!-- H2 (Unit Testing) -->
<suppress>
    <notes>H2 is only used for local unit testing</notes>
    <packageUrl regex="true">^pkg:maven/com\.h2database/h2@.*$</packageUrl>
    <vulnerabilityName>.*</vulnerabilityName>
</suppress>
```

#### 로컬 실행

```bash
./gradlew dependencyCheckAnalyze --info
```

리포트: `build/reports/dependency-check-report.html`

---

## 캐싱 전략

### Gradle 캐싱

- **위치**: GitHub Actions 캐시 + 로컬 `.gradle`
- **구성**: `setup-gradle` v6.3.0의 commit `9c971963bec38e04b3d30dcc455b5382be2fdbfb`와 `cache-provider: basic`을 명시한다. 캐시 제공 방식 변경은 테스트 생략 승인이 아니며 Gradle task 입력과 필수 실패 판정은 유지한다.
- **저장 책임**: upstream CI는 backend 하나만 저장하고, backend가 명시적으로 false인 이관 전용 실행에서만 migration이 저장한다. 재사용·PIT·별도 이관 점검·의존성 감사·릴리스는 읽기 전용이다. 생성된 독립 제품은 자체 단일 writer를 유지한다. 캐시 miss에 따른 다운로드는 정상 동작이며 실패 경고를 숨기지 않는다.
- **키·입력**: `setup-gradle` action의 캐시 구성과 Gradle task 입력 계약을 따른다. wrapper·build 파일 두 개만으로 전체 캐시 키를 설명하지 않는다.
- **효과 확인**: 캐시 hit 여부와 실행 시간은 대상 workflow run에서 확인한다. 과거 측정치를 현재 성능 보장으로 사용하지 않는다.

### E2E API Docker layer 캐시

Buildx의 `type=gha,scope=e2e-api`로 두 shard가 layer 복원을 시도하고 첫 shard만 `mode=max`로 내보낸다. cache export 오류만 비치명으로 처리하며 이미지 빌드·로컬 적재·테스트 오류는 계속 실패한다. API 태그를 Compose의 `API_IMAGE_REF`와 결속하고 `--no-build`로 같은 이미지를 사용한다. upstream artifact 전달이나 완료 대기는 추가하지 않는다. 현재 Linux run `35579358480`의 API image build step은 첫 shard 299초, 두 번째 111초이며 둘 다 Buildx `CACHED` 표시는 0건이었다. 첫 shard의 GHA cache export 단계는 184.1초로 전체 build step과 구분한다. 같은 실행의 FE build는 62/65초였다. 이 실행은 cache hit에 따른 절감의 증거가 아니다.

### Next.js 캐싱 — E2E에서는 사용하지 않는다

E2E job은 회차별 JWT 환경과 일치하는 프론트엔드를 클린 빌드한다. 빌드 시점 환경값이 번들에 포함될 수 있으므로 다른 실행에서 만든 Next build cache를 E2E에 복원하지 않는다.

- **Gradle·Playwright 브라우저 캐시는 유지**한다(아래 참조). 캐시 복원을 다시 도입하려면 시크릿이 번들에 인라인되지 않음을 먼저 증명할 것.

### Playwright 브라우저

- **위치**: `/tmp/playwright-browsers`
- **키**: `runner.os-playwright-{pnpm-lock.yaml 해시}`
- **효과**: 매번 설치하지 않고 재사용

---

## 로컬 테스트

### 전체 파이프라인 시뮬레이션

```bash
# Docker를 포함한 병합 전 로컬 게이트
./gradlew localGate

# API·브라우저 E2E가 필요한 변경은 새 격리 스택에서 별도 실행
npm run verify:e2e
```

주간 Dependency-Check나 release workflow를 위 명령이 대신하지 않는다. 필요한 검증은 변경 범위와 대상 workflow를 기준으로 추가한다.

E2E runner는 외부 DB·공유 개발 서버를 대상으로 받지 않는다. 별도 운영·도입 환경 검증이 필요하면 해당 런북과 승인 경계를 따른다. cleanup 접두사나 loopback URL만으로 실행 환경의 격리를 증명했다고 보지 않는다.

### JaCoCo 커버리지 확인

```bash
./gradlew jacocoRootReport
open build/reports/jacoco/aggregated/index.html
```

임계값 검증은 `./gradlew jacocoRootCoverageVerification`, 해석과 문제 해결은 [커버리지 워크플로](../../.agent/workflows/coverage.md)를 따른다.

### Playwright 리포트

```bash
pnpm -C frontend exec playwright test --reporter=html
pnpm -C frontend exec playwright show-report
```

### 로컬 사전 게이트 (git hooks)

CI가 실행되기 전, 저장소에 포함된 공유 pre-push 게이트가 잘못된 푸시를 먼저 차단합니다. 범위별 최소 검증은 [AGENTS.md](../../AGENTS.md#verification-by-change-scope)를 따르며, 최종 병합 권위는 required CI입니다.

```bash
# 클론마다 1회 설치
git config core.hooksPath .githooks
```

- **pre-push (차단)**: 변경 범위를 판정해 문서 계약 또는 소스 컴파일·타입·codegen·하네스 검증을 실행한다. 실제 명령 집합은 훅과 `.githooks/README.md`를 따른다.
- **pre-commit**: DTO/Controller/api-docs.json/생성 타입의 codegen 드리프트는 경고한다. 별도로 gitleaks가 설치되어 있으면 staged 시크릿 탐지는 커밋을 차단하고, 미설치면 스캔 생략 경고를 출력한다.
- **우회**: `git push --no-verify` 또는 `SKIP_HOOKS=1 git push`.

자세한 내용은 [.githooks/README.md](../../.githooks/README.md) 참조.

---

## 릴리스 프런트엔드 런타임 인계

루트 Docker context는 `.agent/temp`와 모든 하위 경로의 JVM 충돌 진단 로그(`hs_err_pid*.log`)를 제외한다. 격리 검증의 자격 파일·백업 증거와 프로세스 정보를 담을 수 있는 진단 로그를 후속 API 이미지 빌드에 전달하지 않도록 기존 Docker context 계약에서 제외와 재포함 금지를 검사한다. 프런트엔드 context는 `frontend/`로 한정되어 이 저장소 루트 임시 경로를 포함하지 않는다.

`release.yml`은 frontend image를 build/push할 뿐 배포하지 않는다. build step의 repository variables는 Next production build를 검증하기 위한 입력이고, 발행된 image를 어느 backend에 연결할지는 runtime deploy owner가 별도로 인계해야 한다. build arguments가 container runtime environment를 대신한다고 간주하지 않는다.

프런트엔드 Docker builder만 `NEXT_DOCKER_STANDALONE=true`로 standalone 출력을 켠다. Docker의 tracing root는 `/app`이며 runner에는 추적된 서버·의존성, `.next/static`, `public`만 복사한다. `nextjs` 사용자가 `node server.js`로 3000 포트에 기동하며 telemetry는 계속 꺼 둔다. 일반 호스트 빌드는 기존 출력과 repository root를 유지한다. API·actuator·WebSocket rewrite는 빌드 때 정해지므로 runtime URL을 바꾼다고 다시 생성되지 않는다. BFF의 runtime 환경 인계와 기존 Secure/HttpOnly 세션 정책은 그대로 필요하다. 이미지 크기·취약점 감소와 실제 기동은 해당 소스의 이미지 ID로 검증해야 하며 정적 계약 통과로 대신하지 않는다.

로컬 운영 형상 검증은 [`run-isolated-release-smoke.mjs`](../../scripts/run-isolated-release-smoke.mjs)를 사용한다. `node scripts/run-isolated-release-smoke.mjs --source-info`가 반환한 revision과 실제 작업 트리 해시를 두 Docker build의 `BASELINE_BUILD_SHA`·`BASELINE_BUILD_INPUT_TREE_SHA256`에 전달한 뒤, `node scripts/run-isolated-release-smoke.mjs --api-image sha256:<64자리> --frontend-image sha256:<64자리>`로 그 이미지 ID를 검사한다. 필요한 PostgreSQL·edge digest 이미지도 로컬에 있어야 한다. 실행기는 빌드·pull·push·원격 CI·운영 DB 접속을 하지 않는다. 기존 E2E의 `e2e` 전용 검증기를 넓히지 않고 별도의 `prod` 계획을 검증한다.

실행 순서는 소유한 tmpfs DB에서 migration-only `e2e` bootstrap으로 명시적 권한 cutover를 수행하고, `prod` 단독 API와 frontend·edge를 기동한 뒤 HTTP·첨부·관리 포트 경계를 검사하는 것이다. 이어 DB와 첨부를 백업하고 두 번째 새 DB·볼륨에 복구해 같은 이미지의 동작을 검사한다. 성공 증거는 모든 검사와 소유 자원 정리가 끝난 뒤에만 `.agent/temp/egov-release-smoke-*/result.json`에 기록한다. 작업 트리가 바뀌거나 이미지의 source label이 다르면 거부하며, dirty 실행 증거에는 `publicationApproved: false`를 기록한다. 실행기는 현재 로컬 수동 검증 경로이며 release workflow의 자동 smoke 단계로 연결됐다는 뜻은 아니다.

소스 입력은 물리 경로도 저장소 내부인지 검사하며, 컨테이너 시작 전 실제 이미지 명령·사용자·mount·발행 포트를 계획과 대조한다. 증거에는 실제 복사한 edge template의 SHA-256도 포함한다. 인코딩된 인증 경로 검사는 정상 로그인·refresh를 선행한 뒤 토큰 필드가 없는 400/404 응답을 요구한다. 빈 200, 인증 실패, 요청 제한, 서버 장애는 안전한 경로 거절의 증거가 아니다. 복구 행 수는 모든 테이블의 유효한 정수 값을 확인하고 테이블 이름 순서를 정규화해 비교한다.

이 검증은 빈 DB에서 별도 cutover 없이 `prod`가 자동 설치된다는 주장, 과거 v0.1.0 데이터의 forward upgrade, 구 이미지 rollback, 운영 RTO/RPO, TLS 브라우저 E2E 또는 SMTP 실발송을 증명하지 않는다. HTTP loopback의 쿠키는 테스트 컨텍스트만 재전송하며 Secure/HttpOnly 정책을 완화하지 않는다. 실제 Next→Spring 경로의 이중 인코딩·잘못된 percent 입력은 유효한 폐기용 로그인·refresh 대조군을 사용해 상태와 토큰 노출 여부만 기록한다. DB·첨부 복구의 범위는 [복구 runbook](../04-operations/backup-and-restore-runbook.md)을 따른다.

이미지는 **GHCR**(`ghcr.io/<owner>/egov-api`·`ghcr.io/<owner>/egov-frontend`)로 발행한다(DEC-OPS-103). 태그 대상은 계속 main 이력과 required-checks.json의 성공한 필수 체크를 모두 요구한다. 두 API URL의 공용 검증기를 Gradle·Docker 빌드보다 먼저 실행하고, 두 이미지를 로컬에 적재한 뒤 이미지 ID와 revision을 검증한다. 이어 `node scripts/release-images.mjs scan`으로 두 이미지의 취약점과 SBOM을 검사한 뒤, 그 동일 이미지만 `GITHUB_TOKEN`으로 push한다. 두 registry digest를 확보한 경우에만 `release-manifest.json`을 생성해 GitHub Release 자산으로 게시한다. 두 번째 push 실패 시 첫 이미지가 레지스트리에 남을 수 있지만 완성 manifest와 GitHub Release는 생성되지 않는다. 이 절차는 registry의 두 push를 원자적으로 만들지 않는다.

스캐너는 [공식 Trivy 0.74.0 이미지](https://github.com/aquasecurity/trivy/pkgs/container/trivy/1132805973?tag=0.74.0)의 digest로 고정한다. `docker save`의 대상은 검증한 이미지 ID이고 scanner에는 archive를 읽기 전용으로 전달한다. Docker socket·작업 트리·자격 파일을 마운트하지 않으며 전용 cache/output만 쓸 수 있다. 런타임 이미지의 HIGH/CRITICAL은 미수정 취약점도 포함해 `--exit-code 1`로 차단한다. CycloneDX에도 [공식 문서](https://github.com/aquasecurity/trivy/blob/v0.74.0/docs/guide/supply-chain/sbom.md)에 따라 `--scanners vuln`를 명시한다. 두 이미지 검사·SBOM 생성이 모두 성공해야 `release-scan-evidence.json`이 생기며, 발행기는 이미지 ID·소스 revision·실행 회차·스캐너와 DB metadata·report/SBOM 해시를 재검증한다. 승인된 태그 발행의 기존 Release 단계에만 완료 receipt, 두 SBOM과 그 해시가 참조하는 vulnerability JSON 두 개를 함께 보존한다. 이 계약 테스트의 성공은 실제 이미지의 취약점 검사 결과가 아니다.

`workflow_dispatch`는 발행 없는 dry-run이다. 선택한 checkout의 검증·두 이미지 빌드·ID/revision 검증·취약점 검사·SBOM 생성을 실행하며 GHCR 로그인, push, GitHub Release, cache export, build-record artifact upload는 수행하지 않는다. scan 산출물도 로컬에만 남는다. 외부 의존성·스캐너·취약점 DB·캐시 다운로드는 할 수 있다. 이 수동 실행 자체도 원격 작업이므로 로컬 검증만으로 실행했다고 간주하지 않는다. 발행 단계의 권한은 `build-and-push` 잡에 한정하며, 수동 실행에서도 발행 단계의 조건과 스크립트의 이벤트 검증이 함께 차단한다.

배포 호스트는 Bash·Docker Compose v2·jq와 승인된 Release의 `release-manifest.json`을 준비해 `./scripts/deploy.sh /secure/path/release-manifest.json`을 실행한다. 스크립트는 완성된 두 digest와 revision을 검사하고, 기존 `API_IMAGE_REF`·`FRONTEND_IMAGE_REF`가 있으면 일치 여부를 확인한 뒤 해당 이미지를 pull한다. 기관이 승인한 다른 registry digest도 기존처럼 소비할 수 있으며 발행기는 GHCR만 사용한다. 이미지 label과 실행 컨테이너 identity·health를 검사하며 `--no-build`로 기동한다. manifest는 서명이나 배포 승인의 대체물이 아니므로 신뢰하는 승인된 Release에서 받아야 한다. 신규 설치·기존 DB 업그레이드의 production smoke 증거는 별도 검증 범위다.

기존 [`WorkflowManifestLinterTest`](../../api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java)가 실행 순서·권한·dry-run 경계를 검사하고, [`release-images.test.mjs`](../../scripts/release-images.test.mjs)는 스캐너 실패·취약점·증거 변조의 발행 차단과 첫/두 번째 push 실패·digest 누락 시 완성 manifest가 생기지 않는지를 command runner로 확인한다.

<!-- FRONTEND_RELEASE_RUNTIME_API_HANDOFF -->

```yaml
releaseRuntimeContract:
  publisher: image-only
  requiredEnvironment: [BACKEND_API_URL, NEXT_PUBLIC_API_URL]
  buildArgsSubstituteRuntimeEnvironment: false
  evidenceValuePolicy: names-and-validation-only
```

- `BACKEND_API_URL`: absolute http(s) URL ending `/api/v1` 또는 `/api/v1/`.
- `NEXT_PUBLIC_API_URL`: absolute http(s) URL ending `/api/v1` 또는 `/api/v1/`.
- 두 값 모두 credential, query, fragment, 제어문자와 상대 URL을 허용하지 않는다.
- 배포 manifest/secret provider는 두 이름을 container runtime에 명시적으로 주입한다. endpoint는 자격증명은 아니지만 내부 topology일 수 있으므로 release handoff evidence에는 raw value를 복제하지 않고 image digest, 변수 이름 2개, validator 성공 여부와 bounded health category만 남긴다.
- 누락·형식 오류는 fallback URL로 발행을 계속하지 않고 배포 preflight를 실패시킨다. 저장소의 기본/e2e Compose는 같은 계약을 정적으로 검증하지만 별도 Kubernetes·PaaS·`docker run` 배포는 인수처 manifest와 secure channel에서 이 인계를 증명해야 한다.

---

## 문제 해결

### Gradle 캐시 미스

**증상**: 매번 전체 빌드 실행

**해결**: 먼저 `--info` 로그에서 입력 해시·Gradle/JDK 버전·cache key를 확인한다. 재현 확인이 필요하면 `./gradlew clean <task> --no-build-cache`로 한 번 비교한다. 저장소·사용자 캐시 디렉터리 삭제는 기본 해결 절차가 아니며, 정확한 대상과 복구 비용을 확인한 뒤 수행한다.

### Playwright 브라우저 설치 실패

**증상**: `Executable doesn't exist`

**해결**:
```bash
pnpm -C frontend exec playwright install --with-deps chromium
```

### OWASP 스캔 타임아웃

**증상**: NVD 데이터베이스 다운로드超时

**해결**:
```bash
# NVD API 키 설정 (선택사항)
export NVD_API_KEY=your-key
./gradlew dependencyCheckAnalyze
```

---

## 관련 문서

- [테스트 종합 가이드](./testing-guide.md)
- [E2E 테스트 운영 런북](./e2e-test-guide.md)
- [API 문서화 가이드](./api-documentation-guide.md)

*CI 구조·실행 경로 검토: 2026-09-21. 새 구조의 런타임·성능 검증은 별도 CI 증거가 필요하다.*


## 시큐어코딩 정적 분석 (SAST)

[`sast-policy.json`](../../config/security/sast-policy.json)이 CodeQL 버전·보안 점수 임계값·언어를 정의한다. Java는 5개 모듈의 production `compileJava`를 캐시 없이 추적하여 Lombok 생성 코드까지 분석한다. JavaScript/TypeScript는 [`codeql.yml`](../../config/security/codeql.yml)의 프론트엔드와 운영 스크립트 경로를 분석한다. `security-extended`는 기본 보안 쿼리와 추가 보안 쿼리를 포함한다([GitHub 공식 설명](https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options)).

- PR과 main/master push의 코드·설정 변경에서는 두 언어의 전체 대상 소스를 분석하며, 명시적인 문서 전용 변경만 생략한다. 이관만 바뀌어도 양언어 분석을 유지한다. 분류 실패·언어 누락·분석 실패는 통과로 처리하지 않는다.
- 보안 점수 7.0 이상(High/Critical)은 기존·신규 여부와 관계없이 실패시킨다. [승인된 오탐 6건](../04-operations/sast-findings-review.md)만 정확한 위치·fingerprint·소스/방어 해시·만료일에 묶어 예외로 처리한다. 그 미만의 탐지도 리포트에 남긴다. 리포트 누락·잘못된 버전·빈 쿼리 집합·실행 오류·예외 건수 불일치는 별도 오류로 실패한다.
- 두 언어의 실제 취약/안전 fixture를 CodeQL로 분석하고, 취약 fixture가 동일 정책 CLI에서 종료 코드 1을 내는지 매 CI에서 확인한다. fixture의 취약 동작은 실행하지 않는다.
- `secure-coding`은 여섯 번째 required context다. 기존 release workflow가 같은 manifest를 읽으므로 대상 SHA에 이 체크가 성공하지 않으면 이미지·릴리스 발행을 차단한다. 원격 ruleset 적용 여부는 `npm run verify:ops`로 별도 확인한다.
- 코드 snippet·전체 파일 내용·소스에서 유래한 메시지를 제거한 SARIF를 사용한다. 14일 보존 감사 artifact에는 예외 ID·사유·만료일과 전체 탐지를 남기고, GitHub Security 게시본에서는 승인된 개별 탐지만 제외한다. 원본 CodeQL DB는 업로드하지 않는다. 분석에 앱·OCI 자격증명은 필요하지 않다.
- SAST는 SQL/명령 주입·경로 조작·XSS·위험한 암호 사용 등 코드 패턴과 데이터 흐름을 검사한다. 업무별 권한 의미, 배포 설정, 실제 공격 가능성을 전부 증명하지 않으므로 기존 인증·인가 하네스와 E2E를 함께 유지한다.

로컬에서는 정책에 고정된 CodeQL bundle을 설치하고 `CODEQL_PATH`에 실행 파일의 절대경로를 지정한다. 공식 bundle checksum을 확인한 뒤 다음을 실행한다. Java 분석에는 JDK 21이 필요하다.

```powershell
$env:CODEQL_PATH = 'C:/tools/codeql/codeql.exe'
npm run test:sast
npm run verify:sast -- java
npm run verify:sast -- javascript
npm run verify:sast:probe -- java
npm run verify:sast:probe -- javascript
```

로컬 분석 로그·원본 리포트는 Git에서 제외된 `build/sast-*`에 보관한다. 실패한 탐지는 rule ID·파일·행·데이터 흐름을 확인해 수정하고 재분석한다. 규칙 비활성화, 파일 전체 제외, `continue-on-error`, 임계값 상향으로 red를 감추지 않는다.

CI는 DB/API 기동 전에 `node scripts/e2e-compose-preflight.mjs`로 Compose 설정을 검증하고, 격리 runner에서 실제 컨테이너·datasource 소유권을 다시 확인한다. 환경 플래그만으로 실행을 허용하지 않는다.
