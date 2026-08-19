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
테이블 계약도 매니페스트에 명시한다.

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
- `profile-lock.json`, `README.md`

완성된 V1 체인은 두 번째 빈 DB에 다시 적용된다. 테이블·시퀀스 집합과 현재 표준 메타 행 수가 원본 DB와 일치해야만 PASS한다.

### 3.3 소스 projection

DB 생성기가 출력한 실제 디렉터리를 `--db-bundle`에 전달한다.

```bash
npm run base:generate-source -- \
  --profile collaboration \
  --db-bundle build/reusable-base/collaboration-<sha>-<timestamp>
```

소스 생성기는 DB lock의 프로필·커밋을 현재 릴리스와 대조한 뒤 선택하지 않은 Java 도메인,
그 도메인에 의존하는 소비자, 프런트 라우트와 전이 importer를 제거한다. 원본 마이그레이션 체인은
검증된 V1 번들로 교체하고 `REUSABLE_BASE.md`와 `reusable-base-lock.json`을 기록한다.

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

기존 운영 DB를 작은 프로필로 변환하는 용도로 이 파이프라인을 사용하지 않는다. 운영 데이터 축소는
별도의 데이터 이관·백업·롤백 계획과 명시 승인을 요구한다.

## 7. 비정본 브랜치 주의

`template/reusable-base` 등 장기 template 브랜치는 현재 릴리스와 보안·DB·품질 게이트의 동기화를 보장하지 않는다. 신규 base 생성 입력으로 사용하지 않고, 필요한 역사 비교가 있을 때만 읽기 전용 참고 자료로 취급한다.

*Last reviewed against current sources: 2026-08-19.*
