---
schema_version: 1
memory_kind: decisions
status: active
authority: adr-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-10-29
verified_against: 47ff9721ccd0076ed11825d5607519be12652327
canonical_sources:
  - ../../scripts/decision-indexes.mjs
  - ../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md
  - ../../docs/archived/operational-decisions-history.md
  - ../../docs/04-operations/operational-decisions-index-ci-governance.md
  - ../../docs/04-operations/operational-decisions-index-composer.md
  - ../../docs/04-operations/operational-decisions-index-migration.md
  - ../../docs/04-operations/operational-decisions-index-product.md
  - ../../AGENTS.md
  - ../../docs/02-architecture/decisions/README.md
  - ../../.github/required-checks.json
  - ../../config/governance/gates.json
refresh_triggers:
  - accepted-decision
  - superseding-adr
  - project-rule-change
---

# 공용 결정 인덱스

`verified_at`·`verified_against`는 인덱스 구조·참조를 점검한 날짜와 작업 시작 커밋이다. 2026-10-17 정리는 과거 승인·DB·CI·운영 실측을 재실행한 것이 아니며, 각 행의 시행일·검증일과 증거 경계는 그대로다.

## 범위와 승격 규칙

제품·아키텍처 결정의 정본은 [ADR 디렉터리](../../docs/02-architecture/decisions/README.md)다. 이 파일은 세션마다 자동으로 읽히는 짧은 결정 인덱스로, 어느 경로를 고치든 걸리는 Accepted ADR 과 운영 결정, 나머지 Accepted ADR 의 ID·제목 목록만 둔다. 나머지 Accepted ADR 의 행과 특정 경로에만 걸리는 운영 결정은 아래 「영역 결정 색인」 표의 색인에, 지금의 작업을 제약하지 않는 결정은 [역사 색인](../../docs/archived/operational-decisions-index-historical.md)에 있다. ADR 내용을 복제하거나 바꾸지 않는다. 제안·보류 항목은 결정으로 기록하지 않고 [known-gaps.md](known-gaps.md)에 둔다.

- 허용 상태: `accepted`, `superseded`, `rejected`.
- 기존 결정의 전문은 소급 편집하지 않는다. 운영 결정의 변경은 후속 DEC가 `supersedes`로 연결하고, Accepted ADR의 규범 변경은 후속 ADR로 대체한 뒤 인덱스에 연결한다. 이 규칙(2026-10-17) 전에 운영 결정이 ADR 일부를 대체한 경우는 해당 ADR 머리의 "후속 결정" 줄과 ADR 색인 상태 열로 표시한다.
- 행의 시행일·당시 수치는 결정 배경이며 현재 구현 수치가 아니다. 현행 상태는 [project-context.md](project-context.md)·[known-gaps.md](known-gaps.md)와 링크된 코드에서 확인한다. 재검증일은 인덱스·참조 점검일이며 과거 승인이나 외부 운영 증거를 새로 부여하지 않는다.
- 헌법과 `AGENTS.md`의 실질 정책 변경은 사용자 명시 요청이 먼저다.
- 이 파일은 에이전트 진입점이 매 세션 읽는다. 행 길이와 파일 전체 크기의 상한은 [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs)이 검사한다.

## Accepted ADR index

ADR ID 가 ADR 색인의 키다: 각 ADR 의 링크·이유·전문은 [ADR 색인](../../docs/02-architecture/decisions/README.md)의 같은 ID 행에서 연다. 이 표는 결정 요지·시행일·대체 범위만 둔다. 어느 경로를 고치든 걸리는 ADR 만 이 표에 두고, 나머지 Accepted ADR 은 아래 「영역 결정 색인」 표가 가리키는 영역 색인의 표 맨 위(운영 결정 행 앞)에 둔다(DEC-OPS-385). 한 ADR 의 행은 색인 하나에만 있고, 공용·영역 색인을 합친 집합이 ADR 색인의 Accepted 집합과 같으며, 아래 목록의 영역 줄은 그 영역 색인의 ADR 행과 같아야 한다([공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs)).

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| ADR-0001 | accepted | core/app 제품 경계와 main·release-tag 배포 기준을 분리한다. | 2026-08-15 | - |

나머지 Accepted ADR 의 행은 아래 영역 색인에 있다. 대부분은 결정을 집행하는 계약·시험·생성기가 다른 영역 경로에도 있어 여러 영역에 걸친다 — 대상 경로가 그 영역에 걸리지 않아도 제목이 작업과 닿으면 그 행을 읽는다([AGENTS.md 작업 시작 시 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기)). 괄호는 다른 영역 경로에 있는 대표 집행 조항이다. 영역별 ID·제목:

- [CI·검증·거버넌스](../../docs/04-operations/operational-decisions-index-ci-governance.md): ADR-0005 UI 품질 증거 보존(ui-quality 원장·스키마) · ADR-0015 시큐어코딩 정적 분석(High/Critical 차단) · ADR-0018 기술 계약·정기 검토·기관 승인 분리(reviewBy 경과는 비차단) · ADR-0021 격리·책임별 테스트(compose 계획 검사) · ADR-0022 CI 모듈 영향 분류·캐시(ID 형식 복제 계약) · ADR-0023 E2E 영향 선별·캐시 저장 · ADR-0024 Spring Boot 4.1·Jackson 3·JSpecify 규칙 · ADR-0026 CI 임계 경로·재사용 선별(시험 시간 profile) · ADR-0027 재사용 검증 입장·PR 레이아웃(presets 의 ci 선언) · ADR-0030 재사용 CI 의 PR 제외(ci.pr 이 null 이면 main 두 레이아웃) · ADR-0032 이관 PIT 슬롯 · ADR-0037 제품 PIT 슬롯 · ADR-0044 CI 튜닝값 정본·PIT 범위별 하한(슬롯·순서는 ci.yml·실측 profile, 계약은 양수·profile 순서)
- [프로젝트 생성기·재사용 투영](../../docs/04-operations/operational-decisions-index-composer.md): ADR-0020 멀티·단일모듈 출력(원본 모듈·빌드 관례 유지) · ADR-0028 시작 구성은 기능 목록(스크립트는 이름을 열거하지 않는다)
- [레거시 이관 도구](../../docs/04-operations/operational-decisions-index-migration.md): ADR-0008 승인형 오프라인 이관(실행 봉투·온라인 모듈 미의존) · ADR-0029 표준화 이관과 용어 원장(온라인 암호 구현과 대조) · ADR-0031 원장 확정·chunk 실패 처리(제어 스키마 승인 플래그) · ADR-0041 로컬 이관 작업공간·AI 진행
- [제품 동작·화면·도메인](../../docs/04-operations/operational-decisions-index-product.md): ADR-0002 한국어 우선 UI·ko/en 메시지 번들 · ADR-0003 과업 중심 UX·WCAG 2.2·KRDS 표현·민감 상태 위치 · ADR-0004 하이브리드 IA 잠정 채택(메뉴 DB·생성기 미적용) · ADR-0006 단일 SSR DOM 반응형 · ADR-0007 참조-기본 IA 승인(처분 승인 전 메뉴·생성기 미적용) · ADR-0009 검색어의 URL 사용(허용 목록, 생성물은 좁히기만) · ADR-0010 세션 쿠키 Secure(loopback 예외는 격리 E2E 한정) · ADR-0011 익명 만족도 퇴역·자격증명 이름의 path/query 차단 · ADR-0012 블로그 도메인 제거 · ADR-0013 표준 길이 정합(ZDM waiver 결속) · ADR-0014 보류 컬럼 표준 정합(주민번호 암호문 보존) · ADR-0016 복수 그룹·명시 권한 인가(권한 생성물·명시 bootstrap) · ADR-0017 과업 중심 메뉴(V2_99→Contract 초기화 순서) · ADR-0019 클라이언트 IP 신뢰 경계(edge·TRUSTED_EDGE_PROXY) · ADR-0025 권한·업무 계약·내구 작업·MFA(미배정 권한·AND 진입) · ADR-0033 메일 수신주소 암호화 보관 · ADR-0034 구 인가 API 퇴역(ISM 별칭은 결재로) · ADR-0035 로그인 요청 제한 기본값(E2E 는 종전 값) · ADR-0036 1 기반 page·size·POST 201 · ADR-0038 이중 제출 CSRF(E2E 헬퍼가 헤더를 싣는다) · ADR-0039 콘텐츠 페이지 1차 범위(cms 기능 선언) · ADR-0040 게시판 운영·예약·고정(BOARD_PIN 미배정) · ADR-0042 콘텐츠 페이지 운영 보완(CMS_PURGE 미배정) · ADR-0043 게시판 공개 동선(지정 게시판 삭제 거부) · ADR-0045 즐겨찾기 정리·엄격 입력·읽은 메모 기준 지시

## 운영 결정 index

아래 DEC 행은 당시 결정의 짧은 검색 인덱스이며 상태·시행일·대체 범위는 당시 기록 그대로다.

ID가 보관 원문의 앵커다: 각 행의 전문·이유·승인 근거는 [보관 기록](../../docs/archived/operational-decisions-history.md)의 `#<ID 소문자>` 절(예: `#dec-ops-001`)에 있다.

이 표는 어느 경로를 고치든 걸리는 결정만 둔다(기준은 [AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory)). 특정 경로에만 걸리는 결정은 아래 「영역 결정 색인」 표의 색인에, 퇴역·전부 대체·일회성 실행·구현 기록으로 분류한 결정은 [역사 색인](../../docs/archived/operational-decisions-index-historical.md)에 있고 전문은 같은 보관 원문 앵커다. 행이 퇴역·전부 대체·일회성 실행이 되면 역사 색인으로, 걸리는 범위가 넓어지거나 좁아지면 공용·영역 색인 사이로 옮긴다(지우지 않는다).

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 저장소 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 2026-08-18 | - |
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | 2026-08-18 | - |
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 2026-08-18 | - |
| DEC-OPS-013 | accepted | 단독 운영 기간 IA 프로그램의 세 owner 역할(Product·IA·Security/Privacy)을 저장소 소유자 lkindo 로 지명하고 승인 채널을 저장소 PR 리뷰로 기록한다. | 2026-08-23 | - |
| DEC-OPS-062 | accepted | 축 2(화면 도달성) 래칫의 운영 방침을 확정한다 — 0 을 목표로 하지 않는다. | 2026-09-08 | DEC-OPS-051 의 래칫 목적을 재확인하고 잔여 소진 목표를 명시적으로 배제 |
| DEC-OPS-097 | accepted | 거버넌스 총량 관리 규칙을 AGENTS.md 에 둔다. | 2026-09-14 | - |
| DEC-OPS-177 | accepted | 연속 배치 작업의 반복 비용을 규칙으로 줄인다. | 2026-09-27 | - |
| DEC-OPS-340 | accepted | 공용 메모리 행은 원장이 세는 수를 다시 적지 않고 원장에 링크한다(GAP-WIRING-001·GAP-ARCH-001). | 2026-10-17 | DEC-OPS-090 ⑥ 의 공용 메모리 결합 수 대조, GAP-WIRING-001 수치 결속(2026-09-15 커밋 2c55b9924, DEC 없음) |
| DEC-OPS-358 | accepted | 기록이 로그인 ID 로 소유를 판정하는 표에 남은 ID 는 새 계정에 다시 주지 않는다. | 2026-10-19 | - |
| DEC-OPS-371 | accepted | 규칙·기록·계약의 중복과 반복 재생성을 걷는다 — 결정 인덱스 반복 열·역사 행 분리, DEC 기록 기준, 공유 OCI 적용 로그, 고정값의 원장 계산, npm run regen, Atlas·URL 승인·IA 처분 결속 축소, 헌법 정정, 범용 스킬 정리, 하네스 기준선 단일 구현(2026-10-19 사용자 승인). | 2026-10-19 | DEC-OPS-335 의 Atlas 소스 다이제스트 결속, 구현 기록·공유 OCI 적용을 DEC 로 쓰던 관행, 백엔드 헌법 §10.3 의 외부 발송 runAfterCommit 표준, 하네스 기준선의 Java·node 이중 구현과 거울 대조 |
| DEC-OPS-374 | accepted | 직접 맡은 작업 브랜치는 추가 승인 없이 PR·required CI·main 병합·원격/로컬 브랜치 삭제까지 마무리한다. 현재 사용자의 범위 제한과 다른 작업 보호를 우선한다. | 2026-10-20 | - |
| DEC-OPS-375 | accepted | 부서 미배정 사용자의 '부서 공유' 일정을 기본조직으로 묶어 미배정자끼리 공유하는 현재 동작과, 일반 사용자 관리자(USER_UPDATE·USER_DEPT)가 보호 관리자 계정의 이름·연락처·부서를 바꿀 수 있는 현재 권한 의미를 유지한다(2026-10-21 사용자 결정). | 2026-10-21 | - |
| DEC-OPS-379 | accepted | ADR-0040 의 스키마 변경을 저장소 Flyway 로 일괄 승인하고, 공유 OCI 적용은 PR 병합마다 하며, 예약 집행 전 진단에서 나온 미래 시작일·형식 오류 행은 보정하지 않는다(2026-10-23 사용자 결정). | 2026-10-23 | - |
| DEC-OPS-381 | accepted | 자동 로드되는 공용 결정 인덱스에는 Accepted ADR(5열)과 어느 경로를 고치든 걸리는 운영 결정만 두고, 특정 경로에만 걸리는 운영 결정은 자동 로드하지 않는 영역 결정 색인 넷에 둔다. 변경 작업은 대상 경로가 걸리는 영역 색인을 읽고, 새 결정은 기본으로 영역 색인에 쓰며, 자동 로드되는 공용 메모리 파일마다 전체 크기 상한을 둔다(2026-10-24 사용자 결정). | 2026-10-24 | DEC-OPS-371 ① 의 'Atlas 가 두 색인이 보관 원문의 DEC 를 정확히 한 번씩 나눠 갖는지 검사한다' 가운데 두 색인(현재·역사 → 공용·영역·역사 색인), Accepted ADR index 의 이유·정본 열(기록 템플릿, DEC 없음) |
| DEC-OPS-382 | accepted | 방법론 보완 배치를 한 결정으로 묶는다(2026-10-24 사용자 승인). ① 설계 검토 예산·결정 카드·결정 유형 분리를 SOP §7 에 두고, 시안 확인을 스키마·데이터·인가·IA 처분·운영 적용 승인과 분리한다. ② 산출물 내보내기는 비규범 파생물이다 — 커밋하지 않는 build/deliverables 에만 쓰고 수동·dispatch·릴리스 태그에서만 만들며, frontend/public·regen·required CI 에 넣지 않고 .agent/memory·docs/archived·ADR 색인·공유 OCI·생성물 메뉴 스냅숏을 읽지 않는다(기관 RTM CSV 는 실행 인자 예외). ③ 스캐폴더는 최소 정합화와 등록 점검기로 두고 실사용 전에는 Node 로 옮기지 않는다. ④ 시연 라우트를 메뉴 연결 선택지·화면 목록·권한 묶음 화면에서 뺀다. ⑤ 공개 저장소 CI 는 시험 결과 XML·SARIF 만 올리고 산출물 패키지는 다이제스트만 남긴다. ⑥ 출력은 Markdown·CSV 다. ⑦ OpenAPI 의 PUBLIC 연산은 security: [] 로 전역 bearer 를 지운다. | 2026-10-24 | - |
| DEC-OPS-385 | accepted | 방법론 후속 보완 배치를 한 결정으로 묶는다(2026-10-26 사용자 승인). ① `verify:docs` 는 문서 전용 변경의 넓은 경로이지 작업 중 최소 검사가 아니고, 병렬 에이전트·워크플로가 도는 동안 메인도 무거운 검증을 시작하지 않으며, H1·H3·식별자·동시성·게이트 의미를 보는 검토 관점은 채택률로 줄이지 않는다. ② 실행 스킬은 모두 AGENTS·SOP 를 상위 권위로 가리키고 배치 대기·매 작업 검토·필수 재검토·섹션별 승인을 강제하지 않는다. ③ 의미를 바꾸는 변경(H3·H1·식별자·게이트)은 병합 전 독립 검토를 한 번 두고, 검토자는 사용자 원문과 diff 로 반례를 먼저 적은 뒤 재진술을 읽는다. ④ 실행 기록은 겹친 무거운 실행과 실행 중 입력 변경을 경고만 하고 막지 않는다. ⑤ 자동 로드 인덱스에는 어느 경로를 고치든 걸리는 Accepted ADR 의 행과 나머지 Accepted ADR 의 영역별 ID·제목 목록만 두고, 나머지 행은 영역 색인 표 맨 위에 두며, ADR 행에 길이 상한을 둔다. 변경 작업은 그 목록에서 작업과 닿는 ADR 을 영역과 상관없이 읽는다(AGENTS 필수 읽기 3). ⑥ 동시에 작업하면 별도 작업 트리를 쓰고, 커밋할 경로에 다른 작업의 변경이 섞여 있으면 `--only` 커밋 대신 멈추고 보고한다(잠금은 두지 않는다). | 2026-10-26 | DEC-OPS-381 의 '공용 결정 인덱스에는 Accepted ADR(5열)' 가운데 Accepted ADR 전부를 자동 로드하는 부분 |
| DEC-OPS-386 | accepted | 세 에이전트(Claude Code·Codex·Antigravity) 하네스 공용화 배치를 한 결정으로 묶는다(2026-10-27 사용자 승인). ① 스킬 정본은 `.agent/skills` 하나이고 `npm run regen` 이 `.agents/skills`·`.claude/skills` 에 안내 파일을 만든다 — 안내 경로에 스킬을 직접 쓰지 않는다. ② 셸 명령의 실행 전 가드는 `scripts/agent-guard.mjs` 규칙 표가 정본이고 세 어댑터(`.claude/settings.json`·`.codex/hooks.json`·`.agents/hooks.json`)는 부르기만 한다. 판정할 수 없으면 막지 않고 막지 않은 명령에 승인을 대신 내리지 않는다. ③ 반복된 실수는 기억·문서보다 먼저 가드·lint·계약으로 막고 실제 사례가 붉어지는 시험과 함께 둔다. ④ `npm run dev` 는 원격 DB 에서 Flyway 자동 적용을 끈다(옵트인해도 seed-dev 제외). ⑤ `.agents/`·`.claude/`·`.codex/` 는 내용물만 무시하고 안내 파일·훅만 추적한다. ⑥ 의미를 바꾸는 변경의 독립 검토(DEC-OPS-385 ③)는 가능하면 다른 회사 모델에 맡긴다. | 2026-10-27 | - |
| DEC-OPS-387 | accepted | 하네스·방법론 정합화 배치를 한 결정으로 묶는다(2026-10-27 사용자 승인). ① 다른 회사 모델 독립 검토로 diff·사용자 원문을 보내는 것은 매번 묻지 않되 비밀·토큰·쿠키·개인정보·운영 데이터·`.env` 내용은 보내지 않는다(AGENTS 안전 경계의 예외). ② 포괄 승인("진행해")은 Workflow 도구 동의가 아니고, 작업 브랜치 완료의 상시 승인과 별개다. ③ 훅 우회는 사용자가 명시 지시한 경우뿐이며 실행 전 가드가 환경 변수·`core.hooksPath` 우회도 묻는다. ④ 병합한 브랜치의 로컬 강제 삭제는 끝 커밋이 원격 추적 ref 에 있으면 묻지 않고, 작업 트리 디렉터리 제거는 묻는다. | 2026-10-27 | SOP §2.1 이 포괄 승인을 Workflow 도구 동의로 보던 문구(DEC 없음), 실행 전 가드가 작업 트리 이름 `setup` 을 막던 부분(DEC-OPS-386 ② 구현) |
| DEC-OPS-389 | accepted | 방법론 감사 결정 카드 후속을 한 결정으로 묶는다(2026-10-29 사용자 위임). ① 경로 → 영역 결정 색인 판정의 정본은 `scripts/decision-indexes.mjs` 이고 `--for`·`--diff` 가 읽을 색인과 gap 상세 절을 출력한다. 대상 경로는 작업이 직접 고치는 입력 파일이며(생성물·공용 메모리·결정 색인은 입력 경로로 판정), 어느 원장에도 걸리지 않으면 넷 모두를 읽고 그런 최상위 집합은 계약이 고정한다. ② known-gaps 는 모든 작업에 걸리거나 글로만 지켜지는 큰 피해 금지가 있는 행만 전문으로 두고, 특정 경로 행은 레지스트리 한 줄과 `docs/04-operations/known-gaps-detail.md` 로 나눈다(상한 19000자, 산출물 입력 금지). ③ 규칙 계층 5 에 승인된 운영 결정을 둔다. ④ L2 는 §2.3 의미 변경 범주를 포함하고 L2 Audit 리포트는 PR 설명의 고정 절이다. ⑤ CI 튜닝값은 ADR-0044 를 따른다. ⑥ 변이 800개 이상 PIT 범위의 하한은 실측−5(최저 75)로 범위마다 두고 낮추지 않는다(gates.json `scopeFloors`). | 2026-10-29 | DEC-OPS-381 ② 의 판정 정본(손으로 쓴 경로 표 → 경로 원장)과 ⑤ 의 known-gaps 상한 값(34000 → 19000), DEC-OPS-366 의 '범위마다 75%' 가운데 변이 800개 이상 범위 |

## 영역 결정 색인

이 표의 색인과 [gap 영역 상세](../../docs/04-operations/known-gaps-detail.md)의 같은 영역 절은 자동으로 읽히지 않는다. 읽는 의무는 [AGENTS.md 작업 시작 시 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기)가 정하고, 이 표는 경로를 색인에 잇는다. 판정의 정본은 [경로 원장](../../scripts/decision-indexes.mjs)이고 이 표는 그 경로 패턴을 그대로 보인다(공용 메모리 계약이 대조한다). 문서(`docs/`)의 영역 배정은 원장에만 둔다 — `node scripts/decision-indexes.mjs --for <경로…>`(또는 `--diff <base>`)가 읽을 색인과 gap 상세 절을 출력한다. `**` 는 하위 경로 전부, `*` 는 한 단계 안의 임의 문자열이다. 경로가 여러 행에 걸리면 걸린 색인을 모두 읽고, 어느 행에도 걸리지 않으면 넷을 모두 읽는다.

| 영역 색인 | 이 경로를 고치면 읽는다 |
|---|---|
| [CI·검증·거버넌스](../../docs/04-operations/operational-decisions-index-ci-governance.md) | `.github/**`, `.githooks/**`, `.zap/**`, `.agent/scripts/**`, `.agent/skills/**`, `.agent/knowledge/**`, `.agents/hooks.json`, `.claude/settings.json`, `.codex/hooks.json`, `.gemini/settings.json`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `Makefile`, `start-dev.ps1`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.gitleaks.toml`, `.nvmrc`, `lombok.config`, `config/governance/**`, `config/security/**`, `config/dependency-check/**`, `config/migration-test-duration-profile.json`, `config/pit-duration-profile.json`, `scripts/**`(아래 두 행의 도구는 그 행도 읽는다), `tools/agent-evaluation/**`, `api-server/src/test/**`, `api-server/src/main/resources/db/migration/**`(무중단 waiver), `frontend/e2e/**`, `frontend/scripts/**`, `frontend/atlas/**`, `frontend/*.config.*`, `frontend/tsconfig*.json`, `frontend/vitest.setup.ts`, `frontend/lighthouserc.json`, `frontend/.gitignore`, `frontend/.nvmrc`, `test/load-tests/**`, `package.json`, `package-lock.json`, `frontend/package.json`, `frontend/pnpm-lock.yaml`, `gradle/**`, `**/*.gradle`, `gradle.properties`, `gradlew`, `gradlew.bat` |
| [프로젝트 생성기·재사용 투영](../../docs/04-operations/operational-decisions-index-composer.md) | `config/modules/**`, `config/project-composer-menus.json`, `tools/project-composer/**`, `frontend/src/extensions/**`, `scripts/project-composer*`, `scripts/composer-*`, `scripts/reusable-*`, `scripts/generate-reusable-base-*`, `scripts/verify-reusable-*`, `scripts/slot-registry*`, `scripts/domain-deletion-*`, `scripts/frontend-reachability-census*` — 경로가 아닌 조건: 기능 마커(`config/modules/*.json` 의 `markerBlocks`)가 가리키는 화면, 한 기능이 다른 기능의 코드를 새로 import 하는 변경 |
| [레거시 이관 도구](../../docs/04-operations/operational-decisions-index-migration.md) | `migration-tool/**`, `tools/migration-workspace/**`, `tools/migration-workspace-prototype/**`, `scripts/*migration*`, `config/migration-test-duration-profile.json` |
| [제품 동작·화면·도메인](../../docs/04-operations/operational-decisions-index-product.md) | `foundation/**`, `business-core/**`, `business-app/**`, `api-server/src/main/**`(Flyway 새 표·컬럼 포함), `api-server/src/test/**`, `api-server/Dockerfile`, `frontend/src/**`, `frontend/public/**`, `frontend/next.config.*`, `frontend/next-env.d.ts`, `frontend/components.json`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/.env.example`, `frontend/README.md`, `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `.agent/knowledge/**`, `lombok.config`, `db_columns.json`, `config/governance/permission-catalog.json`, `config/governance/authorization-policies.json`, `config/governance/permission-bundles.json`, `config/governance/privacy-access-census.json`, `config/frontend-visible-terms.json`, `config/ui-*.json`, `config/ui-quality-baseline/**`, `config/krds-profile-mapping.json`, `config/db/**`, `config/edge/**`, `config/observability/**`, `docker-compose*.yml`, `.dockerignore`, `.env.example`, `README.md`, `migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java` |
| 추가 색인 없음 | `.agent/memory/**`, `docs/04-operations/known-gaps-detail.md`, `docs/04-operations/operational-decisions-index-*.md`, `docs/archived/operational-decisions-*.md`, `docs/02-architecture/decisions/README.md`, `docs/README.md`, `.agents/skills/**`, `.claude/skills/**`, `frontend/public/governance_harness_atlas.html`, `api-docs.json`, `frontend/src/types/generated-**`, `frontend/src/extensions/generated-*`, `config/governance/generated-*`, `config/ui-url-state-census.json`, `business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java`, `business-core/src/main/resources/authorization/*.json` — 생성물·공용 메모리·결정 색인은 그 변경을 부른 입력 경로로 판정한다. ADR 문서는 그 ADR 행이 있는 색인을 읽는다(공용 인덱스의 ADR 은 추가 색인이 없다) |
| 넷 모두 | 위 어느 행에도, 경로 원장의 문서 배정에도 걸리지 않는 경로, 또는 걸리는지 판단이 서지 않을 때 |

## 기록 템플릿

DEC를 쓰는 기준과 쓸 색인은 [AGENTS.md](../../AGENTS.md#documentation-and-memory)를 따른다. 새 운영 결정은 기본으로 그 결정이 걸리는 경로의 영역 색인(위 「영역 결정 색인」 표)에 `ID | 상태 | 결정 | 시행일 | supersedes` 행을 두고, 어느 경로를 고치든 걸리는 결정일 때만 이 파일의 운영 결정 표에 둔다. [보관 기록](../../docs/archived/operational-decisions-history.md)에는 같은 ID의 `## DEC-OPS-NNN` 절과 `ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes` 전문 행을 둔다. 색인 행과 보관 원문의 상태·시행일·supersedes는 같아야 한다. 아키텍처·제품 경계를 바꾸면 먼저 ADR을 만들어 [ADR 색인](../../docs/02-architecture/decisions/README.md)에 링크하고, 같은 5열로 한 줄만 추가한다 — 어느 경로를 고치든 걸리면 이 파일의 ADR 표에, 아니면 그 ADR 이 주로 걸리는 경로의 영역 색인 표 맨 위(운영 결정 행 앞)에 두고 이 파일의 ADR 목록 그 영역 줄에 ID·제목을 더한다.
