---
schema_version: 1
memory_kind: known-gaps
status: active
authority: derived-active-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-10-29
verified_against: 47ff9721ccd0076ed11825d5607519be12652327
canonical_sources:
  - ../../docs/04-operations/known-gaps-detail.md
  - ../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md
  - ../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md
  - ../../docs/archived/operational-decisions-history.md
  - ../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md
  - ../../docs/02-architecture/testing-process-redesign.md
  - ../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md
  - ../../docs/04-operations/authorization-cutover-runbook.md
  - ../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md
  - ../../frontend/public/governance_harness_atlas.html
  - ../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md
  - ../../docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md
  - ../../docs/02-architecture/legacy-migration-tool-design.md
  - ../../docs/04-operations/verification-blindspots.md
  - ../../docs/04-operations/pending-decisions.md
  - ../../docs/03-guides/design-tokens.md
refresh_triggers:
  - gap-state-change
  - production-readiness-change
  - verification-evidence-change
---

# 공용 활성 Gap 인덱스

`verified_at`·`verified_against`는 인덱스 구조·참조를 점검한 날짜와 작업 시작 커밋이다. 이 점검은 과거 승인·DB·CI·운영 실측을 재실행한 것이 아니다. 행의 검증일은 그 행의 근거를 마지막으로 대조한 날이며, 2026-10-17로 갱신한 행은 링크된 원장·코드·문서를 다시 대조했고 DB·운영 실측은 다시 하지 않았다.

## 범위·상태 정의

이 파일은 현재 코드나 외부 실측으로 재현 가능한 미해결 위험의 얇은 인덱스다. 상세 원장은 링크된 문서·코드이며, 완료 이력은 Git과 보관 기록에 남긴다. 활성 표 밖에는 종료 뒤 남은 경계와 재개 조건만 둔다. 세션마다 자동으로 읽히므로 아래 두 표에는 모든 작업에 걸리거나 글로만 지켜지는 금지가 있는 행만 전문으로 두고, 특정 경로에서만 필요한 행은 「영역 상세 gap 레지스트리」에 한 줄로 남긴 뒤 전문을 [gap 영역 상세](../../docs/04-operations/known-gaps-detail.md)에 둔다.

- 우선순위: `P0` 즉시 안전/false-green, `P1` 높은 회귀·운영 위험, `P2` 계획 필요, `P3` 개선.
- 상태: `open`, `blocked-external`, `deferred`, `accepted-risk`, `needs-revalidation`.
- 추측이나 과거 task의 unchecked 항목만으로 새 gap을 만들지 않는다.

## 활성 Gap registry

| GAP-ID | 우선순위 | 상태 | 영역 | 요약 | 근거 | 다음 행동/재개 조건 | 결정권자 | 검증일 |
|---|---|---|---|---|---|---|---|---|
| GAP-PACK-001 | P2 | open | reusable feature boundaries | 기능 소유(`config/modules`)에 따른 Java·frontend 투영과 시작 구성 CI 경로가 있다. 시작 구성도 기능 단위로 투영해 pack·순위 축이 없고(11단계 C3~C7), 같은 기능 목록의 직접 선택과 결과가 같다(ADR-0028, DEC-OPS-285·289). 검색·모니터링·게시판 마법사의 상위 기능 import 를 분리하고, 제거된 원본 목적지의 alias·redirect 와 UI 원장의 적용범위를 투영한다. 적용 대상 소스 부재는 비대상으로 숨기지 않는다. 소유 판정은 선언이 아니라 연쇄 실측이다 — 자기 파일이 어느 기능 경로에도 없어도 다른 기능 소유 타입을 import 하면(타입 전용 참조 포함) 함께 빠지며, 투영 tsc 와 생존 목록이 그것을 잡는다. 남은 경계는 모든 일반 링크·업무 흐름의 런타임 의미를 포괄하는 검증이다. | [프로필 검증](../../scripts/verify-reusable-base.mjs), [기능 선언](../../config/modules/), [preset 동치 계약](../../scripts/project-composer-preset-equivalence.test.mjs), [투영 무결성](../../scripts/reusable-governance-integrity.mjs), [생존 가드](../../scripts/frontend-reachability-census.test.mjs) | 새 링크·흐름 변경은 실제 생성물과 기관 시나리오로 검증하며 마커로 정상 기능을 과잉 은폐하지 않는다. 한 테스트 파일이 여러 기능의 서비스를 다시 섞지 않게 유지한다. 기술 runner 결과를 기관 업무·운영 승인으로 승격하지 않는다. 리다이렉트 페이지 제거는 동거 테스트를 연쇄하지 않는다 — 연쇄로 바꾸면 목적지 소실이 조용히 통과한다. 남는 화면은 생성기·정밀 점검·무결성 검사가 기능 소유 기대값과 양방향으로 대조하고(DEC-OPS-265), 시작 구성의 비화면 파일은 동치 계약이 같은 목록의 직접 선택과 대조한다. | 아키텍처/제품 소유자 | 2026-10-20 |
| GAP-ZDM-001 | P2 | open | zero-downtime | 구조화 waiver와, 승인과 구분된 동결 부채인 2026-09-16 이전 자유형 예외(V2_8~V2_83)가 있다 — 건수·대상·만료는 [waiver 원장](../../config/governance/zdm-waivers.json)과 린터의 두 예외 상수가 정본이다(DEC-OPS-340). Contract 성격 waiver의 `expandMigration`은 실제 존재하며 더 이른 Flyway 버전이어야 한다. 파괴적 DDL·예외 메타데이터·선행 Expand와 그 릴리스 기록·관측 기간은 검사하지만 실제 배포·backfill 완료·릴리스 간 호환 창까지 증명하지 않는다. 2026-09-16 이전 승인 동결분과 사용자 승인 V2_127(DEC-OPS-233)은 릴리스 기록·관측 기간 검사에서 빠진다(id·대상·선행 Expand 조합 고정). 2026-09-14 OCI 읽기 실측에서 레거시 부채 마이그레이션은 모두 성공 적용됐고 재사용 DB 번들은 V2 체인 대신 `V1_0__baseline.sql` 덤프를 써서, 이미 적용된 부채가 다시 실행될 경로가 없어 P2로 둔다. 적용된 마이그레이션은 수정할 수 없으므로 건수를 줄이는 것은 목표가 아니다. | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [waiver registry](../../config/governance/zdm-waivers.json), [무중단 이행 가이드](../../docs/02-architecture/zero-downtime-migration.md), [재사용 DB 번들 생성기](../../scripts/generate-reusable-base-db.mjs) | 새 Contract waiver는 `expandRelease`로 선행 Expand의 릴리스 태그·배포일·환경·기록 행을 남기고, 린터가 7일 관측 기간과 같은 릴리스 동시 반영을 막는다(DEC-OPS-101). 남은 과제는 그 기록이 실제 배포·관측을 뜻한다는 운영 증거다. 레거시 부채 마이그레이션(V2_8~V2_83)을 다 적용하지 않은 채 멈춘 환경이 새로 확인되면 P1로 되돌린다. 소스 버전 선후만으로 무중단 적용 완료를 주장하지 않는다. | DB/사용자 | 2026-10-27 |
| GAP-UIQ-001 | P2 | deferred | ui quality evidence | 8개 시나리오는 partial-automated-evidence이며 currentBaseline은 unmeasured다. r12에는 실행 시점 protocol hash가 없어 ADR-0005의 measured 자격이 없고, 현재 8개 화면 모두 r12 이후 변경됐다. 수동 접근성 48건 중 전문가 검토 40건·NVDA/Chrome 외부 차단 8건은 미완료다. 2026-09-08 소유자 재검토의 asOf와 28개 reviewBy 2026-12-07은 보존하며 90일 기록 상한도 유지한다. ADR-0018 이후 일정 경과는 운영 보고의 overdue이며 기술 CI 자동 실패가 아니다. | [사용자 런북 §8](../../docs/04-operations/ui-ux-modernization-user-action-runbook.md), [baseline protocol §13](../../docs/04-operations/ui-ux-baseline-protocol.md), [ADR-0005](../../docs/02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md), [ADR-0018](../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md) | 지정 평가자와 승인된 Windows 환경을 확보하면 protocol hash를 실행 시점에 기록한 새 run과 수동 48건을 같은 combined summary로 발행한다. 그전까지 measured 선언·hash 소급 대입·수동 항목 자동 충족은 금지다. 정기 검토와 기관 accessibility preflight는 [검토 수명 가이드](../../docs/03-guides/governance-review-lifecycle.md)를 따른다. | 접근성 소유자/사용자 | 2026-09-14 |
| GAP-AGENT-001 | P2 | accepted-risk | coordination | 공용 메모리는 지속 지식만 공유하며 실시간 claim·lock·presence 조정 기능은 없다. 동시 작업은 별도 작업 트리로 떼고 잠금은 두지 않기로 정했다(DEC-OPS-385 ⑥). 같은 기계의 무거운 실행 겹침은 시작 전 프로세스 확인과 실행 기록의 사후 경고가 받친다. | [SOP §6.6](../../docs/03-guides/orchestration-protocol.md#66-작업-트리), [SOP §6.3](../../docs/03-guides/orchestration-protocol.md#63-무거운-검증은-하나씩), [coordination design](../../docs/archived/dual-operator-coordination.md) | 작업 트리 분리로 막지 못한 동시 편집·실행 충돌이 실제로 반복되면 별도 조정 수단을 다시 설계한다. | 사용자 | 2026-10-27 |
| GAP-CMTY-001 | P3 | open | community membership | 가입 승인·반려(DEC-OPS-043), 회원 전용 게시판(DEC-OPS-072), 탈퇴·재가입(DEC-OPS-131)은 닫혔다. 커뮤니티 귀속 게시판은 목록·상세·댓글·쓰기 전 경로에서 관리자 또는 승인 회원만 통과하고 통합 검색에서 빠지며, 판정 포트가 없으면 거부한다. 회원은 본인 탈퇴 또는 관리자 강제 탈퇴로 탈퇴(W)가 되어 게시판 접근이 끊기고, 다시 신청하면 같은 행이 새 신청(A)으로 돌아간다. 남은 것: 게시판 외 회원 전용 자원이 없고, `mngrYn` 을 읽는 인가 판정이 없어 커뮤니티 운영자 위임을 두지 않는다. 귀속은 생성 시점에만 정한다 — 바꾸면 쌓인 글의 열람 범위가 소급 변경된다(H3). 가입은 인증 사용자면 통과한다. `CommunityUser.userId` 는 esntlId 축이라 loginId 로 join 하면 조용히 0건이 된다(서비스 테스트가 고정). | [CommunityService](../../business-app/src/main/java/nuri/business/service/community/CommunityService.java), [CommunityMemberStatus](../../business-app/src/main/java/nuri/business/domain/community/CommunityMemberStatus.java), [CommunityMembersPanel](../../frontend/src/components/business/community/CommunityMembersPanel.tsx) | ⓐ 운영자 위임(운영자가 할 수 있는 일을 먼저 정의), ⓑ 생성 후 귀속 변경(인가 의미 결정 선행), ⓒ 게시판 외 회원 전용 자원 중 필요한 것을 제품이 정한다. 블로그는 [ADR-0012](../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md)로 제외했다. | 제품/도메인 소유자 | 2026-09-25 |
| GAP-WIRING-001 | P3 | open | api surface | 어떤 생산 TypeScript 모듈도 부르지 않고 대체 표면·BFF 같은 원장의 다른 사유도 없는 operation(unwired, 축 1의 부채)과, operation 을 부르는 프런트 서비스 메서드가 services·시험 밖에서 불리지 않는 화면 고아(축 2)가 남아 있다. 축 1 의 소비는 생산 TS 모듈이 부른다는 뜻이지 화면이 쓴다는 뜻이 아니므로 unwired 는 화면 미사용 기능의 하한이며 총량이 아니다(DEC-OPS-050). operation 수와 두 상한은 [원장](../../config/governance/operation-consumer-census.json)의 `expected`가 정본이며 이 행은 다시 적지 않는다(DEC-OPS-340 — 공용 메모리 계약은 라벨 가까이의 수치 표기를 막고, 라벨에서 떨어진 서술은 보지 않는다). 설문 템플릿 상세 조회·수정과 결재 상세·재상신은 실제 화면에 연결했다. 2026-10-18 재분류(DEC-OPS-352): 늘 거부되거나 다른 화면 경로가 같은 일을 하는 메뉴 서비스 메서드 셋을 걷고, 가입·사용자 접속 통계·권한별 메뉴 목록을 대체된 표면으로 옮겼다. 남은 화면 고아는 목록과 같은 값을 주는 단건 조회와, 제품·개인정보 결정이 걸린 발신 메일 상세·주소록 사용자 검색·커뮤니티 포틀릿·기간별 일정이다. 목록과 같은 값을 주는 단건 조회를 래칫을 내리려고 배선하지 않는다(DEC-OPS-062). 이름 기반 census는 동명 메서드를 혼동할 수 있으므로 숫자만으로 기능 완성 여부를 판정하지 않는다. | [원장](../../config/governance/operation-consumer-census.json), [재진술 금지 계약](../../scripts/shared-memory-contract.test.mjs), [배선과 분석 한계](../../docs/04-operations/readiness-followups.md#api와-화면-연결), [제품 결정](../../docs/04-operations/operational-decisions-index-product.md) | 남은 조회 경로의 실제 소비 목적과 제품 결정을 대조한다. 메일 이력의 개인정보 경계 등 기존 결정을 유지하며 미소비 항목을 일괄 연결·삭제하지 않는다. | API/제품 소유자 | 2026-10-18 |

### 종료한 항목의 남은 경계

종료·기관 이전의 상세 이력은 [보관 기록](../../docs/archived/operational-decisions-history.md#종료이전-gap-기록)에 둔다. 다음은 종료로 없어지지 않은 위험·재개 조건이다.

- `GAP-FE-002`: CI의 flaky 감소는 반복 실행으로 확인한다. main 로그에 `socket hang up`/`ECONNRESET`이 재발하면 원인을 재검증한다([종료 근거](../../docs/archived/operational-decisions-history.md#gap-fe-002)).
- `GAP-FE-003`: 본문은 여전히 따로 공개되므로 서버에서 오래 걸리는 본문은 늦게 하이드레이션하고, 그 전에 넣은 입력은 React 가 되돌린다 — E2E 는 `waitForHydration` 으로 기다린다. 공급자가 첫 화면 직후 값을 다시 바꾸면 같은 경합이 돌아온다(공급자 단위 시험이 막는다). 미리 채운 캐시(HydrationBoundary)와 그 소비자를 다른 Suspense(`next/dynamic` 의 loading 등)로 나누면 로그아웃의 캐시 비움이 늦은 경계를 빈 캐시로 하이드레이션해 #418 이 난다 — 업무 홈은 한 단위로 묶었고 구조 단언이 막는다(2026-10-23)([종료 근거](../../docs/archived/operational-decisions-history.md#gap-fe-003)).
- `GAP-MEMO-001`: 지시 작성자 컬럼이 없어 변경 전에 수신자 아닌 사람이 남긴 지시 여부는 저장소로 판별할 수 없다([인가 변경 범위](../../docs/archived/operational-decisions-history.md#gap-memo-001)).
- `GAP-BASE-002`: T2는 required가 아니며 재실패 시 새 gap을 연다. core의 소비자 없는 게시판 DTO 3개와, 투영 원장이 의도치 않은 연쇄 제거도 기대 부재로 받아들이는 한계는 남는다([범위](../../docs/archived/operational-decisions-history.md#gap-base-002)).
- `GAP-ETL-001`: 앞서 커밋한 chunk는 남아 전체 되돌리기는 승인된 백업 복원이다. 이후 도입된 원장 승인 예외 격리와 쓰기 오류 중단을 구분한다([현행 ADR-0031](../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md), [복구 런북](../../docs/04-operations/migration-recovery-runbook.md)).
- `GAP-BOARD-002`: 2026-10-16 확인한 시드·라이브 게시판 4개의 유형 코드·템플릿 불일치는 보정하지 않았다. 화면은 템플릿 이름에 짝 불일치를 덧붙여 보이며(ADR-0043 결정 5) 데이터 수정은 별도 승인 대상이다([남은 데이터 경계](../../docs/archived/operational-decisions-history.md#gap-board-002)).
- `GAP-BOARD-003`: 비밀·논리 삭제 글에서 `BOARD_READ_ALL`만 있으면 본문은 열리고 첨부는 403인 비대칭은 의도다. 예약 게시는 B1(#966)이 집행하며, 버전이 없는 옛 글은 수정·일정 변경을 400으로 막는다 — 다른 도입 환경의 보정은 별도 데이터 승인이다([종료 근거](../../docs/archived/operational-decisions-history.md#gap-board-003)).
- `GAP-DOMAIN-001`: 추천 이력이 없던 기존 `like_cnt` 값은 유지한다. `GAP-BOARD-001`: 쓰지 않는 게시글 비밀번호 컬럼의 제거는 별도 스키마 승인이다([기존 집계](../../docs/archived/operational-decisions-history.md#gap-domain-001), [컬럼 경계](../../docs/archived/operational-decisions-history.md#gap-board-001)).
- `GAP-DEP-002`: spring-retry 유지 판단·재개 조건은 [후속 결정](../../docs/archived/operational-decisions-history.md#dec-ops-125)과 [정리 기록](../../docs/04-operations/readiness-followups.md#후속-정리-2026-09-24)을 따른다. 당시 기록한 Boot 4.1 지원 종료는 2027-07-31이며 다음 minor 결정 때 재확인한다.
- `GAP-POLL-001`·`GAP-POLICY-001`: 다른 도입 환경의 기존 NULL 분포는 기관이 읽기 집계로 확인한다. `GAP-API-001`: 내부 확장 Map과 추가 JSON 필드 호환성은 남으며 binary/stream 전송까지 타입화한 결과가 아니다([기존 데이터](../../docs/archived/operational-decisions-history.md#gap-poll-001), [타입 경계](../../docs/archived/operational-decisions-history.md#gap-api-001)).

## 재검증 대기

`needs-revalidation`과 `blocked-external` 항목은 외부 상태가 바뀌었다는 주장만으로 닫지 않는다. 날짜가 있는 API/UI 실측이나 운영 증거를 확보한 뒤 상태를 갱신한다.

외부 증거가 있어야 닫히는 항목은 아래 표로 분리한다. 저장소 안에서 진행할 수 있는 일이 없다는 뜻이지,
위험이 사라졌다는 뜻이 아니다. 활성 표는 저장소에서 다음에 할 일을 보기 위한 것이고, 이 표는
증거 확보의 수신자와 조건을 기록한다.

| GAP-ID | 우선순위 | 상태 | 영역 | 요약 | 근거 | 다음 행동/재개 조건 | 결정권자 | 검증일 |
|---|---|---|---|---|---|---|---|---|
| GAP-SEC-004 | P1 | needs-revalidation | client IP trust boundary | ADR-0019 형상(edge가 `X-Forwarded-For`를 덮어씀, Next 비공개, `TRUSTED_EDGE_PROXY`)을 2026-09-14 격리 운영 오버레이 스택에서 전체 경로로 실측했다. edge 경로는 위조 IP를 기록하지 않았고 IP 제한도 우회되지 않았다. 그러나 신뢰 대역이 서브넷 전체라 도커 게이트웨이도 신뢰되어, api 공개 포트 직접 요청에서 위조 IP가 기록되고 IP 제한이 우회됐다. 신뢰 대상을 Next 고정 주소 /32로 좁힌 뒤(DEC-OPS-098) 같은 시험에서 둘 다 막혔다. 남은 것: egov-net 안의 다른 컨테이너가 Next에 직접 보내는 위조 XFF, 운영 호스트의 LB·TLS·iptables·IPv6 경로. | [리허설 결과](../../docs/04-operations/readiness-followups.md#클라이언트-ip-신뢰-경계-리허설), [ADR-0019](../../docs/02-architecture/decisions/ADR-0019-client-ip-trust-boundary.md), [ConfigSafetyLinterTest](../../api-server/src/test/java/nuri/api/harness/ConfigSafetyLinterTest.java), [edge 템플릿](../../config/edge/default.conf.template) | 운영 배포 때 네트워크를 재생성(`down`→`up`)해 고정 주소를 반영하고, 실제 호스트에서 위조 헤더 로그인의 기록 IP와 IP 제한 허용·거부를 다시 본다. 부가 컨테이너는 egov-net에 두지 않거나 Next 직접 도달을 막는다. 로그인 한도 기본값은 ADR-0035 로 IP당 분당 30 으로 낮췄다 — 운영 배포에서 [RATE-LIMIT] 거절을 관측해 조정한다. | 보안/운영 소유자 | 2026-09-14 |

기관으로 이전한 `GAP-OPS-002`·`GAP-SEC-001`·`GAP-DATA-001`·`GAP-AUTH-003`은 `backup-recovery`·`crypto-lifecycle`·`authorization` 통제에서, `GAP-SEC-003`·`GAP-STORAGE-001`·`GAP-OPS-001`은 `attachment-operations`·`operational-assurance`에서 증거를 확보한다. 원본의 종료는 기관 의무 면제가 아니다. 직접 DB 쓰기·import의 첨부 provenance 강제 설계는 여전히 별도다. [기관 도입 가이드](../../docs/03-guides/governance-review-lifecycle.md#3-온라인-제품의-기관-도입), [이전 근거 1](../../docs/archived/operational-decisions-history.md#gap-ops-002), [이전 근거 2](../../docs/archived/operational-decisions-history.md#gap-sec-003).

## 영역 상세 gap 레지스트리

아래 gap 은 특정 경로에서만 필요해 전문을 [gap 영역 상세](../../docs/04-operations/known-gaps-detail.md)의 영역 절로 옮겼다(DEC-OPS-389). 영역 결정 색인과 같은 경로 판정으로 읽는다 — 대상 경로가 그 영역에 걸리면 그 절을 읽고, `node scripts/decision-indexes.mjs --for <경로…>` 가 절을 알려 준다. 모든 작업에 걸리거나, 시험·계약·자동 로드 규칙이 막지 못해 글로만 지켜지고 어기면 검증 신호·인가·데이터·식별자를 해치는 금지가 있는 행은 위 표에 전문으로 둔다. 레지스트리 줄은 ID·우선순위·상태·영역과 160자 이하 요약만 두며, 상세 행과 ID·우선순위·상태가 같아야 한다(공용 메모리 계약). 상세 행을 고치거나 새 행을 더하면 이 줄도 함께 고친다.

| GAP-ID | 우선순위 | 상태 | 영역 | 한 줄 요약 | 상세 |
|---|---|---|---|---|---|
| GAP-UIF-001 | P3 | open | font token scope | Next/font 변수 범위는 고쳤고 OS·브라우저별 렌더링 차이와 재생성한 시각 기준선의 사람 검토가 남았다 — Linux CI 결과를 다른 OS·브라우저의 증거로 쓰지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-ARCH-001 | P2 | open | module boundaries | `business-app` 서비스 계층의 교차 도메인 참조는 결합 원장이 edge 정확 집합으로 동결한다 — 새 app→app 결합은 만들지 않고 foundation 포트·이벤트로 역전한다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-CONTRACT-001 | P2 | open | API/DTO | 입력 계약 원장 표적의 제약을 게이트가 검사하고 `@Valid` 없는 제약 DTO 도 막는다 — 원장 밖 요청 본문은 저장 경로가 생기면 다시 판정한다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-FE-001 | P3 | accepted-risk | frontend security | `style-src` 의 `unsafe-inline` 은 sonner 가 nonce 를 지원하거나 교체될 때까지 받아들인 위험이다 — 세분화하면 `csp-policy` 계약이 붉다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-CODE-001 | P3 | accepted-risk | institution code | 기관코드 원장·수신 로그에는 앱 쓰기 경로가 없고 수신 확인은 `procSe` 만 바꾼다 — 쓰기 경로와 그 권한은 공급처 명세가 확정된 뒤에 설계한다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-UI-001 | P3 | deferred | table sorting | 표 열 정렬은 현재 페이지 행만 재배열하고 화면이 그 범위를 고지한다 — 날짜 외 열의 전체 정렬은 실제 요구와 인덱스 계획을 함께 설계한다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-COPY-001 | P3 | open | visible copy norms | 화면 용어 원장의 규범 검토에서 기록한 편차(날짜 형식·확인 문구·대기 라벨 등)가 남았다 — 화면별로 처분하고 일괄 치환하지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-DEPT-001 | P3 | open | department hierarchy | 부서 저장이 상위 연결을 지우던 경로는 닫혔고 이미 지워진 행은 저장소로 알 수 없다 — NULL 집계로 손상을 추정해 보정하지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-FILE-001 | P3 | open | attachment cleanup | 첨부 실물 삭제는 영속 작업·제한 재시도로 처리하고 운영 저장소 복구·고아 후보 처리는 미완료다 — 고아 파일을 추정해 지우지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-LOGIN-001 | P3 | open | login policy | 로그인 정책의 `dpcn_prm_yn` 은 읽는 코드가 없고 제품은 단일 세션을 유지한다 — 폐기 규칙을 설계하기 전에는 화면에 열지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-AUTH-004 | P3 | deferred | authorization history | 권한 배정 버전 계산이 `tb_authrt_chg_hstry` 를 인덱스 없는 열로 훑는다 — 이력이 1만 행을 넘거나 느려지면 인덱스를 새 마이그레이션으로 둔다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-COMPOSE-001 | P3 | open | composer degraded compositions | 기능 저하 생성물의 화면 일부가 사실과 다르게 말할 수 있다 — `/admin` 밖 링크와 문장 속 메뉴 이름은 아직 기계로 대조하지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#composer) |
| GAP-MIG-002 | P2 | open | migration protected keys | 암호화할 소스 컬럼은 키로 쓸 수 없어(평문이 제어 표에 남는다) 그런 컬럼만 키인 테이블과 숫자형 보호 소스는 지금 적재할 수 없다. | [상세](../../docs/04-operations/known-gaps-detail.md#migration) |
| GAP-STD-001 | P2 | open | standard schema metadata | 표준 스키마에 표준 용어가 없거나 물리 타입이 다른 컬럼이 남았다(목록은 처분안) — 등록 단어 조합만으로 표준 적합으로 보지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-E2E-001 | P3 | needs-revalidation | E2E impact selection | PR 은 검토된 화면 변경만 E2E 를 spec 단위로 선별하고 공유·미지 입력과 main 은 전수다 — 일반 의존성 완전성과 절감률은 검증되지 않았다. | [상세](../../docs/04-operations/known-gaps-detail.md#ci-governance) |
| GAP-DATA-002 | P2 | blocked-external | legacy input data | OCI 설문 3행의 시작·종료일이 잘린 채 남아 있다 — 업무 소유자가 원래 날짜를 확인하기 전에는 추정해 보정하지 않는다. | [상세](../../docs/04-operations/known-gaps-detail.md#product) |
| GAP-DEP-001 | P1 | needs-revalidation | dependency security | PR 의존성 snapshot readiness 와 runtime High 차단은 구현됐고, public fork probe 와 양쪽 snapshot 부재 경계는 외부 검증이 남았다. | [상세](../../docs/04-operations/known-gaps-detail.md#ci-governance) |
| GAP-MIG-001 | P1 | blocked-external | migration-tool | vendor 7종 이관의 실측 범위가 서로 다르고 모두 UNVERIFIED·MANUAL_ONLY 다 — 도입 버전·driver 별 COMMIT 자격·cutover 는 기관 실측이 필요하다. | [상세](../../docs/04-operations/known-gaps-detail.md#migration) |

## 해결 규칙

gap을 해결하면 정본 코드·문서·테스트를 먼저 갱신하고, 회귀 방지 실행 경로와 red 증거를 확인한 뒤 활성 표에서 제거한다. 장기 결정이 생기면 ADR 또는 [decisions.md](decisions.md)에 링크하고 상세 이력은 중복 복사하지 않는다.
