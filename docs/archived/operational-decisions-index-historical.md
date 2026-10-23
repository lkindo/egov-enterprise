# 운영 결정 역사 색인

> 상태: 역사 색인 — 지금의 작업을 따로 제약하지 않는 운영 결정(퇴역·전부 대체·일회성 실행·구현 기록)의 짧은 색인이다. 에이전트 진입점이 자동으로 읽지 않는다.

현재 작업을 제약하는 결정은 [공용 결정 인덱스](../../.agent/memory/decisions.md)에 있다. 두 색인은 보관 원문의 DEC를 겹치지 않게 나눠 가지며, 각 행의 전문·이유·승인 근거는 ID를 앵커로 [보관 원문](operational-decisions-history.md)의 같은 ID 절에 있다. 여기로 옮긴 것은 결정의 효력·승인을 바꾸지 않는다. 상태·결정·시행일·supersedes는 옮기기 전 인덱스 행 그대로이고, 분류와 근거는 2026-10-19 분류안(행마다 보관 원문·후속 결정·현재 코드를 대조)에서 가져왔다. 누락·중복과 보관 원문과의 상태·시행일·supersedes 일치는 Atlas 생성기가 검사한다.

| ID | 상태 | 결정 | 시행일 | supersedes | 분류 | 근거 |
|---|---|---|---|---|---|---|
| DEC-OPS-007 | superseded | main 목표 review policy는 approval 1, code-owner review, last-push approval, thread resolution을 요구하고 stale review 자동 dismiss는 끈다. | 2026-08-19 | - | 대체됨 | 상태 superseded, DEC-OPS-009 가 전부 대체(단독 운영 approval 0). |
| DEC-OPS-014 | accepted | 밀도·구조 토큰 어휘 12종(`--control-h`·`--control-h-sm`·`--cell-px`·`--cell-py`·`--font-size-body`·`--form-gap`·`--page-max-w`·`--page-pad`·`--page-pad-md`·`--page-pad-lg`·`--radius-control`·`--filter-pad`)을 두 브랜드 프로필의 라이트·다크 4개 블록에 신설한다(Phase 1, ERP 전환 마스터플랜 D2 — 마스터플랜 정본 문서는 아직 저장소 미반영이라 링크하지 않는다). | 2026-08-23 | - | 구현 기록 | 토큰 신설 1회 구현. 결과는 premium.css·krds-aligned.css 와 theme-token-contract 가 유지. |
| DEC-OPS-018 | accepted | 설문·투표를 재사용 선택 기능으로 분리하고 투영과 검증을 연결한다. | 2026-08-24 | - | 구현 기록 | 패키지 이동은 1회 구현, pack·rank 축은 DEC-OPS-289·291 이 걷음(기능 소유는 config/modules). |
| DEC-OPS-021 | accepted | main 지정 커밋에 첫 릴리스 v0.1.0을 부여하고 세 프로필 산출물을 생성한다. 외부 발행은 별도 승인이다. | 2026-08-24 | - | 일회성 실행 | 릴리스 태그·산출물 1회 생성 기록. |
| DEC-OPS-024 | accepted | `/admin/security/login-policy` 의 config redirect 를 제거해 로그인 정책 화면을 정본 경로로 복원한다. | 2026-08-27 | DEC-OPS-023 ① 의 login-policy 예외만 무효화(규칙 자체는 유지) | 구현 기록 | 경로 복원 1회. 결과는 next.config·route capabilities census 가 유지. |
| DEC-OPS-025 | accepted | ADR-0007의 2026-08-23 G1 워크숍과 참조-기본 IA 승인으로 DEC-OPS-013의 **G1 날짜 보류·T0 미성립·SLA 미개시 부분만** 종료한다. | 2026-08-31 | DEC-OPS-013의 G1 날짜·T0 보류 부분만 종료(owner·PR 채널은 유지) | 일회성 실행 | ADR-0007 승인에 따른 상태 종료 기록. 남는 owner 지명·PR 채널은 DEC-OPS-013 이 보유. |
| DEC-OPS-033 | accepted | 쪽지함과 결재함에 서버 페이징을 연결하고 페이지 이동 시 선택·오류를 초기화한다. | 2026-09-05 | - | 구현 기록 | 화면 배선 1회. NotePage.validation·ApprovalHubClient.actions 시험이 결과 유지. |
| DEC-OPS-036 | accepted | 외부인사·포상·템플릿의 수정·삭제 API와 화면을 연결한다. | 2026-09-05 | - | 구현 기록 | 정정 경로 배선 1회. 템플릿 참조 차단 부분은 DEC-OPS-047 대체, 포상 승인 표면은 DEC-OPS-367 이 걷음. |
| DEC-OPS-037 | accepted | 업무함과 커뮤니티에 관리 화면을 연결한다. | 2026-09-06 | - | 구현 기록 | 다이얼로그 배선 1회, 역할 판정은 ADR-0016 대체. DeptJobBoxManageDialog·CommunityManageDialog 시험이 유지. |
| DEC-OPS-039 | accepted | ISM을 결재함에 통합하는 제안과 업무 어휘를 정리한다. | 2026-09-06 | - | 대체됨 | 제안은 DEC-OPS-040 이 승인으로 종료, ISM 화면·API 는 DEC-OPS-040·348(ADR-0034)로 걷힘. |
| DEC-OPS-040 | accepted | 도메인 감사에서 남긴 disposition 제안 11건을 사용자 위임에 따른 개별 승인으로 확정한다. | 2026-09-06 | DEC-OPS-039 의 overlay 제안(proposed)을 승인으로 종료 | 일회성 실행 | route별 처분 승인 1회 기록, 승인 레코드는 overlay 가 보유. /admin/system/audit 등은 DEC-OPS-350 이 재정리. |
| DEC-OPS-041 | accepted | 중복 온라인 투표 API를 제거하고 기존 Poll API로 소비자를 통합한다. | 2026-09-06 | - | 구현 기록 | 중복 API 1회 제거. PollApiController·PollUserService 가 결과 유지. |
| DEC-OPS-045 | accepted | 감사 잔여 소규모 정정 두 건을 사용자 승인으로 반영한다. | 2026-09-06 | - | 구현 기록 | 1회 정정. compose 전달 일반 규칙은 DEC-OPS-087 deploy-env-forwarding-contract 가 맡음. |
| DEC-OPS-052 | accepted | server action 의 생성 실행기 직접 호출을 서비스 위임으로 통일한다 | 2026-09-07 | - | 구현 기록 | promotionActions 리팩터링 1회. boardActions 는 직접 호출을 유지해 일반 규칙으로 집행되지 않음. |
| DEC-OPS-054 | accepted | 축 2 의 화면 소비 판정에 직접 호출 형태를 편입한다. | 2026-09-07 | DEC-OPS-051·053 이 보고한 화면 고아 수치를 정정(게이트 설계는 유지) | 구현 기록 | 판정기 보정 1회, operation-consumer-census.test.mjs 가 결과 유지. |
| DEC-OPS-055 | accepted | `BoardUserService` 의 대체된 4메서드(`getPost`·`createPost`·`updatePost`·`deletePost`)를 걷는다 | 2026-09-07 | - | 구현 기록 | 죽은 두 번째 경로 1회 제거. |
| DEC-OPS-056 | accepted | 중복 구현 파일 `services/foundation/security/SecurityAdminService.ts` 를 통째로 걷는다 | 2026-09-07 | - | 구현 기록 | 중복 구현 1회 제거, 정본 services/foundation/system 서비스 유지. |
| DEC-OPS-057 | accepted | `UserAuthorityAdminService.saveUserAuthority`(단수) 편의 래퍼를 걷는다 | 2026-09-07 | - | 구현 기록 | 래퍼 1회 제거. 해당 서비스는 이후 ADR-0016 인가 통합으로 바뀜. |
| DEC-OPS-059 | accepted | 본인 비밀번호 변경을 배선한다 | 2026-09-08 | DEC-OPS-032 가 열지 않은 본인 변경 경로를 보완(관리자 초기화 결정은 유지) | 구현 기록 | 배선 1회. 변경 뒤 토큰 처리 규칙은 DEC-OPS-091·094 가 보유. ChangePasswordForm 시험 유지. |
| DEC-OPS-063 | accepted | 만족도 수정을 배선한다 | 2026-09-08 | - | 구현 기록 | 배선 1회. 인가 의미는 ADR-0011 이 보유. SatisfactionEditForm 시험 유지. |
| DEC-OPS-064 | accepted | 만족도 관리자 대리 삭제를 배선한다 | 2026-09-08 | - | 대체됨 | 역할 판정은 ADR-0016 대체, 나머지는 배선 기록(SatisfactionSection 시험 유지). |
| DEC-OPS-066 | accepted | 로그인 정책 신규 등록 경로를 연다 | 2026-09-08 | - | 구현 기록 | 배선 1회. LoginPolicyAdminClient.behavior 계약 유지. |
| DEC-OPS-067 | accepted | 보안 3화면(권한·롤·그룹)에 일괄 삭제 UI 를 신설한다 | 2026-09-08 | DEC-OPS-062 의 C형(일괄 삭제 UI 부재) 3건을 해소 | 대체됨 | 구 권한·롤 UI 는 ADR-0016 이 대체, 구 롤 API 는 DEC-OPS-347(ADR-0034)이 걷음. |
| DEC-OPS-068 | accepted | 로그인 정책 해제(삭제)를 배선하고, DEC-OPS-062 가 `deleteLoginPolicy` 를 "대체된 표면" 으로 본 판정을 정정한다 | 2026-09-08 | DEC-OPS-062 의 B형 판정 중 `deleteLoginPolicy` 1건만 정정(나머지 2건은 유지) | 구현 기록 | 배선 1회. LoginPolicyAdminClient 해제 계약 유지. |
| DEC-OPS-070 | accepted | 설문 응답자·마이페이지 콘텐츠 두 표면을 걷는다 | 2026-09-08 | PD-SRVY-001·PD-MYPG-001 종료 | 퇴역 | 표면 제거 완료, 마이페이지 콘텐츠 테이블도 DEC-OPS-231 이 폐기. |
| DEC-OPS-073 | accepted | 블로그 도메인의 전체 제거를 ADR-0012로 확정한다. | 2026-09-08 | DEC-OPS-072의 ⑥ 및 DEC-OPS-047의 블로그 기여자 부분만 종료 | 구현 기록 | 규범 정본은 ADR-0012(accepted). 이 행은 GAP-BLOG-001 종료와 대체 연결 기록. |
| DEC-OPS-074 | accepted | 사용자 요청에 따라 CI/CD에 CodeQL SAST를 추가하고 `secure-coding`을 여섯 번째 required context로 정의한다. | 2026-09-09 | — | 구현 기록 | 규범 정본은 ADR-0015(accepted)·CTX-005, required-checks.json·required-checks-contract 가 집행. |
| DEC-OPS-079 | accepted | §A3-1 부채 이행 웨이브 — 전용 입력 페이지를 목록 위 모달로 옮긴다. | 2026-09-12 | - | 구현 기록 | 이행 1회. 4라우트 전용 가드는 DEC-OPS-081 이 대체. |
| DEC-OPS-080 | accepted | §A3-1 마지막 부채를 이행하고 래칫을 0 으로 내린다. | 2026-09-12 | - | 구현 기록 | 이행 1회. SurveyFormDialog.edit 왕복 계약과 a3-1 census 가 결과 유지. |
| DEC-OPS-083 | accepted | 축소 프로필(core·collaboration)에서 404 가 되는 링크 4축을 닫는다 | 2026-09-12 | - | 구현 기록 | 수리 1회. pack 마커는 DEC-OPS-292 가 기능 id 로 바꿈. 착지 '/' 는 LoginClient·403 복구 계약이 유지. |
| DEC-OPS-084 | accepted | 쿼리 수 계측 가드레일을 core 도메인 표적으로 돌려 축소 프로필에 살린다 | 2026-09-13 | - | 구현 기록 | 리팩터링 1회, pack 축은 DEC-OPS-289~291 이 걷음. QueryCountGuardrailIntegrationTest 가 유지. |
| DEC-OPS-085 | accepted | RBAC 매트릭스를 pack 경계로 두 클래스로 가른다 | 2026-09-13 | - | 구현 기록 | 통계 demo 귀속은 DEC-OPS-240 대체, pack 축 퇴역. 두 시험 클래스가 결과 유지. |
| DEC-OPS-109 | accepted | PD-RBAC-001(DB 인가 전환의 사후 shadow 증명 여부)을 전제 소멸로 종료한다. | 2026-09-22 | PD-RBAC-001 종료 | 퇴역 | 인용한 rbac shadow 설정이 ADR-0016 이행에서 제거돼 선택지 자체가 사라진 종료 기록이다. 새 제약을 남기지 않는다 |
| DEC-OPS-112 | accepted | 게시판 통계 응답에서 `intelligenceScore` 를 걷는다. | 2026-09-23 | - | 구현 기록 | 필드 제거 일회 작업. 재유입 방지는 honest-affordance-contract.test.ts가 BoardService 소스까지 보며 지킨다 |
| DEC-OPS-116 | accepted | CI 실패 annotation 의 JUnit 메시지 추출을 ci.yml 셸에서 테스트 가능한 모듈로 옮긴다. | 2026-09-23 | - | 구현 기록 | 셸 패턴 결함 수정. ci-annotate-test-failures.mjs와 그 계약 테스트가 결과를 지키며 별도 규칙을 남기지 않는다 |
| DEC-OPS-118 | accepted | 컨트롤 높이 2차 — 화면별 판단이 필요하던 17곳을 뜻에 맞게 옮긴다. | 2026-09-23 | - | 구현 기록 | DEC-OPS-117 동결 아래 이행 차수. 결과는 밀도 계약이 지킨다 |
| DEC-OPS-119 | accepted | 컨트롤 높이 3차 — VRT 기준선 화면과 공통 레이아웃의 `h-11` 16곳을 걷고 기준선을 다시 만든다. | 2026-09-23 | - | 구현 기록 | 이행 차수와 기준선 재생성 기록. Linux 워크플로 재생성 규칙은 DEC-OPS-017 몫이고 결과는 밀도 계약이 지킨다 |
| DEC-OPS-120 | accepted | 기본 밀도에서 값이 같은 고정 높이 35곳을 토큰으로 옮긴다. | 2026-09-23 | - | 구현 기록 | 이행 차수. 결과는 work-screen-grammar-contract 밀도 계약이 지킨다 |
| DEC-OPS-121 | accepted | 컨트롤 높이 5차 — 같은 값의 토큰이 없는 `h-10`·`h-12` 56곳을 36px 로 옮기고 남은 11건을 비대상으로 확정한다. | 2026-09-23 | GAP-UIDENSITY-001 의 활성 gap 지위 | 구현 기록 | 마지막 이행 차수로 GAP-UIDENSITY-001을 닫았다. 남은 11건은 계약 동결에 반영돼 있다 |
| DEC-OPS-123 | accepted | Spring Boot 4.1 1단계를 적용한다(ADR-0024). | 2026-09-24 | - | 일회성 실행 | ADR-0024 1단계 적용 기록. 2단계(DEC-OPS-124)가 호환 모듈을 걷었고 현재 상태는 ADR-0024·CTX-002가 정본이다 |
| DEC-OPS-129 | accepted | 네트워크 모니터링을 퇴역한다. | 2026-09-25 | PD-OPS-002 | 퇴역 | 이 결정으로 표면이 걷혔고 V2_104가 배정을 정리했다. 현재 코드에 해당 화면·API가 없고 남는 제약이 없다 |
| DEC-OPS-130 | accepted | 라우트 기능 원장 검토가 드러낸 결함 4건을 고친다. | 2026-09-25 | - | 구현 기록 | 결함 수정 묶음. 결과는 새 테스트가 지키며 별도 규칙을 남기지 않는다 |
| DEC-OPS-132 | accepted | 게시글 작성일에 인덱스를 둔다(V2_105). | 2026-09-25 | - | 구현 기록 | 인덱스 추가 마이그레이션 기록. BoardPostDateIndexMigrationIntegrationTest가 실행 계획을 고정하고 CTX-022가 사실로 인용한다 |
| DEC-OPS-133 | accepted | 헌법 3종·공용 메모리·문서를 현재 코드와 결정에 맞춘다. | 2026-09-25 | DEC-OPS-038 의 보존 개월 인수처 이관 부분(DEC-OPS-128 ②) | 구현 기록 | 문서 현행화 기록. 보안 헤더 기준선·자기참조 FK 규칙은 헌법 본문이 정본으로 보유한다 |
| DEC-OPS-144 | accepted | 화면 문구·상태를 서버 판정과 같게 말한다(DIP B2, 화면 10건). | 2026-09-26 | - | 구현 기록 | 화면별 문구·표시 수정 묶음. 원칙은 DEC-OPS-140·145와 정직성 계약이 지키며 이 행이 별도 규칙을 남기지 않는다 |
| DEC-OPS-161 | accepted | 반복 조회를 줄인다(DIP B5 F10). | 2026-09-26 | - | 구현 기록 | 성능 개선 묶음이며 결과는 테스트가 지킨다. 새 인덱스 불필요 판단은 GAP-AUTH-004가 재검토 조건과 함께 추적한다 |
| DEC-OPS-180 | accepted | CI 검증 강도를 유지하며 임계 경로를 병렬화한다. | 2026-09-29 | - | 구현 기록 | ADR-0026 이행 기록이며 정본은 ADR-0026·CTX-021. custom 입장은 DEC-OPS-282, 이관 PIT 슬롯은 ADR-0032, PIT 범위는 DEC-OPS-366이 바꿨다 |
| DEC-OPS-181 | accepted | ADR-0025가 승인 밖으로 둔 운영 적용 중 둘을 공유 OCI DB에 집행한다(2026-09-29 사용자 승인). | 2026-09-29 | - | 일회성 실행 | 공유 OCI 적용 기록. 기관 DB 자동 미배정 규칙은 ADR-0025 D06이 정본이다 |
| DEC-OPS-207 | accepted | 결정 17~23의 마이그레이션 V2_116~118 을 공유 OCI DB 에 적용한다(2026-10-01 사용자 승인). | 2026-10-01 | - | 일회성 실행 | 공유 OCI DB 1회 Flyway 적용과 읽기 확인 기록. |
| DEC-OPS-211 | accepted | V2_119 가 메뉴 이름 '프로그램 관리'를 '화면 관리'로 바꾸고 메뉴가 참조하지 않는 레거시 프로그램 행을 지운다(사용자 사전 승인 2026-10-02). | 2026-10-02 | - | 퇴역 | 프로그램 원장 tb_prgrm_lst 자체를 DEC-OPS-224·231(V2_127)이 걷어 대상 표면이 남지 않았다. |
| DEC-OPS-212 | accepted | V2_119 를 공유 OCI DB 에 적용한다(2026-10-02 사용자 사전 승인, PR #824 병합 뒤). | 2026-10-03 | - | 일회성 실행 | 공유 OCI DB 1회 적용과 읽기 확인 기록. |
| DEC-OPS-215 | accepted | V2_120 이 ROLE_USER 의 들어갈 수 없는 설문 관리 메뉴 표시를 회수한다. | 2026-10-03 | - | 일회성 실행 | 옛 배정 6행을 한 번 회수한 데이터 정리 마이그레이션. 표시⊆진입 규칙은 DEC-OPS-186·238 이 소유. |
| DEC-OPS-217 | accepted | V2_120 을 공유 OCI DB 에 적용한다(2026-10-03, PR #830 병합 뒤). | 2026-10-03 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-220 | accepted | V2_121 을 공유 OCI DB 에 적용한다(2026-10-03 사용자 사전 승인 — 이 결재 작업의 V2_121·V2_122 에 한정). | 2026-10-03 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-221 | accepted | V2_122 를 공유 OCI DB 에 적용한다(2026-10-03 사용자 사전 승인 — 이 결재 작업의 V2_121·V2_122 에 한정, PR #833 병합 뒤). | 2026-10-04 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-223 | accepted | V2_123 을 공유 OCI DB 에 적용한다(2026-10-04 사용자 사전 승인 — V2_123 에 한정, PR #835 병합 뒤). | 2026-10-04 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-224 | accepted | 프로그램 목록을 퇴역한다(2026-10-04 사용자 승인). | 2026-10-04 | DEC-OPS-209 ②의 이전 프로그램 둘째 탭과 ①의 읽기 전용 연결, DEC-OPS-210·214 묶음의 PROGRAM_* 포함 부분, ADR-0014 결정 2·3의 프로그램 연결·연결 프로그램 삭제 409 | 퇴역 | 프로그램 API·권한 퇴역 결정. ② 는 DEC-OPS-231 이 대체했고 원장 표는 V2_127 로 삭제돼 남은 표면이 없다. |
| DEC-OPS-226 | accepted | V2_124 를 공유 OCI DB 에 적용한다(2026-10-04 사용자 승인 — 프로그램 목록 퇴역의 배정 정리, PR #837 병합 뒤). | 2026-10-05 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-227 | accepted | 넓은 화면의 사이드바 접기를 찾기 쉽게 한다. | 2026-10-05 | DEC-OPS-225 ⑤가 시행한 접힘 표현 중 사이드바 전체 숨김·본문 여백 0(카탈로그 §4 종전 서술) | 대체됨 | DEC-OPS-228 이 글자 단추·3rem 접힘 막대·포커스 넘기기·머리글 단추 유지를 모두 대체. sidebar-rail.tsx 부재. |
| DEC-OPS-229 | accepted | 꺼진 '마이페이지관리' 메뉴 행과 남은 메뉴 배정을 정리한다(2026-10-05 사용자 결정). | 2026-10-05 | - | 일회성 실행 | V2_125 로 메뉴 1행·배정 1건을 한 번 지운 데이터 정리. |
| DEC-OPS-230 | accepted | V2_125 를 공유 OCI DB 에 적용한다(2026-10-05 사용자 승인 — 꺼진 마이페이지관리 메뉴 행 정리, PR #841 병합 뒤). | 2026-10-05 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-231 | accepted | 레거시 연결 프로그램과 빈 마이페이지 콘텐츠 테이블을 앱과 DB 에서 걷는다(GAP-PROGRAM-001 종료, 2026-10-05 사용자 승인). | 2026-10-05 | DEC-OPS-224 ②의 연결 프로그램 400 거부·수정 시 레거시 연결 해제 | 퇴역 | prgrm_file_nm·tb_prgrm_lst·tb_indv_pg_conts 를 V2_126·127 로 걷은 퇴역 기록. 메뉴 스냅숏 형식 2 는 DEC-OPS-238(형식 3)·339 가 대체. |
| DEC-OPS-234 | accepted | V2_126·V2_127 을 공유 OCI DB 에 적용한다(2026-10-05 사용자 승인 — 프로그램 원장과 빈 마이페이지 콘텐츠 테이블 폐기, PR #843 병합 뒤). | 2026-10-05 | - | 일회성 실행 | 공유 OCI DB 1회 적용 기록. |
| DEC-OPS-236 | accepted | 소스 간결화 재점검(PR #848) 병합 뒤 점검이 찾은 결함을 고치고 기록을 바로잡는다. | 2026-10-07 | DEC-OPS-235 ④의 대상 서술 | 구현 기록 | DEC-OPS-235 ④ 오기 정정과 부서 트리·메뉴 E2E·rename 스크립트 수정 기록. 결과는 코드·시험이 지킨다. |
| DEC-OPS-241 | accepted | 생성기를 단계 모듈로 나누고, 골든 비교가 드러낸 기존 결함 넷을 고친다(Phase 1-1). | 2026-10-08 | - | 구현 기록 | 생성기 파일 분할 리팩터링과 단독 선택·드라이브 표기 결함 수정 기록. 결과는 생성기 계약 시험이 지킨다. |
| DEC-OPS-255 | accepted | Phase 1 종료 조건을 대조하고 시안과 어긋난 표시 둘을 맞춘다(설계서 16장 Phase 1 종료). | 2026-10-10 | - | 구현 기록 | Phase 1 종료 대조와 표시 2건 수정 기록. 의도적 차이는 DEC-OPS-250·251 이 이미 규칙으로 갖는다. |
| DEC-OPS-260 | accepted | 명령 센터(Ctrl+K)의 방향키가 고르는 순서를 화면에 그린 순서와 맞춘다. | 2026-10-10 | - | 구현 기록 | 버그 수정(CATEGORY_ORDER 단일화) 기록이며 global-command-center.test.tsx 가 지킨다. 새 규칙 없음. |
| DEC-OPS-272 | accepted | 근거 없는 묶음 간선 4개를 걷는다(Phase 2 간선 제거 E2). | 2026-10-12 | manifest clusters 의 게시판 묶음 스크랩 포함과 결재 묶음 | 대체됨 | manifest clusters(config/reusable-base-profiles.json, 현재 부재)를 매니페스트 v2(DEC-OPS-288·294)가 대체, 바로가기 소유는 DEC-OPS-274·대시보드 묶음은 DEC-OPS-281 이 대체. |
| DEC-OPS-299 | accepted | Phase 2(모듈 선택 고도화)의 종료 조건을 기능 22개 기준으로 다시 정하고 실측으로 닫는다(U11). | 2026-10-13 | 설계서 16.2 의 KPI 목표값(저장소 밖 문서라 이 행이 대체를 기록한다) | 일회성 실행 | Phase 2 종료 판정과 2026-10-13 측정 기록. KPI 는 지속 래칫이 아니고 남은 일은 GAP 로 넘김(GAP-SLOT-001 은 DEC-OPS-334 로 종료). 단일 소유 원천은 DEC-OPS-294 가 지킴. |
| DEC-OPS-303 | accepted | 결재 통합 시험에서 알림 행을 보는 시험 하나를 떼어 '공통 기반 + 결재' 생성물에서도 나머지 13건이 돌게 한다(GAP-BASE-003). | 2026-10-13 | DEC-OPS-295 ④의 '결재 통합 시험이 통째로 빠진다' | 구현 기록 | 시험 분리(ApprovalReferenceNotificationIntegrationTest)와 게이트 선언 조정 기록. 결과는 informalsanction.json 게이트·presets 기대치가 지킴. DEC-OPS-295 ④를 고친 수정. |
| DEC-OPS-304 | accepted | 2026-10-13 Dependabot 배치를 한 PR 로 적용한다. | 2026-10-13 | - | 일회성 실행 | 의존성 배치 적용 기록. 템플릿 핀 동기는 기존 진입점 계약, wrapper 9.8.0 차단은 DEC-OPS-237 이 지킴. |
| DEC-OPS-314 | accepted | V2_128 을 공유 OCI DB 에 적용한다(2026-10-14 사용자 사전 승인 — L3 착수 때 승인 필요 항목을 한꺼번에 승인, PR #897 병합 뒤). | 2026-10-14 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록(사전 읽기→백업→migrate→validate). |
| DEC-OPS-329 | accepted | V2_129 를 공유 OCI DB 에 적용한다(2026-10-16 사용자 승인 — 나의 결재선 새 테이블, PR #912 병합 뒤). | 2026-10-16 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록. |
| DEC-OPS-346 | accepted | 대형 화면·서비스·이관 도구 클래스를 동작을 바꾸지 않고 나누며, 단일 파일을 읽던 계약은 나뉜 파일 전체로 넓힌다. | 2026-10-18 | - | 구현 기록 | 리팩터링과 census 판정 보정 기록. 계약 확장 원칙은 AGENTS H2 가, A1·쓰기 권한 census 판정은 census 코드·시험이 지킴. 이관 plan 재승인은 일회성. |
| DEC-OPS-347 | accepted | 410만 돌려주던 구 롤·롤 권한·권한 쓰기 API 12개를 경로째 걷는다(ADR-0034). | 2026-10-18 | ADR-0016 '영향과 검증'의 종료 API 무변경 거부(410) 부분(ADR-0034) | 퇴역 | ADR-0034 이행의 표면 제거. RoleApiController·AuthorRoleApiController 는 하네스 주석에만 남음. 걷은 경로의 403/401 은 RBAC 시험이 지킴. |
| DEC-OPS-348 | accepted | 결재 API 로 대체된 비공식결재(ISM) API 를 걷고, 그 API 에만 묶인 INFORMAL_* 권한 10개와 배정을 퇴역한다(V2_130). | 2026-10-18 | DEC-OPS-053 의 ISM API superseded-surface 등재(표면 제거로 종료) | 퇴역 | ADR-0034 이행. InformalSanctionApiController 코드 0건, V2_130 이 배정 정리(OCI 는 DEC-OPS-351). DEC-OPS-053 등재를 종료한 행. |
| DEC-OPS-349 | accepted | 집행 지점이 없던 기관코드 쓰기 권한 INST_CODE_CREATE·UPDATE·DELETE 와 그 배정을 퇴역하고, 로그인 정책의 dpcn_prm_yn 컬럼은 유지한다. | 2026-10-18 | GAP-CODE-001 의 '쓰기 권한 퇴역은 별도 결정' 부분 | 퇴역 | V2_130 으로 배정 정리 완료. 남은 경계(쓰기 경로 설계 때 권한 재정의, dpcn_prm_yn 컬럼)는 GAP-CODE-001·GAP-LOGIN-001 이 소유. |
| DEC-OPS-350 | accepted | 실행될 수 없던 /admin/observability·/admin/system/audit 를 redirect 스텁으로 바꾸고 그 화면 전용 코드를 지운다. | 2026-10-18 | V2_48 주석의 /admin/system/audit 실기능 판정과 "추측으로 지우지 않는다"(실행 불가 실측으로 종료) | 퇴역 | 전용 코드 제거 완료(ServiceTopology·AuditTimelineClient 는 주석에만). 스텁 목적지는 라우트 원장 계약이 지킴. |
| DEC-OPS-351 | accepted | V2_130 을 공유 OCI DB 에 적용한다(2026-10-18 사용자 승인 — 집행 지점 없는 권한 배정 정리, PR #932 병합 뒤). | 2026-10-18 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록. |
| DEC-OPS-352 | accepted | operation census 의 화면 고아·미배선을 다시 분류하고 늘 거부되거나 대체된 메뉴 서비스 경로 셋을 걷는다(GAP-WIRING-001). | 2026-10-18 | operation census 원장의 가입·사용자 접속 통계·권한별 메뉴 목록 미배선 사유(DEC 없음) | 구현 기록 | 원장 사유 정정·래칫 실측 하향·죽은 메서드 제거 기록. 이후 래칫은 operation-consumer-census.json, 남은 결정은 GAP-WIRING-001·DEC-OPS-062 가 지킴. |
| DEC-OPS-362 | accepted | 쓰지 않는 백엔드 의존성 7종(Spring Batch·eGov batch·Quartz·commons-net·jdom2·commons-dbcp2·scribejava)을 걷는다. | 2026-10-19 | - | 구현 기록 | 의존성 제거 기록. '되살릴 때 사용 코드와 함께' 는 일반 원칙 수준이고 spring-retry 판단은 DEC-OPS-125 가 유지. |
| DEC-OPS-363 | accepted | V2_131·V2_132 를 공유 OCI DB 에 적용한다(2026-10-19 사용자 승인 — 로그아웃 시각·정보주체 컬럼과 감사 원장 트리거, PR #936 병합 뒤). | 2026-10-19 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록. |
| DEC-OPS-365 | accepted | V2_133 을 공유 OCI DB 에 적용한다(2026-10-19 사용자 사전 승인 — 10개 표 낙관적 잠금 버전 컬럼, PR #937 병합 뒤). | 2026-10-19 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록. |
| DEC-OPS-367 | accepted | 처리 흐름 없는 상태 표면 넷(업무보고 상태·포상 승인·행사 승인·인터넷서비스안내 반영 여부)을 걷고 물리 컬럼은 읽기 전용으로 남긴다. | 2026-10-19 | - | 퇴역 | 업무보고 상태·포상/행사 승인·ISG 반영 여부 표면 제거 완료(rptSttsCd 는 엔티티 읽기 전용 매핑과 시험에만). 컬럼 제거는 별도 스키마 승인 몫. |
| DEC-OPS-368 | accepted | 아무도 쓰지 않는 보고서 통계 원장을 읽던 탭·라우트·조회 API 를 걷고, V2_134 가 메뉴 9040105 와 그 배정·즐겨찾기를 지운다(표는 남김). | 2026-10-19 | - | 퇴역 | ReprtStats 엔티티·화면 제거 완료(하네스 주석에만), tb_rptp_stats 표는 남음. OCI 적용은 DEC-OPS-370. |
| DEC-OPS-370 | accepted | V2_134 를 공유 OCI DB 에 적용한다(2026-10-19 사용자 사전 승인 — 보고서 통계 메뉴 퇴역, PR #940 병합 뒤). | 2026-10-19 | - | 일회성 실행 | 공유 OCI 마이그레이션 적용 기록. |
| DEC-OPS-380 | accepted | 공유 OCI DB 의 ROLE_ADMIN 그룹에 상단 고정 권한 BOARD_PIN 을 배정하고 같은 트랜잭션에 GROUP_GRANT/ADD 이력 1건을 남긴다(2026-10-23 사용자 승인). | 2026-10-23 | - | 일회성 실행 | 공유 OCI 권한 배정 기록. 템플릿 기본 그룹 없음은 ADR-0040 결정 5 가 정본이다. |
