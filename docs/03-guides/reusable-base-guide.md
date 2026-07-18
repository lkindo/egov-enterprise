# 재사용 Base 가이드 (`template/reusable-base`)

> **이 브랜치는 무엇인가**: eGov Enterprise 를 **신규 SI/재개발 프로젝트의 시작점(base)**으로 쓰기 위해,
> 데모용 샘플 도메인 20+개를 **코드·라우트·DB 테이블까지 물리적으로 제거**한 "깨끗한 골격" 브랜치다.
> `main` 은 **데모 전량을 보존**하며, 이 브랜치만 샘플이 제거된 상태다.
>
> - **브랜치**: `template/reusable-base`
> - **기준 커밋**: `4009edd47` (main 대비 374파일 변경, **31,941줄 삭제**)
> - **원본(데모)**: `main`
> - **최초 작성**: 2026-07-18

---

## 1. 목적과 철학

이 저장소의 진짜 목적은 **전자정부 표준 프레임워크의 현대화 골격을 재사용**하는 것이다. `main` 에는
게시판·설문·커뮤니티·일정 등 실동작 데모가 가득하지만, 신규 프로젝트에는 대부분 불필요하다.

`template/reusable-base` 는 **"복제 → 신규 DB 부팅 → 바로 개발 시작"** 이 되도록, 아래만 남긴 순수 골격이다.

- **커널(필수 인프라)**: 인증·인가·사용자·조직·부서·메뉴·프로그램·공통코드·파일·로그·정책·마이페이지
- **핵심 재사용 기능**: 게시판(board) + 통신 4종(notification·mail·sms·note)

신규 프로젝트는 이 base 위에 자기 도메인을 얹으면 된다.

---

## 2. 유지 / 삭제 도메인 매트릭스

### 2.1 유지 (base 기본 탑재)

| 구분 | 도메인 |
|---|---|
| **커널** | auth · login · user · organization · deptjob · group · menu · program · code(공통코드) · file · log · policy · mypage · config · common |
| **게시판 클러스터** | board · **comment** · **scrap** · satisfaction · BoardTemplate(`tb_tmplt_info`) |
| **통신 4종** | notification · mail · sms · note |
| **대시보드** | DashboardApiController (DashboardItemProvider SPI — board 위젯만 기본 탑재) |

> ⚠ **comment·scrap 는 board 와 한 몸이다.** `Board` 엔티티가 `@OneToMany` 로 comment 를 소유하고
> `BoardEventListener` 가 댓글 수를 동기화하므로, board 를 유지하려면 comment·scrap 은 필수 유지다.

### 2.2 삭제 (샘플 데모 — base 에서 제거됨)

`image · template(도메인 코드) · stats · banner · popup · community · survey · consult · calendar ·
schedule · addressbook · faq · help · blog · poll · reward · informalsanction · isg · memoreport ·
operation · report`

> **approval(전자결재) 도 함께 삭제됐다** — `ApprovalApiController`/`InformalSanctionApiController` 가
> 동일한 informalsanction 백엔드(`tb_ifml_atrz_info`)를 공유하는 얇은 계층이라, informalsanction 삭제 시
> 함께 제거된다.

---

## 3. 핵심 설계 결정 (왜 이렇게 잘라냈나)

의존성을 정적 실측한 뒤 아래 함정을 피해 외과적으로 분리했다.

| # | 결정 | 이유 |
|---|---|---|
| 1 | **comment·scrap = board 유지** | board 엔티티가 직접 참조. 삭제 시 board 컴파일/기능 파손 |
| 2 | **blog 외과적 제거** | `Blog*`/`BlogDto`/`BlogMapper` 가 board 패키지에 물리 융합 → 도려내고 `BoardMasterService` 의 blog 메서드(死코드) 제거 |
| 3 | **approval = informalsanction 함께 삭제** | 동일 백엔드 테이블 공유 |
| 4 | **template: 코드만 삭제, 테이블 유지** | `tb_tmplt_info` 를 board 의 `BoardTemplate` 이 이중 매핑 → 테이블·BoardTemplate 은 유지, 독립 template 도메인 코드만 삭제 |
| 5 | **UserDeletionCleanupListener 분기 축소** | 사용자 삭제 정리 리스너가 addressbook/blog/community 를 참조 → 해당 분기 제거, comment/notification/board 유지 |
| 6 | **허브 의존 페이지 → 리다이렉트** | `dept-job`/`boards`/`work-hub` 페이지가 삭제된 다중탭 허브 셸(WorkHubClient/KnowledgeHubClient)을 얇게 감싸고 있어, 실제 목록 라우트로 리다이렉트하도록 교체 |

---

## 4. 데이터베이스 — V2_25 Teardown ⚠ 중요

### 4.1 동작
`api-server/.../db/migration/V2_25__drop_sample_domain_tables.sql` 이 삭제 도메인의 **물리 테이블 39개를
`DROP TABLE IF EXISTS ... CASCADE`** 로 제거하고, `tb_menu_info` 에서 삭제 라우트를 가리키는 메뉴 항목을 정리한다.

- `IF EXISTS` + `CASCADE`: 대상 부재 시 무시, 삭제 도메인의 FK 는 테이블과 함께 소멸
- ZeroDowntime 린터는 각 `DROP` 라인의 `-- linter:ignore` 로 의도된 예외 처리
- 유지 테이블(`tb_bbs_*`, `tb_dgstfn_info`, `tb_tmplt_info`, `tb_note_*`, `tb_user_*`, `tb_menu_*`,
  `tb_com_*`, `tb_file_*`, 조직/부서/그룹/프로그램/로그인/인가/롤, `tb_stmp_info`, `tb_indv_pg_conts`)은 **제외**

### 4.2 🚨 반드시 지켜야 할 것 — 신규(FRESH) DB 전용
> **V2_25 를 공유 데모 OCI DB 에 절대 적용하지 말 것.** `main`(데모)의 샘플 데이터가 파괴된다.
>
> 이 브랜치의 마이그레이션 체인은 **신규(비어 있는) 데이터베이스**를 대상으로 설계됐다.
> 신규 DB 에서는 V2_0 → … → V2_24 가 샘플 테이블을 만들고 **V2_25 가 그것을 제거**해 최종 스키마가 깨끗해진다.
> 이미 데모가 적재된 OCI 에 이 브랜치로 `bootRun` 하면 V2_25 가 실 데이터를 드롭하므로 금지한다.

---

## 5. 신규 프로젝트 시작하기 (사용법)

```bash
# 1) base 브랜치로 새 저장소 시작
git clone -b template/reusable-base <this-repo-url> my-new-project
cd my-new-project

# 2) 반드시 신규(빈) 데이터베이스를 준비하고 접속 정보를 교체
#    - application.yml 의 spring.datasource.* 를 새 DB 로 지정 (데모 OCI 재사용 금지)

# 3) 백엔드 부팅 — Flyway 가 V2_0..V2_25 를 신규 DB 에 적용 → 깨끗한 스키마
./gradlew :api-server:bootRun     # (Windows: .\gradlew.bat ...)

# 4) 프론트엔드
pnpm -C frontend install
pnpm -C frontend dev
```

이후 신규 도메인을 추가할 때:
- 프론트 선택 모듈은 `frontend/src/config/project-modules.ts` 의 `projectModules` 배열에 등록
- 백엔드/DB 는 3대 헌법(`.agent/knowledge/.../constitution.md`)을 따른다

---

## 6. 검증 게이트 (기준 커밋 `4009edd47` 시점)

| 게이트 | 결과 |
|---|---|
| BE `compileJava` + `compileTestJava` + 전체 `test` (H2) | **BUILD SUCCESSFUL** (전면 통과) |
| 마이그레이션 린터 (ZeroDowntime/SchemaNaming/UniqueMirror/ApiDocsPath) | **BUILD SUCCESSFUL** |
| FE `tsc --noEmit` | 그린 |
| FE `next build` | **성공 — 정적 페이지 125 → 72** |
| FE `vitest` | **162 passed / 1 skipped** |

> BE 테스트는 H2 인메모리 + `flyway.enabled=false` 라 V2_25 DROP 은 테스트에 영향을 주지 않는다(공유 OCI 무관).

---

## 7. FE 死코드 정리 이력 (완료)

재사용 base 의 프론트엔드 死서비스·死위젯 정리를 2단계로 **완료**했다(2026-07-18).

- **Phase 1 — orphan 서비스 21개 삭제**: kept 파일이 참조하지 않는 삭제도메인 서비스
  (survey·poll·community·template·help·hpcm·manual·ism·approval·memoreport·operation·event·
  roughmap·report·deptSchedule·banner-admin·popup-admin)를 importer 실측 후 삭제. 집합 서비스
  테스트(AdminServicesPart2/3·Comprehensive·UserDomain·Support)에서 삭제-서비스 블록만 제거하고
  유지 서비스 커버리지는 보존.
- **Phase 2 — kept UI 얽힘 4개 완전 제거**: `addressbook`·`banner`·`popup`·`stats` 가 유지 UI 에
  박혀 있던 것을 걷어냄.
  - **대시보드**(`UnifiedDashboardClient`): 배너 슬라이더·팝업·통계 차트 위젯 제거. 실시간 피드
    (WebSocket)·활동 피드·공지/업무 리스트·요약 카드·시스템 지표는 유지 → 기능하는 대시보드 보존.
    (`BannerSlider`/`PopupManager`/`DashboardCharts` 삭제)
  - **comms 수신자 검색**: 주소록 자동완성 → **수동 입력**으로 전환 —
    쪽지(`note`, UserPicker 제거)·`CollaborationHubClient`(CONTACTS 탭 제거)·`MailSendHubClient`
    (ID/이메일 입력 후 추가). `user-picker.tsx`·`types/business/addressbook` 삭제.
  - 삭제 서비스: `AddressbookUserService`·`BannerService`·`PopupService`·`StatsAdminService`·`StatsService`.

> **의도적으로 유지된 것**: `knowledgeService` 는 게시판 상세(`BoardDetailClient`/`Server`)가 쓰는 **유지
> 도메인 서비스**라 삭제하지 않았다. `NoteService`·`MailService`·`ScrapService`·`CommentService` 등
> 통신/게시판 서비스도 유지.
> **후속(E2E)**: 메일 수신자 플로우가 검색→수동입력으로 바뀌었으므로, 관련 E2E
> (`recipient-item`·`selected-recipient-badge` testid)는 별도 갱신 대상이다.

검증(각 Phase): tsc 그린 · next build 성공(72 pages) · vitest 155 passed.

---

## 8. main(데모)과의 관계 · 유지보수

- `main` = 데모 전량 보존(원본). 이 브랜치 = 샘플 제거 골격.
- **커널 개선을 base 에 반영**하려면: `main` 에서 커널/board/통신 관련 수정을 한 뒤 이 브랜치로
  `cherry-pick` 또는 선별 병합한다. (샘플 관련 커밋은 가져오지 않는다.)
- 반대로 이 브랜치의 골격 정리 결과를 `main` 에 되돌리지 않는다(main 은 데모를 유지해야 함).
- 마이그레이션 체인이 의도적으로 분기됐으므로, 두 브랜치는 **서로 다른 데이터베이스**를 대상으로 한다.

---

*Governed by: Enterprise Governance Constitution · 관련 메모: 프레임워크 재사용 목표(§2.B)*
