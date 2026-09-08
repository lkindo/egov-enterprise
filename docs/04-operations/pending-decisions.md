# 사용자 결정 대기 레지스트리

이 문서는 **현재 사용자·제품·운영 판단이 있어야 다음 단계로 갈 수 있는 항목만** 기록한다.
완료 과정, 커밋별 시행착오, 일회성 통계는 Git과 PR에 남기고 이 레지스트리에 복제하지 않는다.
구현 결함이나 외부 차단 상태는 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)에서 찾는다.

## 상태와 처리 규칙

- `open`: 선택지가 현재 구현에 실제 영향을 주며 사용자 판단이 필요하다.
- `blocked-input`: 인수처 정책·외부 스펙·운영 토폴로지가 없으면 선택할 수 없다.
- 결정 후에는 코드·ADR 등 정본을 먼저 갱신하고 이 행을 제거한다. 완료 이력은 이 파일에 누적하지 않는다.
- 각 행의 근거일은 서로 다를 수 있다. 착수 전 링크된 현재 코드·설정과 live DB·외부 설정을 다시 확인한다.

## 제품·보안 결정

| ID | 상태 | 결정할 것 | 현재 확인된 경계 | 권장안·재개 조건 | 근거 |
|---|---|---|---|---|---|
| PD-AUTH-001 | blocked-input | 로그인 응답 본문의 `accessToken`을 없애고 순수 HttpOnly 쿠키 계약으로 갈지 | `refreshToken`은 이미 응답에서 숨기지만 `accessToken`은 E2E setup·정리 스크립트 등 비브라우저 소비자가 사용한다. | 외부 API 소비자 지원 정책을 먼저 정한다. 제거한다면 소비자를 쿠키 또는 별도 machine-to-machine 인증으로 전환한 뒤 공급 계약을 축소한다. | [TokenResponse](../../business-core/src/main/java/nuri/business/service/auth/dto/TokenResponse.java), [E2E auth setup](../../frontend/e2e/auth.setup.ts) |
| PD-CSP-002 | blocked-input | CSP 위반 리포트를 자체 로그로 보관할지 외부 수집기로 보낼지 | 수신 Route Handler는 있으나 장기 수집·경보 소유자는 정해지지 않았다. | 보존기간, 개인정보 마스킹, 경보 담당자와 외부 SaaS 허용 여부가 정해질 때 재개한다. | [CSP report route](../../frontend/src/app/api/security/csp/route.ts) |
| PD-NOTE-001 | blocked-input | 양측이 삭제한 쪽지를 즉시 물리 삭제할지 야간 배치로 수거할지 | 사용자 관점 삭제와 물리 보존 수명은 별도 정책이다. | 복구 요구·감사 보존·예상 데이터량을 받은 뒤 선택한다. 소규모이고 별도 보존 의무가 없다면 즉시 수거를 우선한다. | [쪽지 도메인](../../business-app/src/main/java/nuri/business/domain/note) |
| PD-NOTE-003 | blocked-input | 읽은 앱 내 알림(`tb_user_noti`, `read_yn='Y'`)을 몇 개월 뒤에 파기할지 | 파기 경로는 있으나 기본 비활성이다(`nuri.notification.retention.enabled=false`, `read-months=0`). 읽지 않은 알림은 대상이 아니며 1 미만 설정은 켜도 삭제하지 않는다. 법정 보존 의무가 없는 사용자 통지라 로그의 12개월 하한은 적용하지 않았다. | 인수처가 보존 개월을 정하면 `read-months` 와 `enabled` 를 함께 켠다(2026-09-06 DEC-OPS-045 로 운영 compose 가 두 변수를 컨테이너에 전달하므로 이미지 수정 없이 켤 수 있다. 규모가 커지면 파기 술어용 인덱스도 함께 판단한다). 별도 요구가 없으면 6개월을 권고한다(헤더 드로어·알림 센터가 최근 통지만 다루고, 업무 문서는 각 도메인 화면이 정본이다). | [NotificationRetentionScheduler](../../business-app/src/main/java/nuri/business/service/notification/NotificationRetentionScheduler.java), [보존 정책](log-retention-policy.md) |
| PD-NOTE-002 | blocked-input | 미개봉 쪽지 회수 기능을 제품에 넣을지 | 회수는 삭제 정책과 다른 사용자 계약이다. | 요구사항이 없으면 구현하지 않는다. 채택 시 수신·읽음과 동시성 의미를 먼저 정의한다. | [NoteApiController](../../api-server/src/main/java/nuri/api/controller/business/note/NoteApiController.java) |
| PD-BIZ-001 | blocked-input | 별도 사업코드/BIZ master 개념을 향후 지원할지 | 현재 이벤트의 잘못된 `biz_cd`는 제거됐고, 별도 권위 원천은 없다. | 인수처의 사업코드 원천과 소비자가 제시될 때만 신규 모델을 설계한다. | [DB migration](../../api-server/src/main/resources/db/migration) |
| PD-CMTY-001 | open | **커뮤니티 회원 자격이 무엇을 열지** — 커뮤니티 귀속 콘텐츠(회원 전용 게시판 등)를 만들지, 멤버십을 기록으로만 둘지. 같은 결정에서 **블로그 도메인의 처분**(같은 수준으로 만들지 / 걷을지)도 함께 정한다. | 가입 신청·승인·반려 전이는 2026-09-06 DEC-OPS-043 으로 완비됐고 화면도 있다. 그런데 **회원이 되어도 열리는 기능이 없다** — 화면이 그 사실을 고지한다('회원 전용 기능은 아직 제공되지 않습니다'). `BoardMaster.cmntySn`·`Board.blogSn` 귀속 컬럼과 `findByCmntySnAndUseYn` 이 있으나 호출자가 0 이다. 블로그는 한 단계 더 뒤다 — 엔티티·리포지토리·멤버십 모델은 있는데 **서비스 CRUD·DTO·컨트롤러가 0** 이고 `tb_blog_info` 에 행을 만드는 경로도 없어 두 부수 역할(사용자 삭제 정리·템플릿 참조 차단)이 항상 0 을 반환한다. 유일한 `BoardMaster` 생산 UI 는 `blogYn: 'N'` 을 하드코딩한다. 커뮤니티 운영자 위임(`mngrYn='Y'`)과 탈퇴 전이도 경로가 없다. | **함께 결정한다** — 두 도메인이 같은 멤버십 모델이고 `BoardMaster` 의 `cmntySn`·`blogSn` 이 같은 미사용 축이라, 따로 정하면 한쪽을 두 번 뒤집는다. 권장안: **커뮤니티만 회원 전용 게시판으로 한 단계 진행하고 블로그는 현 상태 유지**. 커뮤니티는 API·화면이 이미 있어 귀속 게시판 노출·열람 판정만 얹으면 되고(`APPROVED` 를 경계로 사용), 블로그는 처음부터 만드는 비용이 커뮤니티와 같은데 수요 근거가 없다. 블로그를 걷는 선택은 테이블 DROP 을 동반해 승인받은 PK 현대화(V2_70)를 되돌리는 파괴적 DB 변경이므로 별도 승인 경계다. | [GAP-CMTY-001·GAP-BLOG-001](../../.agent/memory/known-gaps.md), [CommunityService](../../business-app/src/main/java/nuri/business/service/system/content/community/CommunityService.java), [Blog](../../business-app/src/main/java/nuri/business/domain/blog/Blog.java) |
| PD-BIZ-002 | blocked-input | 남아 있는 `biz_yr` 의미를 `evnt_yr`로 개명할지 | 이름 변경은 API·DB·문서 소비자 계약을 함께 바꾼다. | 실제 의미와 외부 소비자를 확인한 후 별도 DB 변경으로 수행한다. | [DB constitution](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) |

## 데이터·운영 결정

| ID | 상태 | 결정할 것 | 현재 확인된 경계 | 권장안·재개 조건 | 근거 |
|---|---|---|---|---|---|
| PD-DB-001 | blocked-input | 공통코드형 컬럼을 FK로 강제할지, 안정된 소수 값만 CHECK로 둘지 | 런타임 변경 가능한 공통코드와 고정 enum은 같은 제약 전략을 쓸 수 없다. | 컬럼별 권위 원천과 변경 주기를 먼저 분류한다. 동적 코드는 FK, 불변 상태값은 CHECK를 기본안으로 삼는다. | [DB constitution](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md), [migrations](../../api-server/src/main/resources/db/migration) |
| PD-DB-002 | blocked-input | `tb_menu_info.route_mdfcn_yn`의 실제 의미를 정의하고 개명할지 | `_yn` 이름과 달리 불리언 제약에서 명시 제외돼 있으며 마이그레이션이 비불리언 값을 사용한다. | 메뉴 원천 시스템의 필드 의미를 확보한 뒤 값 정리·개명·소비자 전환을 한 변경으로 설계한다. | [V2_24](../../api-server/src/main/resources/db/migration/V2_24__add_yn_check_and_meta_fk_index.sql), [write smoke](../../api-server/src/test/java/nuri/api/schema/WriteSmokeIntegrationTest.java) |
| PD-DB-003 | blocked-input | `tb_com_dtl_cd`의 표준 상세코드 값을 어디서 공급할지 | 그룹·테이블 구조는 있으나 인수처별 실제 코드값의 권위 원천은 저장소가 정할 수 없다. | 인수처 export 또는 공식 코드 사전을 받으면 seed와 검증 계약을 만든다. 원천 없이 임의 값을 시드하지 않는다. | [framework seed](../../api-server/src/main/resources/db/migration/R__seed_framework.sql) |
| PD-DB-004 | blocked-input | `tb_inst_cd_rcptn_log.etc_cd`를 외부 스펙에 맞춰 정의할지 제거할지 | 이름·길이의 권위 원천이 없고 V2_18에서 의도적으로 보류됐다. | 기관코드 연계 스펙을 받으면 표준화하고, 소비 계획이 없다는 제품 결정이 내려지면 안전 삭제 절차를 적용한다. | [V2_18](../../api-server/src/main/resources/db/migration/V2_18__normalize_column_lengths_finalize.sql) |
| PD-LOG-001 | blocked-input | 접속기록을 보존기간 동안 원형 유지할지 사용자 삭제 시 가명화를 추가할지 | 현행 구현은 접속기록을 24개월 보존하고 사용자 사용통계만 탈퇴 시 정리한다. | 법무·개인정보 책임자가 감사 추적성과 파기 요구를 판정한 뒤 결정한다. 가명화한다면 모든 행위자 컬럼을 같은 정책으로 다룬다. | [log retention policy](log-retention-policy.md) |
| PD-OPS-001 | blocked-input | stdout 운영 로그를 어떤 외부 수집·보존 스택으로 보낼지 | 컨테이너 로컬 로그만으로는 재배포·호스트 장애를 넘는 보존을 보장하지 못한다. | 배포 환경, 보존기간, 검색·경보 책임, 비용 상한을 받은 뒤 Loki/CloudWatch 등 구체 스택을 선택한다. | [production compose](../../docker-compose.prod.yml), [log policy](log-retention-policy.md) |
| PD-OPS-002 | blocked-input | 네트워크 관리 화면의 계측 원천을 무엇으로 할지 | API는 가짜 상태를 만들지 않고 계측 소스가 없으면 빈 결과를 반환한다. | Prometheus·클라우드 모니터링 등 실제 source of truth가 정해질 때까지 화면을 운영 판단 근거로 쓰지 않는다. | [NetworkMonitoringApiController](../../api-server/src/main/java/nuri/api/controller/foundation/controller/system/log/NetworkMonitoringApiController.java) |
| PD-STORAGE-001 | blocked-input | 논리 삭제(`useYn='N'`)된 게시글의 첨부 파일을 언제 물리 파기할지 — 파기 없이 보존할지, 게시글 파기와 함께 지울지, 별도 유예 뒤 지울지 | 게시글 삭제는 `Board.delete()` 가 `useYn='N'` 만 바꾸는 논리 삭제라 게시글 행·첨부 마스터·실물 파일이 모두 남고, 게시글 파기(물리 삭제) 경로 자체가 없다. 첨부 단건 삭제 API(`DELETE /api/v1/files/{atchFileSn}/{fileSn}`, DEC-OPS-034)는 사용자가 명시적으로 지울 때만 실물을 함께 지운다. 삭제된 게시글의 첨부를 먼저 지우면 `useYn` 복원으로 되살린 게시글이 없는 마스터를 가리키는데(`tb_bbs_item.atch_file_sn` 은 물리 FK 없이 참조), 무결성 점검(GAP-STORAGE-001)은 마스터↔실물만 대조해 그 끊긴 참조를 보지 못하므로 보존 정책 없이 파기하지 않는다(DEC-OPS-034). | 게시글 보존·파기 정책(복구 창, 감사 보존 의무, 예상 용량)을 받은 뒤 게시글 파기와 첨부 파기를 **같은 배치**로 설계한다. 별도 요구가 없으면 로그·알림 파기 스케줄러와 같은 모양(기본 비활성·하한 가드)으로 두고, 유예 기간은 PD-NOTE-001(쪽지 물리 삭제)과 함께 정한다. GAP-STORAGE-001 (b)의 정기 점검 결과 보존 경로가 생기면 파기 전 점검 → 파기 → 점검의 순서로 결속한다. | [BoardService#deletePost](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [Board.delete](../../business-app/src/main/java/nuri/business/domain/board/Board.java), [FileService](../../business-core/src/main/java/nuri/business/service/file/FileService.java), [GAP-STORAGE-001](../../.agent/memory/known-gaps.md) |

## 거버넌스·UX 결정

| ID | 상태 | 결정할 것 | 현재 확인된 경계 | 권장안·재개 조건 | 근거 |
|---|---|---|---|---|---|
| PD-RBAC-001 | open | DB 인가 전환의 사후 shadow 증명을 수행할지 현재 위험을 수용할지 | `rbac.db-auth.enabled=true`, `rbac.shadow.enabled=false`이며 URL 인가와 객체 소유권은 서로 다른 방어선이다. | 현재 패턴과 DB 정책의 불일치 0을 재현한 뒤 하드코딩 fallback의 처분을 결정하는 안을 권장한다. | [application.yml](../../api-server/src/main/resources/application.yml), [ApiSecurityConfig](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java) |
| PD-RPT-001 | open | **메모보고 수정·삭제를 화면에 열지, 연다면 응답 계약을 어떻게 확장할지** | 서버는 완비돼 있고 인가도 명확하다(`assertOwnerOrAdmin(frstRgtrId)`). 그런데 **화면이 '내가 고칠 수 있는가' 를 판정할 정보를 받지 못한다** — 그 인가는 `frstRgtrId`(loginId 축)인데 응답 DTO 에 그 필드가 없고, 같은 도메인의 열람 인가는 `userId`·`rptrId`(esntlId 축)를 쓴다. 두 축이 다르다. | 세 선택지: ⓐ 응답에 `editable` 같은 **판정 결과**를 내려준다(식별자 노출 없음 — 권장), ⓑ 응답에 `frstRgtrId` 를 추가한다(loginId 가 목록 응답에 실려 계정 열거 표면이 넓어진다), ⓒ 화면이 판정하지 않고 버튼을 항상 노출한 뒤 서버 403 을 보여 준다(만족도 화면의 방침이나, 목록형 업무 화면에서는 눌러 봐야 아는 버튼이 늘어난다). 권장 ⓐ 를 택하면 서버 DTO·OpenAPI·생성 계약 재생성이 따라온다. | [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [MemoReportDto](../../business-app/src/main/java/nuri/business/service/memoreport/dto/MemoReportDto.java) |
| PD-UX-001 | open (범위 축소) | 참조-기본 IA 는 2026-08-23 G1 워크숍에서 **승인 완료**(ADR-0007, 사용자 연구 없는 승인은 accepted-risk 영구 기록). 잔여 결정 = exact label/group/order/visibility 와 119+2 route disposition 의 **개별 승인** | 증거 기준이 ADR-0007 로 재정의돼 연구·live DB 없이 owner PR 리뷰로 진행 가능해졌다. disposition overlay 는 `proposed` 유지 — 개별 승인 전 menu/generator 소비 불가(fail-closed). | disposition 초안을 작성해 owner PR 리뷰로 route 별 승인을 누적한다. 기관 채택 시 §11.8 원 기준 재검증이 의무다. | [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [IA §14.3](../01-product/information-architecture.md#143-2026-08-23-g1-decision-workshop-기록) |
| PD-UX-002 | open (범위 축소) | URL-state의 미승인 3개 부류(`path-intent`, `hand-assembled-segment`, `opaque`)를 어떻게 분류·검증할지 | 개인정보가 포함될 수 있는 업무 검색어는 ADR-0009에 따라 `q`·`searchCnd`·`searchWrd`와 route-key binding 3건으로 제한 승인됐다. `ui-url-state-approval.json`의 top-level은 `class-governed`·`non-normative-url-state-class-registry`인 비규범 컨테이너이며, 7개 부류 중 4개가 각자 승인 기록을 가진다. ADR-0009 `decisionRef`는 `search-input`에만 있다. 결정 시점 census 368건 중 승인 selector로 완전히 덮인 state-bearing record는 119건이며 검색 승인이 5건을 추가했다. | `path-intent`는 query 보존 경계, `hand-assembled-segment`는 허용 값·인코딩, `opaque`는 detector 개선을 먼저 확정한다. blanket 승인은 하지 않는다. `reviewBy` 2026-12-31 뒤 재승인이 없으면 2027-01-01 시계에서 258건이 red다. | [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md), [부류 오버레이 설계](../02-architecture/url-state-approval-overlay-design.md), [승인 근거](url-state-class-approval-evidence.md), [`ui-url-state-approval.json`](../../config/ui-url-state-approval.json) |

## 결정과 별개로 남은 실행 조건

- CSP Phase 3(`style-src` 세분화)는 production build에서 sonner·framer-motion의 런타임 style 주입을 측정한 뒤 수행한다. nonce 기반 Phase 4는 PD-CSP-001 결정(DEC-OPS-011: PPR 포기·전 페이지 동적 렌더)으로 2026-08-20 집행 완료됐다 — 상세는 [known-gaps GAP-FE-001](../../.agent/memory/known-gaps.md)을 본다.
- 외부 자격·환경 때문에 실행하지 못한 NVD 스캔, 실제 k6, 인증 ZAP은 [검증 사각지대 런북](verification-blindspots.md)의 `blocked-external` 규칙으로 관리한다.
- 단순 리팩터 아이디어나 완료 항목은 이 레지스트리에 두지 않는다. 필요해지면 구체적 목표·근거·소유자를 갖춘 이슈로 새로 만든다.
