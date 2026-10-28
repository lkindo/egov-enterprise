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
        └─ tracked source tree + config/modules + verified DB bundle
                                      └─ projected source ─> selected backend layout
                                                                   └─ compile / tsc / harness / schema gate
```

- 단일 정본: 현재 릴리스 소스
- 기능 소유·시작 구성 SSOT: [`config/modules`](../../config/modules/) — 기능 파일(`<기능 id>.json`)·`core.json`·`presets.json`. v1 manifest 는 11단계 C7 에서 걷었다.
- 생성기: `scripts/generate-reusable-base-db.mjs`, `scripts/generate-reusable-base-source.mjs`
  - 소스 투영 단계: `reusable-source-tree`(복사·Git), `-java`(Java 제거 계획·투영), `-frontend`(마커 블록·연쇄 제거), `-gates`(게이트 제거 승인·하네스 조정), `-harness`(하네스 기준선 거울) `.mjs`
  - DB 번들 단계: `reusable-db-postgres`(컨테이너·psql·pg_dump), `reusable-db-migrations`(버전 순서·권한 Contract 리허설) `.mjs`
- 출력: `build/reusable-base/` 아래의 무시되는 릴리스 준비 산출물
- 금지: 장기 template 브랜치 수동 동기화, 운영·공유 DB에서 테이블 삭제, 생성 SQL 수동 편집

## 2. 프로필

프로필(시작 구성)의 실제 테이블·시퀀스 집합은 `core.json`·기능 파일의 `owns` 이고, 원본 스키마의 물리 실측 수는 `core.json` 의
`databaseSnapshot` 이다. `npm run base:census` 가 그 둘을 소스와 대조한다. 시작 구성은 `presets.json` 의 이름 붙은 기능 목록이다.

| 프로필 | 선택 기능 | 용도 |
|---|---|---|
| `core` | 없음 | 인증·사용자·조직·권한·메뉴·코드·파일·로그·정책·통계 중심 최소 골격 |
| `collaboration` | 게시판·댓글·스크랩·메일·쪽지·알림·문자·실시간 대시보드 | core + 협업 기본 |
| `demo` | 선택 기능 22개 전부 | 현재 제품의 전체 참조 기능 |
| `survey` | 설문·투표 | 공통 기반 + 설문(인증 시작 구성, 13b) |
| `approval` | 약식 전자결재 | 공통 기반 + 결재(인증 시작 구성, 13b) |

시작 구성은 이름 붙은 기능 목록이다([ADR-0028](../02-architecture/decisions/ADR-0028-presets-are-named-domain-lists.md)). 지금 `core` ⊂ `collaboration` ⊂ `demo` 는 포함 관계지만
규칙이 아니다. `survey`·`approval` 은 공통 기반에 기능 하나를 더한 구성이라 `collaboration` 에
들지 않는다(DEC-OPS-295). 결재 구성에는 알림이 없어, 알림 행까지 보는 결재 시험 하나(`ApprovalReferenceNotificationIntegrationTest`)만
그 구성에서 빠지고 나머지 결재 통합 시험(`ApprovalWorkflowIntegrationTest`)은 남는다(DEC-OPS-303). 시작 구성의 기능 목록은 필수 의존 폐포에 닫혀 있어야 하고(카탈로그 적재가 검사한다 — 11단계 C5 에서
pack 순위 검사를 대신했다), 물리 테이블·독립 시퀀스는 한 기능만 소유한다. `board`·`comment`처럼 함께 선택해야 하는
묶음(`dependsOn` 의 `bundle`)과 `tb_tmplt_info`처럼 공유되는 테이블 계약(`owns.sharedTables`)도 기능 파일에 명시한다. 수동 도메인 삭제 스크립트
`scripts/delete-domain.ps1`은 기능 파일(`config/modules/<기능>.json`)로 도메인을 확인하고, 동반 삭제는 생성기와 같은 카탈로그
간선을 거꾸로 따라 정하며, 화면은 지우는 기능의 화면 소유로 지운다([getting-started §5.1](getting-started.md#51-프로젝트-고유-기능-삭제)).

생성기는 시작 구성도 기능 단위로 투영한다(2026-10-13 매니페스트 v2 11단계 C3). 제외 기능은 시작 구성의 기능 목록에서, 화면 제외 경로는
기능 규칙에서 정하고 pack 의 `removePaths` 를 보지 않는다 — 같은 기능 목록의 직접 선택과 같은 결과다. 기능 소유·지원 파일·시작 구성
기대치는 매니페스트 v2(`config/modules`)에서 읽는다. 소유 기능이 빠진 공유 테이블은 그 테이블 선언의 소비자 가운데 구성에 있는 첫
기능이 넘겨받는다(순위를 보지 않는다). 생성물의 `config/modules` 에는 구성의 기능 파일·`core.json`·활성 구성 하나만 담은
`presets.json` 이 남고 생성물 무결성 검사가 그 집합을 구성과 대조한다. 그 `presets.json` 의 `active` 가 생성물 표지다 — 권한 생성기·
하네스 프로필·원장 계약·생성물 무결성 검사는 표지를 생성기 투영 구조(활성 구성 하나·기능 파일 집합)와 함께 확인하고, 구조가
다르거나 lock 이 있는데 표지가 없으면 실패한다. lock·하네스 프로필에도 pack 이 없다(11단계 C5). 걷은 v1 소유 선언 파일
(`config/reusable-base-profiles.json`)이 원본이나 생성물에 되살아나면 로더·카탈로그·생성물 표지 판정이 '옛 소유 선언이 남아 있다'
(`old ownership declaration remains`)로 멈추고, 운영 계약이 생산 코드의 그 이름 참조를 막는다(11단계 C7).

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

이 가이드의 명령은 위 다섯 시작 구성과 PostgreSQL을 대상으로 한다. 프로필도 도메인 선택형 생성기와
같은 해석기로 구성을 만든다(DEC-OPS-239). 구성 식별자에 출력 레이아웃이 들어가므로 DB 번들은 레이아웃마다
만든다. 레이아웃이 달라도 테이블·메뉴·권한 내용은 같다. 개별 도메인 선택과 별도 로컬 UI는
[도메인 선택형 생성기 가이드](project-composer-guide.md)를 따른다. 추가 DB는
[프로젝트 생성기 상세 설계](../02-architecture/project-composer-design.md)의 후속 범위다.

## 3. 공식 생성

### 3.1 선행 조건

- 작업 트리가 깨끗해야 한다.
- `HEAD`가 정확한 `v*` 릴리스 태그여야 한다.
- Docker와 실행 중인 PostgreSQL 컨테이너가 필요하다. 컨테이너 이름은 `--container <name>`으로 반드시
  지정한다(기본값이 없다).
- 생성기는 이름이 `test_reusable_base_*`인 일회용 DB만 만들고 종료 시 제거한다.
- 원본 frontend 의존성이 설치돼 있어야 한다(`pnpm -C frontend install --frozen-lockfile`). 소스 생성기는 생성물의 API 계약을
  원본의 TypeScript·openapi-typescript 로 다시 만들며(§3.5), 없으면 출력 폴더를 만들기 전에 `TOOL_UNAVAILABLE` 로 멈춘다.

### 3.2 DB 번들

```bash
npm run base:census
npm run base:generate-db -- --profile collaboration --container <name>
npm run base:generate-db -- --profile collaboration --layout single-module --container <name>
```

`--profile`은 프리셋 레시피를 만들어 [구성 해석기](../../scripts/project-composer-recipe.mjs)를 거친다
(`--layout` 기본값은 `multi-module`). 생성기는 현재 versioned migration 전체를 빈 DB에 적용하고, 구성 밖의
객체를 그 일회용 DB에서만 제거하며, 남는 테이블의 물리 스키마가 보존됐는지와 기능 간 외래 키 선언을
대조한다. 이후 다음 파일을 만든다.

- `db/migration/V1_0__baseline.sql`
- `db/migration/V1_1__seed_meta_standard.sql`
- `db/migration/R__seed_framework.sql`
- `db/migration/R__seed_reference_data.sql` — 원본 마이그레이션이 넣은 공통코드 그룹과 앱이 하드코딩한 게시판 마스터 가운데 선택한 기능의 몫([선언](../../scripts/reusable-reference-data.mjs), [DEC-OPS-262](../../.agent/memory/decisions.md))
- `db/migration/R__zz_seed_base_admin.sql`
- `schema-contract.json`, `schema-reapplied.json`, `README.md`
- `profile-lock.json` — 재적용 검증을 모두 통과한 뒤에만 `validated: true`와 파일 해시를 담아 기록한다

완성된 V1 체인은 두 번째 빈 DB에 다시 적용된다. 테이블·시퀀스 집합, 물리 스키마, 현재 표준 메타 행 수,
그룹별 메뉴·권한 배정, 참조 데이터(공통코드 그룹·게시판 마스터) 집합과 day-1 관리자 부트스트랩(§3.3)의 SQL 단언이 모두 성립해야만 PASS한다.
소스 생성기는 검증된 같은 구성의 번들만 받는다.
`R__seed_demo.sql` 자체는 번들에 복사하지 않는다. 그 안의 게시판 마스터 행은 게시판 기능을 고른 구성에서만 참조 데이터 시드에 들어간다.
공통코드 그룹은 core 소유가 기본이고, 게시판(COM009)·결재(COM075) 그룹은 그 기능을 고를 때만 싣는다(게시판 유형은 공통코드가 아니다 — DEC-OPS-332). 상세 코드는 원본도 시드하지 않는다(PD-DB-003).
데이터 seed(표준 메타·참조 데이터)는 덤프 직전에 표를 기본 키 순서로 다시 써서(`CLUSTER`) 행 순서가 실행·구성과 무관하다. 그래서 내용이 같으면 파일 해시도 같다. 기본 키가 없는 표는 seed 로 덤프할 수 없다.

### 3.3 day-1 관리자 부트스트랩

V1 baseline은 `pg_dump --schema-only`이므로 versioned 체인이 기록한 메뉴·권한 부여 데이터가
그대로 승계되지 않는다. 현재 인가는 [ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md)의
복수 그룹과 명시 `OPERATION`·`NAVIGATION`을 사용한다. 관리자 그룹 이름만으로 모든 API를 허용하지
않으므로 신규 base에는 기능 부여와 메뉴를 명시적으로 초기화해야 한다.

`R__zz_seed_base_admin.sql`은 신규 base의 빈 권한·메뉴 상태와 변경 이력을 확인하여 초기화한다.
기존 제품 DB에서 회수된 기능·메뉴·사용자 배정을 재부여하지 않으며 예약 그룹의 수정된 이름도 덮어쓰지 않는다.
원본 파일은 바꾸지 않고, 번들에는 구성으로 투영한 같은 시드를 싣는다.

- 선택한 기능의 [기능 카탈로그](../../config/governance/permission-catalog.json) `defaultGroups`와 같은 명시 OPERATION 부여
- [메뉴 스냅숏](../../config/project-composer-menus.json)에서 구성이 고른 메뉴와, 원본의 그룹별 NAVIGATION 배정을
  그 메뉴만큼 투영한 부여(그룹마다 표시하는 메뉴에 들어갈 수 있어야 한다), 메뉴 시퀀스 전진
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

DB 생성기가 출력한 실제 디렉터리를 `--db-bundle`에 전달한다. 번들은 같은 레이아웃으로 만든 것이어야 한다 —
레이아웃이 다르면 소스 생성기가 다시 만들 명령을 알려 주고 멈춘다.

```bash
npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp> \
  --layout multi-module

npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle <--layout single-module DB 실행이 출력한 경로> \
  --layout single-module
```

DB 번들의 기본 경로(`build/reusable-base/<profile>-<sha>-<timestamp>`)에는 레이아웃이 붙지 않는다. 생성 완료
메시지의 경로를 쓰고, 레이아웃은 번들의 `profile-lock.json`에서 확인한다.

소스 생성기는 DB lock의 프로필·커밋·레이아웃·구성 해시를 현재 릴리스와 대조한 뒤 선택하지 않은 Java 도메인,
그 도메인에 의존하는 소비자, 프런트 라우트와 전이 importer를 제거한다. 원본 마이그레이션 체인은
검증된 V1 번들로 교체하고 `REUSABLE_BASE.md`와 `reusable-base-lock.json`을 기록한다.
루트 이관 카탈로그(`db_columns.json`)는 DB 번들이 검증한 스키마로 다시 쓴다([카탈로그 투영](../../scripts/reusable-migration-catalog.mjs), DEC-OPS-263).
이관 도구는 이 카탈로그로 매핑 타깃을 판정하므로, 구성에서 빠진 표로 가는 매핑은 검증 단계에서 거부된다.
Flyway 이력 표 항목만 원본에서 가져오고, 산출물의 스키마 검증이 카탈로그와 적용 스키마를 정확히 대조한다.

권한 정의는 구성으로 함께 투영한다([권한 투영](../../scripts/reusable-permission-projection.mjs), DEC-OPS-287).
권한 카탈로그는 구성의 권한 코드만 남기고, Java·TS 코드 상수와 시드의 생성 블록도 그 카탈로그에서 다시 만든다.
인가 원장의 연산 바인딩은 핸들러 소스가 지워진 행을 빼고 외부(`EXTERNAL#`) 행은 남긴다. 런타임 바인딩은 이 원장에서 그대로 나온다.
권한 묶음은 구성 코드로 줄이고, 여는 화면이나 관련 화면이 남을 때만 둔다. 줄인 권한 집합이 앞 묶음과 같으면 뺀다.
남는 권한인데 남은 묶음에 없으면 원본 묶음 이름을 적은 생성 제외 행이 된다. 원본 규칙(여는 화면 하나 이상)은 그대로다.
권한이 하나라도 빠진 묶음은 원본 이름 뒤에 '(이 구성에 남은 권한)'을 붙이고, 설명을 기능을 열거하지 않는 고정 문장으로 바꾼다 —
원본 설명은 빠진 기능을 맡긴다고 말할 수 있다(core 의 '기본 업무'는 권한 72개 중 11개만 남는데 설명은 결재·게시판·쪽지를 말했다).
맡기는 일은 권한 작업대의 묶음 대화상자가 권한 수와 여는 화면·관련 화면의 이름으로 보인다. 화면 이름을 설명에 옮겨 적지 않는다 —
화면 이름에는 묶음 문구가 쓰면 안 되는 용어가 있다. 권한이 그대로인 묶음은 이름·설명이 원본과 같다. 계획의 '생성 뒤 직접 배정할
권한' 안내도 묶음을 생성물에 실릴 이름으로 부른다(DEC-OPS-330).
화면 목록(`generated-screen-registry.ts`)은 TypeScript 없이 데이터로 투영한다.
화면·별칭·라벨은 생성물 트리에서 화면 목록 생성기와 같은 뼈대로 정하고, 쓰기·표시 귀속은 원본 행에서 구성 밖 코드만 뺀다.
생성물의 라우트 원장은 검토 전이라, 화면 라벨은 같은 page 파일이면 원본 라우트 원장 스냅숏에서 가져온다.
생성물에서 다시 만든 결과와 같은지는 야간 생성물 검사(T2)의 `--check` 가 본다.
투영본의 하한은 원본 값(권한 200·바인딩 350)이 아니라 도출값과의 정확한 비교다.
카탈로그는 구성 코드 수, 바인딩은 하네스 census(`permissionCatalog`·`operationBindings`)와 같아야 하고,
바인딩 핸들러 소스는 생성물에 있어야 한다. 생성물 무결성 검사는 이 불변식과 화면 목록의 내부 불변식(화면·묶음의 권한이 카탈로그
안에 있다)을 다시 세고, 권한 생성물을 다시 만들어 대조한다. 화면 목록을 TypeScript 로 다시 만든 결과와의 동치는 T2 `--check` 만 본다.
정밀 점검(PERMISSION_PROJECTION)은 같은 함수로 남는 page 전부(넘기는 page 포함, 목적지가 사라진 리다이렉트는 거버넌스 투영처럼 뺀다)의
카탈로그 키·진입 권한, 남는 바인딩, 묶음 투영을 미리 판정한다. 정밀 점검 계약이 복사한 트리에 생성기의 거버넌스 단계를 돌려 남는
page·화면 수·남는/빠지는 묶음·생성 제외 권한이 같은지 대조한다.
모든 기능을 고른 구성(demo)은 카탈로그·인가 원장·묶음 원장·화면 목록·권한 생성물이 원본과 바이트가 같다.
**이미 배포한 생성물 DB 는 정리하지 않는다.** 예전 생성물로 만든 DB 에는 지금 구성 밖 권한이 그룹에 배정돼 있을 수 있다.
새 생성물은 그 코드를 모르므로 권한 스냅숏이 그 그룹 사용자의 인증을 막는다(fail-closed).
그런 DB 에 새로 만든 소스를 배포하기 전에 구성 밖 OPERATION 배정을 정리하고 이력을 남긴다.
이 절차는 업그레이드 키트(Phase 3)의 선행 조건이고, 기관 채택 `authorization` 통제의 확인 항목이다.

API 계약 사슬도 구성으로 다시 만든다(Phase 2 10c-2, DEC-OPS-286). ① `api-docs.json` 은 인가 원장의 연산 바인딩으로
핸들러 소스를 찾아, 투영이 지운 핸들러의 연산을 빼고 남는 문서에서 닿는 스키마와 쓰이는 태그만 남긴다([계약 투영](../../scripts/reusable-contract-projection.mjs)).
바인딩이 없거나 소스를 찾지 못한 연산은 판정할 수 없어 생성이 실패하고, 정밀 점검이 같은 판정으로 미리 막는다.
② 같은 단계에서 생성 타입 3종(`generated-zod`·`generated-operations`·`generated-api.d.ts`)을 원본의 생성기와
원본 frontend 의 openapi-typescript 로 다시 만든다. ③ 투영 원장을 쓴 뒤 생성 경계 census 와 소비 census 원장을 생성물
트리에서 다시 만든다([census 투영](../../scripts/reusable-contract-census.mjs)). 생성물에 없는 연산의 원장 항목은 빠지고,
핸들러는 남는데 원본의 소비자 파일을 투영이 모두 지운 연산(예: 게시판의 공개 FAQ 연산 — 소비자는 도움말 화면뿐)은
`consumer-not-in-composition` 으로 그 지운 파일을 근거로 적는다. 기대값(연산 수·세 래칫)은 생성물에서 잰 값이며,
생성기는 생성물에서 소비 census 가 오류 0 인지 확인한다. 단 세 래칫은 부채의 상한이라 `unwiredMax`·`ungatedWriteMax` 가
원본보다 커지면 그 연산·화면을 밝히며 실패하고, 화면 고아(`screenOrphanMax`)가 원본보다 늘면 원본 census 와 대조해 늘어난
메서드를 lock(`contracts.consumer.screenOrphansAdded`)에 남긴다. 모든 기능을 고른 구성은 api-docs·생성 타입 3종·두 census 가
원본과 같다. 생성물의 경로 린터는 api-docs ⊆ 컨트롤러도 본다. springdoc 으로 다시 추출한 문서와의 대조는 T2 야간 검증이 한다.

**API 규약 변경 이행 노트(ADR-0036, 2026-10-19).** 원본은 목록의 `page` 를 요청·응답 모두 1 기반으로, 자원을 만드는 POST 를 201 과 새 식별자 본문으로 바꿨다. 새로 만드는 생성물에는 그대로 실린다. 이미 만든 생성물은 자동으로 바뀌지 않으며(업그레이드 키트 미구현), 원본 변경을 일부만 옮기면 0·1 기반이 섞인다 — 백엔드·프런트·E2E·부하 시험을 같은 릴리스로 옮긴다. 기관은 저장소 밖 소비자를 스스로 확인하고 대조표를 알린다: `page=0` 은 400, 옛 0 기반 `page=N` 은 `page=N+1`, 옛 이름 `pageIndex`·`pageUnit` 은 한 릴리스 동안만 별칭, 생성 POST 56개는 201. 원본의 확인(저장소 밖 소비자 없음)은 upstream 사실이며 기관 사실이 아니다(ADR-0018).

생성 타입을 다시 만든 직후 생성기는 남는 프런트 코드(`frontend/tsconfig.json` 범위 — 시험 포함)가 이 구성에서 사라진 계약
이름을 쓰지 않는지 본다([계약 이름 판정](../../scripts/reusable-contract-references.mjs)): 생성 모듈 셋의 이름 import·re-export·
이름공간 멤버, generated-api 의 `components['schemas']['X']`·`operations['id']`·`paths['/p']` 리터럴 색인이다. 사라진 이름을 쓰면
파일과 줄을 밝히며 멈추고(생성물의 tsc 가 약 10분 뒤에 깨질 자리), 판정할 수 없는 모양(동적 import, `export *`, 리터럴이 아닌 색인)도
실패다. 정밀 점검은 원본 생성 파일과 투영 결과로 사라질 이름을 예측해 같은 판정을 미리 하고, 생성기는 그 예측이 다시 만든 파일의
export 차이와 같은지도 본다. 어느 기능에도 속하지 않아 투영 뒤에 남던 공유 위치의 기능 코드(예: 댓글·만족도 폼 검증, 댓글 타입)는
그 기능의 경로로 선언해 함께 지운다.

springdoc 별칭(`_N`) 가운데 기본 연산이 다른 기능과 함께 빠지고 별칭만 남는 연산(예: 게시판은 있고 설문이 없는 구성의
`getStats_1` — 기본 `getStats` 는 설문 소유)은 id 를 원본 그대로 두고 lock 의 `contracts.apiDocs.keptAliasesWithoutBase` 에 적는다.
생성물에서 springdoc 으로 다시 추출하면 충돌이 없어 접미사 없이 나오므로, T2 의 springdoc 재추출 대조는 이 목록의 접미사 차이를
정규화해야 하고, 생성물 유지자가 springdoc 으로 api-docs 를 다시 만들면 그 연산의 서술자 이름(`getStats_1Operation`)이 바뀐다.

공식·개발용 산출물은 `.agent/skills/` 가운데 이 저장소 전용 스킬만 복사한다. 스킬마다 생성물 복사 여부는
[`reusable-source-tree.mjs`](../../scripts/reusable-source-tree.mjs)의 `SKILL_DISTRIBUTION`이 정하며, 외부에서 들여온
범용 스킬(SKILL.md 머리에 출처·라이선스를 적고 LICENSE 파일을 둔다)과 이 저장소에서 쓴 범용 스킬, 분류표에 없는 스킬은
복사하지 않는다. 분류되지 않은 스킬이 생기면 `project-composer-source` 계약이 red 다. 재배포 제한이 확인된
`docx`, `pdf`, `pptx`, `xlsx`는 2026-09-30부터 원본 저장소도 추적하지 않으며(DEC-OPS-182, `.gitignore`), 다시 추적되면
같은 계약이 red 다. 로컬에 남은 사본은 분류표에 없으므로 산출물로 새지 않는다. Git 이력은 재작성하지 않았고, 이 분류가
나머지 자산의 배포 권리를 보증하지는 않는다. 기존 산출물에는 소급 적용되지 않으므로 재사용·게시 전에 다시 생성해야 한다.
개발용 `--allow-dirty` 생성은 그 밖의 추적 파일과 gitignore에 걸리지 않는 새 로컬 파일을 계속 포함한다.
공식 산출물은 기존의 clean working tree·릴리스 태그 요건을 그대로 따른다.

`--layout`은 DB 생성기와 소스 생성기에 같은 값을 준다(기본 `multi-module`). 레이아웃이 다른 DB 번들은 소스 생성기가
거부하므로 레이아웃마다 DB 번들을 따로 만든다. 기본 소스 출력 경로는
`build/reusable-base/source/<profile>-<sha>`이고 단일모듈에는 `-single-module` 접미사가 붙는다.
명시 `--output`도 기존 디렉터리를 덮어쓸 수 없다. 소스 lock의 `layout`이 선택 결과를 기록하며,
검증기는 필드가 없는 이전 lock만 `multi-module`로 해석한다. 미지원 값과 요청·생성물 불일치는 실패한다.

생성 완료 시 출력 폴더에 독립 Git 저장소를 초기화한다. 부모 저장소의 `build/` 제외 규칙이
프런트엔드 파일 탐색에 전파되지 않도록 하는 경계이며, 파일 추가·커밋·원격 연결은 수행하지 않는다.
인수 시 숨김 `.git` 디렉터리도 유지하거나, 옮긴 프로젝트의 루트에서 `git init` 후 빌드한다.
ZDM 게이트는 projection 근거를 검증한 뒤 이 초기 unborn 저장소를 수용한다.
HEAD commit이나 ref가 생기면 [보호 migration 이력 검사](../02-architecture/zero-downtime-migration.md#32-보호-이력에-있던-versioned-sql의-불변성)에 필요한 전체 이력과 보호 remote ref를 준비해야 한다.

### 3.6 제거되는 거버넌스 게이트와 승인

투영은 제외 도메인만 지우는 것이 아니라 **그 도메인을 참조하는 거버넌스 게이트까지 연쇄로** 지운다.
하네스 린터는 검사 대상의 FQN 을 소스에 직접 품기 때문이다. 그 뒤 생성기가 살아남은 게이트만으로
`baseline-manifest.properties` 를 다시 쓰므로, 파생 제품의 메타 게이트는 사라진 게이트를 **처음부터
없었던 것으로** 본다 — 아무 red 도 남지 않는 조용한 손실이다.

그래서 소스 생성기는 제거된 게이트를 항상 **말하고**(콘솔 · `REUSABLE_BASE.md` · `reusable-base-lock.json`
의 `removedGates`), 시작 구성의 명시적 승인(`config/modules/presets.json` 의 `expected`)과 exact 대조한다.

```json
{
  "id": "example",
  "domains": [],
  "expected": {
    "gates": [
      { "file": "api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java",
        "reason": "선택 가능한 RBAC 검사 표면이 모두 제외됨. 필수 core 인가는 기존 별도 매트릭스로 검사한다." }
    ],
    "gateRemovalRules": [
      { "rule": "historical-migration-tests", "reason": "…" }
    ],
    "javaCascade": [
      "api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java"
    ]
  }
}
```

모양을 보이는 예시다(`example` 은 실제 시작 구성이 아니다). 실제 `core` 는 게이트 14건·규칙 2개·연쇄 106개다 — 값은 `presets.json` 이 정본이다.

생성기와 정밀 점검은 이 승인을 `presets.json` 에서 읽는다(11단계 C3). `expected.gates` 는 기능 파일의 게이트 소유(`owns.gates`·
`owns.rbacMatrix`)에서 계산한 목록과 정확히 같아야 한다(로더가 본다). 직접 선택 구성의 승인은 기대치 없이 그 게이트 소유에서
계산한다.

- 승인하지 않은 게이트가 제거되면 생성이 **FAIL** 한다.
- 제거되지 않는데 승인 목록에 남은 항목(낡은 승인)도 **FAIL** 한다 — 죽은 승인은 다음 제거를 조용히 통과시킨다.
- `reason` 이 비면 **FAIL** 한다. 목록이 곧 서랍이 되지 않도록 사유를 `presets.json` 안에 남긴다.
- 승인은 삭제를 **허용**하는 장치가 아니라 **조용할 수 없게** 만드는 장치다. 게이트가 사라지는 변경에서는
  기능 파일·`presets.json` 과 커밋 메시지가 함께 움직여 diff 에 의도가 드러난다.

**연쇄로 지운 Java(DEC-OPS-264).** 게이트가 아닌 Java 도 선언이 아니라 타입 참조 연쇄로 빠진다 — core 는 106개다
(api-server main 50개 — 컨트롤러 34·요청·응답 DTO 11·연동·리스너 5 — 와 api-server 시험 53개, business-app 시험 3개).
소유는 코드에서 도출되므로, 잘못 들어간 import 한 줄은 컨트롤러를 지우면서 기대치까지 함께 바꾼다(개인정보 census·컨트롤러
하한이 지키는 일부만 따로 붉어진다). 그래서 프리셋마다 연쇄로 지울 비게이트 Java 경로를 `presets.json` 의
`expected.javaCascade` 에 적고, 생성기·정밀 점검(plan/deep)·운영 계약
(`scripts/project-composer-preset-equivalence.test.mjs` — 시작 구성마다 정밀 점검 blockers==[])이 같은 판정으로 실제 연쇄와 exact 대조한다.
저장소에서는 그 동치 계약이 `presets.json` 의 Java·프런트 게이트 승인(`expected.gates`, 사유 형식 포함)과 연쇄 목록을 시작 구성마다
생성기 계획과 대조한다 — 수가 아니라 목록이라 게이트 하나가 사라지고 다른 하나가 살아나는 교체도 GATE_UNACKNOWLEDGED·GATE_STALE 로 붉다.
목록의 형식·중복·누락·낡은 항목도 이 대조가 본다. 차단 코드별 red 증명은 `scripts/project-composer-deep-failure-points.test.mjs` 에 있다
(승인 목록만 바꾼 변이는 첫 실측의 제거 집합으로 승인 대조만 한다). 투영본(생성물)에서는 `scripts/pack-tagged-registry.test.mjs` 가
승인·연쇄 목록에 적힌 파일이 실제로 없는지만 본다. 이 소유 이동은 DEC-OPS-335 가 정했다(2026-10-17).
사유는 기계적("<타입> 참조")이라 목록에 적지 않고 생성물 lock 의 `java.cascadeRemoved` 에
남는다. 직접 선택 구성은 기대치가 없어 lock 기록만 남긴다.

생산 저장소 CI의 `reusable-base` 시작 구성 × 2레이아웃 matrix(PR 은 `ci.pr` 레이아웃 하나, survey·approval 은 PR 에서 빼고 main·T2 에서만 — DEC-OPS-296)가 실제 DB 번들과 소스 생성·산출물 검증을 실행하고 결과를 required
`backend-build`에 집계한다. 게이트 승인 목록 **자체**의 건전성(형식·중복·대상 실재)은
`npm run test:base-profile`(CI의 `test:operational-contracts`에 포함)이 별도로 지킨다.

현재 시작 구성은 파일 게이트를 core 13·collaboration 10·survey 11·approval 12·demo 0건(`presets.json` 의 `expected.gates`),
역사 검증 규칙 45건을 제외한다(2026-10-13). 역사 규칙은 V2 migration 파일 검증 42건과 구 인가 전환 검증 3건이며, 새 V1 baseline의 현재
PostgreSQL 스키마 검증은 계속 실행한다. 모든 프로필은 원본 Atlas 규칙(`upstream-atlas`)으로 Atlas HTML·생성기와
그 계약 3건(`governance-atlas-contract`·`atlas-catalog`·`atlas-generation`)도 걷는다 — Atlas 는 원본의 운영 사실을 담고
로그인 전에 응답되며, 생성기가 원본 공용 메모리를 읽어 생성물 안에서 다시 만들 수 없다. 파일 게이트(예: `SurveySubmissionConcurrencyIntegrationTest`·`RbacDemoSurfaceAuthorizationMatrixTest`·`ApprovalWorkflowIntegrationTest`·`CommunityDecisionConcurrencyIntegrationTest`·`TemplateCreationIntegrityIntegrationTest`·`ReferenceIntegrityCommunityFkIntegrationTest`)은 빠진
기능의 표면만 검사하는 게이트라 검사 대상 자체가 없다. **남는 코드도 검사하던 횡단 게이트는 모두 되살렸다** —
`QueryCountGuardrailIntegrationTest`(DEC-OPS-084)와 `RbacAuthorizationMatrixTest`(DEC-OPS-085)는 당시 pack 경계(지금은 기능 경계)로 옮겼고,
`PrivacyAccessCensusLinterTest`(DEC-OPS-089)·`InputContractMirrorLinterTest`·`CrossDomainCouplingLinterTest`(DEC-OPS-090)는
판정 원장을 JSON 으로 옮겼다. 승인 목록의 정본은 `presets.json` 의 `expected` 다.

**횡단 게이트를 되살리는 방식(DEC-OPS-089·090, 11단계 C4).** 표적 목록을 게이트 소스의 상수·타입 참조에서 JSON 원장으로
옮긴다. 원장은 셋이다 — `config/governance/privacy-access-census.json`, `input-contract-mirror-census.json`,
`cross-domain-coupling-census.json`. 원장에 소유를 적지 않는다 — 2026-10-13 항목마다 적던 pack 태그 230개를 걷고, 남고 빠지는
기대를 소스의 기능 소유에서 계산한다.

- 게이트는 저장소에서 원장 전체를, 생성물에서는 생성기가 기록한 투영 계획(하네스 프로필의 `retainsType`·`retainsSource`)에서
  소스가 모두 남은 항목만 기대한다. 시작 구성과 직접 선택이 같은 판정이다. 지운 항목은 **실제로 없을 때만** 부재로 인정한다
  — 타입 표적은 참조 타입 중 하나가 `ClassNotFoundException` 일 때, 결합 edge 는 소스 파일 중 하나가 없을 때다.
  전부 남아 있으면 투영 기록과 트리가 어긋난 것이고, 링크 오류는 판정할 수 없는 것이라 둘 다 red 다.
- 기대 생존은 항목이 참조하는 **소스가 모두** 구성 안 기능(또는 core) 소유일 때만 참이다. 소유는 카탈로그가 연동을 계산할 때 쓰는
  규칙(지원 파일 선언, 업무 앱 기능 디렉터리, foundation·business-core 는 core, api-server 는 참조하는 업무 패키지)을 그대로 쓴다.
  node 계약(`scripts/*-census-contract.test.mjs`, 공용 판정은 `scripts/pack-tagged-registry.mjs`)이 시작 구성마다 생성기의
  `planJavaRemoval` 을 불러 그 기대와 양방향으로 대조한다(`expected to survive in …`·`expected to be removed in …`).
  설문 소유를 다른 기능으로 잘못 정하면 '공통 기반 + 설문'(`survey`) 시작 구성이 잡는다 — 그 구성만 설문을 다른 demo 전용 기능과
  가른다. 13b 전에는 협업 시작 구성에 설문만 더한 합성 구성을 따로 돌았다. 계약이 '설문을 다른 기능과 가르는 시작 구성이 있다'를
  요구하므로 그 구성을 걷으면 붉다.
- api-server 의 기능 디렉터리 밖 파일은 참조하는 업무 패키지로 소유가 정해진다 — 생성기 연쇄와 같은 import 관계다. 그런 항목에서
  '잘못 들어간 import 로 코어 항목이 사라지는' 신호(DEC-OPS-089)는 이 대조가 아니라 시작 구성의 Java 연쇄 exact 목록이 받친다.
  지금 원장에서 그런 소스 파일은 셋이다(행사 외부인사 컨트롤러, 결재 기안·승인 요청 DTO — 항목 6개). 다른 api-server 파일을 거쳐 닿는 간접 참조는
  소유 규칙이 core 로 보므로 이 대조가 붉다.
- 표적 하한(anti-vacuity)은 프로필과 무관하게 원장 **전체**에 적용한다.
- 원장 해시는 하네스 기준선 도구(`scripts/harness-baseline-manifest.mjs`)의 `GATE_REGISTRIES`, 판정 본문은 `ARCH_RULE_FILE_PATTERN` 의 `__sourceHash` 가 동결한다. 생성기와 메타 게이트가 같은 도구를 쓴다.
- 게이트 판정은 각 게이트 파일 안에 둔다. 공용 Java 헬퍼로 빼면 그 파일이 `__sourceHash` 밖으로 나가고, 다른 게이트
  클래스의 메서드를 부르면 한 게이트의 제거가 나머지를 끌고 나간다.
- 게이트 소스에는 빠질 수 있는 도메인 타입을 참조하지 않는다. 생성기의 Java 의존 판정은 **코드에서만** 한다 — import 선언·
  FQN·같은 패키지와 와일드카드 import 의 단순명을 주석·문자열·텍스트 블록을 지운 코드에서 본다(2026-09-14 부터. 그 전에는
  import 를 원문에서 읽어 red-proof 텍스트 블록 한 줄이 결합 census 게이트를 지웠다). 프런트 import 판정도 2026-10-11 부터
  주석·문자열을 건너뛰는 토크나이저로 한다(§3.7 규칙 4).

<a id="37-프런트-pack-마커-작성-규칙"></a>

### 3.7 프런트 마커·슬롯 작성 규칙

선택 기능이 모든 프로필에 남는 셸(화면·공용 컴포넌트)에 무언가를 더하는 길은 두 가지다.

- **슬롯 기여**(2026-10-11 슬롯 단계 PR-4): 기능이 자기 디렉터리의 기여 파일에 항목을 적고, 셸은 생성 레지스트리만 읽는다.
  기능이 빠지면 기여 파일이 기능과 함께 직접 지워지고 레지스트리가 남은 기여로 다시 렌더된다 — 셸 파일은 바뀌지 않는다.
  그 자리에 맞는 슬롯이 있으면 슬롯을 쓴다(아래 '슬롯 규칙').
- **마커 블록**: 셸 파일 안의 기능 소유 코드를 `reusable-base:<기능 id>:start` / `…:end` 마커 블록으로 감싼다. 토큰이 곧
  소유 기능이다(11단계 C6 — 종전 토큰은 pack 이름이었다). 슬롯으로 옮기는 중이며, 남은 블록은 그 기능 파일
  (`config/modules/<기능 id>.json`)의 `owns.markerBlocks` 에 적은 블록 수·이행 단계(step)·사유(reason)로 드러난다.

생성기는 **마커 투영·레지스트리 렌더 → import cascade** 순서로 투영한다(`createFrontendProjector` → `pruneFrontend`).
두 판정은 `scripts/reusable-source-frontend.mjs` 한 곳에 있다(2026-10-11 판정 통일).

- 마커 블록은 공용 파서(`parseMarkerBlocks`)가 읽는다. 블록을 남기는지는 projector 가 한 번에 정한다 — 토큰의 기능이 구성에
  있어야 한다. 시작 구성도 같다(11단계 C3). 토큰은 기능 파일의 기능 id 여야 하고(아니면 `unknown marker feature`), 그 파일의 블록이
  그 기능 파일의 `owns.markerBlocks` 에 선언돼 있어야 한다(아니면 `Unclassified composer UI block`) — 블록은 조용히 남거나 빠지지
  않는다. 필수 기반은 늘 있으므로 `core` 토큰은 없다. 마커 선언은 투영하는 트리가 아니라 스크립트가 속한 저장소의 `config/modules` 에서
  읽는다(원본의 스크립트는 원본을, 생성물의 스크립트는 생성물을 투영한다). 선언은 projector 마다 읽는다 — 오래 도는 생성기 화면 서버도
  pull 뒤의 선언으로 정밀 점검을 판정한다. 도달성 census 도 시작 구성의 해석된 구성으로 투영한다(11단계 C5).
- import 연쇄는 `planFrontendRemoval` 이 계산한다. 간선은 도달성 census 와 같은 토크나이저(`scripts/frontend-module-graph.mjs`)로
  읽고, 넘겨받은 파일 목록 안에서만 정확한 표기로 잇는다(`scripts/frontend-module-resolver.mjs`).
- 생성기·정밀 점검·도달성 census·생존 시험·경계 계약·거버넌스 투영이 모두 이 함수들을 쓴다.

1. **링크만이 아니라 그 구역 전체를 소유 기능의 블록에 둔다** — 전용 import·지역 선언·데이터 조회·보조 함수·타입까지.
   파일 상단 import 블록과 JSX 블록처럼 같은 기능의 블록을 여러 개로 나눠도 된다. 링크만 감싸면 축소 프로필에서
   미사용 import 로 타입 검사가 깨지거나(`noUnusedLocals`), 제거된 API 를 부르는 화면이 남는다(2026-09-13 생성기
   투영 확인: core 의 `/` 가 투영에서 제거되는 `/api/v1/dashboard` 호출 코드를 들고 있었다 — 실패는 오류 경계로
   전파되는 경로이며 런타임 실행은 하지 않았다).
   타입 전용 참조(`import type`)도 의존이고, 그 타입으로 좁혀지는 분기(유니온 멤버 비교)도 같은 구역이다 — 멤버가
   블록과 함께 빠진 투영에서는 비교 자체가 타입 오류다(2026-09-22 #707 core 투영 tsc 실측: 모니터링 허브가 댓글 행
   타입을 블록 밖에서 참조해 허브와 그곳을 목적지로 둔 관측성 리다이렉트 페이지가 연쇄 소실됐다).
2. **마커는 줄 단위이고 한 줄에 하나, 중첩 금지다.** 여닫는 태그가 다른 블록에 걸리면 연속 블록으로 나눈다.
   JSX 자식 위치는 `{/* … */}`, import·배열·객체·JSX 속성 위치는 `/* … */` 를 쓴다. 속성 목록 조립이 복잡하면
   props 객체를 만들어 spread 한다. page 파일의 블록에는 redirect 호출이나 return 을 두지 않고, `next.config` 에는
   마커를 두지 않는다. 화면의 라우트 종류(page·리다이렉트)가 프로필마다 갈리면 화면 생존 기대값(원본 라우트 원장)과
   거버넌스 투영(투영 뒤 본문)이 어긋나므로 마커 투영이 FAIL 한다.
3. **설명 주석에 마커 토큰을 쓰지 않는다** — 마커는 주석 안에 쓰므로 파서는 주석도 읽는다. 짝이 맞지 않는 마커로 생성이
   FAIL 한다. 마커 블록을 셀 때도 이 파서를 쓴다. 다른 스크립트나 시험에 두 번째 마커 파서(마커 접두를 쓰는 정규식·문자열
   비교)를 만들지 않는다 — 도달성 계약의 단일 모듈 계약이 red 로 막는다. 예외는 없다.
4. **간선은 코드에서만 읽는다.** 주석·문자열·정규식 속 import 인용은 간선이 아니므로 파일을 지우지 않는다(2026-10-11 부터.
   그 전에는 생성기가 원문에 import 정규식을 적용해 주석 속 인용 한 줄이 파일 전체를 지웠다).
   - `import type`·`typeof import()`·`require`·`require.resolve`·`createRequire`·리터럴 동적 import·re-export 는 간선이다.
     확장자 없는 지정자는 `.d.ts` 와 자산(.css 등)까지, `.js` 지정자는 같은 이름의 `.ts` 까지 잇는다.
   - 간선과 마커는 `.ts`·`.tsx`·`.js`·`.jsx`·`.mjs`·`.cjs`·`.mts`·`.cts` 파일 전부에서 읽는다(확장자 대소문자 무시).
   - 판정할 수 없는 import(계산된 동적 import, `import.meta.glob`, `require.context`, 지정자 접미사 등)는 생성 FAIL 이다.
     `import`·`require` 라는 이름의 메서드 정의도 여기에 걸린다. 멤버 호출(`obj.require(…)`)은 간선도 실패도 아니다.
   - 대소문자만 다른 지정자와 후보가 둘 이상인 지정자도 FAIL 이다. 해석은 디스크를 묻지 않으므로 플랫폼과 무관하다.
   - frontend 밖(루트 `scripts/`)·빌드 폴더(`.next` 등)·패키지 대상은 간선이 아니다. 지워질 수 있는 파일은 frontend 안에만 있다
     (연쇄 판정 기준이다. census 의 도달성 그래프는 밖 스크립트도 잇지만 지우지 않는다).
     `public/` 파일은 간선을 읽지 않는다 — Next 가 URL 로만 내주는 정적 폴더라 번들하지 않는다. src 에서 `public/*.js` 를
     import 하지 않는다. 마커는 다른 모듈 파일처럼 투영하므로 public 파일의 마커 오류도 생성 FAIL 이다(census·정밀 점검도 같다).
   - JSX 텍스트 안의 백틱·따옴표 한 쌍은 토크나이저가 문자열로 읽어 그 사이의 간선을 조용히 숨길 수 있다. 원본은 운영 계약의
     AST 오라클(`scripts/frontend-reachability-census.test.mjs` 가 파일마다 TypeScript AST 의 지정자와 판정할 수 없는 의존 호출 줄을
     토크나이저와 대조한다)이 지키고, 따옴표는 `react/no-unescaped-entities` 경고가 lint 경고 상한에 걸려 먼저 막힌다. 생성기는
     의존성 설치 전에 돌므로 TypeScript 에 기대지 않는다. 원본 밖에서 고친 체크아웃의 숨은 간선은 생성물 타입 검사(산출물 검증)가
     깨진 import 로 늦게 잡는다.
5. **블록은 자기 기능이 요구하는 기능의 블록 import 에 기댈 수 있다**(예: 커뮤니티 블록이 게시판 블록의 import 를 쓴다 —
   커뮤니티는 게시판을 요구한다). 블록이 남는 구성에는 요구 기능도 있다(카탈로그의 필수 의존 폐포). 반대 방향과 요구 관계가
   없는 기능 사이는 금지다 — 한쪽만 남는 구성에서 누락·미사용 import 로 타입 검사가 깨진다. 기준은 기능 사이의 요구 관계이고
   순위(종전 pack 순위)가 아니다(11단계 C6).
6. **공용 컴포넌트는 선택 기능 소유 구현을 import 하지 않고 주입받는다.** 수신자 피커는 주소록 출처를 prop 으로 받고,
   조합 지점(메일·문자 화면)은 core 도우미(`useRecipientAddressBook`)로 슬롯 레지스트리에서 받아 넘긴다 — 공용 파일에
   마커를 흩뿌리지 않는다(아래 슬롯 규칙).
7. **대상이 cascade 로 잘못 사라진 링크는 가리지 않는다.** 그 링크를 마커로 숨기면 신호를 은폐하게 된다(H2).
   원인(잘못된 import)을 고친다.
   구성이 남겨야 할 화면은 기능 소유에서 계산한다(`scripts/reusable-page-survival.mjs`: core 화면 + 포함 기능 화면 +
   모든 기능이 포함된 공유 화면, 그리고 거버넌스 투영과 같은 규칙의 리다이렉트 화면 정리). 홈·로그인은 늘 core 화면이다.
   생성기·정밀 점검·생성물 무결성 검사가 남는 화면을 이 기대값과 양방향으로 대조한다. 기대한 화면이 빠지면 생성기·정밀
   점검은 SOURCE_SURVIVAL, 무결성 검사는 일반 실패이고, 구성에 없는 화면이 남아도 실패다. 기대값은 기능의 라우트 소유(카탈로그)에서
   계산하고 화면 제외 경로(`owns.frontend`)로 거르지 않으므로, 화면 생존을 바꾸는 잘못된 배치(경로를 다른 기능의 `owns.frontend` 에
   넣는 실수)는 잡힌다. 비화면 파일의 소유는 이 대조 밖이고, 시작 구성에서는 preset 동치 계약이 같은 목록의 직접 선택과
   대조한다(DEC-OPS-265, ADR-0028).
8. **판정은 실제 투영본의 타입·lint·build와 적용범위 계약이다.** 마커 편집은 전체 제품 빌드만으로 확인할 수 없다.
   - 마커 블록을 더하거나 걷으면 그 기능 파일 `owns.markerBlocks` 의 파일별 블록 수·이행 단계(step)·사유(reason)를 함께 고친다.
     운영 계약(`project-composer-source.test.mjs`)이 공용 파서로 센 원본 블록 수와 기능 파일 선언을 정확히 대조한다(마커 래칫).
     생성물에서는 남은 블록의 토큰이 모두 그 생성물의 기능 파일에 있는 기능인지 파서가 본다.
   - 마커를 추가·수정하면 `base:verify`로 영향 프로필을 생성·검증한다. CI도 시작 구성과 두 레이아웃의 같은 경로를 실행한다(PR 은 `ci.pr` 레이아웃, survey·approval 은 main·T2).
   컴파일 성공만으로 모든 링크와 API의 런타임 동작이 증명되는 것은 아니다.

**슬롯 규칙**(설계 [§5 슬롯](../02-architecture/project-composer-design.md#슬롯-기여와-레지스트리)):

1. **기여는 `src/extensions/<기능 id>/<슬롯>.ts` 이고 데이터만 담는다.** .ts 만 쓰고 JSX 를 두지 않는다. 최상위 문장은 import 와
   default export `defineContributions('<슬롯>', [...])` 하나뿐이고, 슬롯 인자는 파일 이름과 같다. 항목 값은 리터럴·`키: 값` 꼴
   객체·배열·`as const`·import 한 이름뿐이다 — 함수·호출·단축·계산·펼침 속성은 두지 않는다. 항목마다 문자열 `id` 와 노출 술어
   `visibleWhen` 을 둔다. import 는 중립 모듈(`@/extensions/slots`·lucide-react, 어떤 기능도 소유하지 않는 `@/types/*`·`@/lib/*`)
   이나 자기 기능 경로만 쓴다 — 다른 기능이 소유한 파일을 가져오면 그 기능이 빠진 구성에서 셸까지 연쇄로 지워진다. 경계 계약
   (`scripts/reusable-frontend-boundaries-contract.test.mjs`)이 강제한다.
2. **기여 디렉터리는 그 기능 파일에 선언한다** — `config/modules/<기능 id>.json` 의 `owns.frontend`. 카탈로그 적재가
   양방향으로 강제한다(선언이 없거나, 기능이 아니거나, 다른 기능의 디렉터리를 가리키면 실패). 기능이 빠지면 기여 파일은 직접 제거되어
   투영 원장에 남는다.
3. **레지스트리 `src/extensions/generated-<슬롯>.ts` 는 생성 파일이다.** 손으로 고치지 않는다. 기여를 더하거나 걷으면
   `npm run slots:generate` 로 다시 만들고 `npm run slots:check` 로 확인한다(`merge:main` 도 다시 만든다). 생성기·정밀 점검·
   도달성 census·거버넌스 투영은 같은 projector 가 직접 제거 경로에 걸리지 않은 기여로 레지스트리를 다시 렌더한다. 연쇄
   계산 전이라 레지스트리를 읽는 셸은 남는다. 기여가 하나도 남지 않으면 빈 배열이다. 생성물 lock 의 `frontend.slots` 가
   슬롯별로 남은 기여 기능을 적는다.
4. **레지스트리를 import 하는 모듈은 소비자 표(`scripts/slot-registry.mjs` 의 `SLOT_REGISTRY_CONSUMERS`)에 있는 파일뿐이다**(시험 포함).
   허브 탭은 허브마다 슬롯(`hub-tabs-<허브>`)이라 소비자가 그 허브 셸 하나다 — 허브 셸은 다른 허브의 탭 뷰를 번들에 싣지 않고,
   기여의 쓰기는 그 허브 셸에만 귀속된다(GAP-SLOT-001). `stats-panels` 는 배치별로 적는다. 화면은 그 소비 도우미를 쓰고,
   시험은 도우미를 쓰거나 레지스트리를 `vi.mock` 으로 감싼다. 기여 파일이 투영으로 빠졌는지는 투영 원장 도우미
   (`inProjection`)로 가른다.
5. **슬롯 이름은 한 철자(케밥)다** — SlotMap 키 = 기여 파일 이름 = 레지스트리 파일 이름. 슬롯 종류(항목 타입)는 10개 이하이고,
   키는 그 슬롯을 읽는 셸과 같은 변경에서 더한다. 허브 탭은 허브마다 슬롯을 두지만 항목 타입 `HubTab<허브>` 하나라 한 종류다 —
   같은 항목 타입을 여러 슬롯이 쓰는 것은 허브 탭뿐이고, 허브 탭 슬롯은 `HubTabViews` 키마다 정확히 하나다(경계 계약).
6. **노출 술어는 노출일 뿐 인가가 아니다.** `always` 는 늘 보이는 사유를 적는다. `permissions`·`page` 는 기능권한·라우트
   게이트와 같은 함수로 판정한다. `/admin` 밖의 page 술어는 늘 참이다 — 그때 실제 보장은 기여 파일이 기능과 함께 직접
   지워지는 것이다. 링크 항목은 같은 객체의 `{ page: '<자기 목적지>' }` 만 관리 링크 census 가 게이트로 인정하고, 목적지가
   리터럴이 아니면 붉다. 술어는 그 기여가 부르는 API 의 권한과 맞춘다 — 다르면 보이는데 열면 403 이거나, 쓸 수 있는데
   감춘다. 수신자 피커의 주소록 출처는 목록·단건 API 와 같은 `{ permissions: ['ADBK_READ'] }` 다(PR-5). `always` 는 판정할
   권한이 없을 때만 쓴다. 전달 채널(`delivery-channels`)은 구성의 사실이라 `always` 하나만 쓰고(타입이 묶는다), 화면은 core
   도우미 `hasDeliveryChannel` 로 채널이 있는지만 묻는다(GAP-COMPOSE-001). 이렇게 값을 읽는 화면이 다른 기능 소유면 그 기여는 '등록만 하는 기여'가 아니라 읽는 기능의 연동이 `contributions` 나 anchor 로 덮어야 한다. 값을 넘기는 소비자는 소비자 종류 표(`SLOT_CONSUMER_KINDS`)에 value 로 적고(넘기는 export·읽는 기여), 카탈로그가 그 선언과 import 그래프로 대조한다(DEC-OPS-353). 셸 링크(`shell-links`)는 `{ page: 자기 href }` 만 쓰고, 목적지는 앱 안 경로다(`//`·`/\` 로
   시작하면 브라우저가 외부 주소로 읽는다). 주체 없이 거르는 바닥글·오류 화면 배치는 `/admin` 밖 목적지만 둔다. 머리글·명령 센터 배치는 아이콘이 있는 목록이라 아이콘이
   필요하다(협업 허브 머리 배치는 필요 없다). 업무 보고 머리 배치(`work-report`)도 아이콘 단추라 아이콘이 필요하다.
   나의 업무 탭 줄 배치(`work-hub`)는 글자 탭이라 아이콘을 두지 않고, id·목적지가 core 탭(업무 관리)과 겹치지 않는다 — id 가
   탭 DOM id 가 된다. 바닥글 항목은 같은 기여 안에 같은 목적지의 머리글 짝을 둔다(fill
   화면에서 바닥글이 숨는다). 경계 계약이 강제한다(PR-6, 명령 센터·협업 허브 배치는 허브 분해 H1, 나의 업무·업무 보고 배치는
   업무 허브 분해 W1).
7. **허브 탭(`hub-tabs-<허브>`)의 id 는 `?tab=` 값이다.** 대문자 식별자이고 그 허브 슬롯 안에서 유일하며, 그 허브의 셸 고유
   탭과 겹치지 않는다. 허브는 슬롯 이름이 정하므로 항목에 `hub` 를 두지 않는다(항목 키는 id·order·label·view·visibleWhen).
   `view` 는 기능 모듈이 내보낸 이름이나 이름만 담은 객체다(`{ Component: NoteCollaborationTab }`). 허브의 탭 해석 모듈
   (`*-tabs.ts`)이 `TAB_HUB.slotHub`(허브, 기여 슬롯은 `hub-tabs-<slotHub>`)와 `TAB_HUB.contributable`(탭 → 기여 파일)을 선언하고, 셸은 보이는 기여 id 를
   `parse(raw, contributed)` 에 넘긴다. 경계 계약이 `contributable` 과 실제 기여를 양방향으로 대조하고, 탭 목적지 계약은
   생성물에서 기여 파일이 투영으로 빠진 탭으로 가는 메뉴 행만 건너뛴다. 기여에서 import 로 닿는 파일의 소유 기능은 기여 기능이
   요구하는 기능 안이어야 한다(기여 폐포 — 기여가 연쇄로 지워져 그 레지스트리를 읽는 허브 셸이 함께 지워지지 않게).
8. **기여는 연동 분류에 정확히 한 번 나온다.** 기여가 빠질 때 다른 기능의 동작이 줄면 `INTEGRATES` 의 근거(anchor)가 그
   기여 파일을 가리키고(계획이 기능 저하로 알린다), 잃는 것이 없으면 `REGISTRATION_ONLY_CONTRIBUTIONS` 에 사유와 함께 둔다.
9. **기여에 뷰·폼·쓰기·URL 을 처음 담을 때는 그것을 보는 census 를 같은 변경에서 넓힌다**(설계 §5 의 진입 조건 표). 지금
   기여는 데이터만 담고, 경계 계약의 함정 규칙이 JSX·최상위 실행문·항목 안의 함수와 호출·링크 키(링크 슬롯 밖)·기능 밖 import 를
   막는다. 쓰기를 담는 기여(스크랩 슬롯 `post-actions`)는 **쓰기 함수 하나(`submit`)의 이름만** 가리킨다 — 함수는 그 기능의
   모듈(보통 조회 모듈 `src/queries`)에 두고, 잠금·토스트·완료 표시는 호스트 셸이 소유한다(추천·삭제와 같은 잠금을 쓰게 하려면).
   축 3·화면 목록은 기여 파일을 화면 모집단에 넣어 그 레지스트리를 읽는 화면(도우미 .ts 면 그 도우미를 읽는 화면)으로 쓰기를
   귀속하고, 기여가 import 하는 비화면·비서비스 모듈은 어느 디렉터리에 있든 중간 모듈로 읽는다. 기여의 판정은
   `visibleWhen.permissions` 원소만 센다 — always 사유 문자열에 권한 이름을 따옴표째 적어도 판정이 아니다.
10. **업무 홈(`home-sections`)은 서버 자식도 레지스트리를 읽는다**(Phase 2 9단계). 그래서 기여가 가리키는 두 이름의 모듈 경계가
    정해져 있다 — `Component` 는 `'use client'` 모듈에서 가져오고(`ssr: false` 래퍼는 서버 컴포넌트에서 쓸 수 없다),
    `prefetch` 의 `query` 는 `'use client'` 가 없는 모듈의 queryOptions 값이다(`'use client'` 모듈의 값은 서버에서 클라이언트
    참조가 된다). `prefetch` 의 `failure` 는 `boundary`(서버에서 다시 던져 오류 경계로)·`section`(삼키고 그 구역이 조회 실패를
    말한다) 중 하나다. 배치는 overlay·actions·cards·main·status·bottom 이고, `cards` 배치 컴포넌트는 `<li>` 하나를 그린다. 링크는
    컴포넌트가 그린다(기여는 링크 키를 갖지 않는다). 셸은 등록된 기여가 하나라도 있으면 DASHBOARD_READ 로 진입을 판정한다.
    경계 계약이 강제한다.

### 3.8 검토 원장 투영과 기관 승인

[ADR-0018](../02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)에 따라
원본 제품의 검토 이력과 도입 기관의 운영 승인을 구분한다. 소스 생성기는 URL census·승인·route·UI quality·
화면 용어·KRDS 원장, 적용범위 계약과 공용 메모리를 해시가 붙은 `config/governance/upstream-review/` snapshot으로 보존하고, 실제 투영 소스에서
active URL·route census를 다시 생성한다. 살아남은 동일 소스·관측 범위에만 원본 승인 selector를
제한하며 원본 검토자·날짜·근거는 바꾸지 않는다. 투영 범위는
`config/governance/reusable-governance-projection.json`에 기록한다.

UI 시나리오·화면 용어 pilot·KRDS의 적용범위는 [review scope 계약](../../config/governance/reusable-review-scopes.json) 행의
`requiredDomains`(그 행을 남기는 데 필요한 기능, 빈 목록은 공통 기반)와 해석된 구성에서 계산한다(11단계 C5 — `requiredPacks` 는 거부한다).
적용 대상 소스가 실수로 없어졌다는 이유로 검사를 제외하지 않는다. 유지하는
시나리오의 경로·step·근거 파일은 실제로 존재해야 하며, 기능 구성과 브랜드 프로필은 별개 축이다.
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
검증 driver는 DB·소스 생성기에 같은 레이아웃을 전달한 뒤 lock과 대조한다.

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

생산 저장소는 기존 6개 required context를 유지하며 main 에서 시작 구성마다 두 레이아웃(PR 은 `ci.pr` 레이아웃, null 이면 제외)의 생성 조합을 검사한다. 생성물은
`artifact-verification` 한 job에서 자기 프로필·레이아웃의 산출물 runner를 직접 실행하고, 기존 버전의 gitleaks
working-tree·incremental 검사를 함께 수행한다. 실제 실행 설정은
[생성물 실행 경로 계약](../../scripts/reusable-artifact-entrypoints-contract.mjs)이 정한다.

생산 저장소의 13개 workflow·required-check 명세·package·pre-push는
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

현재 승인된 계약은 **모든 시작 구성이 각 출력 레이아웃의 기술 게이트를 통과하는 것**이다. 생성기는 원본 제거 계획의
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

2026-10-07부터 인가 매트릭스 두 개(`RbacAuthorizationMatrixTest`·`RbacDemoSurfaceAuthorizationMatrixTest`)도 `governance-harness` 태그로 `harnessTest`에서 돈다. 종전에는 태그가 없어 생성물에서 컴파일만 되고 실행되지 않았다. 위 표의 건수는 그 전 실측이다. 쿼리 수 가드(`QueryCountGuardrailIntegrationTest`)는 business-app 모듈에 있어 이 태스크 밖이며 실행 경로는 따로 정한다.

소스 모집단·필수 실행 단계의 누락, 잘못된 프로필과 보안 부정 테스트 변조가 red가 되는 것도
확인했다. 이 로컬 기술 검증과 현재 커밋의 required CI는 별개이며, 병합에는
시작 구성 matrix를 포함한 required CI 통과가 필요하다. 위 날짜의 실측은 단일모듈
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

### 4.2 생성물의 일반 테스트

산출물 검증은 하네스·스키마 검증과 프런트 `tsc`·lint·build 만 돌리고 일반 테스트(`./gradlew test`)와 vitest 는 돌리지 않는다.
2026-10-10 main(`9b402a822`)에서 만든 생성물에서 처음 돌린 결과, 투영 뒤에도 남은 검사가 처음부터 붉었다(설계서 D6).

| 프로필 | 백엔드 `test` | 프런트 vitest |
|---|---|---|
| `core` | 3,064건 중 7건 | 781개 파일 2,572건 중 47개 파일 145건 |
| `collaboration` | 3,788건 중 2건 | 938개 파일 3,146건 중 40개 파일 102건 |

표의 파일 열은 vitest `numTotalTestSuites` 로 센 값으로 보인다(2026-10-13 T2 의 core 는 파일 312·suite 841 — T2 판정기는 둘을 나눠 적는다).
2026-10-13 T2 첫 실행(main `52527499a`)은 시작 구성 두 레이아웃과 단독 폐포 21개(27잡)를 돌았다. 모든 잡이 생성·산출물 검증을 통과했고
25잡이 일반 테스트에서 붉었다(vitest 93건·JUnit 4건). core 생성물은 vitest 312개 파일(suite 841) 2,673건, 전체 구성은 백엔드 4,800건·vitest
4,518건이다. 원인과 수리는 [GAP-BASE-002](../../.agent/memory/known-gaps.md)와 [DEC-OPS-298](../../.agent/memory/decisions.md)에 있다.

백엔드 9건은 [DEC-OPS-257](../../.agent/memory/decisions.md)로 닫았다. 기능 단언은 기능 타입을 참조하는 클래스로 옮겨 기능과 함께 빠지게 하고,
생성기가 지운 ErrorCode 가 소유한 메시지 키를 번들에서 걷고 메시지 번들 계약의 하한을 지운 코드·참조 수만큼 내린다(lock `java.prunedMessageKeys`·`java.messageContractFloors`). 원본 하한은 그대로라 여유 폭이 원본과 같다. 런타임 문서를 세는 자격증명 검사의 하한은 core 아래로 둔다.
Bean Validation 키(`message = "{키}"`)도 지운 스캔 대상 소스만 참조했고 남는 소스·ErrorCode·handler 키 어느 것도 읽지 않으면 걷는다(lock `java.prunedValidationMessageKeys`, 2026-10-29 — 게시판 DTO 만 쓰는 `validation.pattern` 이 게시판 없는 생성물에서 고아 키로 붉었다). 원본에서 이미 고아인 키는 계속 붉다. 투영한 core 트리의 고아·빠진 키는 `scripts/reusable-source-messages.test.mjs` 가 PR 시점에 본다.
프런트 계약은 생성기가 남기는 투영 원장(`reusable-projection-ledger.json`, lock `projectionLedger`)으로 투영이 지운 기능 파일을 거른다([DEC-OPS-258](../../.agent/memory/decisions.md)).
시험은 `@/test-utils/projection` 의 `inProjection`·`keepInProjection`·`readInProjection` 을 쓰고, 원장에 있고 실제로 없는 파일만 뺀다.
원장에 없는 부재는 그대로 ENOENT 로 붉고, 원장에 있는데 파일이 있으면 실패한다. skip 대신 그 시험을 등록하지 않으며, 대상 전체가 빠질 수 있는
파일은 `missingOutsideLedger` 로 "남아 있거나 투영으로 빠졌다" 를 확인하는 시험 하나를 늘 둔다. 여러 기능의 파일을 읽는 시험은 시험 전체가 아니라
파일마다 단언을 거른다. 원본에는 원장이 없으므로 원본의 계약은 그대로다. 생성기는 파일을 지우는 마지막 단계 뒤에 원장을 쓰고 `base:verify` 가
생성 직후 원본과 대조하며, skip 금지 게이트는 원장 판정이 아닌 조건부 등록(`if (…) it(…)`)을 skip 과 같이 막는다.
총계·허용 목록·예시도 같은 원장으로 거른다([DEC-OPS-259](../../.agent/memory/decisions.md)). 총계 동결은 파일(화면)별 표를 함께 두어 합이 총계와 같게 하고,
생성물에서는 `frozenInProjection`·`keepInProjection` 으로 원장으로 빠진 파일 몫만 뺀다. 빈 스캔을 막는 하한은 원본 값을 두고 원장이 있을 때만
가장 작은 생성물에서도 성립하는 값으로 내리며, 실측을 주석에 남긴다. 빠진 화면을 예시로 쓰는 시험은 `pageInProjection(경로)` 로 거르되, core 계약은 모든 생성물에 남는 예시로 늘 등록하고,
마커 블록으로 걷히거나 다른 기능이 넘기는 화면 부분은 그 블록과 함께 빠지는 같은 기능 파일로 거른다(마커 블록 자체는 원장에 남지 않는다).
권한 코드(생성물마다 원장에서 다시 만들고 원장에 없는 코드는 늘 거부한다)·화면 목록 라우트·기능 소유 API 경로·다른 기능의 마커 블록 문장을 예시로 쓰는 시험도 같은 방식으로 거른다 —
core 규약은 core 예시로 바꾸고, 기능 단언은 그 기능과 함께 빠지는 시험 디렉터리로 옮기며, 마커 블록 문장은 그 기능 소유 파일로 갈라 기능이 없을 때는 부재를 단언한다(2026-10-29 T2 수리).
2026-10-10 core 실제 생성물의 vitest 는 801개(파일이 아니라 `numTotalTestSuites` 로 센 suite 수로 보인다 — 위 표 아래 설명) 2,575건이 모두 통과한다. 수리 뒤 T2 예약 실행 연속 두 번이 모든 구성의 두 레이아웃에서 녹색이었다(2026-10-16, [GAP-BASE-002 종료](../../.agent/memory/known-gaps.md)).

다시 재려면 `npm run base:verify -- --profile <프로필>` 로 만든 생성물을 **짧은 경로로 복사**한 뒤(`node_modules`·`build` 제외) 그 안에서
Gradle 시험과 `pnpm -C frontend install --frozen-lockfile`·`pnpm -C frontend exec vitest run` 을 차례로 돌린다. Gradle 시험은 레이아웃마다 다르다.
멀티모듈은 `./gradlew test --continue` 가 모든 모듈을 돈다. 단일모듈의 `test` 는 `api-server` 시험만 돌므로
`./gradlew test foundationTest coreTest appTest --continue` 를 돌린다(이관 시험까지는 `allTests`).
저장소 안의 깊은 경로에서는 vitest 가 `#module-evaluator` 를 찾지 못해 시작하지 못한다(Windows 실측). 판정은 종료 코드가 아니라 시험 작업별 리포트 XML 과 vitest JSON 보고서로 한다.
같은 절차를 GitHub runner 에서 구성 단위로 도는 것이 [T2 야간 시험](cicd-pipeline.md#재사용-생성물-야간-시험t2)이다. 매일 06:17 KST 에 예약 실행한다.
직접 선택 구성은 그 워크플로의 `compositions` 입력으로 잰다.

⚠ 수치를 **추론하지 말고 실제로 돌려라.** 2026-09-12 이전에는 아무도 투영본에서 harnessTest 를 돌리지
않아 생성기 드리프트 4축이 v0.1.0(2026-08-24) 이후 계속 쌓여 있었고, `demo` 조차 red 였다.

## 5. 로컬 개발 검증

커밋 전 생성기 자체를 확인할 때만 다음 완화 플래그를 사용한다.

```bash
npm run base:generate-db -- \
  --profile collaboration --layout single-module --container <name> --allow-dirty --allow-non-release-ref

npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle <위 DB 실행이 출력한 경로> \
  --layout single-module \
  --allow-dirty --allow-non-release-ref
```

이 산출물의 lock에는 `localDevelopmentBuild: true`가 기록되며 공식 배포물로 사용할 수 없다.
§4의 `base:verify`도 개발·CI 검증을 위해 이 플래그를 사용한다. 공식 출시물은 clean release tag에서
완화 플래그 없이 생성하고 산출물 전체 검증을 통과시킨다.

## 6. 변경 절차

도메인·테이블·시퀀스 소유권이 바뀌면 다음 순서로 갱신한다.

1. 현재 migration과 엔티티의 최종 물리 상태를 확인한다.
2. 기능 파일(`config/modules/<기능>.json`)의 `owns`·`dependsOn` 과 `core.json` 의 `owns`·`databaseSnapshot` 을 갱신하고
   `npm run modules:check` 로 스키마·파일 사이 대조를 확인한다(이 디렉터리가 원천이다 — 다시 만드는 생성 스크립트는 없다).
3. `npm run test:base-profile`에서 누락·중복·실측 수 불일치가 없는지 확인한다.
4. 시작 구성마다 DB 번들을 레이아웃별로 생성해 빈 DB 재적용을 통과시킨다.
5. 영향을 받는 소스 projection을 두 레이아웃으로 생성해 §4 게이트를 통과시킨다.
6. 제거되는 거버넌스 게이트가 달라졌으면 기능 파일의 `owns.gates` 와 `presets.json` 의 `expected.gates` 를 사유와 함께
   갱신한다(§3.6). 승인 없이 게이트가 빠지면 생성이 FAIL한다.

기존 운영 DB를 작은 프로필로 변환하는 용도로 이 파이프라인을 사용하지 않는다. 운영 데이터 축소는
별도의 데이터 이관·백업·롤백 계획과 명시 승인을 요구한다.

## 7. 비정본 브랜치 주의

`template/reusable-base` 등 장기 template 브랜치는 현재 릴리스와 보안·DB·품질 게이트의 동기화를 보장하지 않는다. 신규 base 생성 입력으로 사용하지 않고, 필요한 역사 비교가 있을 때만 읽기 전용 참고 자료로 취급한다.

*생성·검증·부트스트랩·기관 도입 경계 검토: 2026-09-14. 실제 결과는 해당 산출물의 검증 보고서가 정본이다.*

*출력 레이아웃·명령 계약 반영: 2026-09-19. 위 과거 날짜의 테스트 수치는 당시 이력이며 새로운 레이아웃의 실행 결과로 승계하지 않는다.*
