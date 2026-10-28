# 운영 결정 영역 색인 — CI·검증·거버넌스

> 상태: 영역 결정 색인 — 이 저장소(원본)에서 CI·훅·게이트·계약·원장·검증 도구 경로를 고칠 때 읽는 Accepted ADR·운영 결정의 짧은 색인이다. 에이전트 진입점이 자동으로 읽지 않으며, 읽는 조건은 [공용 결정 인덱스](../../.agent/memory/decisions.md)의 「영역 결정 색인」 표가 정한다. 생성물(재사용 base·이관 제품)에 복사된 이 파일은 upstream 이력이며 도입 기관의 현재 결정이 아니다.

ID가 보관 원문의 앵커다: 운영 결정 행의 전문·이유·승인 근거는 [보관 기록](../archived/operational-decisions-history.md)의 `#<ID 소문자>` 절에 있다. 어느 경로를 고치든 걸리는 결정·Accepted ADR 은 [공용 결정 인덱스](../../.agent/memory/decisions.md)에, 지금의 작업을 제약하지 않는 결정은 [역사 색인](../archived/operational-decisions-index-historical.md)에 있다. 공용·영역·역사 색인은 보관 원문의 DEC 를 겹치지 않게 나눠 가지며, 누락·중복과 상태·시행일·supersedes 일치는 Atlas 생성기가 검사한다. 행은 2026-10-24 공용 결정 인덱스에서 옮긴 그대로다(DEC-OPS-381). 표 맨 위의 ADR 행은 어느 경로를 고치든 걸리지는 않는 Accepted ADR 가운데 이 영역에 둔 것이고, ADR ID 가 [ADR 색인](../02-architecture/decisions/README.md)의 키다 — 2026-10-26 공용 결정 인덱스에서 옮긴 그대로다(DEC-OPS-385). 대부분은 집행하는 계약·시험이 다른 영역 경로에도 있으므로 공용 결정 인덱스가 모든 ADR 의 ID·제목을 영역별로 싣는다. ADR 이 어느 경로를 고치든 걸리게 되면 공용 결정 인덱스로 옮긴다.

일반 UI 검토 일정의 현재 처리는 [ADR-0018](../02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)이 DEC-OPS-027 ③·DEC-OPS-087 ②의 달력 기반 기술 차단 부분을 대체한다. 다른 통제와 실제 예외 만료는 유지한다.

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| ADR-0005 | accepted | UI 품질 증거는 digest-derived versioned compact summary와 tracked index로 보존하고 기존 summary를 덮어쓰지 않는다. | 2026-08-21 | - |
| ADR-0015 | accepted | CodeQL SAST의 High/Critical 차단을 CI·릴리스 필수 체크에 연결한다. | 2026-09-09 | - |
| ADR-0018 | accepted | 일반 검토 최신성·기술 계약·기관 승인을 분리한다. 세 프로필 실제 산출물 검증, 명시 소유권 기반 원장·메모리 투영과 무결성, 기관별 실행 artifact 결속을 적용한다. 원본 운영 사실은 upstream 이력이며 기관 승인은 pending에서 시작한다. | 2026-09-14 | DEC-OPS-027 ③·DEC-OPS-087 ②·UI quality 및 E2E duration의 일반 최신성 차단, DEC-OPS-077 ⑤의 축소 프로필 red 허용 기대치 |
| ADR-0021 | accepted | 테스트를 API 계약·사용자 과업·횡단 품질로 재편하고 로컬·CI의 격리 소유권을 검증한다. 전체 E2E와 영향 shadow를 병행한다. | 2026-09-21 | - |
| ADR-0022 | accepted | PR·통합 push의 영향 분류를 통일하고 온라인·이관 build/PIT와 커버리지를 분리한다. Gradle 캐시 provider를 명시한다. | 2026-09-21 | ADR-0021 결정 4의 main 전수 강제·DEC-OPS-104의 PIT 부분집합 조건 |
| ADR-0023 | accepted | PR의 검토된 화면만 E2E spec 선별, main 전수·전체 discovery 대조와 Gradle 단일 writer를 유지한다. | 2026-09-21 | ADR-0021의 E2E shadow·ADR-0022 결정 8 |
| ADR-0024 | accepted | Spring Boot 4.1로 두 단계 전환한다. 1단계는 Jackson 2 호환 모듈로 API 계약을 유지하고 2단계에서 Jackson 3으로 옮긴다. | 2026-09-24 | - |
| ADR-0026 | accepted | backend와 schema 검증을 병렬화하고, 증명된 변경만 재사용 profile을 선별하며 CI 시간을 계측한다. | 2026-09-29 | - |
| ADR-0027 | accepted | 사용자 구성 검증을 분류 직후 시작하고 PR 은 시작 구성마다 한 레이아웃만 검증하며(main 은 두 레이아웃 전수), 생성물의 일반 테스트는 별도 T2 워크플로가 돈다. | 2026-10-12 | ADR-0026 결정 1의 PR 두 layout 부분·결정 10의 custom 입장(custom 두 layout 의 결정 2 는 유지) |
| ADR-0030 | accepted | ADR-0027 이후 승인된 PR 제외 선언과 시작 구성에 덮인 야간 단독 폐포 제거를 후속 ADR로 승격한다. 기존 실행·실패 경계는 유지한다. | 2026-10-13 | ADR-0027 결정 2·4의 해당 부분 |
| ADR-0032 | accepted | 이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다. `sast-scope` 한 슬롯과 대상·판정·집계는 그대로다. | 2026-10-17 | ADR-0026 결정 10의 이관 PIT 한 슬롯 부분 |
| ADR-0037 | accepted | 제품 PIT 는 6슬롯으로 돌고 선언 순서는 실측이 긴 범위 먼저다. 대상·75% 판정·집계는 그대로이고 효과가 없으면 4로 되돌린다. | 2026-10-20 | ADR-0026 결정 9의 제품 PIT 4슬롯 부분 |
| ADR-0044 | accepted | CI 튜닝값(PIT·CodeQL 슬롯 수, PIT 선언 순서)은 ci.yml·실측 profile 이 정본이고 계약은 양의 슬롯 수와 profile 순서만 본다. 바꾸면 PR 설명에 실측 run id 를 남긴다. PIT 하한은 범위별(변이 800개 이상은 실측−5, 최저 75)이고 api-server 의 PIT 선별은 유지한다. | 2026-10-29 | ADR-0026 결정 5·9·10, ADR-0032, ADR-0037 의 슬롯·순서 값 고정과 범위마다 75% |
| DEC-OPS-003 | accepted | 프론트 도구체인은 Node 22+와 pnpm 9를 단일 축으로 사용하고 계약 생성은 offline-first로 한다. | 2026-08-18 | - |
| DEC-OPS-006 | accepted | 하네스의 논리 규칙 ID는 유지하되 발견·실행·품질 하한은 중앙 `gates.json`과 소수 runner/task로 통합한다. | 2026-08-19 | - |
| DEC-OPS-008 | accepted | 조건부 heavy job은 내부 `*-scope`로 두고 브랜치 보호에는 항상 완료되는 안정 aggregate context만 노출한다. | 2026-08-19 | - |
| DEC-OPS-009 | accepted | 단독 운영 기간의 main review policy는 approval 0·code-owner/last-push/thread-resolution 전부 비활성으로 확정하고, 명세·계약을 이 값에 양방향 동결한다. | 2026-08-20 | DEC-OPS-007 |
| DEC-OPS-012 | accepted | UI quality baseline 의 새 authoritative run(r13)과 수동 접근성 48건 수집을 보류하고, r12 를 현재 자동 증거로 유지한 채 UI 개선 작업을 재개한다. | 2026-08-22 | - |
| DEC-OPS-017 | accepted | 파일럿 시각 회귀 기준선을 대시보드·로그인 로그·공통코드·로그인 네 화면으로 확대하고 비결정적 결재함은 제외한다. | 2026-08-23 | - |
| DEC-OPS-019 | accepted | 파생 제품의 여섯 검증 축 기준선 재동결 절차와 diff 검토를 정한다. | 2026-08-24 | - |
| DEC-OPS-020 | accepted | IA acceptanceEvidence를 기관 재검증 의무로 연결하고 개별 승인과 등록된 소비자 아래에서만 사용한다. | 2026-08-24 | - |
| DEC-OPS-027 | accepted | 하네스 실행 경로 강화 다섯 축을 도입한다. | 2026-09-01 | - |
| DEC-OPS-048 | accepted | 고아 도메인 ISG(인터넷 서비스 안내)를 배선하고, 같은 사각을 닫는 게이트를 신설한다. | 2026-09-07 | - |
| DEC-OPS-050 | accepted | `operation-consumer-census` 가 증명하는 범위를 정확히 한정한다. | 2026-09-07 | DEC-OPS-048 의 census 보증 범위 서술만 한정(게이트 자체는 유지) |
| DEC-OPS-051 | accepted | `operation-consumer-census` 에 축 2(서비스 메서드 → 화면 도달성)를 신설한다. | 2026-09-07 | DEC-OPS-050 의 "축 2 는 별도 게이트가 필요하다" 를 종료 |
| DEC-OPS-053 | accepted | 죽은 `IsmAdminService` 를 걷고, 그로 인해 드러난 표면을 `superseded-surface` 카테고리로 기록한다 | 2026-09-07 | - |
| DEC-OPS-075 | accepted | CodeQL 오탐 7건을 소스·방어 해시, 정확한 탐지 위치, 만료일에 묶어 한정 예외로 등록한다. | 2026-09-09 | — |
| DEC-OPS-078 | accepted | 업무 화면 문법 §A3-1(폼 그릇 규칙)에 집행 게이트를 신설한다. | 2026-09-12 | - |
| DEC-OPS-081 | accepted | "생산 코드는 page-redirect 라우트를 가리키지 않는다" 를 route census 파생 일반 게이트로 승격한다. | 2026-09-12 | DEC-OPS-079 의 4라우트 전용 가드를 대체 |
| DEC-OPS-086 | accepted | 런타임 의존성 두 축의 동작을 계약으로 고정하고, 그 계약으로 dependabot major 2건을 판정한다. | 2026-09-13 | - |
| DEC-OPS-087 | accepted | 조용히 실패하던 세 경로를 계약으로 닫는다 | 2026-09-13 | - |
| DEC-OPS-089 | accepted | 개인정보 접근 census 의 판정 원장을 소스 밖으로 옮기고 항목마다 소유 pack 을 적는다 | 2026-09-13 | - |
| DEC-OPS-090 | accepted | 남은 횡단 게이트 둘을 원장 방식으로 되살리고, 생성기의 Java 의존 판정을 코드 기준으로 고친다 | 2026-09-14 | - |
| DEC-OPS-093 | accepted | 부하 테스트는 정확성과 지연을 따로 판정한다. | 2026-09-14 | - |
| DEC-OPS-101 | accepted | Contract 마이그레이션은 선행 Expand의 배포·관측 기록을 요구한다. | 2026-09-16 | - |
| DEC-OPS-103 | accepted | 릴리스 이미지를 GHCR 로 발행한다. | 2026-09-16 | W0-11 의 `packages:write` 제거 |
| DEC-OPS-104 | accepted | 이관 도구 뮤테이션을 전용 잡으로 분리한다. | 2026-09-16 | - |
| DEC-OPS-107 | accepted | 원본에서 만들 수 없는 증거 의무를 기관 채택 수명으로 이전한다. | 2026-09-21 | GAP-OPS-002·GAP-SEC-001·GAP-DATA-001·GAP-AUTH-003 의 활성 gap 지위 |
| DEC-OPS-108 | accepted | 브랜치 보호 명세에 `requireExtraApprovalForUnattributedChanges` 를 넣고, 명세가 모르는 pull request 파라미터를 red 로 잡는다. | 2026-09-21 | - |
| DEC-OPS-111 | accepted | 운영 환경 없이 만들 수 없는 증거 3건을 기관 채택 수명으로 이전한다. | 2026-09-23 | GAP-SEC-003·GAP-STORAGE-001·GAP-OPS-001 의 활성 gap 지위 |
| DEC-OPS-113 | accepted | ZAP 주간 스캔 경고 11건을 전수 분류하고 수리 3건을 적용한다. | 2026-09-23 | - |
| DEC-OPS-115 | accepted | route capability 동결과 커밋된 원장을 양방향으로 대조하고, 그 대조가 드러낸 낡은 판정 2건을 고친다. | 2026-09-23 | - |
| DEC-OPS-125 | accepted | Boot 4 전환 후속을 정리한다. | 2026-09-24 | GAP-DEP-002 종료 |
| DEC-OPS-126 | accepted | 주간 ZAP 이 OpenAPI 로 API 전체를 로그인한 상태로 스캔한다. | 2026-09-24 | - |
| DEC-OPS-146 | accepted | 생성 응답을 손으로 쓴 타입으로 다룰 때 서버가 보내지 않는 필드를 선언하지 못하게 한다(DIP V10). | 2026-09-26 | - |
| DEC-OPS-178 | accepted | 승인된 후속 3건을 적용한다(2026-09-27 사용자 승인). | 2026-09-27 | GAP-BOARD-001·GAP-CI-001 종료 |
| DEC-OPS-182 | accepted | 재배포가 제한된 Anthropic 스킬 4개(`docx`·`pdf`·`pptx`·`xlsx`, 186파일)를 원본 저장소에서 걷는다(2026-09-30 사용자 승인). | 2026-09-30 | - |
| DEC-OPS-183 | accepted | main push 의 변경 범위는 직전 main SHA 가 자기 main CI 실행을 가졌을 때만 diff 로 좁힌다. | 2026-09-30 | - |
| DEC-OPS-191 | accepted | 2MB 한글 글꼴을 미리 불러오지 않고, 라우트별 preload 글꼴 바이트를 예산으로 막는다. | 2026-10-01 | - |
| DEC-OPS-216 | accepted | 프런트 의존성 감사는 운영 여부를 `pnpm audit --prod` 보고서로 판정한다. | 2026-10-03 | - |
| DEC-OPS-232 | accepted | 화면 기능 동결 목록을 원장 쪽으로도 대조하고, 걷은 마이페이지 화면의 낡은 항목을 지운다. | 2026-10-05 | DEC-OPS-115 의 대조 범위 서술 |
| DEC-OPS-233 | accepted | V2_127 한 건만 무중단 관측 기간 없이 선행 Expand 와 같은 릴리스에 싣는다(2026-10-05 사용자 승인 — "이번만 내 승인하에 규칙을 무시하고 내가 명령한 작업을 진행해"). | 2026-10-05 | DEC-OPS-101 의 관측 기간 요구 중 이 한 건 |
| DEC-OPS-237 | accepted | 2026-10-07 Dependabot 배치를 한 PR 로 적용한다. | 2026-10-07 | ADR-0022 결정 7의 v6.3.0 commit 지정 부분, dependabot.yml 의 붉은 wrapper PR 유지 방침 |
| DEC-OPS-261 | accepted | 메뉴·별칭·화면 코드·백엔드 문자열이 `?tab=` 으로 여는 값을 그 허브의 탭 해석과 대조한다(Phase 2, 슬롯 도입 전 census 범위 확장). | 2026-10-10 | - |
| DEC-OPS-282 | accepted | 재사용 생성 검증의 입장 순서와 PR 레이아웃을 바꾼다(ADR-0027, CI 비용 축소 1차). | 2026-10-12 | ADR-0026 결정 1의 PR 두 레이아웃 부분·결정 10의 custom 입장(결정 2 는 유지), DEC-OPS-180·CTX-021 의 'custom 2개는 backend 뒤' |
| DEC-OPS-283 | accepted | 재사용 생성물의 일반 테스트를 별도 워크플로로 돌린다(ADR-0027, T2). | 2026-10-12 | - |
| DEC-OPS-296 | accepted | 새 인증 시작 구성은 PR CI 에서 빼고 main 두 레이아웃과 T2 에서만 돈다(U15, Phase 2 CI 2차-a). | 2026-10-13 | ADR-0027 결정 2 의 'PR 은 시작 구성마다 한 레이아웃' 중 `ci.pr` 이 null 인 시작 구성 |
| DEC-OPS-297 | accepted | 생성기·도구 전용 경로만 바꾼 변경은 이관·PIT·frontend 를 돌리지 않고, 남길 축은 그 경로를 읽는 시험에서 계산한다(Phase 2 CI 2차-b, C11). | 2026-10-13 | - |
| DEC-OPS-298 | accepted | T2 야간 검증을 매일 06:17 KST 에 예약 실행하고 계약 재생성 대조를 기본으로 켠다(Phase 2 B8, U20). | 2026-10-13 | - |
| DEC-OPS-301 | accepted | T2 계획은 시작 구성과 기능 목록이 같은 단독 폐포를 돌지 않는다(Phase 2 마무리 검토). | 2026-10-13 | ADR-0027 결정 4·DEC-OPS-283 ① 의 '서로 다른 단독 폐포' 가운데 시작 구성과 같은 목록, DEC-OPS-295 의 '31잡', DEC-OPS-297 의 '생성기 화면만 바꾸면 재사용·E2E 만 돈다' |
| DEC-OPS-335 | accepted | 계약·하네스의 반복 실행 비용과 중복 판정을 줄이고 검사 모집단·단언은 유지한다(코덱스 작업분과 보완). | 2026-10-17 | DEC-OPS-264 ①·DEC-OPS-290 ④ 의 시작 구성 승인 exact 대조 소유(pack-tagged-registry → 정밀 점검 동치 계약), DEC-OPS-090 ⑤ 의 pack-tagged-registry.test.mjs Java 승인 exact 소유(투영본 분기는 남는다) |
| DEC-OPS-336 | accepted | Atlas 도구와 operation 소비 원장을 생성기·도구 전용 경로 표에 넣는다(DEC-OPS-297 확장). | 2026-10-17 | 범위 분류 회귀 시험이 Atlas 도구 셋을 미분류 전수로 고정하던 부분(Atlas 도입 2026-09-10) |
| DEC-OPS-337 | accepted | 이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다(ADR-0032). | 2026-10-17 | ADR-0026 결정 10 의 `mutation-scope-migration` `max-parallel: 1` 부분 |
| DEC-OPS-338 | accepted | 로컬 검증은 정적 검사를 운영 계약보다 먼저 돌리고 명시한 TZ 를 따르며, verify binding 은 범위 분기에서 닿는 줄이어야 한다. | 2026-10-17 | - |
| DEC-OPS-344 | accepted | CI 의 cross-stack 계약은 frontend 축이 켜지면 커버리지 전체 스위트가 소유하고, 커버리지 분모에 queries·extensions 를 넣으며, 화면 목록 생성기는 레이아웃 셸 제거를 원장 근거로만 받는다. | 2026-10-18 | ci.yml 주석의 "몇십 초 중복이 증거를 잃는 것보다 싸다" 판단 |
| DEC-OPS-364 | accepted | 운영 계약 비용을 실측하고, 문서 전용 푸시의 계약 범위를 줄이지 않는다(투영 시험이 문서 트리를 입력으로 쓴다). | 2026-10-19 | - |
| DEC-OPS-366 | accepted | PIT 범위를 제품 13개로 넓힌다 — 설문·참여(커뮤니티·메모 보고·일정)·사용자/조직을 더하고 설문 결과를 설문 범위로 옮긴다. | 2026-10-19 | - |
| DEC-OPS-369 | accepted | 프런트 커버리지 하한을 CI 실측의 정수 내림에서 1포인트 여유를 둔 85/79/82/87로 올린다(종전 71/63/64/73). | 2026-10-19 | - |
| DEC-OPS-373 | accepted | 1단계 배치: 검증 신호 앞당김(Atlas 버전·액션 핀 사본 제거, 시험의 원장 수 재진술 검출, CodeQL 근사, 통합 점검 명령, PIT 6슬롯·범위 둘 추가, 스키마 검증 플레이크), 얇은 도메인 보강(팝업 대화상자, 포상 수상자 검사, 업무 홈 조각·관리자 운영 신호, 통계 시계열 일원화, 공통코드 사용처, 감사 원장 사유 내보내기)(2026-10-20 사용자 지시). | 2026-10-20 | ADR-0026 결정 9 의 제품 PIT `max-parallel: 4`(ADR-0037), DEC-OPS-281 ⑤ 의 "대시보드→알림은 화면 의존", DEC-OPS-276 ③ 의 미수집 축 요약 칸 `summary`, 공통코드 조회의 인스턴스 로컬 캐시(DEC 없음) |
| DEC-OPS-384 | accepted | 릴리스는 직전 발행 릴리스(main first-parent 위의 GitHub Release, 없으면 이 규칙이 들어온 커밋) 이후 main 커밋마다 실패·취소·판정 없음·진행 중인 main 실행이 남지 않을 때만 나간다. 해소는 성공한 재실행이나 그 뒤의 성공한 main 수동(전수) 실행이다(2026-10-26 사용자 결정 — 선택지 D). main push 의 비교 기준은 그 커밋을 판정한 실행만 인정한다. | 2026-10-26 | DEC-OPS-183 의 '취소되지 않은 실행이면 있음으로 본다' 가운데 판정 없이 끝난 결론 |
| DEC-OPS-388 | accepted | 방법론·하네스 감사 후속 배치를 한 결정으로 묶는다(2026-10-28 사용자 승인, 결정 위임 2026-10-29). ① 예약 워크플로가 두 번 연속 비성공이면 green 까지 known-gaps 행이나 같은 추적 기록을 두고, 주간 거버넌스 검토 잡에만 `actions: read` 를 줘 연속 실패 표를 요약에 싣는다. ② 주간 ZAP 은 OpenAPI 사본에서 세션을 끝내는 연산(`POST /api/v1/auth/logout`)만 빼고 스캔하며 세션 확인 단계는 그대로다. ③ pre-push·verify fast/push 는 짧은 결정적 단계(불변식·원문 계약·하네스)를 운영 계약 앞에 두고, `regen --check` 가 손으로 고치는 원장 확인을 함께 돈다. ④ CI 가 내려받아 실행하는 gitleaks 는 고정 SHA-256 을 확인한 뒤 푼다. ⑤ 실행 전 가드는 판정 실패를 규칙 id·오류 이름만 남기고 통과시키며, `echo AGENT_GUARD_CANARY` 로 어댑터 생존을 확인하고, 작업 트리 재귀 삭제를 묻는다. ⑥ 문서 전용 push 범위(DEC-OPS-364)·커밋하는 Atlas(DEC-OPS-335)·정확값 원장(DEC-OPS-371 ②)은 유지하고, 공유 OCI 적용 기록만 담는 PR 은 다음 작업 PR 에 싣거나 하루치를 묶는다. ⑦ 게시글 비밀 여부 NULL 은 응답에서 'N' 으로 내고 새 글은 'N' 으로 저장하며 기존 행은 보정하지 않는다. | 2026-10-29 | DEC-OPS-126 의 'API 전체' 가운데 세션 종료 연산, DEC-OPS-338 ① 의 소스 경로에서 불변식·원문 계약·하네스를 운영 계약 뒤에 두던 순서 |

DEC-OPS-104의 전용 이관 PIT 잡·실패 집계 결정은 유지한다. 당시 `mutationMigrationTool`이 `mutation`의 부분집합이어야 한다는 조건만 [ADR-0022](../02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md)가 독립 선택으로 대체한다.
