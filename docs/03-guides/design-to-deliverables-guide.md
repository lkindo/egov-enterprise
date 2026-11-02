# 시안에서 산출물까지 — 설계 검토·시안·산출물 초안 가이드

> **이 문서는 규칙을 새로 두지 않는다.** 규칙의 원본은 [DEC-OPS-382](../archived/operational-decisions-history.md#dec-ops-382),
> [DEC-OPS-397](../archived/operational-decisions-history.md#dec-ops-397), [DEC-OPS-399](../archived/operational-decisions-history.md#dec-ops-399),
> [오케스트레이션 프로토콜 §7·§8](orchestration-protocol.md#7-설계-검토-예산-design-review-budget)이고,
> 여기서는 그 결정이 만든 장치를 어디서 어떻게 쓰는지와 각 장치가 증명하지 않는 것을 잇는다.

## 1. 장치 지도

| 단계 | 장치 | 하는 일 | 증명하지 않는 것 |
|---|---|---|---|
| 앞단 요구사항 작업공간(저장소 밖) | [`scripts/export-deliverables-workspace.mjs`](../../scripts/export-deliverables-workspace.mjs) (`init`·`verify`·`export-context --workspace <checkout 밖 경로>`) | 어느 Git 작업 트리에도 속하지 않는 checkout 밖 폴더에 저장소 역량 스냅숏(`context.snapshot.json`), 원시 근거·3축 Fit-Gap·에픽/작업/AC 백로그(`backlog.json`, 기본 빈 골격·`--sample` 시 합성 표본), 10열 호환 추적표(`rtm.csv`), 5개 표준 보기 보고서(`WORKSPACE-REPORT.md`)를 초기화·검증한다 | 저장소 안에 기관 요구사항·회의록을 커밋하지 않는다(DEC-OPS-382 ②). 백로그에 수동 구현 완료 값을 적지 않으며 4층 상태를 분리한다 |
| 설계 검토 | [SOP §4 DESIGN BRIEF·§7 설계 검토 예산](orchestration-protocol.md#7-설계-검토-예산-design-review-budget) | 결정 카드(D-n)로 검토 대상을 정하고, 결정 유형마다 확정 수단을 나누고, 등급별 검토 횟수 상한을 둔다 | 시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다 |
| 화면 시안(앱 안) | 패턴 갤러리 `/admin/patterns` — A1 조회형 목록, A2 마스터-디테일 + A3 인라인 편집, A7 현황 + 원본 표 | 실제 셸·토큰·검증 흐름으로 밀도·간격·문구를 판단한다. axe·반응형 E2E 가 이 화면을 방문한다 | 정적 표본이다. 서버 계약·데이터·권한 의미를 보이지 않는다(라우트 원장 status `demo`) |
| 화면 시안(저장소 밖) | `pnpm -C frontend prototype:kit` → `build/prototype-kit/tokens.css`·`README.md` | 슬라이드·디자인 도구 시안이 앱과 같은 색·대비 값을 쓰게 한다 | 의사소통 자료다. 화면 판단은 갤러리에서 한다 |
| 구현 착수 | [`scripts/generate-domain.ps1`](../../scripts/generate-domain.ps1) + [등록 점검기](../../scripts/domain-registration-doctor.mjs) | 현행 규칙에 맞는 최소 뼈대 5파일을 만들고, 원장·생성물 등록 지점 가운데 빠진 곳을 사람 판정·생성기·선택 등재로 나눠 보인다 | Flyway·권한 원장·검토 원장에 쓰지 않는다. 의미 판단은 [identity-model-guide §6](identity-model-guide.md)·[getting-started §5.2](getting-started.md) 몫이다 |
| 산출물 초안 | [`scripts/export-deliverables.mjs`](../../scripts/export-deliverables.mjs) + 수동 워크플로 `Deliverables draft` | 원장에서 권한·화면·역량·API·서비스 판정·프로그램·메뉴·보안약점·하류 추적·입력 항목 후보·시험 목록·인수 시험(UAT) 시나리오 후보·예외 및 도입 승인 현황 표를, `--db` 면 참조 스키마의 DB 정의서·ERD·표준 사전을, `--compare` 면 이전 기준선 대비 변화를 Markdown·CSV 로 계산한다 | 감리·검수를 대신하지 않는다. 기관 DB 의 실제 배정·운영 실측이 아니다 |

## 2. 정본·파생·비규범의 경계

| 대상 | 지위 | 위치 | 바꾸는 법 |
|---|---|---|---|
| 권한 카탈로그·인가 원장·라우트 원장·보안약점 원장 | 정본(사람이 검토한 원장) | `config/governance/`, `config/ui-route-capabilities.json`, `config/security/` | 사람이 PR 로 고친다 |
| 화면 목록·권한 생성물 | 커밋하는 파생 생성물 | `frontend/src/types/` | 원장을 고친 뒤 `npm run regen` |
| 앞단 요구사항·백로그 작업공간(`backlog.json`·`rtm.csv`·`WORKSPACE-REPORT.md`) | 기관·프로젝트 외부 작업공간(저장소 비커밋) | checkout 밖 `--workspace <경로>` | `node scripts/export-deliverables-workspace.mjs init\|verify\|export-context --workspace <checkout 밖 경로>` 로 관리하고 `--rtm <workspace/rtm.csv>` 로 산출물 초안에 넘긴다 |
| 산출물 초안·Atlas HTML | 비규범·비커밋 파생물 | `build/deliverables/<커밋>/`, `build/atlas/` | 필요할 때 다시 실행한다(`export-deliverables.mjs`, `npm run atlas:build`). 손으로 고친 사본은 초안이 아니라 기관 문서다 |
| 시안(갤러리·토큰 키트·저장소 밖 아티팩트) | 비규범 | `/admin/patterns`, `build/prototype-kit/` | 확인은 승인이 아니다([SOP §7.2](orchestration-protocol.md#72-결정-유형별-확정-수단)) |

## 3. 산출물 초안 내보내기

**실행.** 깨끗한 작업 트리에서 `node scripts/export-deliverables.mjs` 를 돌리면 `build/deliverables/<커밋 12자리>/` 에 표마다 `.md`·`.csv`
와 `README.md`·`manifest.json` 을 쓴다. 변경이 남은 트리는 거부한다 — `--allow-dirty` 는 미리 보기이며 폴더 이름에 `-dirty` 가 붙고
README 가 제출용이 아니라고 적는다. `--out` 은 `build/deliverables/` 아래만 받는다. GitHub 에서는 Actions → `Deliverables draft`
(workflow_dispatch)가 같은 커밋에서 DB 표까지 두 번 만들어 내용 다이제스트를 대조하고 실행 요약에 다이제스트와 행 수만 남긴다.
공개 저장소라 묶음을 artifact 로 올리지 않는다.

**DB 표(`--db`).** Docker 로 이 실행만의 PostgreSQL 17 컨테이너를 만들어(포트 비공개, 소유 표식 확인 뒤 삭제) 저장소 Flyway 를 DB 번들
생성기와 같은 순서로 단계 적용한다(V2_99 까지 → 반복 시드 → 인가 Contract → 나머지 → 반복 시드). 단순 `flyway migrate` 는 인가 Contract
단계를 건너뛰므로 쓰지 않는다. 적용 결과의 테이블 집합이 기능 선언 소유와, 표준 사전 행 수가 `config/modules/core.json` 의 원본 실측과
다르면 멈춘다. 결과는 참조 스키마이며 운영 DB 실측이 아니다(H1). 공유 OCI 의 실제 불일치는 [GAP-STD-001](../../.agent/memory/known-gaps.md)이
날짜와 함께 따로 적는다.

**기관 요구사항 추적(`--rtm <CSV>`).** 기관이 넘긴 요구사항 추적 CSV 또는 `export-deliverables-workspace.mjs` 가 내보낸 `rtm.csv` 를 커밋하지 않는 실행 인자로 받는다. 저장소가 추적하는 파일은
거부한다. 필수 열은 `요구사항 ID`·`대상 ID` 이고 선택 열은 `요구사항 이름` 과 앞단 작업공간 확장 열(`요구사항 유형`·`해법 구분`·`범위 결정`·`작업 ID`·`인수조건 ID`·`연결 의도`·`기관 인수 판정`)이며, 대상 ID 는 화면 ID·역량 ID·인터페이스 ID 다. 결과는
하류 추적 보기의 요구사항 칸과 요구사항 추적 조인 표이며, 찾지 못한 대상을 숨기지 않고 `찾음`(`found`) 옆에 `원장 상태`(`ledgerStatus`)와 `증거 수준`(`evidenceLevel`)을 함께 적는다. 충족 판정이 아니다. manifest 에는 파일 경로
없이 내용 해시만 남긴다.

**표와 식별자.** 화면 ID 는 라우트 경로, 인터페이스 ID 는 `METHOD 경로`, 역량 ID 는 `라우트#역량`, 프로그램은 파일 경로다. 별도 ID
체계를 만들지 않는다.

| 표 | 원천 | 읽을 때 주의 |
|---|---|---|
| 권한 목록 | 권한 카탈로그·권한 묶음 | 기본 그룹은 Flyway 시드의 템플릿 기본값이다. 묶음은 그룹이 아니다 |
| 화면 목록 | 생성 화면 목록·라우트 원장 | 쓰기 권한은 이름으로 맞춘 호출 계산이다. 시연 화면은 `시연` 열로 남는다 |
| 화면 역량 목록 | 라우트 원장 | 상태·증거 수준·대상은 검토 값 그대로다(UNVERIFIED 를 채우지 않는다) |
| 인터페이스(API) 목록 | 연산 바인딩·엔드포인트 정책·OpenAPI | 조회는 `의미 행 없음(조회)` 이다. OpenAPI 밖 연산은 요약이 비어 있다 |
| 서비스 자원 판정 목록·접근 정책 정의 | 인가 원장 | 정책 정의는 원문(영어)이다 |
| 프로그램 목록 | 네 온라인 모듈의 생산 Java·기능 선언 | 소유 기능은 생성기의 소유 판정이고 계층은 경로 분류다. migration-tool 은 싣지 않는다 |
| 메뉴 목록 | 메뉴 스냅숏 | 시드 그룹의 기본 표시만이다 |
| 구현단계 보안약점 점검표·보안 오탐 승인 목록 | 보안약점 원장·오탐 승인 원장 | 사전 점검이다. 공식 보안약점 진단을 대신하지 않는다 |
| 하류 추적 보기 | 기능 선언·라우트 원장·화면 목록·연산 바인딩·E2E 파일·PR 선별 규칙 | E2E·쓰기 연산은 계산된 후보다(그 시험이 그 역량을 단언한다는 뜻이 아니다). 잇지 못한 칸은 비운다. 라우트 원장의 journeys 칸은 읽지 않는다 |
| 입력 항목 후보(요청 스키마) | OpenAPI 요청 본문 | 화면이 실제로 보이는 항목이 아니다. 길이·패턴은 OpenAPI 선언만이다 |
| 시험 목록 | 네 온라인 모듈·프런트 단위·E2E 시험 소스 | 정적 추출이다 — 매개변수 사례 수·동적 제목·통과 여부가 아니다. 실행 결과는 CI 의 `backend-test-results`·`backend-schema-test-results`·`frontend-test-results` artifact(시험 결과 XML, main push 90일·PR 14일)다 |
| 인수 시험(UAT)·업무 여정 시나리오 후보 | 화면 품질 대표 여정 시나리오 원장(`config/ui-quality-scenarios.json`, ADR-0005 대표 8개) | 대표 여정의 단계별 역할·화면·과업·상태를 편 발주기관 UAT 시나리오 초안 후보다(전체 화면 전수 목록이나 인수 합격 판정이 아니다) |
| 예외·유예·도입 승인 현황 | ZDM 예외·레거시 부채(`zdm-waivers.json`), 비규범 URL 상태 부류 등록부(`ui-url-state-approval.json`), 온라인·이관 도입 승인 원장(`adoption-review.json`·`migration-adoption-review.json`) | 원본 저장소에서 도입 승인 원장은 언제나 `pending` 템플릿이다(실제 기관 승인은 도입 환경·생성물에 기록되며 이 도구는 원본 저장소에서만 실행된다). 공용 메모리(`known-gaps`)는 읽지 않는다 |
| 요구사항 추적 조인 | `--rtm` 으로 받은 기관 CSV(3열 또는 작업공간 10열) | `--rtm` 을 줄 때만 생긴다. `찾음` 외에 `원장 상태`·`증거 수준`과(확장 열이 있으면) Fit-Gap·인수 판정 열을 분리해 표시한다 |
| 단계 기준선 비교 | `--compare` 로 받은 이전 기준선 `manifest.json` | `--compare` 를 줄 때만 생긴다(DEC-OPS-397). 자기 자신(`baseline-comparison.*`)과 `contentDigest` 는 비교·집계에서 제외해 단계 다이제스트 불변성을 유지한다 |
| 테이블·컬럼 정의서, 외래 키 목록, 기능별 물리 ERD, 표준 용어·단어·도메인 사전 | 참조 스키마(`--db`) | 표지(설명 없음·용어 없음·폐기 용어·타입 대조·외래 키 없음)는 이름 대응 표시이지 표준 판정이 아니다. ERD 는 키 컬럼과 물리 외래 키만 그린다 |

**읽지 않는 입력.** 공용 메모리(`.agent/memory`, 거기서 옮긴 [gap 영역 상세](../04-operations/known-gaps-detail.md) 포함), 보관 기록(`docs/archived`), ADR 색인, 공유 OCI(`.env`·DB 접속), 생성물의 검토 전
원장·메뉴 스냅숏(`config/governance/upstream-review`)이다. 원장·생산 Java·E2E·시험 소스와 `--rtm` 은 한 판정 함수를 지나며 거기서
거부한다(구분자·대소문자를 가리지 않는다). 생성기 카탈로그·기능 선언은 그 모듈의 읽기를 쓰며 `config/modules` 와 생산 소스만 읽는다.
생성물(재사용 투영본)에서는 아직 돌지 않는다.

**재현.** `manifest.json` 은 커밋 SHA, 작업 트리 상태, 입력 파일별 sha256(줄 끝을 LF 로 맞춰 계산), lockfile 해시, Node·TypeScript 버전,
내용 다이제스트를 싣는다. 내용 다이제스트는 표 파일(README·manifest 제외)의 경로·sha256 으로 계산하고 커밋·시각을 넣지 않으므로, 원장 값이 같으면 커밋이 달라도 같다.

**CSV.** UTF-8 BOM 과 CRLF 로 쓴다. `= + - @` 탭·CR 로 시작하는 칸은 앞에 `'` 를 붙여 스프레드시트가 수식으로 읽지 않게 한다.
xlsx 는 외부 시범 검토 뒤에 정한다(DEC-OPS-382 ⑥).

## 4. 공공 SW 규범과의 대응

자동(원장 계산) · 반자동(도구 초안 + 사람 확정) · 사람 · 기관 몫으로 나눈다. 조항의 세부 산출물 목록과 서식은 원문으로 대조한다 —
원문 대조 전의 대응은 확인되지 않은 것으로 다룬다.

| 규범 | 요구 | 저장소가 주는 것 | 사람·기관 몫 |
|---|---|---|---|
| 정보시스템 감리기준(행정안전부 고시 제2024-53호) | 감리는 감리법인의 점검이고, 단계마다 발주자 확인을 거친 대비표를 낸다 | 반자동 — 감리 준비 입력 자료 초안(권한·API·화면·프로그램·시험·보안약점 표와 하류 추적 보기) | 대비표 작성·발주자 확인·감리 수행. 요구사항 추적의 상류(RFP·요구사항정의서 ID)는 기관 원장이다(`--rtm` 으로 잇기만 한다). 자동 생성물을 감리 산출물로 인정하는 조문은 찾지 못했다 |
| 소프트웨어 구축·운영 지침(제2024-66호) 제59조제1항 | 변경할 때 표준산출물과 일관성을 유지한다 | 자동 — 같은 커밋에서 원장으로 다시 계산하고 내용 다이제스트로 재현한다 | 표준산출물 반영과 확정 |
| 공공기관의 데이터베이스 표준화 지침(제2025-19호) 제9조 | DB 표준화 산출물을 관리한다 | 반자동 — 참조 스키마의 테이블·컬럼 정의서, 물리 ERD, 표준 용어·단어·도메인 사전(`--db`). 관리항목과 표 열의 대응은 원문 대조 전이다 | 메타데이터 등록, 논리 모델·엔터티·속성 정의서 작성, 컬럼별 표준 판정([GAP-STD-001](../../.agent/memory/known-gaps.md)) |
| 소프트웨어 개발보안 가이드 — 구현단계 보안약점 49개 | 보안약점을 제거한다 | 반자동 — 항목별 탐지 수단·통제 경로를 대응시킨 사전 점검 표 | 공식 보안약점 진단(인증 진단도구·진단원) |

## 5. 단계 기준선

산출물의 기준선은 커밋 SHA 와 내용 다이제스트 한 쌍이다. 설계 확정·구현 완료·릴리스처럼 비교할 시점마다 그 쌍을 남긴다. 두 시점의
다이제스트가 같으면 표 내용이 같고, 다르면 `--compare <이전 manifest.json>` 으로 표별 행 수 증감·해시 변화(`baseline-comparison.md`·`.csv`)를 계산하거나 두 커밋을 다시 계산해 표끼리 비교한다. 묶음 자체를 커밋하거나 손으로 고친 사본을 기준선으로 삼지 않는다. 릴리스 태그에
묶음을 붙이는 일은 첫 실제 릴리스에서 이미지 발행과 함께 확인한다(DEC-OPS-382 — 릴리스 첨부의 첫 적용은 따로 정한다). 설계 검토 비용의 기준선은
[SOP §7.4](orchestration-protocol.md#74-측정)의 PR 설명 칸으로 잰다.

## 6. 갤러리와 토큰 키트를 쓰는 법

- 새 화면 유형의 시각 판단은 갤러리에 표본을 더해서 한다. 표본을 더하면 같은 화면에 두어 axe·반응형 검사를 받게 하고, 폼이면
  폼 검증 census 에, 조회 조건이 둘 이상이면 각 조회 영역에 이름(`KeywordFilter` 의 `landmarkLabel`)을 준다.
- 갤러리는 시연 화면이라 메뉴 연결 선택지·화면 관리 목록·권한 묶음에 나타나지 않는다(DEC-OPS-382 ④).
- 저장소 밖 시안은 토큰 키트의 값만 쓴다. 키트는 값을 새로 만들지 않고 프로필 CSS 를 그대로 싣는다. 시안에서 고른 색을 앱에
  옮기려면 디자인 토큰 절차([design-tokens.md](design-tokens.md))를 따른다.

## 7. 요구사항 입구(Intake)·통합 전환(Cutover)·최종 종료(Closeout) 연결

정보공학(IE)의 표준 사전·단계 기준선·추적표와 애자일의 에픽/스토리·수직 슬라이스·자동 게이트를 전 생명주기로 잇는 실행 순서다(DEC-OPS-397, DEC-OPS-399).

### 7.1 이중 계층 분리: 프로젝트 사업 단계(`P0~P5`) vs 에이전트 변경 작업 파이프라인(`SOP Stage 1~4`)

- **프로젝트 사업 단계(`P0~P5` — 사업·도입·릴리스 생명주기)**: 발주기관 원시 근거 수집(`P0`)부터 요구사항 정규화·3축 Fit-Gap 판정(`P1`), 애자일 에픽·작업·인수조건 구조화(`P2`), IE 원장 식별자·표준 용어 바인딩(`P3`), 배치별 수직 슬라이스 구현(`P4`), 산출물 초안·통합 전환·인수 종료(`P5`)까지의 사업 흐름이다. `P0~P3` 의 기관 고유 요구사항과 백로그는 저장소 안에 커밋하지 않고 **어느 Git 작업 트리에도 속하지 않는 checkout 밖 `--workspace` 폴더**에서 관리한다(DEC-OPS-382 ②).
- **에이전트 변경 작업 파이프라인([SOP §1~§6 Stage 1~4](orchestration-protocol.md) — 개별 코드·스키마 변경의 L0~L2 파이프라인)**: `P3` 에서 확정된 개별 작업 항목(`story`·`configuration`·`verification`·`enabler`) 하나를 실제 저장소 코드·원장·마이그레이션에 반영할 때(`P4`) 작동하는 실행 규약(Dispatch → Execution → Audit → Verification)이다.

### 7.2 사업 단계 `P0~P5` 한눈에 보는 입출력과 교환 계약

| 사업 단계 | 무엇을 넣는가 (입력) | 어떻게 정리·검증하는가 (처리·도구) | 무엇이 나오는가 (산출물·교환 계약·표준 보기) | 보관 위치·책임 경계 |
|---|---|---|---|---|
| **P0. 원시 근거 수집 (Raw Discovery)** | RFP·과업지시서, 이해관계자 인터뷰·회의록, 현행 화면·장표·샘플 파일, 법령·보안·운영상 제약 | `node scripts/export-deliverables-workspace.mjs init --workspace <checkout 밖 경로>`(기본 빈 골격, 예시 확인은 `--sample`)로 외부 작업공간과 저장소 역량 스냅숏을 초기화하고 `sources[]`(`rfp`·`interview`·`as-is-artifact`·`regulation`·`policy-memo`·`other`)에 원시 근거를 등록 | `context.snapshot.json`(저장소 모듈 선언·화면·역량·API 읽기 전용 스냅숏), `backlog.json` 의 `sources[]`, `WORKSPACE-REPORT.md` **보기 1 (P0)** | checkout 밖 `--workspace`(저장소 비커밋, 기관·PM/BA 소유) |
| **P1. 요구사항 정규화 & 3축 Fit-Gap** | `sources[]` 원시 근거 + `context.snapshot.json`(기존 모듈 선언·화면·역량 상태·증거 수준) | 원시 문장을 원자 요구사항(`businessRequirements[]`)으로 쪼개고 **3축 Fit-Gap**(`requirementType`, `solutionDisposition`, `scopeDisposition`), 정량 기준(`nfrCriteria`), 판정·제외 사유(`rationale`), 미결 질의(`openQuestions`)를 기록 | `backlog.json` 의 `businessRequirements[]`, `WORKSPACE-REPORT.md` **보기 2 (P1)**(정규화·정량 기준·미결 질의)·**보기 3 (P1)**(3축 Fit-Gap 및 범위 처분 표) | checkout 밖 `--workspace`(기관·PM 합의 대상, `excluded`·`deferred` 항목은 `rationale` 필수) |
| **P2. 애자일 백로그 구조화 (Epic / WorkItem / AC)** | 범위 포함(`included`) 요구사항(`fit`·`config`·`gap-dev`·`hybrid`) | 에픽(`epic`) 아래에 사용자 스토리(`story`)뿐 아니라 설정(`configuration`), 비기능·기존 기능 검증(`verification`), 공통 기반(`enabler`)을 나누고 **허용(Green `allow`)·금지(Red `forbid`, H3/H5 부정 시험 후보) 인수조건(`acceptanceCriteria[]`)**을 작성 | `backlog.json` 의 `workItems[]`·`acceptanceCriteria[]`, `WORKSPACE-REPORT.md` **보기 4 (P2~P3)**(에픽·작업·AC 백로그 보드) | checkout 밖 `--workspace`(PO·아키텍트·QA 검토) |
| **P3. IE 원장·표준 바인딩 (IE Contract Binding)** | `P2` 작업·AC + `context.snapshot.json` + live `meta_standard_*` 사전 + `/admin/patterns` 시안 | 각 요구사항·작업·AC 를 정식 대상 ID(`화면 경로`, `라우트#역량`, `METHOD 경로`)에 `traceLinks[]`(`candidate`·`planned`·`existing`)로 잇고, 화면 유형(`A1~A7`)·결정 카드(`D-1~D-5`)·표준 용어를 대조한 뒤 `verify --workspace <경로>`(원장 갱신 시 `--refresh-context`) 실행 | 검증된 `backlog.json`(`traceLinks[]`), 10열 호환 `rtm.csv`, `WORKSPACE-REPORT.md` **보기 5 (P3~P5)**(4층 상태 추적 보드), 설계 기준선 `manifest.json` | `--workspace/rtm.csv`(교환 계약) → 저장소 `export-deliverables.mjs --rtm` 입력 |
| **P4. 수직 슬라이스 구현 (Vertical Slice — SOP Stage 1~4)** | `P3` 에서 바인딩된 개별 작업 항목 + 결정 카드(D-n) + Red AC(H5 부정 시험 후보) | [SOP §2~§4](orchestration-protocol.md) 등급(L0~L2) 판정 → [`generate-domain.ps1`](../../scripts/generate-domain.ps1)·Flyway·Entity·Service·Controller·OpenAPI/Zod·프런트 화면 구현 → [`domain-registration-doctor.mjs`](../../scripts/domain-registration-doctor.mjs) → `npm run regen` → H5 부정 시험 red 증명 → PR·required CI 병합 | 원장(`config/governance/*`, `config/ui-route-capabilities.json`)·소스·시험 커밋, 빠진 사람 판정 지점 0개 | 저장소 git 브랜치·PR(에이전트 구현 + 사람 원장·안전 경계 승인) |
| **P5. 통합 전환 & 최종 종료 (Cutover & Closeout)** | 깨끗한 HEAD, `--workspace/rtm.csv`, 이전 단계 기준선(`manifest.json`), 도입 환경 승인 원장 | **산출물 준비(저장소 도구)**: `node scripts/export-deliverables-workspace.mjs verify --workspace <경로> --refresh-context` → `node scripts/export-deliverables.mjs --db --rtm <경로/rtm.csv> --compare <기준선 manifest.json>` + `npm run review:status`<br>**통합 전환·최종 인수(기관 운영 절차)**: [백업·복원 런북](../04-operations/backup-and-restore-runbook.md) → 원천 동결(`ackSourceFreeze`) → 이관·온라인 `adoption:check` 및 `--execute` 전환([거버넌스 검토 수명 가이드 §3·§4](governance-review-lifecycle.md#3-온라인-제품의-기관-도입)) → 발주기관 실제 UAT 수행·합격 및 `acceptanceDisposition` 확정 | `build/deliverables/<커밋>/`(추적·요구사항 조인·UAT 후보·예외 현황·기준선 비교 묶음) + 발주기관 UAT 합격·도입 승인 완료 기록 | 산출물 초안은 비규범 파생물이며, 실제 전환·인수 승인은 발주기관·운영 환경 소유 |

### 7.3 3축 Fit-Gap 분류 어휘와 4층 상태 분리 계약

앞단 백로그(`backlog.json`)와 산출물 추적표(`requirements-trace`)는 [`export-deliverables-workspace.mjs`](../../scripts/export-deliverables-workspace.mjs) 의 상수 어휘를 정본으로 삼고, 완료 상태를 한 칸으로 뭉개지 않는다.

1. **3축 Fit-Gap 분류 (`businessRequirements[]`)**:
   - **요구사항 유형 (`requirementType`)**: `functional`(기능), `non-functional`(비기능·성능·보안·운영), `data`(데이터·표준·이관), `interface`(대내외 연계·API), `constraint`(법령·기술·운영상 제약) 가운데 하나로 분류한다. 범위 포함(`included`)인 `non-functional`·`data`·`constraint` 요구사항은 정량 기준 객체 `nfrCriteria`(`metric`, `threshold`, `verificationMethod`)를 필수로 적는다.
   - **해법 구분 (`solutionDisposition`)**: 저장소 모듈 선언(`core` + 선택 기능 선언) 스냅숏과 대조해 `fit`(기존 역량 그대로 사용), `config`(모듈 선택·프로필·권한·정책 설정으로 충족), `gap-dev`(신규 화면·API·스키마 수직 슬라이스 개발), `hybrid`(기존 역량 + 추가 개발·확장), `undecided`(미결)로 나눈다.
   - **범위 결정 (`scopeDisposition`)**: `proposed`(검토 전 제안), `included`(이번 사업·릴리스 포함), `deferred`(차기 단계 보류 — `rationale` 필수), `excluded`(범위 제외 — `rationale` 필수)로 기록한다. 연결(`traceLinks`)이 없는 요구사항도 `rtm.csv` 에 한 줄로 남겨 범위 제외·보류 내역이 산출물 조인표에서 사라지지 않게 한다.
2. **4층 상태 분리 (`backlog.json` 모든 엔터티에 `status`·`state`·`progress`·`implemented` 등 수동 상태 필드 금지)**:
   - **① 계획·범위 층**: `solutionDisposition` · `scopeDisposition` · `linkIntent`(`candidate` 후보 탐색 / `planned` 신규 개발 예정 / `existing` 기존 저장소 자산에 연결).
   - **② 도구 관측 층**: `found`(`예` / `아니오`) — 대상 ID 가 현재 저장소 원장(`screens`·`capabilities`·`interfaces`)에 존재하는지 도구가 계산한 값.
   - **③ 원장 검토 층**: `ledgerStatus`(`partial` / `unverified` / `unavailable` / `demo`)와 `evidenceLevel`(`E0`~`E3`) — 저장소 라우트·역량 원장의 실제 검토 수준. `found=예` 여도 `unavailable`·`demo`·`unverified`·`E0` 이면 경고를 내고, `partial` 이면 잔여 갭 여부를 확인하도록 안내한다.
   - **④ 기관 인수 판정 층**: `acceptanceDisposition`(`pending` / `accepted` / `conditional` / `rejected`) — 발주기관 UAT 결과에 따른 인수 판정.
