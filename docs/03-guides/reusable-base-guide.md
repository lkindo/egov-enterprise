# 재사용 Base 생성 가이드

> **현행 정책**: 재사용 base는 `main`의 정확한 `v*` 릴리스 태그에서 생성하는
> 산출물이며, 생성 후 해당 프로필의 기술 검증을 통과해야 한다. `template/reusable-base`는 역사 브랜치이며 신규
> 프로젝트의 시작점으로 사용하지 않는다. 결정 배경은
> [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md)과 출력 형태를 보완하는
> [ADR-0020](../02-architecture/decisions/ADR-0020-selectable-reusable-backend-layouts.md)을 따른다.

## 1. 생성 모델

```text
clean v* release tag
        │
        ├─ current V2 migrations ─> disposable PostgreSQL ─> profile DB V1 baseline
        │                                                   └─ second empty DB reapply
        │
        └─ tracked source tree + profile manifest + verified DB bundle
                                      └─ projected source ─> selected backend layout
                                                                   └─ compile / tsc / harness / schema gate
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
| `demo` | core + collaboration + survey + demo | 현재 제품의 전체 참조 기능 |

프로필은 누적된다. 낮은 pack이 높은 pack을 의존할 수 없고, 물리 테이블·독립 시퀀스는 한 pack만
소유한다. `board`·`comment`·`scrap`처럼 함께 선택해야 하는 클러스터와 `tb_tmplt_info`처럼 공유되는
테이블 계약도 매니페스트에 명시한다. 수동 도메인 삭제 스크립트 `scripts/delete-domain.ps1`도 이
매니페스트의 `appDomains`·`clusters`를 같은 SSOT 로 소비한다([getting-started §5.1](getting-started.md#51-프로젝트-고유-기능-삭제)).

### 2.1 백엔드 출력 형태

프로필과 별개로 `--layout multi-module|single-module`을 선택한다. 생략하면 기존
`multi-module` 출력이다. 원본 저장소의 모듈 구조는 유지하며 생성한 소스에만 배치를 적용한다.

| 레이아웃 | 생성된 백엔드 | 소스와 실행 경계 |
|---|---|---|
| `multi-module` | 기존 Gradle 서브프로젝트 | `:api-server:bootRun` 등 기존 모듈 task 사용 |
| `single-module` | `include` 없는 루트 Gradle project 하나 | 기존 논리 소스 디렉터리를 source set으로 연결하고 루트 task 사용 |

단일모듈도 `foundation`, `business-core`, `business-app`, `api-server`의 소스 위치와 Java 패키지를
보존한다. 루트 `src`로 파일을 합치는 기능은 아니다. 검증용 source set은 원본 계층별 컴파일·테스트
클래스패스를 분리하여 core/app 경계와 동일 이름의 테스트·설정 자원을 지킨다. 프론트엔드는 두 형태
모두 별도 `frontend` 애플리케이션이다.

현재 선택 범위는 위 세 누적 프로필과 PostgreSQL이다. 레이아웃을 바꿔도 같은 프로필의 DB 번들을
사용한다. 임의 업무 기능 조합·기능별 메뉴 seed·선택 UI·다른 DB는
[프로젝트 생성기 상세 설계](../02-architecture/project-composer-design.md)의 후속 범위다.

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

V1 baseline은 `pg_dump --schema-only`이므로 versioned 체인이 기록한 메뉴·권한 부여 데이터가
그대로 승계되지 않는다. 현재 인가는 [ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md)의
복수 그룹과 명시 `OPERATION`·`NAVIGATION`을 사용한다. 관리자 그룹 이름만으로 모든 API를 허용하지
않으므로 신규 base에는 기능 부여와 메뉴를 명시적으로 초기화해야 한다.

`R__zz_seed_base_admin.sql`은 신규 base의 빈 권한·메뉴 상태와 변경 이력을 확인하여 초기화한다.
기존 제품 DB에서 회수된 기능·메뉴·사용자 배정을 재부여하지 않으며 예약 그룹의 수정된 이름도 덮어쓰지 않는다.

- 코드의 [기능 카탈로그](../../config/governance/permission-catalog.json) `defaultGroups`와 같은 명시 OPERATION 부여
- core 잔존 라우트의 최소 관리자 메뉴와 명시 NAVIGATION 부여, 메뉴 시퀀스 전진
- 예약 그룹과 최초 초기화 감사의 보존. 구 테이블 분기는 과거 Flyway target 검증용이며 현재 앱의 인가 모델이 아니다.

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
   (실제 기능 부여와 관리자 API 접근의 증거).

### 3.5 소스 projection

DB 생성기가 출력한 실제 디렉터리를 `--db-bundle`에 전달한다.

```bash
npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp> \
  --layout multi-module

npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp> \
  --layout single-module
```

소스 생성기는 DB lock의 프로필·커밋을 현재 릴리스와 대조한 뒤 선택하지 않은 Java 도메인,
그 도메인에 의존하는 소비자, 프런트 라우트와 전이 importer를 제거한다. 원본 마이그레이션 체인은
검증된 V1 번들로 교체하고 `REUSABLE_BASE.md`와 `reusable-base-lock.json`을 기록한다.

`--layout`은 소스 생성기의 인자이며 DB 생성기에 전달하지 않는다. 기본 소스 출력 경로는
`build/reusable-base/source/<profile>-<sha>`이고 단일모듈에는 `-single-module` 접미사가 붙는다.
명시 `--output`도 기존 디렉터리를 덮어쓸 수 없다. 소스 lock의 `layout`이 선택 결과를 기록하며,
검증기는 필드가 없는 이전 lock만 `multi-module`로 해석한다. 미지원 값과 요청·생성물 불일치는 실패한다.

생성 완료 시 출력 폴더에 독립 Git 저장소를 초기화한다. 부모 저장소의 `build/` 제외 규칙이
프런트엔드 파일 탐색에 전파되지 않도록 하는 경계이며, 파일 추가·커밋·원격 연결은 수행하지 않는다.
인수 시 숨김 `.git` 디렉터리도 유지하거나, 옮긴 프로젝트의 루트에서 `git init` 후 빌드한다.

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

생산 저장소 CI의 `reusable-base` 3프로필 × 2레이아웃 matrix가 실제 DB 번들과 소스 생성·산출물 검증을 실행하고 결과를 required
`backend-build`에 집계한다. 승인 목록 **자체**의 건전성(형식·중복·대상 실재)은
`npm run test:base-profile`(CI의 `test:operational-contracts`에 포함)이 별도로 지킨다.

현재 core·collaboration 프로필은 각각 파일 게이트 2건(`acknowledgedRemovedGates`)과 역사 검증 규칙
45건을 제외한다. 역사 규칙은 V2 migration 파일 검증 42건과 구 인가 전환 검증 3건이며, 새 V1 baseline의 현재
PostgreSQL 스키마 검증은 계속 실행한다. 남은 둘(`SurveySubmissionConcurrencyIntegrationTest`·`RbacDemoSurfaceAuthorizationMatrixTest`)은 빠진
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
8. **판정은 실제 투영본의 타입·lint·build와 적용범위 계약이다.** 마커 편집은 전체 제품 빌드만으로 확인할 수 없다.
   마커를 추가·수정하면 `base:verify`로 영향 프로필을 생성·검증한다. CI도 세 프로필과 두 레이아웃의 같은 경로를 실행한다.
   컴파일 성공만으로 모든 링크와 API의 런타임 동작이 증명되는 것은 아니다.

### 3.8 검토 원장 투영과 기관 승인

[ADR-0018](../02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)에 따라
원본 제품의 검토 이력과 도입 기관의 운영 승인을 구분한다. 소스 생성기는 URL census·승인·route·UI quality·
화면 용어·KRDS 원장, 적용범위 계약과 공용 메모리를 해시가 붙은 `config/governance/upstream-review/` snapshot으로 보존하고, 실제 투영 소스에서
active URL·route census를 다시 생성한다. 살아남은 동일 소스·관측 범위에만 원본 승인 selector를
제한하며 원본 검토자·날짜·근거는 바꾸지 않는다. 투영 범위는
`config/governance/reusable-governance-projection.json`에 기록한다.

UI 시나리오·화면 용어 pilot·KRDS의 적용범위는 [review scope 계약](../../config/governance/reusable-review-scopes.json)의
명시 소유 pack에서 계산한다. 적용 대상 소스가 실수로 없어졌다는 이유로 검사를 제외하지 않는다. 유지하는
시나리오의 경로·step·근거 파일은 실제로 존재해야 하며, 프레임워크 pack과 브랜드 프로필은 별개 축이다.
원본의 측정 결과를 현재 프로필의 실행 증거로 자동 승격하지 않는다.

`config/governance/adoption-review.json`은 선택한 프로필의 `pending`으로,
`migration-adoption-review.json`도 독립 이관 제품의 새 `pending`으로 생성한다. 원본 승인 이력이
기관의 데이터 분류·권한·로그·접근성 검토를 대신하지 않는다. 일반 `reviewBy` 경과는 운영 보고에
표시하며 기술 빌드를 무효화하지 않는다. 실제 기관 사용 승인의 대상·범위·유효기간은 기관 preflight에서
별도로 차단한다. 명령과 근거 작성은 [검토 수명 가이드](governance-review-lifecycle.md)를 따른다.

생성물의 공용 메모리는 해당 프로필의 짧은 파생 인덱스로 바뀐다. 원본 OCI·운영 검증 사실과 과거 결정은
upstream snapshot에 보존하고 기관의 사실로 복제하지 않는다. 기관의 실제 상태는 현재 승인 원장이 정본이다.

[무결성 검사](../../scripts/reusable-governance-integrity.mjs)는 snapshot·소스 결속·승계 selector·원장 모집단·
메모리·프로필 lock을 대조한다. 이는 생성된 출시 산출물의 인증 검사다. 도입 후 개발로 소스가 바뀌면 기존
승계 증거의 적용범위를 재검토해야 하며, 해시만 다시 기록하여 기존 승인을 유지해서는 안 된다.

## 4. 산출물 검증

생산 저장소에서 각 프로필의 전체 경로를 확인한다. Docker에 새 격리 PostgreSQL 컨테이너를 만들고,
새 DB 번들·소스를 생성한 뒤 의존성을 설치하여 산출물을 검사한다. 기존 운영·공유 DB를 사용하지 않으며,
종료 시 이번 호출이 만든 컨테이너만 소유권을 확인하여 정리한다. 생성 파일과 검증 보고서는 보존한다.

```bash
npm run base:verify -- --profile core
npm run base:verify -- --profile collaboration
npm run base:verify -- --profile demo
npm run base:verify -- --profile core --layout single-module
npm run base:verify -- --profile collaboration --layout single-module
npm run base:verify -- --profile demo --layout single-module
```

앞의 세 명령은 기본 `multi-module` 검증이며 `--layout multi-module`을 명시해도 같다.
DB 생성은 레이아웃과 독립이고, 검증 driver는 소스 생성기에 선택한 레이아웃을 전달한 뒤 lock과 대조한다.

실행 정본은 [생성·검증 driver](../../scripts/verify-reusable-base.mjs)와
[산출물 runner](../../scripts/verify-reusable-artifact.mjs)다. 범위는 거버넌스 무결성·활성 원장·부정 계약,
Java 컴파일·하네스·실 PostgreSQL 스키마 검증, 프런트 `tsc`·lint·build다. 브라우저 시나리오 실행과 실제
기관 환경 승인은 별도다. 생산 저장소 보고서는 멀티모듈의
`build/reports/reusable-base/<profile>.json`, 단일모듈의
`build/reports/reusable-base/<profile>-single-module.json`에 기록하며 `layout` 필드를 포함한다.
각 생성 디렉터리 내부의 runner 보고서는 기존 `build/reports/reusable-base/<scope>.json` 경로를 유지한다.
이 보고서는 실행한 기술 검증 범위만 기록한다.

이미 생성한 디렉터리에서 의존성을 설치한 뒤에는 `npm run verify`로 같은 산출물 검사를 실행한다.
`npm run test:operational-contracts`는 공통 활성 계약을, pre-push는 전체 산출물 검사를 실행한다.
생산 저장소의 원본 회귀 테스트는 생산 저장소에서 계속 실행한다.

온라인 생성물의 명령은 다음과 같다. 모든 scope는 거버넌스 무결성·활성 UI 계약·실행 경로 계약을 먼저 검사한다.

| 생성물 명령 | runner scope | 추가 검사 |
|---|---|---|
| `npm run verify:docs`, `npm run test:operational-contracts` | `contracts` | 공통 계약만 |
| `npm run verify:be` | `backend` | Java 컴파일·하네스·실 DB 스키마 |
| `npm run verify:fe` | `frontend` | 프런트 타입·lint·build |
| `npm run verify`, `verify:artifact`, `verify:full`, `verify:push`, `verify:fast` | `full` | backend와 frontend 모두 |

단일모듈 산출물에서 직접 사용하는 Gradle 명령은 다음과 같다. 명령은 생성 디렉터리에서 실행하며,
Windows PowerShell에서는 `./gradlew` 대신 `.\gradlew.bat`를 사용할 수 있다.

| 명령 | 범위 |
|---|---|
| `./gradlew bootRun` | 온라인 API 실행 |
| `./gradlew bootJar` | 온라인 실행 jar `build/libs/app.jar` 생성 |
| `./gradlew harnessTest schemaValidationTest` | governance 하네스와 실제 PostgreSQL 스키마 검증 |
| `./gradlew allTests` | API·foundation·core·app 및 독립 이관 도구의 일반 테스트 suite 실행 |
| `./gradlew migrationBootJar` | 별도 migration source set으로 오프라인 이관 실행 jar 생성 |

`compileTestJava`는 단일모듈의 출처별 테스트 source set도 함께 컴파일한다. 산출물 runner의
backend 범위는 컴파일·하네스·스키마 검사이며 모든 일반 테스트 실행과 같지 않다. `allTests`는 일반
테스트를 묶는 별도 task이고 API의 하네스·스키마 태그는 위 이름 있는 task에서 실행한다.
`migrationBootJar`는 온라인 jar·클래스패스에 이관 코드를 합치지 않는다. jar 빌드나 테스트 통과는
기관 데이터 이관 실행 승인을 부여하지 않으며 기존 오프라인 승인 절차를 따른다.

`fast`·`push`는 기존 호출부와의 보수적인 호환을 위해 `full`에 연결된다. 생산 저장소처럼 비용 순으로
중첩된 단계가 아니다. 생산자 전용 `base:*`와 기관 환경이 필요한 `verify:e2e`·`verify:ops` 별칭은 생성물에서
제거한다. 기관 브라우저 검증과 원격 ruleset 검증은 기관에서 별도로 설계하고 연결한다.

생산 저장소는 기존 6개 required context를 유지하며 3프로필 × 2레이아웃의 6개 생성 조합을 검사한다. 생성물은
`artifact-verification` 한 job에서 자기 프로필·레이아웃의 산출물 runner를 직접 실행하고, 기존 버전의 gitleaks
working-tree·incremental 검사를 함께 수행한다. 실제 실행 설정은
[생성물 실행 경로 계약](../../scripts/reusable-artifact-entrypoints-contract.mjs)이 정한다.

생산 저장소의 12개 workflow·required-check 명세·package·pre-push는
`config/governance/upstream-verification/`에 SHA-256이 붙은 비활성 이력으로 보존한다. 원본 CodeQL·E2E·mutation과
배포·예약 작업은 기관 범위에 맞게 다시 결속해야 하며, 생성물 기본 CI가 원본 CI와 동등한 검증이나 운영 인증을
제공한다고 주장하지 않는다. 생성물의 `.github/required-checks.json`은 `remoteApplied: false`이고 대상 브랜치·App은
미설정이다. 기관이 `artifact-verification`과 추가로 선택한 검사를 실제 ruleset에 연결해야 병합을 강제할 수 있다.

Windows에서는 `./gradlew` 대신 `.\gradlew.bat`을 사용한다. 배포 아카이브를 만들 때는 Git index의
`gradlew` 실행 비트(100755)를 보존한다. 생성 디렉터리는 검증 후 별도 릴리스 자산으로 보관하며,
이를 다시 장기 브랜치의 정본으로 승격하지 않는다.

기관 도입 검토를 시작할 때는 같은 산출물에서 `npm run review:status`로 현재 검토 상태와 scope digest를
확인한다. 기관이 원장을 검토·작성한 뒤 `npm run review:adoption -- --environment <실제-환경-ID>`를
자기 배포 직전 절차에 연결한다. 기본 `pending`은 기관 검토 미완료이며 참조 프레임워크 릴리스의
전역 차단 조건은 아니다. 독립 이관 도구만 사용하는 프로젝트는 `verify:migration`과 이관 전용 원장을 사용한다.

### 4.1 하네스 게이트의 프로필별 기대치

현재 승인된 계약은 **세 프로필 모두 각 출력 레이아웃의 기술 게이트를 통과하는 것**이다. 생성기는 원본 제거 계획의
retained/removed Java 소스·FQCN 집합을 실제 산출물과 정확히 대조해
`config/governance/reusable-harness-profile.json`에 결속한다. 하네스는 이 명시 모집단으로 축소 제품을
검사하며 파일 부재만으로 임의의 검사를 생략하지 않는다. 기관 고유 코드 변경은
[adopter 재동결 절차](../04-operations/adopter-baseline-refreeze.md)로 별도 검토한다.

2026-09-14에는 실제 생성한 세 프로필에서 Java 전체 컴파일과 아래 검사를 실행해
실패·건너뜀 0건을 확인했다. 이에 따라 축소 하네스 붕괴 `GAP-BASE-001`은 활성 gap에서 제거했다.

| 프로필 | `harnessTest` | 실제 PostgreSQL `schemaValidationTest` |
|---|---|---|
| `core` | 91/91 | 11/11 |
| `collaboration` | 91/91 | 11/11 |
| `demo` | 91/91 | 13/13 |

소스 모집단·필수 실행 단계의 누락, 잘못된 프로필과 보안 부정 테스트 변조가 red가 되는 것도
확인했다. 이 로컬 기술 검증과 현재 커밋의 required CI는 별개이며, 병합에는
현재 3프로필 × 2레이아웃 matrix를 포함한 required CI 통과가 필요하다. 위 날짜의 실측은 단일모듈
출력의 검증 결과를 포함하지 않는다. 기관의 운영·업무 승인은 별도다.

아래 수치는 **2026-09-12의 역사적 진단**이며 현재 허용되는 실패 수가 아니다.

| 프로필 | 제거 java | harnessTest | 성격 |
|---|---|---|---|
| `demo` | 0 | 당시 수정 후 green | 생성기와 하네스 메타 계약의 드리프트 수정 |
| `collaboration` | 238 | 당시 일부 red | 축소 제품 ↔ 동결 census 불일치 |
| `core` | 435 | 73건 중 19건 red | 위와 같음 |

당시 실패는 세 부류였다.

1. **anti-vacuity 플로어가 축소 제품 규모보다 높다** — 요청 컨트롤러 30 < 하한 40, `@Entity` 0 < 20,
   재생 테이블 35 < 50, 핸들러 153 < 250 등. 플로어는 "스캔이 조용히 붕괴하면 실패" 장치이므로
   현재 생성기는 승인된 소유권과 실제 모집단을 먼저 대조한다.
2. **exact 동결 census 가 제거된 타입을 지목한다** — Entity 74→31, PK 동결 목록의 `BoardMaster`,
   `@Transactional(readOnly)` 동결 목록의 `BoardService`, BaseSearchDto 28→26 등이었다.
3. **횡단 게이트가 제거된 도메인 소스를 필수로 읽는다** — 첨부 assignment census 가 `BoardService`
   소스를, springdoc 동기화 게이트가 cascade 로 제거된 `OpenApiDocumentationTest` 를 요구한다.
   대상 소유권과 검증 실행 경로를 함께 수정해야 하는 문제다.

2026-09-14의 이번 프로필 검증 확장 **이전** 재측정(DEC-OPS-090 적용 후, 실제 생성기 투영): core 는 java 432개가 제거되고 harnessTest 90건 중
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
  --layout single-module \
  --allow-dirty --allow-non-release-ref
```

이 산출물의 lock에는 `localDevelopmentBuild: true`가 기록되며 공식 배포물로 사용할 수 없다.
§4의 `base:verify`도 개발·CI 검증을 위해 이 플래그를 사용한다. 공식 출시물은 clean release tag에서
완화 플래그 없이 생성하고 산출물 전체 검증을 통과시킨다.

## 6. 변경 절차

도메인·테이블·시퀀스 소유권이 바뀌면 다음 순서로 갱신한다.

1. 현재 migration과 엔티티의 최종 물리 상태를 확인한다.
2. `config/reusable-base-profiles.json`의 pack 소유권과 클러스터를 갱신한다.
3. `npm run test:base-profile`에서 누락·중복·상향 의존이 없는지 확인한다.
4. core, collaboration, demo DB 번들을 각각 생성해 빈 DB 재적용을 통과시킨다.
5. 영향을 받는 소스 projection을 두 레이아웃으로 생성해 §4 게이트를 통과시킨다.
6. 제거되는 거버넌스 게이트가 달라졌으면 `profiles.<name>.acknowledgedRemovedGates`를 사유와 함께
   갱신한다(§3.6). 승인 없이 게이트가 빠지면 생성이 FAIL한다.

기존 운영 DB를 작은 프로필로 변환하는 용도로 이 파이프라인을 사용하지 않는다. 운영 데이터 축소는
별도의 데이터 이관·백업·롤백 계획과 명시 승인을 요구한다.

## 7. 비정본 브랜치 주의

`template/reusable-base` 등 장기 template 브랜치는 현재 릴리스와 보안·DB·품질 게이트의 동기화를 보장하지 않는다. 신규 base 생성 입력으로 사용하지 않고, 필요한 역사 비교가 있을 때만 읽기 전용 참고 자료로 취급한다.

*생성·검증·부트스트랩·기관 도입 경계 검토: 2026-09-14. 실제 결과는 해당 산출물의 검증 보고서가 정본이다.*

*출력 레이아웃·명령 계약 반영: 2026-09-19. 위 과거 날짜의 테스트 수치는 당시 이력이며 새로운 레이아웃의 실행 결과로 승계하지 않는다.*
