# 사용자 결정 대기 레지스트리

이 문서는 **현재 사용자·제품·운영 판단이 있어야 다음 단계로 갈 수 있는 항목만** 기록한다.
완료 과정, 커밋별 시행착오, 일회성 통계는 Git과 PR에 남기고 이 레지스트리에 복제하지 않는다.
구현 결함이나 외부 차단 상태는 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)에서 찾는다.

## 상태와 처리 규칙

- `open`: 선택지가 현재 구현에 실제 영향을 주며 사용자 판단이 필요하다.
- `blocked-input`: 인수처 정책·외부 스펙·운영 토폴로지가 없으면 선택할 수 없다.
- 결정 후에는 코드·ADR 등 정본을 먼저 갱신하고 이 행을 제거한다. 완료 이력은 이 파일에 누적하지 않는다.
- 아래의 코드·설정 사실은 2026-08-20 워킹트리 기준이다. 착수 전 대상 파일과 live DB·외부 설정을 다시 확인한다.

## 제품·보안 결정

| ID | 상태 | 결정할 것 | 현재 확인된 경계 | 권장안·재개 조건 | 근거 |
|---|---|---|---|---|---|
| PD-AUTH-001 | blocked-input | 로그인 응답 본문의 `accessToken`을 없애고 순수 HttpOnly 쿠키 계약으로 갈지 | `refreshToken`은 이미 응답에서 숨기지만 `accessToken`은 E2E setup·정리 스크립트 등 비브라우저 소비자가 사용한다. | 외부 API 소비자 지원 정책을 먼저 정한다. 제거한다면 소비자를 쿠키 또는 별도 machine-to-machine 인증으로 전환한 뒤 공급 계약을 축소한다. | [TokenResponse](../../business-core/src/main/java/nuri/business/service/auth/dto/TokenResponse.java), [E2E auth setup](../../frontend/e2e/auth.setup.ts) |
| PD-CSP-002 | blocked-input | CSP 위반 리포트를 자체 로그로 보관할지 외부 수집기로 보낼지 | 수신 Route Handler는 있으나 장기 수집·경보 소유자는 정해지지 않았다. | 보존기간, 개인정보 마스킹, 경보 담당자와 외부 SaaS 허용 여부가 정해질 때 재개한다. | [CSP report route](../../frontend/src/app/api/security/csp/route.ts) |
| PD-NOTE-001 | blocked-input | 양측이 삭제한 쪽지를 즉시 물리 삭제할지 야간 배치로 수거할지 | 사용자 관점 삭제와 물리 보존 수명은 별도 정책이다. | 복구 요구·감사 보존·예상 데이터량을 받은 뒤 선택한다. 소규모이고 별도 보존 의무가 없다면 즉시 수거를 우선한다. | [쪽지 도메인](../../business-app/src/main/java/nuri/business/domain/note) |
| PD-NOTE-002 | blocked-input | 미개봉 쪽지 회수 기능을 제품에 넣을지 | 회수는 삭제 정책과 다른 사용자 계약이다. | 요구사항이 없으면 구현하지 않는다. 채택 시 수신·읽음과 동시성 의미를 먼저 정의한다. | [NoteApiController](../../api-server/src/main/java/nuri/api/controller/business/note/NoteApiController.java) |
| PD-BIZ-001 | blocked-input | 별도 사업코드/BIZ master 개념을 향후 지원할지 | 현재 이벤트의 잘못된 `biz_cd`는 제거됐고, 별도 권위 원천은 없다. | 인수처의 사업코드 원천과 소비자가 제시될 때만 신규 모델을 설계한다. | [DB migration](../../api-server/src/main/resources/db/migration) |
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

## 거버넌스·UX 결정

| ID | 상태 | 결정할 것 | 현재 확인된 경계 | 권장안·재개 조건 | 근거 |
|---|---|---|---|---|---|
| PD-RBAC-001 | open | DB 인가 전환의 사후 shadow 증명을 수행할지 현재 위험을 수용할지 | `rbac.db-auth.enabled=true`, `rbac.shadow.enabled=false`이며 URL 인가와 객체 소유권은 서로 다른 방어선이다. | 현재 패턴과 DB 정책의 불일치 0을 재현한 뒤 하드코딩 fallback의 처분을 결정하는 안을 권장한다. | [application.yml](../../api-server/src/main/resources/application.yml), [ApiSecurityConfig](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java) |
| PD-UX-001 | open (범위 축소) | 참조-기본 IA 는 2026-08-23 G1 워크숍에서 **승인 완료**(ADR-0007, 사용자 연구 없는 승인은 accepted-risk 영구 기록). 잔여 결정 = exact label/group/order/visibility 와 119+2 route disposition 의 **개별 승인** | 증거 기준이 ADR-0007 로 재정의돼 연구·live DB 없이 owner PR 리뷰로 진행 가능해졌다. disposition overlay 는 `proposed` 유지 — 개별 승인 전 menu/generator 소비 불가(fail-closed). | disposition 초안을 작성해 owner PR 리뷰로 route 별 승인을 누적한다. 기관 채택 시 §11.8 원 기준 재검증이 의무다. | [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [IA §14.3](../01-product/information-architecture.md#143-2026-08-23-g1-decision-workshop-기록) |
| PD-UX-002 | blocked-input | 로그 검색 조건을 URL에 얼마나 보존할지 — 2026-08-23 워크숍에서 **deferred 확정**: 분류는 면제가 아니라 수행 대상 | 공유·새로고침 복원성과 URL 내 개인정보 노출 위험이 충돌한다. URL-state census 523 record 의 분류 초안이 선행돼야 승인 회의가 성립한다. | 분류 초안 작성을 별도 태스크로 수행한 뒤 owner 승인 회의를 다시 연다. 페이지·탭 등 비민감 상태만 URL에 두는 안이 기본 검토안이다. | [IA §14.3](../01-product/information-architecture.md#143-2026-08-23-g1-decision-workshop-기록), [frontend log routes](../../frontend/src/app/admin/system/logs) |

## 결정과 별개로 남은 실행 조건

- CSP Phase 3(`style-src` 세분화)는 production build에서 sonner·framer-motion의 런타임 style 주입을 측정한 뒤 수행한다. nonce 기반 Phase 4는 PD-CSP-001 결정(DEC-OPS-011: PPR 포기·전 페이지 동적 렌더)으로 2026-08-20 집행 완료됐다 — 상세는 [known-gaps GAP-FE-001](../../.agent/memory/known-gaps.md)을 본다.
- 외부 자격·환경 때문에 실행하지 못한 NVD 스캔, 실제 k6, 인증 ZAP은 [검증 사각지대 런북](verification-blindspots.md)의 `blocked-external` 규칙으로 관리한다.
- 단순 리팩터 아이디어나 완료 항목은 이 레지스트리에 두지 않는다. 필요해지면 구체적 목표·근거·소유자를 갖춘 이슈로 새로 만든다.
