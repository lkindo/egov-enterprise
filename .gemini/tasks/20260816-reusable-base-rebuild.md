# 현재 프로젝트 최적화 후 reusable-base 재구성

> 상태: 완료
> 등급: L2 (모듈 경계·릴리스 산출물·DB baseline 정책 결정)
> 사용자 방향: 과거 template 브랜치를 먼저 고치는 대신 현재 프로젝트를 최적화한 뒤 그 결과에서 base를 재구성한다.

## 1. 결정

- `main`/현재 릴리스가 코드·보안·DB의 단일 정본이다.
- `template/reusable-base`는 2026-07 역사 스냅샷으로만 보존한다. 2026-08-16 실측은
  `origin/template/reusable-base...HEAD = 5 / 486`이다.
- 공식 base는 깨끗한 정확한 `v*` 릴리스 태그에서 생성한다. 장기 template 브랜치를 유지하지 않는다.
- 프로필은 `core`·`collaboration`·`demo` 3개이며 `config/reusable-base-profiles.json`이
  도메인·테이블·시퀀스·클러스터 소유권의 SSOT다.
- 운영/공유 DB를 축소하지 않는다. current versioned migration을 일회용 PostgreSQL에 적용한
  최종 상태에서 V1 baseline을 만들고 두 번째 빈 DB에서 재적용한다.

## 2. Deep Context Sandbox Map

```text
foundation
   ↑
business-core  ── core ports / identity / auth / file / logs
   ↑
business-app   ── feature-owned domains and listeners
   ↑
api-server     ── controllers / websocket / harness / migrations

release tag
   ├─ reusable-base profile census
   ├─ current migrations → disposable DB → profile V1 DB bundle → second DB
   └─ source projection + verified DB bundle → compile / tsc / harness / schema validation
```

주요 결합점과 처리:

- 거대 `UserDeletionCleanupListener`가 board/blog/addressbook/notification/community를 함께 알았다.
  각 기능의 `MANDATORY` 트랜잭션 리스너로 분리했다.
- board 패키지 안의 blog 엔티티·DTO·메서드가 도메인 소유권을 흐렸다. blog 패키지로 분리해
  실제 도달성을 확인했고, 컨트롤러 소비자가 없는 서비스·DTO·매퍼·리포지토리는 제거했다.
- `LogRetentionScheduler`가 선택 모듈에 있어 core 로그의 수명주기가 app에 의존했다. core로 이동했다.
- operation repository가 service-oriented 저장소 패키지에 있어 domain 소유권이 불명확했다.
  `domain.operation`으로 이동했다.
- DB 통계와 무관한 인메모리 실시간 대시보드가 `stats`에 섞여 있었다. `dashboard`로 분리하고
  collaboration pack에서 board+notification 의존을 명시했다.
- core 첨부 resolver가 모든 demo 테이블을 enum 전수 순회해 작은 projection에서 존재하지 않는
  테이블을 조회할 수 있었다. 기능별 `AttachmentSourceContributor`만 순회하도록 바꾸고 누락·유령·중복을
  harness가 현재 클래스패스 기준으로 검증한다.
- 프런트 공용 사용자 picker가 addressbook 서비스에 의존했다. core 사용자 검색 계약으로 교체했다.
  collaboration hub·메일·쪽지의 주소록 결합을 제거하고, 배너·팝업·DB 통계 위젯은 기본 대시보드에서 분리했다.

## 3. DB 실측과 정정

처음 확인한 로컬 `egov-e2e-postgres`는 Flyway V2.31의 오래된 상태였다. 이 DB를 snapshot 원본으로
삼은 첫 시도는 생성 소스의 schema validation에서 최신 `pst_sn` 부재로 실패했다. 이 실패를 근거로
생성 정책을 다음과 같이 정정했다.

- snapshot 원본: 기존 컨테이너의 현재 스키마가 아니라 저장소의 V2.0~V2.83 versioned migration 84개
- 적용 위치: 이름을 검증한 `test_reusable_base_*` 일회용 DB
- 최종 현재 상태: 테이블 83, 시퀀스 49(독립 3), 실패 migration 0
- 표준 메타: words 3,386 / terms 13,207 / domains 127
- migration 최종 상태에서 이미 제거된 사테이블 6개를 프로필에서 제외:
  `tb_indv_pg`, `tb_dscsn_list`, `tb_faq_info`, `tb_hldy_info`, `tb_main_image`, `tb_memo_todo_info`

프로필 결과:

| 프로필 | 테이블 | 시퀀스 | pack |
|---|---:|---:|---|
| core | 38 | 13 | core |
| collaboration | 53 | 23 | core + collaboration |
| demo | 83 | 49 | core + collaboration + demo |

세 프로필 모두 current migration 적용 → 축소 → dump → 두 번째 빈 DB 재적용 → 객체/메타 행 수 대조를
통과했다. 공유·운영 DB에는 DDL/DML을 실행하지 않았다.

## 4. 구현 산출물

- `config/reusable-base-profiles.json`: 프로필/pack/DB 소유권/클러스터/공유 테이블 계약
- `scripts/reusable-base-census.mjs`: 소스 소유권, pack 의존 방향, 테이블·시퀀스 중복/누락 검증
- `scripts/generate-reusable-base-db.mjs`: 릴리스 태그용 DB V1 bundle 생성·재적용 검증
- `scripts/generate-reusable-base-source.mjs`: 소스 projection, 전이 importer 제거, DB bundle 결합,
  생성물 전용 harness 기준 생성
- `package.json`: `base:census`, `base:generate-db`, `base:generate-source`, `test:base-profile`
- `.githooks/pre-push`, `scripts/verify.mjs`: base profile 계약을 컴파일 전 필수 게이트로 편입
- ADR/재사용 가이드/pending decisions/governance atlas: 릴리스 생성 정책으로 동기화

공식 생성기는 dirty tree와 비릴리스 ref를 거부한다. 개발 플래그로 만든 local bundle은 lock에
`localDevelopmentBuild: true`를 기록하며 배포할 수 없다.

## 5. 변이·회귀 증거

- 사용자 삭제 리스너: 정리 호출 5개를 각각 제거했을 때 정확히 5개 테스트 red, 복구 후 green.
- blog 분리: 조회·생성·가입·존재·portlet 경로 변이 6종에서 7개 테스트 red, 복구 후 green.
- 로그 보존: 최소 보존기간 12→0 변이에서 3개 중 2개 red, 복구 후 green.
- 첨부 contributor: board 등록을 제거하자 `AttachmentSourceRegistryLinterTest`가
  `tb_bbs_item` 누락으로 red, 복구 후 resolver+linter green.
- 생성물 1차: 오래된 DB snapshot 때문에 최신 컬럼 부재를 schema validation이 red로 검출.
- 생성물 2차: 축약 V1에 원본용 migration 20건 floor가 남은 것을 red로 검출. 생성물에서만 floor를
  2로 조정하고 원본 기준은 유지했다.
- 최종 collaboration local projection: profile 6 tests, Java compile/test compile, frontend tsc,
  harness, 실 PostgreSQL schema validation 전부 green.

## 6. 산출물 검증 기록

- DB bundle:
  - `build/reusable-base/core-e7b45cfb944a-2026-08-16T04-05-17-463Z`
  - `build/reusable-base/collaboration-e7b45cfb944a-2026-08-16T04-05-48-007Z`
  - `build/reusable-base/demo-e7b45cfb944a-2026-08-16T04-06-21-920Z`
- 완전 검증된 최종 collaboration source projection:
  `build/reusable-base/source/collaboration-local-6`
- 위 경로는 모두 무시되는 로컬 개발 산출물이다. 커밋 `e7b45cfb944a`가 릴리스 태그가 아니고 작업
  트리가 dirty였으므로 공식 배포물이 아니다.

## 7. 완료 조건

- [x] 현재 소스·DB census와 과거 template 드리프트 확인
- [x] core/collaboration/demo 프로필 SSOT와 위반 테스트
- [x] 현재 프로젝트 구조·프런트 결합 최적화
- [x] 세 프로필 DB V1 bundle 생성 및 두 번째 빈 DB 재적용
- [x] collaboration 소스 projection 전체 검증
- [x] 변이 검증과 harness baseline 정당 변경 기록
- [x] 운영 문서 동기화
- [x] 최종 원본 schema validation, targeted tests, worktree 감사
