# 운영 결정 영역 색인 — 프로젝트 생성기·재사용 투영

> 상태: 영역 결정 색인 — 이 저장소(원본)에서 프로젝트 생성기·기능 소유·슬롯·재사용 투영 경로를 고칠 때 읽는 Accepted ADR·운영 결정의 짧은 색인이다. 에이전트 진입점이 자동으로 읽지 않으며, 읽는 조건은 [공용 결정 인덱스](../../.agent/memory/decisions.md)의 「영역 결정 색인」 표가 정한다. 생성물(재사용 base·이관 제품)에 복사된 이 파일은 upstream 이력이며 도입 기관의 현재 결정이 아니다.

ID가 보관 원문의 앵커다: 운영 결정 행의 전문·이유·승인 근거는 [보관 기록](../archived/operational-decisions-history.md)의 `#<ID 소문자>` 절에 있다. 어느 경로를 고치든 걸리는 결정·Accepted ADR 은 [공용 결정 인덱스](../../.agent/memory/decisions.md)에, 지금의 작업을 제약하지 않는 결정은 [역사 색인](../archived/operational-decisions-index-historical.md)에 있다. 공용·영역·역사 색인은 보관 원문의 DEC 를 겹치지 않게 나눠 가지며, 누락·중복과 상태·시행일·supersedes 일치는 Atlas 생성기가 검사한다. 행은 2026-10-24 공용 결정 인덱스에서 옮긴 그대로다(DEC-OPS-381). 표 맨 위의 ADR 행은 어느 경로를 고치든 걸리지는 않는 Accepted ADR 가운데 이 영역에 둔 것이고, ADR ID 가 [ADR 색인](../02-architecture/decisions/README.md)의 키다 — 2026-10-26 공용 결정 인덱스에서 옮긴 그대로다(DEC-OPS-385). 대부분은 집행하는 계약·시험이 다른 영역 경로에도 있으므로 공용 결정 인덱스가 모든 ADR 의 ID·제목을 영역별로 싣는다. ADR 이 어느 경로를 고치든 걸리게 되면 공용 결정 인덱스로 옮긴다.

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| ADR-0020 | accepted | 원본 모듈 구조를 유지하며 생성 백엔드의 멀티모듈·단일모듈 출력을 선택한다. 단일 출력도 논리 소스 그룹·검증 경계와 오프라인 이관 책임을 보존한다. | 2026-09-19 | - (ADR-0001 출력 형태 보완) |
| ADR-0028 | accepted | 시작 구성은 `config/modules/presets.json` 의 이름 붙은 기능 목록이고, 같은 목록은 시작 구성으로 고르든 직접 고르든 같은 해석 결과와 소스 투영(Java·프런트·게이트·규칙 제거)을 낸다. pack·rank 는 없고, 계약이 시작 구성마다 대조하며 시작 구성 기대치(게이트·Java 연쇄·규칙)는 exact 목록이다. | 2026-10-13 | ADR-0001 결정의 '세 프로필 중 하나 선택'·manifest SSOT 문장, ADR-0020 결정 5·검증과 후속 범위의 '누적 프로필' 표현 |
| ADR-0047 | accepted | 다중 DB 는 PostgreSQL 단일 정본과 벤더 어댑터로 만들고, 앱 SQL 은 포트·린터로 경계를 둔다. | 2026-10-31 | ADR-0020 결정 5 의 PostgreSQL 범위 |
| DEC-OPS-076 | accepted | 재사용 base 투영에서 거버넌스 게이트가 조용히 사라지는 경로를 닫는다 | 2026-09-12 | - |
| DEC-OPS-077 | accepted | 재사용 base 산출물의 하네스 검증을 실측 기준으로 세운다. | 2026-09-12 | - |
| DEC-OPS-088 | accepted | 모든 프로필에 남는 화면이 빠진 pack 을 부르거나 가리키지 않게 한다 | 2026-09-13 | - |
| DEC-OPS-238 | accepted | 프로젝트 생성기의 모듈 선택 결함을 닫는다(Phase 0). | 2026-10-07 | - |
| DEC-OPS-239 | accepted | 재사용 base 생성의 진입 경로를 하나로 합친다(Phase 0b). | 2026-10-08 | ADR-0020 결정 5의 "레이아웃만 다르면 같은 DB 번들 재사용" 절차 부분 |
| DEC-OPS-240 | accepted | 통계를 Core로 옮기고 프로젝트 생성기의 선택 기능에서 뺀다(Phase 0c). | 2026-10-08 | DEC-OPS-085 의 통계 표면 demo 귀속과 `ReportStatsService` 대역 경계 부분(pack 분리 원칙은 유지) |
| DEC-OPS-242 | accepted | 선택 연동 선언과 기능 저하·미배정 권한 안내를 계획에 싣는다(Phase 1-2, B4·B8). | 2026-10-08 | - |
| DEC-OPS-243 | accepted | 자동 포함 사유를 사용자 말과 경로로 보인다(Phase 1-3, E2). | 2026-10-08 | - |
| DEC-OPS-244 | accepted | 생성기 기능 카드를 업무 영역으로 묶어 찾게 하고, 화면 문구를 카탈로그 해시 밖으로 옮긴다(Phase 1-4, E3·E9). | 2026-10-09 | - |
| DEC-OPS-245 | accepted | 구성 차이를 계획 단계에서 미리 보인다(Phase 1-5a, 설계서 10장·E3). | 2026-10-09 | - |
| DEC-OPS-246 | accepted | 생성하기 전에 이 컴퓨터의 생성 환경을 점검하고 최종 확인을 거친다(Phase 1-5b, 설계서 14·19장, E5). | 2026-10-09 | - |
| DEC-OPS-247 | accepted | 생성 전에 소스 투영을 정밀 점검한다(Phase 1-5c, 설계서 10장 plan/deep, C3). | 2026-10-09 | - |
| DEC-OPS-248 | accepted | 계획·점검 요청의 실패를 코드로 나눠 다음 행동을 보인다(Phase 1 E4a, 설계서 14.2). | 2026-10-09 | - |
| DEC-OPS-249 | accepted | 생성 작업 실패를 생긴 지점에서 코드로 나눠 다음 행동을 보인다(Phase 1 E4b, 설계서 14.2). | 2026-10-09 | 생성기 가이드의 '화면에 자식 출력 원문을 보내지 않는다'(DEC-OPS-238 ⑤와 함께 정함) 가운데 검증 단계 로그 끝부분 |
| DEC-OPS-250 | accepted | 생성 작업의 진행을 단계 타임라인으로 보이고, 남은 시간은 실제 작업 이력으로만 말한다(Phase 1 E6a, 설계서 14.3·20장). | 2026-10-09 | - |
| DEC-OPS-251 | accepted | 진행 중인 생성을 취소하고, 남은 임시 자원은 다음 기동에 정리한다(Phase 1 E6b, 설계서 14.3). | 2026-10-10 | - |
| DEC-OPS-252 | accepted | 자동 포함 카드를 키보드로 닿게 하고 바뀐 자동 포함을 한 번 알린다(Phase 1 E7, 설계서 14.1). | 2026-10-10 | - |
| DEC-OPS-253 | accepted | 계획의 메뉴를 원본 계층의 트리로 보이고 공통 기반 대비 추가를 표시한다(Phase 1 E8, 설계서 시안 S2). | 2026-10-10 | - |
| DEC-OPS-254 | accepted | 저장한 구성을 불러오고, 넓은 화면에서 요약과 버튼을 고정한다(Phase 1 E9, 설계서 시안 S1·21장). | 2026-10-10 | - |
| DEC-OPS-256 | accepted | 모듈 선택 고도화 Phase 2 의 결정 여섯 가지를 권고안대로 정한다(설계서 16.1). | 2026-10-10 | - |
| DEC-OPS-257 | accepted | 생성물에서 처음부터 붉은 백엔드 검사를 기능 소유로 나누고, 모집단 하한은 core 에서도 성립하는 값으로 둔다(Phase 2 D6 1차). | 2026-10-10 | - |
| DEC-OPS-258 | accepted | 생성기가 투영으로 지운 파일을 원장에 남기고, 프런트 계약은 그 원장으로 기능 파일을 거른다(Phase 2 D6 2차). | 2026-10-10 | - |
| DEC-OPS-259 | accepted | 생성물의 프런트 총계·허용 목록·예시를 투영 원장으로 거른다(Phase 2 D6 3·4차). | 2026-10-10 | - |
| DEC-OPS-262 | accepted | 생성물 DB 번들에 선택한 기능 몫의 참조 데이터를 싣는다(Phase 2, 설계서 B5). | 2026-10-10 | - |
| DEC-OPS-263 | accepted | 생성물의 이관 카탈로그를 구성 스키마로 다시 쓴다(Phase 2 B12). | 2026-10-10 | - |
| DEC-OPS-264 | accepted | 연쇄 제거를 기록하고 프런트 두 판정의 동치를 잰다(Phase 2, 설계서 C4·C5). | 2026-10-11 | - |
| DEC-OPS-265 | accepted | 연쇄 뒤 남는 화면을 구성의 기대값과 양방향으로 대조한다(슬롯 단계 PR-1, 설계서 11장). | 2026-10-11 | - |
| DEC-OPS-266 | accepted | 프런트 마커 투영과 import 연쇄를 한 판정으로 모은다(슬롯 단계 PR-2, 설계서 C5). | 2026-10-11 | DEC-OPS-088 ④의 주석 인용 금지와 ⑤의 원문 가드, DEC-OPS-264 ②, DEC-OPS-265 ③의 동치 시험 근거 |
| DEC-OPS-267 | accepted | 기능이 화면에 끼우는 조각을 슬롯으로 두고, 첫 기여로 수신자 피커의 주소록 출처를 옮긴다(슬롯 단계 PR-4, 설계서 11장). | 2026-10-11 | - |
| DEC-OPS-269 | accepted | 게시글 상세의 스크랩 버튼을 스크랩 기능의 `post-actions` 슬롯 기여로 옮기고, 쓰기 권한 census 가 슬롯 기여의 쓰기를 그 기여를 여는 화면에 귀속하게 넓힌다(Phase 2 스크랩 슬롯 S2). | 2026-10-12 | - |
| DEC-OPS-271 | accepted | 수동 도메인 삭제의 동반 삭제를 카탈로그 간선의 역방향 폐포로 정한다(Phase 2 간선 제거 E1). | 2026-10-12 | delete-domain.ps1 의 manifest clusters 동반 삭제 규칙 |
| DEC-OPS-273 | accepted | 시스템·운영 묶음을 기능 다섯으로 나눈다(DEC-OPS-256 ① 이행). | 2026-10-12 | DEC-OPS-244 ①의 업무 영역 4개 |
| DEC-OPS-274 | accepted | 협업 허브를 core 셸과 쪽지·스크랩 탭 기여로 나눈다(Phase 2 허브 분해 H1·H3). | 2026-10-12 | DEC-OPS-272 의 명령 센터 바로가기 소유 부분, DEC-OPS-088 ③의 협업 허브 주소록 마커 부분 |
| DEC-OPS-275 | accepted | 지식 허브를 게시판 셸과 커뮤니티 탭 기여로 나눈다(Phase 2 허브 분해 H2). | 2026-10-12 | - |
| DEC-OPS-276 | accepted | 통계 셸의 게시판·설문 탭과 요약 칸을 `stats-panels` 기여로 옮긴다(Phase 2 허브 분해 H4). | 2026-10-12 | - |
| DEC-OPS-278 | accepted | 감시 허브의 댓글 탭을 걷고 `/admin/system/comments` 를 댓글 기능의 독립 화면으로 둔다(Phase 2 허브 분해 H6, 안 B). | 2026-10-12 | 설계서 11장 슬롯 표의 '댓글(hub.tabs.monitoring)' 귀속 |
| DEC-OPS-279 | accepted | 나의 업무 허브를 core 셸과 링크 기여로 나눈다(Phase 2 업무 허브 분해 W1). | 2026-10-12 | - |
| DEC-OPS-280 | accepted | 커뮤니티 후속: api-server 기능 참조를 간선으로 세고, 게시글 모아보기를 게시판 소유로, 커뮤니티→템플릿을 선택 포트로 바꾼다(Phase 2 C). | 2026-10-12 | DEC-OPS-271 의 '템플릿을 지우면 커뮤니티도 지운다' |
| DEC-OPS-281 | accepted | 업무 홈을 core 셸과 기능의 홈 조각으로 나눈다(Phase 2 9단계). | 2026-10-12 | DEC-OPS-272 의 '대시보드 묶음은 그대로다' 부분, DEC-OPS-088 ②의 업무 홈 마커 배치 부분 |
| DEC-OPS-284 | accepted | 슬롯 노출 술어를 화면 목록의 표시 권한으로 귀속한다(Phase 2 10단계 10a). | 2026-10-12 | GAP-COMPOSE-001 의 술어 귀속 문장, DEC-OPS-268 ③·DEC-OPS-277 ③ 의 화면 목록 미귀속 서술 |
| DEC-OPS-285 | accepted | 시작 구성은 이름 붙은 기능 목록이고 같은 목록은 같은 결과를 낸다(ADR-0028, Phase 2 10단계 13a). | 2026-10-13 | DEC-OPS-265 의 'core 에 남는 비화면 파일은 preset 통합 몫' |
| DEC-OPS-286 | accepted | 생성물의 API 계약 사슬을 구성으로 다시 만든다(Phase 2 10c-2, U5-A). | 2026-10-13 | - |
| DEC-OPS-287 | accepted | 생성물의 권한 정의·바인딩·묶음·화면 목록을 구성으로 함께 투영한다(Phase 2 10단계 10b-2, 설계서 12.3). | 2026-10-13 | - |
| DEC-OPS-288 | accepted | 기능 선언을 매니페스트 v2(`config/modules`)로 옮기고, 카탈로그가 그것을 읽으며 시작 구성을 직접 선택과 같은 해석기로 푼다(Phase 2 11단계 C1·C2). | 2026-10-13 | - |
| DEC-OPS-289 | accepted | 생성기 투영을 매니페스트 v2 의 기능 소유로 옮기고 pack·순위를 걷는다(Phase 2 11단계 C3). | 2026-10-13 | DEC-OPS-288 ④의 'C3·B5 전까지 pack 투영' |
| DEC-OPS-290 | accepted | 횡단 게이트 원장 셋의 pack 태그를 걷고, 남고 빠지는 기대를 기능 소유에서 계산해 시작 구성마다 생성기 계획과 대조한다(Phase 2 11단계 C4). | 2026-10-13 | DEC-OPS-089·090 의 pack 태그 판정, DEC-OPS-289 ⑤ 의 C4 몫 |
| DEC-OPS-291 | accepted | 관찰자도 기능 소유와 시작 구성으로 판정하고 카탈로그·구성·lock 의 pack 축을 걷는다(Phase 2 11단계 C5). | 2026-10-13 | DEC-OPS-282 ②의 레이아웃 표 위치(분류기 상수), DEC-OPS-289 ⑤ 의 C5 몫(관찰자·검토 범위·lock 의 pack 축) |
| DEC-OPS-292 | accepted | 프런트 마커 토큰을 기능 id 로 바꾸고 마커 선언을 기능 파일로 옮긴다(Phase 2 11단계 C6). | 2026-10-13 | DEC-OPS-266 ①의 소유 표(`FRONTEND_MARKER_FILES`), DEC-OPS-088 ④의 순위 하향 의존 규칙 |
| DEC-OPS-293 | accepted | 스크립트가 시작 구성 이름을 열거하지 않고 presets.json 에서 읽는다(Phase 2 11단계 C8). | 2026-10-13 | - |
| DEC-OPS-294 | accepted | 매니페스트 v2 전환을 마친다 — 기능 소유의 원천은 `config/modules` 하나다(Phase 2 11단계 C7). | 2026-10-13 | DEC-OPS-288 ①의 C7 전까지 v1 에서 생성, DEC-OPS-243 ①·244 ①·264 ① 의 정본 위치(사유 표·표시 문구 모듈·`profiles.<name>.acknowledgedJavaCascade` → 기능 파일의 `requires[].userReason`·`presentation`·presets.json 의 `expected.javaCascade`) |
| DEC-OPS-295 | accepted | '공통 기반 + 설문'·'공통 기반 + 결재' 를 인증 시작 구성으로 둔다(DEC-OPS-256 ③, Phase 2 13b-1). | 2026-10-13 | DEC-OPS-290 ②의 합성 구성 |
| DEC-OPS-300 | accepted | 워크플로우 예시 화면(정적 목업)은 시연 기능이 소유하고, 라우트 원장의 확인된 소유는 투영과 대조한다(Phase 2 마무리 검토). | 2026-10-13 | DEC-OPS-273 의 '프런트 전용 기능은 권한 도메인을 갖지 않는다', 11단계 C5 의 워크플로우 예시 화면 결재 소유 |
| DEC-OPS-327 | accepted | 알림 기능 없이 만든 생성물의 결재·메모 보고 화면은 알린다고 말하지 않는다(GAP-COMPOSE-001). | 2026-10-16 | GAP-COMPOSE-001 의 결재·메모 보고 알림 문구 부분 |
| DEC-OPS-330 | accepted | 권한이 빠진 투영 묶음은 원본 이름·설명을 들고 가지 않는다(GAP-COMPOSE-001). | 2026-10-16 | GAP-COMPOSE-001 의 투영 묶음 이름·설명 부분 |
| DEC-OPS-334 | accepted | 허브 탭 슬롯을 허브마다 나눈다(GAP-SLOT-001 종료). | 2026-10-16 | DEC-OPS-274·275·277·284 의 '`hub-tabs` 슬롯 하나·항목의 `hub` 값으로 허브 구분' 부분 |
| DEC-OPS-339 | accepted | 메뉴 스냅숏 해시는 메뉴 inventory 에 닿을 수 있는 SQL 입력만 담는다(형식 v2). | 2026-10-17 | 메뉴 스냅숏 해시가 모든 migration·seed·인가 Contract SQL 을 입력으로 삼던 부분 |
| DEC-OPS-353 | accepted | 슬롯 기여의 연동 분류를 소비자 종류 선언과 import 그래프로 대조하고, 잘못 적은 registrationOnly 기여를 연동으로 옮긴다(GAP-COMPOSE-001). | 2026-10-18 | DEC-OPS-327 의 알림 전달 채널 기여 registrationOnly 분류 |
