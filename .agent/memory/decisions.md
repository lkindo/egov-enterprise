---
schema_version: 1
memory_kind: decisions
status: active
authority: adr-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-11-26
verified_against: b4a98d72d6723bbf66a063c86ebb77d20238f025
canonical_sources:
  - ../../AGENTS.md
  - ../../docs/02-architecture/decisions/README.md
  - ../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md
  - ../../docs/archived/operational-decisions-history.md
  - ../../.github/required-checks.json
  - ../../config/governance/gates.json
refresh_triggers:
  - accepted-decision
  - superseding-adr
  - project-rule-change
---

# 공용 결정 인덱스

`verified_at`·`verified_against`는 인덱스 구조·참조를 점검한 날짜와 기준 커밋이다. 아키텍처·제품 경계 정본은 [ADR 정본 목록](../../docs/02-architecture/decisions/README.md)에, 운영 결정 전문·이유·근거·역사 결정은 [운영 결정 보관 원문](../../docs/archived/operational-decisions-history.md)에 둔다. 이 파일은 매 세션 자동 로드되는 `Do-Not-Break` 체크리스트와 저장소 공통 활성 운영 결정만 싣는다. 원시 세션 로그를 이관하지 않으며 실시간 claim/lock 조정 버스로 쓰지 않는다.

## Do-Not-Break 체크리스트 (자동 게이트 미커버 확정 규칙)

린터·단위 테스트가 단독으로 강제하지 못하는 확정 동작·데이터 금지·운영 경계다. 해당 영역을 고치기 전에 반드시 확인한다.

### A. 데이터·DB·스키마·인코딩 금지 (8건)

1. `GAP-DATA-002`: 공유 OCI 온라인 설문 3행의 잘린 시작·종료일은 업무 소유자가 원래 날짜를 확인하기 전까지 추정 보정하지 않는다.
2. `DEC-OPS-358` / `AGENTS.md`: 로그인 ID로 소유를 판정하는 기록 테이블의 잔존 ID는 새 계정에 재부여하지 않으며, 임의 이관 이력/시드/운영 데이터를 복구·수정하지 않는다(운영/코어 데이터 DML 명시 승인 필수).
3. `DEC-OPS-375` / OCI 적용 경계: 부서 미배정 '부서 공유' 일정(기본조직 묶기)과 일반 관리자의 보호 관리자 기본정보 수정 권한 의미는 유지하며, 공유 OCI DB 마이그레이션은 반드시 백업 후 명시 승인을 받아 적용하고 [적용 로그](../../docs/04-operations/shared-oci-migration-apply-log.md)에 기록한다(DEC 아님).
4. `DEC-OPS-379`: 이미 적용된 Flyway 마이그레이션/체크섬 사후 변조 및 예약 집행 전 진단에서 나온 미래 시작일·형식 오류 행 임의 보정 금지; 스키마 변경은 Expand–Sync–Redirect–Contract를 따른다.
5. `GAP-STD-001`: 기승인 `version` 기술 명칭 예외(`DEC-OPS-378`)와 1차 C 유지 승인 항목은 미등록 정정 후보에서 제외하며, 등록 단어 조합만으로 DB 표준 적합 판정을 내리지 않는다.
6. `GAP-ZDM-001`: Contract waiver의 `expandRelease` 대조는 기록 검증이지 실제 배포·관측 증명이 아니며, 도입 기관은 `V2_127` 한 건 예외(`DEC-OPS-233`)를 승계하지 않는다.
7. `DEC-OPS-396`: 모든 날짜·시각은 KST(`Asia/Seoul`), 시간대 없는 컬럼은 한국 벽시계 `LocalDateTime`, 프런트 '오늘'은 브라우저가 아닌 KST다(날짜 경계 변경 시 `TZ=UTC` 교차 확인).
8. `DEC-OPS-134 ④` / `DEC-OPS-417`: CSV 반출은 수식 시작 글자(`= + - @` 탭·CR) 앞에 `'`를 붙이고 한국 날짜를 쓴다; 화면 문구는 서술 `~니다`·요청 `~해 주세요`/`~하세요`를 쓰고 `~하십시오`를 금지하며(화면 용어 원장 소유자는 저장소 소유자, 승인 표지 임의 변경 금지).

### B. 제품 동작·인가·UI·비즈니스 경계 (12건)

9. `GAP-DEPT-001`: 부서·조직도 편집은 행 잠금/순서·미로드 상위 노드(`unloadedParentId`) 보존과 하위 참조 정합성을 유지하며, 기존 `up_ognz_id IS NULL`을 추정 일괄 보정·삭제하지 않는다.
10. `GAP-FILE-001`: 첨부 실물 삭제는 업무 트랜잭션 커밋 뒤 영속 작업(`tb_sys_job`)으로 수행하며, `FileAccessPolicy`·`AttachmentReferenceResolver` 인가 경계를 우회하거나 고아 파일을 추정 삭제하지 않는다.
11. `GAP-LOGIN-001`: 로그인·세션·쿠키 `Secure` 예외는 명시적 평문 loopback(격리 E2E)에 한정(`ADR-0010`)하고 단일 세션을 유지(`dpcn_prm_yn` 미개방)하며, 운영 edge·백엔드 로그인 rate limit(`ADR-0059`)을 유지한다.
12. `GAP-LOGIN-002`: 보호계정·마지막 관리자 잠금/비활성화/권한 박탈 차단 가드 우회 금지; `MFA_REQUIRE_PROTECTED`는 앱 기본 `false`·운영 오버레이 기본 `true`(`ADR-0054`)이며, 로그인 잠금이 기존 세션을 끊지 않는 정책을 유지한다.
13. `GAP-CODE-001`: 기관코드 원장·수신 로그에는 앱 쓰기 경로를 열지 않고 수신 확인은 `procSe`만 변경하며, 공통코드·행정코드 마스터는 참조 무결성 및 낙관적 잠금 버전을 유지한다.
14. `GAP-WIRING-001`: [배선 원장](../../config/governance/operation-consumer-census.json)의 unwired·화면 고아·ungated write 상한 악화 금지; 목록과 같은 값을 주는 단건 조회는 래칫을 내리기 위해 억지로 배선하지 않으며 발신 메일 이력 등 개인정보 경계를 보존한다(`DEC-OPS-062`).
15. `GAP-UI-001`: 반응형 표는 단일 SSR DOM 위 CSS 전환 유지(`ADR-0006`); 서버 정렬은 `ServerSortWhitelist`와 인덱스 기반 `@SortableBy` 허용 목록만 연다(`DEC-OPS-433`).
16. `GAP-COPY-001`: [화면 용어 원장](../../config/frontend-visible-terms.json)의 규범·결함 기준을 유지하며 일괄 치환 및 과장 표현(`100%`, `수기 0%`, `현행화 0시간`)을 금지한다.
17. `GAP-UIQ-001`: UI 품질 기준선·폼 검증 경계([전용 폼 census](../../config/governance/a3-1-form-container-census.json))의 `measured` 허위 선언·hash 소급 대입·수동 접근성 자동 충족 및 부채 래칫 악화를 금지한다.
18. `GAP-UIF-001` / `DEC-OPS-403`: URL 상태 승인 파일(`config/ui-url-state-approval.json`)은 사람이 고르는 기록 ID 원장이므로 생성기로 덮어쓰지 않고, 폰트·CI 크로미움 렌더링 결과를 다른 OS·브라우저 증거로 승격하지 않는다.
19. `DEC-OPS-431` / `ADR-0043` / `DEC-OPS-430 ③` / `DEC-OPS-416` / `GAP-PACK-001`: 게시판 답글 등록 퇴역 유지(`ans_psblty_yn` DB 값 보존·지정 게시판 영구 삭제 거부·유형/템플릿 불일치 시드 데이터 임의 수정 금지), 리다이렉트 페이지 제거 시 동거 테스트 연쇄 금지(목적지 소실 은폐 방지), 정책 upsert(`DEC-OPS-430 ③`)·설문/투표 마스터 버전(`DEC-OPS-416`)·기능 소유(`config/modules`, pack 축 없음) 경계를 보존한다.
20. `DEC-OPS-382 ②` / `DEC-OPS-397` / `DEC-OPS-415 ④` / `ADR-0018`: 산출물 내보내기(`export-deliverables`)는 `.agent/memory/`·`docs/archived/`·ADR 색인·`.env`·`upstream-review/` 입력을 거부하며, `--compare` 기준 해시 분리·검수 CSV 14열 `uatBaseDecisionHash`·덮어쓰기 차단(`--allow-decision-overwrite` 명시 시만 허용)을 보존하고, 미확정/시안 산출물을 기관 승인으로 승격하지 않는다.

### C. 인프라·운영·CI·이관·에이전트 경계 (5건)

21. `DEC-OPS-422` / `DEC-OPS-432` / `DEC-OPS-009` / `ADR-0060`: 운영 API 8080 루프백 바인딩·ES256 비대칭 JWT(Next는 공개키만, `JWT_SECRET` 없음)·운영 주민번호 키링 필수; PostgreSQL 외 5개 DB 벤더는 인증 중단(`preview`) 유지; 단독 운영 리뷰 정책(`DEC-OPS-009`·`DEC-OPS-432 ⑥`) 유지.
22. `GAP-COMPOSE-001·002` / `ADR-0018` / `ADR-0057` / `ADR-0062`: 기능 저하 생성물은 채널/포틀릿 저하를 숨기지 않고, 생성 프로젝트는 원본 인증/승인 기록을 승계하지 않은 새 `pending`으로 시작하며(`ADR-0018`·`0057`), 오프라인 `migration-tool`을 생성 앱에서 제외한다(`ADR-0062`).
23. `GAP-MIG-001·002`: 원천 DB 7종 이관은 모두 `UNVERIFIED·MANUAL_ONLY`이며 기관 실측 없이 COMMIT/cutover 승인 불가; 암호화 보호 컬럼은 평문 체크포인트 키로 사용 금지; 전체 롤백은 온라인 저장소 백업 복원 런북 기준.
24. `GAP-SEC-004` / `GAP-FE-001` / `ADR-0019` / `ADR-0038` / `AGENTS.md`: SAST/비밀 스캔·CSRF 이중 제출·CSP(`script-src` nonce, `style-src` 수용 위험 외 약화 금지)·COOP·프록시 IP 신뢰 경계(`TRUSTED_EDGE_PROXY` `/32`, 부가 컨테이너 `egov-net`/Next 직접 도달 차단) 유지; 공개 저장소 안전성(비밀·토큰·개인정보·내부 절대경로·원시 세션 로그 금지).
25. `GAP-AGENT-001` / `GAP-WIN-001`: 무거운 검증은 `heavy-run-queue` 단일 실행(겹친 결과 증거 사용 금지, 에이전트 임의 `confirm-idle` 금지); `DEC-OPS-434`로 작업 브랜치 `pre-push`에서 운영 계약을 생략하므로 `heavy-run-queue`·`agent-guard`·`pre-push`·`project-composer`·`reusable-*` 등 Windows 분기 변경 시 Windows에서 대상/전체 운영 계약을 수동 실행.

## 저장소 공통 활성 운영 결정

아래는 저장소 전역 작업에 적용되는 핵심 활성 운영 결정(DEC) 요약이다. 전체 결정 원문·이유·영역별 결정·과거 결정은 [운영 결정 보관 원문](../../docs/archived/operational-decisions-history.md)의 `#<id 소문자>` 절을, 아키텍처·제품 결정은 [ADR 정본 목록](../../docs/02-architecture/decisions/README.md)을 직접 조회한다.

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 저장소 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 2026-08-18 | - |
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | 2026-08-18 | - |
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 2026-08-18 | - |
| DEC-OPS-062 | accepted | 축 2(화면 도달성) 래칫의 운영 방침을 확정한다 — 0 을 목표로 하지 않는다. | 2026-09-08 | DEC-OPS-051 의 래칫 목적을 재확인하고 잔여 소진 목표를 명시적으로 배제 |
| DEC-OPS-177 | accepted | 연속 배치 작업의 반복 비용을 규칙으로 줄인다. | 2026-09-27 | - |
| DEC-OPS-358 | accepted | 기록이 로그인 ID 로 소유를 판정하는 표에 남은 ID 는 새 계정에 다시 주지 않는다. | 2026-10-19 | - |
| DEC-OPS-374 | accepted | 직접 맡은 작업 브랜치는 추가 승인 없이 PR·required CI·main 병합·원격/로컬 브랜치 삭제까지 마무리한다. 현재 사용자의 범위 제한과 다른 작업 보호를 우선한다. | 2026-10-20 | - |
| DEC-OPS-375 | accepted | 부서 미배정 사용자의 '부서 공유' 일정을 기본조직으로 묶어 미배정자끼리 공유하는 현재 동작과, 일반 사용자 관리자(USER_UPDATE·USER_DEPT)가 보호 관리자 계정의 이름·연락처·부서를 바꿀 수 있는 현재 권한 의미를 유지한다(2026-10-21 사용자 결정). | 2026-10-21 | - |
| DEC-OPS-379 | accepted | ADR-0040 의 스키마 변경을 저장소 Flyway 로 일괄 승인하고, 공유 OCI 적용은 PR 병합마다 하며, 예약 집행 전 진단에서 나온 미래 시작일·형식 오류 행은 보정하지 않는다(2026-10-23 사용자 결정). | 2026-10-23 | - |
| DEC-OPS-382 | accepted | 방법론 보완 배치를 한 결정으로 묶는다(설계 검토 예산 §7, 시안≠승인 분리, 산출물 `build/deliverables` 비규범 파생물 및 금지 입력, 스캐폴더 최소 정합화, OpenAPI PUBLIC `security: []`). | 2026-10-24 | - |
| DEC-OPS-385 | accepted | 병렬 에이전트·워크플로 중 무거운 검증 금지, 의미 변경 L2 병합 전 독립 적대 검토(사용자 원문+diff, §2.3), 동시 작업 별도 작업 트리, 섞인 경로 커밋 중단. | 2026-10-26 | DEC-OPS-381 의 '공용 결정 인덱스에는 Accepted ADR(5열)' 가운데 Accepted ADR 전부를 자동 로드하는 부분 |
| DEC-OPS-386 | accepted | 세 에이전트 하네스 공용화(스킬 정본 `.agent/skills` + `npm run regen`, `scripts/agent-guard.mjs` 규칙 표 정본, `npm run dev` 원격 DB Flyway 차단, 다른 회사 모델 독립 검토). | 2026-10-27 | - |
| DEC-OPS-387 | accepted | 다른 회사 모델 독립 검토로 diff·사용자 원문 전송 예외(비밀·개인정보·`.env` 제외), 포괄 승인≠Workflow 동의, 훅 우회 명시 지시 한정, 병합 브랜치 삭제와 작업 트리 삭제 분리. | 2026-10-27 | SOP §2.1 이 포괄 승인을 Workflow 도구 동의로 보던 문구(DEC 없음), 실행 전 가드가 작업 트리 이름 `setup` 을 막던 부분(DEC-OPS-386 ② 구현) |
| DEC-OPS-395 | accepted | 변경 작업은 도구별 고정 작업 트리와 작업별 브랜치를 사용한다(SOP §6.6 정본, 완료 시 자기 브랜치만 정리하고 고정 디렉터리·의존성·캐시 유지). | 2026-10-31 | DEC-OPS-385 ⑥ 의 동시 작업 시 매번 새 작업 트리를 만들던 운영을 고정 트리 우선 재사용으로 구체화 |
| DEC-OPS-413 | accepted | Windows 무거운 검증 대기열(`scripts/heavy-run-queue.mjs`, SOP §6.3)을 둔다 — 관측 가능한 남은 실행 대기, 미확인 시 `confirm-idle` 대기, 대기열은 증거를 만들거나 면제하지 않는다. | 2026-11-10 | DEC-OPS-385 ⑥ 의 '잠금은 두지 않는다' 가운데 무거운 검증의 실행 잠금 부분, DEC-OPS-412 ② 의 '남은 자식·컨테이너는 살아 있음'(관측할 수 있는 것으로 좁힘) |
| DEC-OPS-414 | accepted | 임시 작업 트리를 예외로 좁히고 수명을 닫는다(`git worktree add` 전 실행 전 가드 승인, 병합 후 사용 여부 확인 뒤 완료 보고에서 삭제 질의, SOP §6.6). | 2026-11-11 | DEC-OPS-395 ② 가운데 임시 트리를 묻지 않고 만들던 운영 |
| DEC-OPS-432 | accepted | 품질 평가 개선 과제 일괄 진행 확정(운영 API 8080 루프백, ES256 비대칭 JWT 전환 완료 및 HMAC/`JWT_SECRET` 제거, 주민번호 키링 필수, 사용자 버전·검색 trigram Flyway, 단독 운영 리뷰 유지). | 2026-11-25 | docker-compose.yml egov-net 주석의 2026-08-04 사용자 답변 ②(백엔드 8080 을 브라우저가 직접 도달) 가운데 공개 바인딩, ADR-0060 결정 5 의 1차 배포 전환 상태(2차 반영으로 끝남) |
| DEC-OPS-433 | accepted | 목록 API 의 클라이언트 정렬은 허용 목록(`@SortableBy` + 인덱스)으로만 받는다(`SortParameterGuard` 기본 거부 및 `OpenApiConfig` 제외). | 2026-11-26 | - |
| DEC-OPS-434 | accepted | 운영 계약 2분할(`core` vs `composer`) 및 작업 브랜치 `pre-push` 로컬 운영 계약/`verify:post-push` 폐기(PR Required CI `secret-scan` 일원화, Windows 분기 `GAP-WIN-001`). | 2026-11-25 | DEC-OPS-410 의 작업 브랜치 push 뒤 로컬 `verify:post-push` 의무와 `pr-checks-wait` 의 로컬 Windows 기록(종료 코드 5) 요구, DEC-OPS-364 의 모든 PR 운영 계약 전수 실행 |
| DEC-OPS-435 | accepted | 거버넌스 다이어트 Phase 2 확정(`Do-Not-Break` 25항목 승격, 4개 영역 결정 색인·`known-gaps-detail.md`·`decision-indexes.mjs`·`ledger-count-restatement.mjs` 폐기, 단일 보관 원문·ADR 색인·활성 gap 표, SOP·메타 계약 축소 및 3대 유용 검사 보존). | 2026-11-26 | DEC-OPS-340 의 원장 수치 재진술·개별 상한 검사, DEC-OPS-381 의 영역 결정 색인 4분할·6분할 매핑, DEC-OPS-389 의 `decision-indexes.mjs`·`known-gaps-detail.md` 분할 및 바이트 상한 |
| DEC-OPS-436 | accepted | 안전형 거버넌스 3단계 확정(`agent-guard` 동결, `heavy-run-queue` 유지 + `verification-record` JSONL·단계별 CIM 폴링 폐지, `pre-push-ref-contract` 속도 최적화, 타사 L2 독립 검토를 `H1·H2·H3` 필수 범위로 한정). | 2026-11-26 | `DEC-OPS-385`·`DEC-OPS-386 ⑥` 의 `H1·H2·H3` 밖 L2 타사 검토 필수 부분, `DEC-OPS-385 ③` 의 JSONL 실행 기록·단계별 겹침/입력 변경 표본 감시, `DEC-OPS-390` ① 의 JSONL 부가 기록 |
| DEC-OPS-437 | accepted | 거버넌스 안전 감사 보정 확정(Governance Atlas·`decisions↔history` 정합 검사 완전 퇴역, `AGENTS.md` `agent-guard` 동결 명시, `verification-record*` 제거 및 프로세스 보조 `heavy-run-pipes.mjs` 통합, `pre-push-ref-contract` 비동기 병렬화). | 2026-11-26 | DEC-OPS-336·DEC-OPS-371·DEC-OPS-398·DEC-OPS-420 ⑤ 의 Atlas·정합 검사 유지 부분, DEC-OPS-436 ② 중 `verification-record.mjs` 잔존 부분 |
| DEC-OPS-438 | accepted | 운영 계약 3분할(`core`·`composer`·`requirements`) 및 `secret-scan` 의 `requirements` 의존·Chromium 설치 조건부화(`requirementsContracts` fail-closed 범위 가드, `OPERATIONAL_CONTRACTS_RUNNER` 유지). | 2026-11-26 | DEC-OPS-434 ① 중 `tools/requirements-workspace/*.test.mjs` 가 `:core` 에 포함되던 부분 |
| DEC-OPS-440 | accepted | 코드 주석은 근거만 쓰고 날짜 표지·변경 경위는 커밋·PR 설명에 둔다(기존 이력 주석 일괄 정리 금지, 고치는 코드의 주석만 줄임, 도구가 읽는 표지·원장 해시 파일·Flyway `V`/`R` 보존, 게이트 없음). | 2026-11-27 | - |
