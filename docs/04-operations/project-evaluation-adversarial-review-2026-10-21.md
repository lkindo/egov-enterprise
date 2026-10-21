# Gemini 상세 품질평가에 대한 적대적 재검토

**판정: 98.3점의 산술은 맞지만, 이를 운영 준비도나 무결성의 인증으로 받아들이지는 않는다.** 구조·검증 장치의 강점은 인정한다. 다만 원문은 구현의 존재, 시험 코드의 존재, 해당 커밋의 시험 통과, 운영 환경에서의 보장을 자주 같은 증거로 취급한다. 몇몇 핵심 설명은 현재 소스와 직접 충돌한다.

이 문서는 Codex의 재검토 의견이다. 원문의 점수를 임의의 낮은 점수로 대체하지 않는다. 요구 범위와 채점 기준, 실행 증거가 결속되기 전에는 종합점수의 대외 사용을 보류하는 편이 타당하다. 아래 우선순위는 후속 확인 순서이며 CVSS나 확정 취약점 등급이 아니다.

## 1. 대상과 검증 경계

| 항목 | 기준 |
|---|---|
| 검토일 | 2026-10-21 |
| 대상 | Gemini `project_detailed_evaluation.md`, 33개 단위 평가, 원문 98.3/100 |
| 수정 전 원문 SHA-256 | `6ccfb48dc32a4dab243cc338214b685466d74ce24d4c06f1725cc6895904cd50` |
| 소스 대조 기준 | `2328fb0631761ac348b9f1d744cfcd3eb2ac8d83` |
| 방법 | 원문·부속 검증 스크립트/로그 읽기, 점수 독립 재계산, 경로 실재 확인, 핵심 주장과 구현·시험 정의의 표적 대조 |
| 제외 | 제품 전체 시험 재실행, 실제 UI 조작, live DB 재실측, 운영 침투·부하·복구 시험 |

원문에는 평가 대상 커밋 SHA가 없다. 따라서 현재 소스와의 불일치를 곧바로 “당시에도 같은 코드였다”는 증명으로 확대하지 않는다. 원문 행 번호는 위 해시의 **수정 전 본문에서 LF로 구분한 행** 기준이다. 이번 검토도 33개 단위의 모든 실행 경로를 전수 재감사한 것은 아니다. 확인하지 않은 영역을 합격으로 표시하지 않는다.

## 2. 점수보다 먼저 고쳐야 할 평가 방법

### 산술과 채점 타당성을 분리한다

33개 행의 세부 점수 합계는 모두 맞는다. Core 8개 합계 797, Business 21개 합계 2,057, Platform 4개 합계 390이며 가중치는 30%·40%·30%다.

`(797 / 8) × 0.3 + (2057 / 21) × 0.4 + (390 / 4) × 0.3 = 98.318452…`

98.3으로 반올림한 것은 옳다. 문제는 만점의 기준과 증거다. 원문 §1.4의 “S 24개”와 마스터 표의 **S 25개·A+ 6개·A 1개·C 1개**는 일치하지 않는다. 99점 이상은 24개지만, 표에는 97점 S와 99점 A+도 있다. 등급 경계와 표 집계를 일치시켜야 한다. 비교 표본 없이 “국내 최고 수준”이라고 한 결론도 독립 비교평가로 볼 수 없다.

원문 §6의 Critical/High 발견 0건도 침해·권한 상승·서비스 중단 위험의 부재를 증명하지 않는다. 평가의 탐지 범위와 한계를 먼저 제시해야 하며, 서로 다른 위험을 높은 평균점수로 상쇄해서는 안 된다.

### 부속 검증의 통과가 의미하는 범위가 좁다

원문과 함께 생성된 `scratch/validate_and_compile.py`를 읽었다. 이 스크립트는 다음을 한다.

- 24행의 별도 하드코딩 점수표를 검산한다. 최종 보고서 표를 파싱해 동등성을 확인하는 방식은 아니다. 이번에는 독립 재계산으로 본문 표와 대조했다.
- 133행 부근에서 `docs/`·ADR·공용 메모리 인용을 금지한다. 과거 점수를 배제하는 것은 가능하지만, 승인된 요구사항·지원 범위·운영 증거까지 배제하면 품질의 기준을 잃는다. 메모리는 원본을 찾는 색인으로만 쓰고 사실은 현재 원본에서 확인해야 한다.
- 169행부터 사전 생성한 `repo_index.json`을 사용하며, 정확한 경로가 없으면 182~185행에서 **같은 파일명의 첫 후보**로 통과시킨다. 디렉터리·동명이인·인용 내용의 진위를 보장하지 않는다. 190행의 `100.0%`도 계산 결과가 아니라 출력 문자열이다.
- 실행하는 외부 명령은 201행의 `git status --short`다. Gradle·Vitest·E2E·운영 검증을 실행하거나 그 결과를 대조하지 않는다.

`verification_log.txt`는 603/603 경로 통과와 깨끗한 워킹트리를 기록한다. 이것만으로 §7의 “전수 실측·환각 0건”이나 모든 시험의 성공은 성립하지 않는다. 별도 실행이 전혀 없었다고 단정하는 것도 피한다. **이 로그와 스크립트에서는 그 실행 증거를 확인할 수 없다.**

독립적으로 백틱 안의 명시적 경로 343개를 추출하여 현재 디스크와 대조했다. 335개는 저장소 기준 경로가 존재했고, 나머지 8개 중 5개는 문맥상 상대 경로로 해석해야 했다. 아래 3개는 저장소 루트를 명시한 경로가 현재 소스와 다르다. 파일명만 적은 인용·와일드카드 등은 이 집계의 모집단이 아니므로 603개 집계와 직접 비교하지 않는다.

| 원문 위치 | 원문 경로 | 현재 확인한 경로 |
|---|---|---|
| 548행 | `frontend/src/types/generated-zod/comment-api-controller.ts` | [generated-operations/comment-api-controller.ts](../../frontend/src/types/generated-operations/comment-api-controller.ts) |
| 1729행 | `frontend/src/components/ui/standard-data-table.tsx` | [app/components/ui/standard-data-table.tsx](../../frontend/src/app/components/ui/standard-data-table.tsx) |
| 1928·2006행 | `config/governance/operation-bindings.json` | [resources/authorization/operation-bindings.json](../../business-core/src/main/resources/authorization/operation-bindings.json) |

## 3. 핵심 반박과 누락된 경계

### 보안·감사·동시성

| 원문 주장 | 현재 근거와 판정 | 후속 조건 |
|---|---|---|
| 143·333·2002행: 로그아웃 후 토큰 재사용 완벽 차단 | [JwtTokenProvider](../../foundation/src/main/java/nuri/foundation/security/jwt/JwtTokenProvider.java) 294~313행은 폐기 시각을 초 단위로 내린다. 같은 초의 로그아웃 직전 발급 토큰도 통과하며 [시험](../../foundation/src/test/java/nuri/foundation/security/jwt/JwtTokenProviderTest.java) 347행부터 이를 명시한다. **1초 미만은 발급 시점의 경계이지, 그 토큰이 1초 뒤 자동 무효화된다는 뜻이 아니다.** | 예외와 노드 시계 전제를 공개한다. 엄밀한 즉시 폐기가 필요하면 세션 버전 등 대안을 비교하고, 같은 초의 폐기·재로그인·다중 노드 시험으로 판정한다. 이번에 악용을 재현한 것은 아니다. |
| 310·324행: 감사 누락 없는 추적 | [WebAuditLogListener](../../business-core/src/main/java/nuri/business/service/log/WebAuditLogListener.java) 88~94행은 저장 실패를 유실로 집계한다. [시험](../../business-core/src/test/java/nuri/business/service/log/WebAuditLogListenerTest.java) 76행부터 유실 2건을 검증한다. 무손실 주장은 틀리다. | 일반 운영 로그와 반드시 보존할 중요 감사 이벤트를 구분한다. 중요 범위만 저장 보장·복구·경보·보존 요구와 대조한다. 모든 로그를 무조건 동기화하는 처방은 피한다. |
| 1284행: 메모보고 `@Version`과 비관적 락의 이중 방어 | [MemoReport](../../business-app/src/main/java/nuri/business/domain/memoreport/MemoReport.java)와 상위 엔티티에 버전 필드가 없다. [서비스](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java) 254~270·315~322행은 잠금 뒤 요청 값을 적용한다. 서버 트랜잭션 직렬화는 오래 열린 폼의 수정 충돌 감지와 다르다. | 본문·지시의 오래된 제출을 허용할지 결정한다. 방지한다면 두 클라이언트 중 오래된 제출이 거부되고 최신 값이 유지되는 검증이 필요하다. `@Version`을 붙이는 것만으로 클라이언트 버전 계약까지 해결됐다고 보지 않는다. |
| 1371·1376행: 동일 부서만 열람, 기본 조직으로 안전한 fallback | [ScheduleService](../../business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java) 37~47·101~110행은 조직 미배정과 사용자 조회 결과 없음을 같은 기본 조직에 매핑한다. DB 조회 예외를 잡아 fallback하는 구현은 아니다. [기존 시험](../../business-app/src/test/java/nuri/business/service/schedule/ScheduleAttachmentAccessTest.java) 110~114행에도 그 공유 동작이 있다. | “미배정 사용자 공통 공유 영역”이라는 정책을 드러낸다. 정책 판정 없이 새 취약점 또는 시험 부재로 단정하지 않는다. 변경 시 본문·첨부의 공개 범위를 함께 검증한다. |
| 1963~1964행: `strict-dynamic`, 프록시의 `X-CSRF-TOKEN` 검증 | [proxy.ts](../../frontend/src/proxy.ts) 274~285행은 `strict-dynamic`을 의도적으로 사용하지 않는다. 242~245행은 `X-XSRF-TOKEN`을 백엔드가 대조한다고 설명한다. 302행부터 Atlas용 별도 CSP도 있다. | 실제 헤더와 검증 책임으로 정정한다. nonce CSP의 존재를 모든 XSS 경로 차단으로 확대하지 않는다. 앱/Atlas·개발/운영·지연 청크의 실행 범위를 구분한다. |

### 내구성·이관·물리 DB

| 원문 주장 | 현재 근거와 판정 | 후속 조건 |
|---|---|---|
| 284·298행: 파일을 삭제했다가 롤백 시 복원 | [FileService](../../business-core/src/main/java/nuri/business/service/file/FileService.java) 173~185행은 메타데이터와 삭제 의도를 커밋하고 실물 삭제를 영속 작업으로 미룬다. 롤백 콜백은 삭제 대상 식별 준비물을 해제한다. 설명한 복원 방식과 다르다. | “커밋 후 지연 삭제”로 정정하고 [복구 절차](durable-work-recovery.md)의 재시도 소진·`FAILED`·잔여 준비물 처리 경계를 포함한다. |
| 1481·1489·1585행: SMS 자동 복구 보장 | [SmsReceiptState](../../business-app/src/main/java/nuri/business/service/sms/SmsReceiptState.java)에는 `UNKNOWN`이 있고 120행은 자동 재발송하지 않는다고 안내한다. [운영 절차](sms-provider-operations.md)는 선점 후 중단의 exactly-once를 보장하지 않는다. | 접수·전달·결과 미확정과 운영자 대조를 구분한다. 불확실한 POST에 재시도를 늘리면 중복 발송 위험이 생기므로 단순 retry 추가에 반대한다. |
| 1759·1793~1796행: 7개 벤더 이관 완비 | [OracleSourceAdapter](../../migration-tool/src/main/java/nuri/migration/adapter/OracleSourceAdapter.java) 26~50행에 `UNVERIFIED`·`MANUAL_ONLY`가 있다. [MigrationWorkflowRunner](../../migration-tool/src/main/java/nuri/migration/MigrationWorkflowRunner.java) 643~645행은 미검증 어댑터의 공개 COMMIT을 거부한다. | 어댑터 존재·discovery·DRY_RUN·엔진 리허설·공개 CLI COMMIT·운영 cutover를 나눈다. PostgreSQL까지 일괄 미검증이라고 해서는 안 된다. 도입할 벤더·버전부터 자격 증거를 확보한다. |
| 1777행: JDBC read-only가 원천 데이터 변경을 원천 차단 | [SourceAdapter](../../migration-tool/src/main/java/nuri/migration/adapter/SourceAdapter.java) 96행은 읽기 전용이 힌트이며 DB의 SELECT-only 권한 실측이 별도 필요하다고 명시한다. | DB 계정 권한·원천 동결·허용 및 거부 시험을 별도 증거로 요구한다. 읽기 전용 플래그를 권한 통제로 간주하지 않는다. |
| 1619·1828·1946~1948행: 7일 운영 관측을 물리적으로 강제 | [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java) 1537~1539행은 실제 배포를 증명하지 않는다고 명시한다. 1573행은 기록 날짜를 검사하며, 정책 전 동결분·승인된 같은 릴리스 예외가 있다. | 기록 형식·순서·기간 검증으로 한정한다. 실제 배포, 구버전 소비 종료, 잠금 시간, 관측·복구는 환경별 증거로 판단한다. |
| 1952행: 모든 테이블의 감사 4개 컬럼 완비 | 원문 이름과 달리 [BaseEntity](../../foundation/src/main/java/nuri/foundation/domain/common/BaseEntity.java)는 `frstRgtrId`·`lastMdfrId`, [BaseTimeEntity](../../foundation/src/main/java/nuri/foundation/domain/common/BaseTimeEntity.java)는 `crtDt`·`mdfcnDt`다. [DB 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)에는 메타·insert-only 예외도 있다. | 전 테이블 단정과 잘못된 이름을 정정한다. [메타 처분 자료](standard-metadata-disposition.md)의 과거 실측은 날짜를 붙여 사용하고, 현재 DB 수치로 재사용하지 않는다. FK 인덱스 존재만으로 대용량 성능을 보장하지 않는다. |

### 기능 범위·소비자·자원 상한

| 원문 주장 | 현재 근거와 판정 | 후속 조건 |
|---|---|---|
| 259행: 기관코드 CRUD 완료 | [InstitutionCodeService](../../business-core/src/main/java/nuri/business/service/code/InstitutionCodeService.java) 52~55행은 원장 쓰기 제거를 명시한다. 70~84행의 수신 확인은 원장 적재가 아닌 처리 표시다. | 조회·수신 확인으로 지원 범위를 정정한다. 점수를 맞추기 위해 원장 쓰기를 복원하지 않는다. |
| 563·576행: 커뮤니티 포틀릿까지 화면 연결 완료 | [서비스](../../frontend/src/services/foundation/system/CommunityAdminService.ts)에는 `getCommunityPortlet`이 있지만, `frontend/src`의 해당 호출 검색에서 화면 소비자는 확인되지 않았다. [소비자 census](../../config/governance/operation-consumer-census.json)도 서비스 존재와 화면 연결의 차이를 명시한다. | 화면 경로·권한·실행 증거를 연결하거나 의도적 미사용으로 분류한다. 정적 검색의 미발견을 모든 동적 경로의 부재 증명으로 확대하지 않는다. |
| 1439~1451행: Showcase 백엔드 부재를 여러 항목에서 감점 | [모듈 정의](../../config/modules/showcase.json)는 화면 예시이며 `frontendOnly: true`다. 기능 범위 밖의 엔진 부재를 여러 축에서 반복 감점하는 것은 부당하다. | 백엔드 항목을 N/A로 처리하거나 시연 기준으로 재정의한다. 테스트·접근성·시연 표시의 정직성은 계속 평가한다. 새 엔진은 제품 범위 확대다. |
| 1528행: 설문 내보내기 행 상한으로 OOM 방지 | [SurveySubmissionApiController](../../api-server/src/main/java/nuri/api/controller/foundation/controller/system/service/survey/SurveySubmissionApiController.java) 62행에서 통계 목록을 만든 뒤 63행에서 상한을 검사한다. 조회·목록 생성 중 메모리 상한까지 증명하지 않는다. | “엑셀 생성 전 결과 행 상한 검사”로 정정한다. 대표 문항·선택지 규모에서 조회량과 최대 메모리를 측정한 뒤 사전 제한 또는 페이지 처리 필요성을 판단한다. 실제 OOM은 재현하지 않았다. |
| 1853행: 공개 표준사전과 UI 라벨 대조 | [frontend-visible-terms-contract](../../scripts/frontend-visible-terms-contract.mjs)는 `pilot-candidate-static-census`·`bounded static census only`로 범위를 제한한다. 공공 표준사전 전체 대조기가 아니다. | 게이트별 모집단·제외·검출 불가능한 경로를 표시한다. 게이트 수나 통과율을 행동 정확성으로 대체하지 않는다. |

## 4. 원문 최종 개선안 14개에 대한 의견

원문 §6의 Medium 4개·Low 10개를 그대로 작업 목록으로 전환하지 않는다.

| 원문 과제 | 의견 | 적용 조건·근거 |
|---|---|---|
| 댓글 `searchKeyword` 누락 | **계약 정리는 동의, 검색 UI 고장 진단은 반박** | [API](../../api-server/src/main/java/nuri/api/controller/business/admin/CommentApiController.java) 31~37행의 예약 파라미터는 미사용이다. [화면](../../frontend/src/app/admin/system/comments/CommentModerationClient.tsx) 82행은 검색 입력 자체를 두지 않는다. 소비자 확인 후 계약 정리 또는 별도 기능 결정을 한다. |
| 스크랩 `useYn`의 `@NotBlank` 제거 | **단순 완화 반대** | [DTO](../../business-app/src/main/java/nuri/business/service/scrap/dto/ScrapDto.java) 32~37행의 필수 계약과 내부 fallback 중 공개 API의 의도를 먼저 정한다. fallback 존재만으로 필수 입력이 결함이 되지 않는다. 400/409·수정/삭제 검증 강화에는 동의한다. |
| 순환 참조 허용 해제 | **조건부 동의** | [기동 설정](../../api-server/src/main/java/nuri/ApiServerApplication.java) 43~44행의 허용 플래그는 정리 후보다. 비허용 기동에서 실제 cycle·override를 찾은 뒤 최소 수정한다. 일괄 이벤트 전환을 먼저 결정하지 않는다. |
| Sonner 교체 후 CSP 스타일 완화 제거 | **방향 동의, 해결 범위 반박** | [proxy.ts](../../frontend/src/proxy.ts) 213~222행에는 React style 속성 사용도 있다. toast 교체만으로 전체 `unsafe-inline` 제거가 끝나지 않는다. 요소·속성 정책과 동적 레이아웃을 분리 검증한다. |
| 사용자 일괄 삭제 상한 | **동의** | [API](../../api-server/src/main/java/nuri/api/controller/UserApiController.java) 217행과 [서비스](../../business-core/src/main/java/nuri/business/service/user/UserService.java) 541~558행에 건수 상한이 없고 ID별 조회를 한다. 상한 값은 소비자·요청 크기·처리 비용으로 정한다. 경계값·초과 거부·서비스 미호출을 검증한다. |
| 부서 순환의 DB 방어 | **보류·실측 우선** | live 스키마·외부 쓰기·현재 잠금 경로를 확인하지 않았다. 현재 DB에 방어가 없다는 단정이나 추측한 CHECK/트리거 DDL을 채택하지 않는다. |
| Help의 `ADMIN` 인자 | **정리 동의, 감사 오염 단정 반박** | [HelpService](../../business-app/src/main/java/nuri/business/service/help/HelpService.java) 64~80·139~143행에서 해당 인자를 쓰지 않는다. [LoginUserAuditorAware](../../business-core/src/main/java/nuri/business/security/audit/LoginUserAuditorAware.java)는 인증 주체를 반환한다. 미사용 인자 정리와 실제 감사자 저장 검증으로 한정한다. |
| 주소록 미사용 `userId` | **낮은 우선순위로 동의** | [서비스](../../business-app/src/main/java/nuri/business/service/addressbook/AddressBookService.java) 187~190행은 현재 인증 주체로 삭제 인가를 수행한다. 인자 미사용을 인가 부재로 해석하지 않는다. |
| 대시보드 연결 수의 Redis 분산 집계 | **운영 형태 결정 후** | 다중 인스턴스 전체 연결 수인지, 노드별 연결 수인지, 고유 사용자 수인지 먼저 정의한다. 용어·목표가 다른 수치를 합치지 않는다. |
| Showcase 백엔드 구축 | **현재 결함 수정 목록에서 제외** | 승인된 실제 업무 엔진 요구가 생기면 별도 과제로 다룬다. 현 시연 범위를 기준으로 평가한다. |
| 포상 결재 참조 제거 또는 활용 | **제품 결정 필요** | 전자결재 연동·이력 보존·기존 데이터 의미를 먼저 정한다. 코드 미사용만으로 필드 삭제를 승인한 것으로 보지 않는다. |
| JSP resolver·레거시 매처 정리 | **소비자 조사 후 낮은 우선순위** | 현재 eGov 호환 계약·외부 소비를 확인하고 제거한다. 이관 자격·감사·수정 충돌보다 우선하지 않는다. |
| migration CLI 원본 stacktrace 별도 저장 | **원문 상시 저장 반대** | [VisibilityFinding](../../migration-tool/src/main/java/nuri/migration/discovery/VisibilityFinding.java)은 벤더 예외의 접속 정보 등 민감 문맥을 이유로 원문 보관을 피한다. 안전한 코드·단계·상관 ID를 먼저 보강하고 비밀 유출 부정 시험을 둔다. |
| 기존 Flyway waiver 정리 | **재검토 동의, 적용 파일 수정 반대** | [무중단 이행 규칙](../../docs/02-architecture/zero-downtime-migration.md)은 적용된 파일의 checksum 변경을 금지한다. 필요한 시정은 새 forward migration으로 한다. 예외를 무조건 영구화하거나 넓혀 green으로 만드는 것도 반대한다. |

추가로 놓친 문구 정합성 후보가 있다. 댓글 화면은 “영구 삭제”로 안내하고 코드 주석은 “물리 삭제”라고 설명하지만 [Comment.delete](../../business-app/src/main/java/nuri/business/domain/comment/Comment.java) 85~86행은 `useYn = "N"`이다. 복구 UI가 없다는 사실과 저장된 데이터의 물리 파기는 구분해야 한다. 파기 동작을 임의 변경하지 말고 실제 동작에 맞게 안내를 정리할 수 있다.

## 5. 권하는 개선 순서

| 순서 | 작업 | 완료 판정 |
|---|---|---|
| 1 | 평가 증거 정비 | 이 재검토를 원문에 연결하고 과장된 보장을 정정한다. 이후 평가에는 커밋·지원 범위·요구사항·실행 ID·제외 범위를 결속한다. 파일 존재 검사는 정확한 경로로 실패 처리한다. |
| 2 | 보안·공개 범위·데이터 보존 정책 확인 | 로그아웃 같은 초 예외, 중요 감사의 보존 수준, 일정 기본 조직 공유, 메모보고 오래된 제출의 기대 동작을 결정한다. 기존 예외를 조용히 강화·완화하지 않는다. |
| 3 | 확인된 API·사용자 안내·자원 제한 정리 | 미지원 댓글 파라미터, 삭제 안내, 일괄 삭제 상한을 각각 소비자 계약과 맞춘다. 설문 export는 측정으로 실제 메모리 비용을 판정한다. |
| 4 | 도입할 환경의 운영 자격 확보 | 사용할 이관 벤더·버전·DB 권한·동결·복구·대표 규모부터 실측한다. 표준 메타와 배포 관측은 날짜가 있는 실제 환경 증거로 갱신한다. 도입 대상이 아닌 벤더까지 동시에 확장하지 않는다. |
| 5 | 구조·성능 부채 정비 | 순환 참조·CSP 스타일·미사용 인자·레거시 호환 코드는 실제 의존성과 비용을 확인한 뒤 처리한다. 엔진 신설과 결재 연동은 제품 결정 이후다. |

기존 단방향 모듈 구조, 인가 정책, 영속 작업, nonce CSP, 계약 생성과 부정 시험은 유지할 가치가 있다. 개선의 목표는 게이트나 기록의 수를 늘리는 것이 아니라, **중요한 사용자 행동의 실패를 실제로 잡고 운영상 약속을 증거와 맞추는 것**이다.

행동 평가는 앞서 정한 시각 회귀 사례 하나에서 시작하는 방향이 적절하다. 실패 이미지 확인 → 원인 판별 → 최소 수정 → 표적 재검증의 수행 여부와 CI 재시도·시간 비용을 본다. 이번 상세보고서의 점수만으로 Harness² 도입을 정당화하지 않는다. 파일 존재·게이트 통과와 실제 행동의 정확성을 분리한 결과가 다음 판단의 근거다.

## 6. 이 검토가 증명하지 않는 것

보안 취약점이 없다는 인증, 운영 DB가 현재 표준과 일치한다는 확인, 모든 UI의 접근성 합격, 전 기능의 실행 성공은 제공하지 않는다. 기존 시험의 단언을 인용한 곳은 시험 정의를 읽은 증거이며 이번 커밋에서 그 제품 시험을 다시 실행했다는 뜻이 아니다. 이 문서 변경의 계약·링크 검증 결과는 해당 PR에 남긴다.
