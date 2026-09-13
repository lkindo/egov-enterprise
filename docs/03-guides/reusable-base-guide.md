# 재사용 Base 생성 가이드

> **현행 정책**: 재사용 base는 `main`의 정확한 `v*` 릴리스 태그에서 생성하는
> 검증된 산출물이다. `template/reusable-base`는 역사 브랜치이며 신규
> 프로젝트의 시작점으로 사용하지 않는다. 결정 배경은
> [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md)을 따른다.

## 1. 생성 모델

```text
clean v* release tag
        │
        ├─ current V2 migrations ─> disposable PostgreSQL ─> profile DB V1 baseline
        │                                                   └─ second empty DB reapply
        │
        └─ tracked source tree + profile manifest + verified DB bundle
                                      └─ projected source ─> compile / tsc / harness / schema gate
```

- 단일 정본: 현재 릴리스 소스
- 프로필 SSOT: `config/reusable-base-profiles.json`
- 생성기: `scripts/generate-reusable-base-db.mjs`, `scripts/generate-reusable-base-source.mjs`
- 출력: `build/reusable-base/` 아래의 무시되는 릴리스 준비 산출물
- 금지: 장기 template 브랜치 수동 동기화, 운영·공유 DB에서 테이블 삭제, 생성 SQL 수동 편집

## 2. 프로필

프로필의 실제 테이블·시퀀스 집합과 개수는 `config/reusable-base-profiles.json` 및 `npm run base:census` 출력이 정본이다.

| 프로필 | 포함 pack | 용도 |
|---|---|---|
| `core` | core | 인증·사용자·조직·권한·메뉴·코드·파일·로그·정책 중심 최소 골격 |
| `collaboration` | core + collaboration | core + 게시판 클러스터 + 메일·쪽지·알림·SMS·실시간 대시보드 |
| `demo` | core + collaboration + demo | 현재 제품의 전체 참조 기능 |

프로필은 누적된다. 낮은 pack이 높은 pack을 의존할 수 없고, 물리 테이블·독립 시퀀스는 한 pack만
소유한다. `board`·`comment`·`scrap`처럼 함께 선택해야 하는 클러스터와 `tb_tmplt_info`처럼 공유되는
테이블 계약도 매니페스트에 명시한다. 수동 도메인 삭제 스크립트 `scripts/delete-domain.ps1`도 이
매니페스트의 `appDomains`·`clusters`를 같은 SSOT 로 소비한다([getting-started §5.1](getting-started.md#51-프로젝트-고유-기능-삭제)).

## 3. 공식 생성

### 3.1 선행 조건

- 작업 트리가 깨끗해야 한다.
- `HEAD`가 정확한 `v*` 릴리스 태그여야 한다.
- Docker와 실행 중인 PostgreSQL 컨테이너가 필요하다. 기본 컨테이너명은
  `egov-e2e-postgres`이며 `--container <name>`으로 바꿀 수 있다.
- 생성기는 이름이 `test_reusable_base_*`인 일회용 DB만 만들고 종료 시 제거한다.

### 3.2 DB 번들

```bash
npm run base:census
npm run base:generate-db -- --profile collaboration
```

생성기는 현재 versioned migration 전체를 빈 DB에 적용하고 프로필 밖의 객체를 그 일회용 DB에서만
제거한다. 이후 다음 파일을 만든다.

- `db/migration/V1_0__baseline.sql`
- `db/migration/V1_1__seed_meta_standard.sql`
- `db/migration/R__seed_framework.sql`
- `db/migration/R__zz_seed_base_admin.sql`
- `profile-lock.json`, `README.md`

완성된 V1 체인은 두 번째 빈 DB에 다시 적용된다. 테이블·시퀀스 집합, 현재 표준 메타 행 수, 그리고
day-1 관리자 부트스트랩(§3.3)의 SQL 단언이 모두 성립해야만 PASS한다.
`R__seed_demo.sql`은 collaboration 소유 테이블을 참조하므로 번들에 복사하지 않는다 —
데모 시드는 데모 프로필 소스 체인의 정의로만 남는다.

### 3.3 day-1 관리자 부트스트랩

V1 baseline은 `pg_dump --schema-only`라서 versioned 체인이 심은 데이터(V2_2 메뉴/권한,
V2_3 역할계층, V2_11 URL 인가 레지스트리)가 생성 base에서 전부 소실된다. 그대로 부팅하면
관리자가 로그인해도 두 겹으로 잠긴다: `DbUrlAuthorizationManager`는 fail-closed라
`tb_prgrm_lst`/`tb_role_prgrm_map`이 비면 `/api/v1/admin/**` 전체를 ROLE_ADMIN에게도
403으로 거부하고, `tb_menu_info`가 비어 `GET /api/v1/menus`가 빈 트리를 반환한다.

`R__zz_seed_base_admin.sql`이 이를 해소한다. 대상 테이블이 **비어 있을 때만**(신규 base)
아래를 시드하고, 풀시드 제품 DB에서는 전 블록이 no-op이다.

- URL 인가 anchor: `ADMIN_ALL(/api/v1/admin/**)`·`ACTUATOR_ALL(/actuator/**)` +
  ROLE_ADMIN/ROLE_SYSTEM 매핑 (V2_11과 동일 값 — 권한 확장 없음)
- core 잔존 라우트만 가리키는 최소 관리자 메뉴 트리(루트 1 + 잎 10)와 ROLE_ADMIN 매핑,
  `sq_menu_sn` 채번 전진
- 권한/역할 마스터(`tb_authrt_info`·ROLE_SYSTEM·`tb_authrt_role_map`·`tb_role_hierarchy`) 멱등 보증

회귀 게이트는 두 겹이다: DB 생성기의 verify 단계가 재적용 DB에서 부트스트랩 행 존재를 SQL로
단언해 시드가 빠지면 생성이 FAIL하고,
[BaseAdminBootstrapSeedIntegrationTest](../../api-server/src/test/java/nuri/api/schema/BaseAdminBootstrapSeedIntegrationTest.java)
(`:api-server:schemaValidationTest`, Testcontainers PostgreSQL 17)가 no-op 안전·부트스트랩 결과·
core 잔존 라우트 계약을 검증한다.

### 3.4 부팅 smoke 절차

생성 산출물을 릴리스로 승격하기 전에 실측한다.

1. 번들 DB를 빈 PostgreSQL에 적용하고 `ADMIN_INITIAL_PASSWORD` 환경변수와 함께 api-server를 부팅한다
   (미설정이면 webmaster는 로그인 불가 상태로 남는다 — `AdminPasswordProvisioner`).
2. `webmaster`로 로그인한다.
3. `GET /api/v1/menus`가 200이고 **비어 있지 않은** 트리를 반환하는지 확인한다.
4. 관리자 토큰으로 `GET /api/v1/admin/system/users`가 200인지 확인한다
   (URL 인가 fail-closed가 풀렸다는 증거).

### 3.5 소스 projection

DB 생성기가 출력한 실제 디렉터리를 `--db-bundle`에 전달한다.

```bash
npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp>
```

소스 생성기는 DB lock의 프로필·커밋을 현재 릴리스와 대조한 뒤 선택하지 않은 Java 도메인,
그 도메인에 의존하는 소비자, 프런트 라우트와 전이 importer를 제거한다. 원본 마이그레이션 체인은
검증된 V1 번들로 교체하고 `REUSABLE_BASE.md`와 `reusable-base-lock.json`을 기록한다.

### 3.6 제거되는 거버넌스 게이트와 승인

투영은 제외 도메인만 지우는 것이 아니라 **그 도메인을 참조하는 거버넌스 게이트까지 연쇄로** 지운다.
하네스 린터는 검사 대상의 FQN 을 소스에 직접 품기 때문이다. 그 뒤 생성기가 살아남은 게이트만으로
`baseline-manifest.properties` 를 다시 쓰므로, 파생 제품의 메타 게이트는 사라진 게이트를 **처음부터
없었던 것으로** 본다 — 아무 red 도 남지 않는 조용한 손실이다.

그래서 소스 생성기는 제거된 게이트를 항상 **말하고**(콘솔 · `REUSABLE_BASE.md` · `reusable-base-lock.json`
의 `removedGates`), 매니페스트의 명시적 승인과 exact 대조한다.

```json
"profiles": {
  "core": {
    "packs": ["core"],
    "acknowledgedRemovedGates": [
      { "file": "api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java",
        "reason": "demo 소유 표면의 RBAC 매트릭스라 그 표면이 없는 프로필에서는 검사 대상이 없다." }
    ]
  }
}
```

- 승인하지 않은 게이트가 제거되면 생성이 **FAIL** 한다.
- 제거되지 않는데 승인 목록에 남은 항목(낡은 승인)도 **FAIL** 한다 — 죽은 승인은 다음 제거를 조용히 통과시킨다.
- `reason` 이 비면 **FAIL** 한다. 목록이 곧 서랍이 되지 않도록 사유를 매니페스트 안에 남긴다.
- 승인은 삭제를 **허용**하는 장치가 아니라 **조용할 수 없게** 만드는 장치다. 게이트가 사라지는 변경에서는
  매니페스트와 커밋 메시지가 함께 움직여 diff 에 의도가 드러난다.

생성기는 DB 번들과 Docker 가 필요해 CI 에서 돌지 않는다. 승인 목록 **자체**의 건전성(형식·중복·대상 실재)은
`npm run test:base-profile`(CI 의 `test:operational-contracts` 에 포함)이 별도로 지킨다.

⚠ 현재 core·collaboration 프로필은 각각 파일 게이트 2건(`acknowledgedRemovedGates`)과 migration 검증 규칙
42건을 잃는다. 남은 둘(`SurveySubmissionConcurrencyIntegrationTest`·`RbacDemoSurfaceAuthorizationMatrixTest`)은 빠진
pack 의 표면만 검사하는 게이트라 검사 대상 자체가 없다. **남는 코드도 검사하던 횡단 게이트는 모두 되살렸다** —
`QueryCountGuardrailIntegrationTest`(DEC-OPS-084)와 `RbacAuthorizationMatrixTest`(DEC-OPS-085)는 pack 경계로 옮겼고,
`PrivacyAccessCensusLinterTest`(DEC-OPS-089)·`InputContractMirrorLinterTest`·`CrossDomainCouplingLinterTest`(DEC-OPS-090)는
판정 원장을 JSON 으로 옮겼다. 승인 목록의 정본은 매니페스트다.

**횡단 게이트를 되살리는 방식(DEC-OPS-089·090).** 표적 목록을 게이트 소스의 상수·타입 참조에서 JSON 원장으로
옮기고 항목마다 소유 pack 을 적는다. 원장은 셋이다 — `config/governance/privacy-access-census.json`,
`input-contract-mirror-census.json`, `cross-domain-coupling-census.json`.

- 게이트는 현재 트리 manifest 에 남은 pack 의 항목만 기대한다. 빠진 pack 항목은 **실제로 없을 때만** 부재로 인정한다
  — 타입 표적은 참조 타입 중 하나가 `ClassNotFoundException` 일 때, 결합 edge 는 소스 파일 중 하나가 없을 때다.
  전부 남아 있으면 pack 태그가 틀린 것이고, 링크 오류는 판정할 수 없는 것이라 둘 다 red 다.
- 태그는 **항목이 참조하는 소스가 모두** 살아남는 가장 작은 rank 누적 프로필이다. 생성기의 `planJavaRemoval` 을
  rank 누적 프로필마다 불러 대조하는 node 계약(`scripts/*-census-contract.test.mjs`, 공용 판정은
  `scripts/pack-tagged-registry.mjs`)이 CI 에서 지킨다. 실제 프로필에는 survey 만 더한 프로필이 없어 Java 게이트는
  survey 와 demo 태그를 구분하지 못한다 — 그 구분은 이 계약만 한다.
- 표적 하한(anti-vacuity)은 프로필과 무관하게 원장 **전체**에 적용한다.
- 원장 해시는 메타 게이트의 `GATE_REGISTRIES`, 판정 본문은 `ARCH_RULE_FILE` 의 `__sourceHash` 가 동결한다(생성기 미러 포함).
- 게이트 판정은 각 게이트 파일 안에 둔다. 공용 Java 헬퍼로 빼면 그 파일이 `__sourceHash` 밖으로 나가고, 다른 게이트
  클래스의 메서드를 부르면 한 게이트의 제거가 나머지를 끌고 나간다.
- 게이트 소스에는 빠질 수 있는 도메인 타입을 참조하지 않는다. 생성기의 Java 의존 판정은 **코드에서만** 한다 — import 선언·
  FQN·같은 패키지와 와일드카드 import 의 단순명을 주석·문자열·텍스트 블록을 지운 코드에서 본다(2026-09-14 부터. 그 전에는
  import 를 원문에서 읽어 red-proof 텍스트 블록 한 줄이 결합 census 게이트를 지웠다). 프런트 import 판정은 여전히 원문을
  본다(§3.7 규칙 4).

### 3.7 프런트 pack 마커 작성 규칙

모든 프로필에 남는 파일이 특정 pack 소유 코드를 쓸 때는 `reusable-base:<pack>:start` / `…:end` 마커 블록으로
감싼다. 생성기는 **마커 제거 → import cascade** 순서로 투영한다(`stripExcludedFrontendPackBlocks` → `pruneFrontend`).

1. **링크만이 아니라 그 구역 전체를 같은 pack 의 블록에 둔다** — 전용 import·지역 선언·데이터 조회·보조 함수·타입까지.
   파일 상단 import 블록과 JSX 블록처럼 같은 pack 블록을 여러 개로 나눠도 된다. 링크만 감싸면 축소 프로필에서
   미사용 import 로 타입 검사가 깨지거나(`noUnusedLocals`), 제거된 API 를 부르는 화면이 남는다(2026-09-13 생성기
   투영 확인: core 의 `/` 가 투영에서 제거되는 `/api/v1/dashboard` 호출 코드를 들고 있었다 — 실패는 오류 경계로
   전파되는 경로이며 런타임 실행은 하지 않았다).
2. **마커는 줄 단위이고 한 줄에 하나, 중첩 금지다.** 여닫는 태그가 다른 블록에 걸리면 연속 블록으로 나눈다.
   JSX 자식 위치는 `{/* … */}`, import·배열·객체·JSX 속성 위치는 `/* … */` 를 쓴다. 속성 목록 조립이 복잡하면
   props 객체를 만들어 spread 한다.
3. **설명 주석에 마커 토큰을 쓰지 않는다** — 짝이 맞지 않는 마커로 생성이 FAIL 한다.
4. **주석에 제거되는 모듈의 import 문장·경로를 인용하지 않는다.** 생성기의 cascade 판정은 주석을 지우지 않은
   원문에 import 정규식을 적용하므로(`@/`·상대 경로 모두), 주석 속 인용 한 줄이 파일 전체를 제거한다. (도달성
   census 토크나이저는 주석을 건너뛰어 이 차이를 보지 못한다 — 수신자 피커와 그 소비 화면은 생성기의 마커 투영·import
   판정 함수를 그대로 재사용하는 원문 가드 테스트로 막고, 그 밖의 파일은 투영 실행으로만 드러난다.)
5. **상위 rank pack 블록은 하위 rank pack 블록의 import 에 기댈 수 있다**(예: demo 블록이 collaboration 블록의
   `Link` 를 쓴다). 프로필은 rank 하향 폐쇄라 안전하다(`base:census` 가 강제). 반대 방향은 금지다.
6. **공용 컴포넌트는 pack 소유 구현을 import 하지 않고 주입받는다.** 수신자 피커는 주소록 출처를 prop 으로 받고,
   조합 지점(메일·문자 화면)만 demo 블록 안에서 어댑터를 넘긴다 — 공용 파일에 마커를 흩뿌리지 않는다.
7. **대상이 cascade 로 잘못 사라진 링크는 가리지 않는다.** 그 링크를 마커로 숨기면 신호를 은폐하게 된다(H2).
   원인(잘못된 import)을 고친다.
8. **판정은 투영본 `tsc --noEmit` 이다.** 마커 편집은 전체 제품 빌드에서 드러나지 않으며, 이 규칙을 기계로 막는
   CI 게이트는 아직 없다(GAP-PACK-001 ③). 마커를 추가·수정한 변경은 §4 절차로 core·collaboration 을 투영해
   base 커밋 대비 신규 타입 오류가 0 인지 확인한다.

## 4. 산출물 검증

생성된 디렉터리에서 아래 게이트를 모두 통과시킨다.

```bash
npm run test:base-profile
./gradlew compileJava compileTestJava
./gradlew :api-server:harnessTest :api-server:schemaValidationTest
pnpm -C frontend install --frozen-lockfile
pnpm -C frontend exec tsc --noEmit
```

Windows에서는 `./gradlew` 대신 `.\gradlew.bat`을 사용한다. 배포 아카이브를 만들 때는 Git index의
`gradlew` 실행 비트(100755)를 보존한다. 생성 디렉터리는 검증 후 별도 릴리스 자산으로 보관하며,
이를 다시 장기 브랜치의 정본으로 승격하지 않는다.

### 4.1 하네스 게이트의 프로필별 기대치 (2026-09-12 실측)

`:api-server:harnessTest` 의 통과 기대치는 **프로필마다 다르다**. 축소 프로필은 전체 제품 기준으로
동결된 수치를 그대로 들고 가므로 일부 게이트가 구조적으로 어긋난다 — 이것은 생성기 결함이 아니라
파생 제품이 기준선을 다시 동결해야 한다는 [DEC-OPS-019 재동결 절차](../04-operations/adopter-baseline-refreeze.md)의
적용 대상이다.

| 프로필 | 제거 java | harnessTest | 성격 |
|---|---|---|---|
| `demo` | 0 | **green이어야 한다** | 아무것도 제거하지 않으므로 어긋날 이유가 없다. red 면 생성기 결함이다. |
| `collaboration` | 238 | 일부 red | 축소 제품 ↔ 동결 census 불일치 |
| `core` | 435 | 73건 중 19건 red | 위와 같음 |

축소 프로필의 red 는 세 부류이며 해소 주체가 다르다(전수 분류·실측은 GAP-BASE-001).

1. **anti-vacuity 플로어가 축소 제품 규모보다 높다** — 요청 컨트롤러 30 < 하한 40, `@Entity` 0 < 20,
   재생 테이블 35 < 50, 핸들러 153 < 250 등. 플로어는 "스캔이 조용히 붕괴하면 실패" 장치이므로
   축소 제품에서는 실제 규모로 다시 동결해야 한다.
2. **exact 동결 census 가 제거된 타입을 지목한다** — Entity 74→31, PK 동결 목록의 `BoardMaster`,
   `@Transactional(readOnly)` 동결 목록의 `BoardService`, BaseSearchDto 28→26 등. 재동결 대상이다.
3. **횡단 게이트가 제거된 도메인 소스를 필수로 읽는다** — 첨부 assignment census 가 `BoardService`
   소스를, springdoc 동기화 게이트가 cascade 로 제거된 `OpenApiDocumentationTest` 를 요구한다.
   이쪽은 재동결로 풀리지 않고 표적 목록을 소스 밖으로 옮겨야 한다(GAP-PACK-001 ④).

2026-09-14 재측정(DEC-OPS-090 적용 후, 실제 생성기 투영): core 는 java 432개가 제거되고 harnessTest 90건 중
19건 red 다 — 되살린 횡단 게이트 3종(개인정보 3·입력 계약 10·결합 4건)은 core·collaboration 투영본에서 모두 통과했고
red 수는 그대로다(남은 red 는 위 세 부류). `demo` 는 90건 전부 green 이다.

⚠ 수치를 **추론하지 말고 실제로 돌려라.** 2026-09-12 이전에는 아무도 투영본에서 harnessTest 를 돌리지
않아 생성기 드리프트 4축이 v0.1.0(2026-08-24) 이후 계속 쌓여 있었고, `demo` 조차 red 였다.

## 5. 로컬 개발 검증

커밋 전 생성기 자체를 확인할 때만 다음 완화 플래그를 사용한다.

```bash
npm run base:generate-db -- \
  --profile collaboration --allow-dirty --allow-non-release-ref

npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp> \
  --allow-dirty --allow-non-release-ref
```

이 산출물의 lock에는 `localDevelopmentBuild: true`가 기록되며 공식 배포물로 사용할 수 없다.

## 6. 변경 절차

도메인·테이블·시퀀스 소유권이 바뀌면 다음 순서로 갱신한다.

1. 현재 migration과 엔티티의 최종 물리 상태를 확인한다.
2. `config/reusable-base-profiles.json`의 pack 소유권과 클러스터를 갱신한다.
3. `npm run test:base-profile`에서 누락·중복·상향 의존이 없는지 확인한다.
4. core, collaboration, demo DB 번들을 각각 생성해 빈 DB 재적용을 통과시킨다.
5. 영향을 받는 소스 projection을 생성해 §4 게이트를 통과시킨다.
6. 제거되는 거버넌스 게이트가 달라졌으면 `profiles.<name>.acknowledgedRemovedGates`를 사유와 함께
   갱신한다(§3.6). 승인 없이 게이트가 빠지면 생성이 FAIL한다.

기존 운영 DB를 작은 프로필로 변환하는 용도로 이 파이프라인을 사용하지 않는다. 운영 데이터 축소는
별도의 데이터 이관·백업·롤백 계획과 명시 승인을 요구한다.

## 7. 비정본 브랜치 주의

`template/reusable-base` 등 장기 template 브랜치는 현재 릴리스와 보안·DB·품질 게이트의 동기화를 보장하지 않는다. 신규 base 생성 입력으로 사용하지 않고, 필요한 역사 비교가 있을 때만 읽기 전용 참고 자료로 취급한다.

*Last reviewed against current sources: 2026-08-23.*
