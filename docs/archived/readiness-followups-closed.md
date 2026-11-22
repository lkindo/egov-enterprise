# 완성도 후속 보강 — 끝난 기록 (보관)

[완성도 후속 보강과 검증 경계](../04-operations/readiness-followups.md)에서 2026-11-22 에 옮긴 절이다. 후속 조치가 끝났고 이 기록을 근거로 삼는 열린 gap·설정이 없다. **현행 판단 근거로 쓰지 않는다** — 당시의 실측·경위 기록이며, 절 제목과 본문은 옮기기 전 그대로다(본문이 말하는 "현행"은 그 날짜 기준이다).

## 실시간 연결 표시 정정 (2026-09-27)

DEC-OPS-140의 승인 의도는 화면이 서버가 제공하는 값의 의미를 정확히 표시하는 것이다.
그 결정의 “1분마다 초기화되지 않는 재기동 이후 누적 연결”이라는 구현 전제는 현재 코드와 다르다.
[RealTimeDashboardService](../../business-app/src/main/java/nuri/business/service/dashboard/RealTimeDashboardService.java)는
새 WebSocket 연결마다 `visitsPerMinute`를 늘리고, `resetVisitsCounter`의 60,000ms 고정 주기에서 0으로 초기화한다.
동시에 유지하는 `activeUsers`는 현재 연결 세션 수다. 둘 다 해당 서버 인스턴스의 값이며 고유 사용자 수가 아니다.

[실시간 카드](../../frontend/src/components/features/dashboard/RealTimeDashboard.tsx)는 이를
“새 연결(이 서버, 1분마다 초기화)”와 “마지막 초기화 이후 연결 횟수”로 표시한다.
집계 방식·초기화 주기·이벤트 필드는 유지한다. 최근 60초 이동 구간이나 전 서버 합산으로 해석하지 않는다.
원래 승인 기록은 보존하고 구현 전제와 표시 문구를 이 후속 근거로 정정한다.
검증 경계는 [서버 초기화 테스트](../../business-app/src/test/java/nuri/business/service/dashboard/RealTimeDashboardServiceTest.java)와
[초기화 전후 프레임 표시 테스트](../../frontend/src/components/features/dashboard/__tests__/RealTimeDashboard.test.tsx)다.
이 코드는 스케줄러가 운영에서 지연 없이 실행된다는 실측 증거까지 제공하지는 않는다.

## 라우트 기능 원장 정기 검토 (2026-09-25)

[route capability 원장](../../config/ui-route-capabilities.json)의 기한(2026-11-30)을 앞두고, 코드로 확인할 수 있는 필드를 다시 읽었다.

| 필드 | 방법 | 결과 |
|---|---|---|
| `menuExposure` | OCI `tb_menu_info` 77행(활성 71)을 읽기 전용으로 가져와 Flyway 메뉴 스냅샷과 행 단위로 대조하고, 행과 모든 상위가 활성인 메뉴의 목적지(리다이렉트 추적 포함)로 분류했다. | 두 원천이 같았다. 118개 모두 확정 — 표시 54·숨김 3·메뉴 없음 61. 그룹별 노출은 재지 않았으므로 `menuSnapshot` 은 `blocked-external` 그대로다. |
| 페이지 제목(`visibleLabel`) | 페이지 91개를 18~19개씩 5묶음으로 나눠 검토 에이전트가 코드에서 제안하고, 묶음마다 검증 에이전트가 같은 코드를 다시 읽어 반박했다. | 85개 확정. 고정 제목이 없는 페이지 6개는 미검토로 둔다. |
| capability 상태·출처·액션 | 같은 방식. `live` 는 E4 가 없어 쓰지 않았다. | 미검토 82개 중 81개를 채웠다(새 capability 183개: partial·후보 live 165, unavailable 12, demo 6 / E3 174, E1 9). 라우트 상태는 partial 85·demo 3·unavailable 2·unverified 28(리다이렉트 27·판단 불가 1). |

검증 단계는 확인 79·정정 11·판단 불가 1을 냈다. 정정 중에는 검토 제안이 틀린 경우가 있었다 — 사용자 활동 통계를 "적재 코드가 없다" 며 unavailable 로 본 제안은 `UserActivityLogAggregator`(2026-09-03)가 실제로 적재한다는 반증으로 partial 이 됐다.

`roles`·`profileOwners`·`journeys` 는 제품·도메인 소유자의 판단이라 이 검토의 범위가 아니다. 그래서 118개 라우트의 `review.reviewBy`(2026-11-30)는 옮기지 않았고, 사유 문구만 남은 필드에 맞게 고쳤다. UI 품질 시나리오 원장의 단계별 `truth.status` 사본 16개는 원장 상태에 맞췄다(담당·검토일은 그대로).

검토가 드러낸 결함은 원장과 별개로 아래에 적고, 같은 날 고쳤다(DEC-OPS-130). 모두 코드로 재확인했다.

| 화면 | 사실 | 영향 | 처리 |
|---|---|---|---|
| 업무 홈 실시간 알림 | 서버가 보내는 `NotificationDto`(`notiSn`·`notiTtlNm`·`notiCn`·`readYn`)를 화면 파서가 `id`·`title`·`message`·`read`·`type` 으로 기대해 모두 버린다. | 알림이 오지 않는 것처럼 보인다. | 헤더 알림함과 같은 정규화로 서버 DTO 를 해석한다. |
| FAQ·Q&A 주 목록 | 목록은 `qna_cat_cd` 를 `FAQ`·`QNA` 로 등치 필터하는데 등록 경로는 FAQ 에 빈 값, Q&A 에 `CAT01` 을 저장하고 그 값을 쓰는 다른 경로가 없다. | 제품에서 등록한 글이 주 목록에 나오지 않는다(인기·최근은 필터 없음). | 지식 허브가 탭 이름을 분류 필터로 보내지 않는다 — 같은 필터가 WIKI·COMMUNITY 탭 목록도 비우고 있었다. |
| `/admin/community/[id]` | 화면이 경로의 `[id]` 를 읽지 않는다. | 지정한 커뮤니티가 아니라 선택한 게시판 글을 보여 준다. | id 를 보존해 정본 커뮤니티 상세로 보내는 page-redirect 로 통합했다. |
| 통계 사용자 활동 | 화면이 `USER_STATS` 를 미수집 축으로 두고 "수집되지 않는다" 고 말하지만, 2026-09-03 부터 적재 코드가 있다. | 값이 있어도 없다고 고지한다. | 미수집 목록에서 빼고 요약 카드 값을 되살렸다. 이름은 세는 값에 맞춰 `사용자 등록 요청 수` 다. |

## 라우트 기능 원장 E4 결속과 리다이렉트 정리

2026-11-10 에 [route capability 원장](../../config/ui-route-capabilities.json)의 E4 를 기계로 묶고 리다이렉트 별칭을 정리했다(DEC-OPS-411).

- **E4 결속.**
  - 기능의 `roundtrips` 는 업무 흐름 시험(`frontend/e2e/journeys`)을 가리킨다. 그 시험은 네트워크를 가로채지 않고, 제목이 그 파일에 한 번만 있어야 한다.
  - 가리킨 시험들이 그 기능의 동작을 모두 덮을 때만 E4 이고, 모두 덮으면 반드시 E4 다.
  - 제목은 실제 `test(...)` 호출만 토큰으로 센다 — 주석 처리한 시험·`test.skip` 은 세지 않는다. 가로채기는 시험이 불러오는 fixture·helper 까지 본다.
  - required CI 는 E2E 에 닿는 변경이 main 에 들어올 때마다 업무 흐름 전체를 돈다. 선택 규칙(ADR-0023)이 무관하다고 본 변경 뒤에는 직전 전체 실행이 증거로 남는다.
  - 후보 live 가 E4 를 얻으면 live 로 올린다. 종전에는 'E4' 라고 적기만 하면 됐고 계약이 아무것도 보지 않아 live 가 0개였다.
- **대조 방법.**
  - 후보 live 183개(E3, 미지원 동작 없음, 목업 출처 아님)를 업무 흐름 시험 32개와 대조했다.
  - 조사 에이전트가 동작마다 수행하는 줄과 서버를 확인하는 줄을 인용해 제안했다. 작성자는 인용한 줄을 다시 읽고 24개를 확정했다.
  - 동작이 하나 모자란 37개는 그대로 두었다. 대부분 시험이 새로고침·페이지 이동·필터 같은 보조 동작을 누르지 않거나, 생성·삭제를 API 로만 한다.
  - 해석이 갈린 것은 하나다. 부서 계층 저장의 `reorder` 는 '순서 이동 핸들'을 끌어 계층을 바꾸는 것으로 보았다. 시험은 형제 순서가 아니라 상위 부서를 바꾼다.
- **결과.**
  - 시험에 직접 결속한 기능 24개가 live 이고, 이들을 가리키는 별칭 기능 2개를 더하면 live 기능은 26개다. 라우트 live 는 7개다. 라우트 7개는 감사 원장, 커뮤니티 상세, 부서 업무 상세, 콘텐츠 페이지, 설문 응답 상세, 그리고 이들을 가리키는 별칭 2개다.
  - E4·E5 는 생성 프로젝트로 넘어가지 않는다. 생성물에서 그 화면 행은 기관 검토 대상이 된다(기존 투영 규칙).
- **리다이렉트 별칭.**
  - 28개는 목적지를 따른다. DEC-OPS-404 가 역할에 적용한 '의미는 목적지' 원칙이다.
  - 상태·출처·동작·이름을 목적지 화면 행에서 가져오고, 어긋나면 계약이 붉다.
  - 미확인 라우트는 28 → 0, 미해결 라우트는 30 → 2 다. 남은 둘은 기본 그룹이 없는 두 화면의 역할이고, 결정대로 둔다.
  - G1 은 여전히 아니다. 그룹별 메뉴 노출(`menuSnapshot`)이 `blocked-external` 이다.

### 1차 확대 (2026-11-10)

- **방법.**
  - E4 직전의 후보 live 160개를 업무 흐름 시험과 다시 대조했다. 조사 에이전트 넷이 동작마다 수행하는 줄과 서버를 확인하는 줄을 인용했다.
  - 이미 E4 인 것은 없었다. 대부분 시험이 데이터를 API 로 만들거나 단추가 보이는지만 확인했다.
  - 화면 조작 몇 줄로 메울 수 있는 기능만 골라, DB 벤더 증거 입력이 아닌 업무 흐름 시험 15개 파일에 화면 단계를 더했다.
  - 결속 방식은 그대로다. 시험에 표지를 붙이지 않고 원장이 시험을 가리킨다.
  - 더한 단계는 격리 E2E 에서 모두 통과한 뒤에 결속했다.
- **결과.**
  - 결속한 기능 32개가 live 로 올랐다. 리다이렉트 별칭 1개(`/smart-toolkit/dept-job/selectDeptJobList`)가 목적지를 따라 함께 올랐다.
  - live 기능은 26 → 59개, live 라우트는 7 → 20개다.
  - 시험은 보강했지만 결속하지 않은 기능이 여덟 있다(Codex 50·51차, 첫 CI). 기능 이름이나 화면이 시험이 확인하지 않은 부분까지 말하기 때문이다.
    - 업무 요약: 일곱 영역 가운데 업무게시판 최근 글만 이 시험이 만든 자료로 본다.
    - 설문지·문항·템플릿: 문항·선택지는 API 로 만들고 화면에서는 수정 단추가 보이는지만 본다.
    - 콘텐츠 게시: '메뉴에 추가'로 넘기는 경로를 누르지 않는다.
    - 실시간 상태: 카드 값이 숫자인지만 보고 서버가 방송한 값과 대조하지 않는다.
    - 콘텐츠·시스템·사용자 통계: 차트는 가로축 날짜만 보고 값은 보지 않는다. 사용자 통계는 네 요청 구분 가운데 수정·조회만 고른다.
    - 알림 보내기: 시험은 동작 전체를 덮는다. 그러나 이 라우트는 계약 안에 고정 기대값(`KNOWN_ROUTE_CAPABILITIES`)이 있다. 생성물 투영은 E4 기능이 있는 라우트의 기능을 검토 대상 하나로 바꾸는데, 고정 대조는 그 투영본에도 걸려 재사용 base 검증이 붉어진다(첫 CI 에서 확인). 고정 기대값이 있는 라우트 일곱(알림·결재·결재 기안·여론조사 관리·부재 관리·게시글 상세·통합 검색)은 투영본의 고정 대조를 어떻게 다룰지 정한 뒤에 E4 로 올린다.
- **시험이 찾은 제품 결함.**
  - 부서 일정 화면에서 등록한 일정은 같은 화면에서 수정할 수 없었다. 수정 폼이 비어 있는 종류·반복 코드를 null 그대로 실어 폼 검증이 막았다. 같은 변경에서 고쳤다.
  - 도움말 센터 1:1 Q&A 탭은 문의가 하나라도 있으면 오류다. 게시판 목록 질의가 작성자·사용 여부를 싣지 않는데(생성 계약은 둘 다 선택이다), Q&A 변환 코드가 손으로 쓴 검사로 둘을 필수로 요구한다. '내 1:1 문의' 표지를 어떻게 지킬지가 제품 판단이라 [GAP-HELP-001](operational-decisions-history.md#gap-help-001)로 남겼다(2026-11-11 DEC-OPS-415 ① 로 종료·`help.qna` E4 결속).
- **남긴 것 — 원장 판단이 필요하다.**
  - 관리자 홈의 '새로고침' 셋(`admin.*`)은 누를 단추가 없다. 60초 자동 갱신만 있다.
  - 설문 허브 이용 현황의 '새로고침'은 조회가 실패할 때만 보인다.
  - 화면 관리(`program.screen-list`)의 검색·정렬·쪽은 서버에 가지 않는다.
  - 알림 스트림의 원장 행은 낡았다. '새로고침·행 옵션 미지원'이라 적혀 있지만 지금은 새로고침 단추와 행별 열기·읽음·삭제가 있다. 시험은 보강했고, 행을 다시 판정한 뒤 결속한다.
  - 기관 코드 탭은 시험이 데이터를 넣을 경로가 없다(GAP-CODE-001).
  - 업무 홈 소개 지정은 동시에 도는 다른 시험의 홈을 바꾼다.
- **남긴 것 — 비용이 크다.**
  - 메뉴 구조 저장(버전 잠금), 메모 보고(합성 수신자), 커뮤니티 관리(반려·탈퇴·폐쇄), 지식 허브(정렬이 시드에 기대는 문제), 받은 쪽지, 게시글 상세(새 spec 과 가중치 실측 필요)가 남았다.
  - 접속 통계 새로고침(서버 렌더), 콘텐츠 편집의 그림 올리기, 공개 안내 목록의 쪽, 업무 등록 화면의 담당자 검색, 여론조사 등록(날짜 팝오버), 비밀번호 초기화·일괄 작업, 사용자 활동 로그(적재 지연 최대 2분)도 남았다.
  - 업무 흐름이 방문하지 않는 기능 29개와, DB 벤더 증거 입력인 시험만 방문하는 기능 13개는 다음 묶음이다. 뒤의 것은 시험 파일을 고치면 DB 벤더 증거를 다시 기록해야 해 재기록 묶음에서 다룬다.

## Spring Boot 4 호환 실측

2026-09-23 GAP-DEP-002(Boot 3.5 라인 OSS 지원 종료·미수정 CVE 16건)의 라인 결정에 앞서, `main`(c58bb9e89) 기준
별도 워크트리에서 **Spring Boot 4.0.8**(Framework 7.0.9·Security 7.0.7·Integration 7.0.6·Jackson 3.1.5·Hibernate 7.2.24·
Tomcat 11.0.24)로 올렸을 때 컴파일이 어디서 막히는지를 반복 실측했다. 목적은 이행이 아니라 **표면 측정**이며,
프로브 보정은 원본에 반영하지 않았다(로컬 브랜치 `probe/boot4-compat`, 워크트리 `D:/project/egov-boot4-probe`).
`./gradlew compileJava compileTestJava --continue`를 13회 반복하며 한 층씩 막힌 원인을 걷어낸 뒤, 전체 Spring
컨텍스트 기동과 eGovFrame 암호 실행까지 측정했다.

### 결과 — 본체·testFixtures 컴파일 통과까지 필요한 변경

| 축 | 변경 | 근거 |
|---|---|---|
| 빌드 — BOM·플러그인 | Boot 플러그인·`spring-boot-dependencies` 3.5.16 → 4.0.8, springdoc 2.8.5 → 3.1.1, spring-boot-admin 3.4.1 → 4.1.2 | Boot 4 BOM 실측 |
| 빌드 — 오버라이드 | `jackson-bom.version` 2.21.5 오버라이드 제거(Boot 4 는 Jackson 3 BOM 좌표, Jackson 2 는 `jackson-2-bom` 2.21.5 로 별도 관리) · `tomcat.version` 10.1.59 오버라이드 제거(Boot 4 는 Tomcat 11 이라 다운그레이드가 됨) | 1차 해석 실패 |
| 빌드 — 관리 이탈 | `spring-retry` 가 BOM 관리에서 빠져 버전 명시 필요(2.0.13) · `spring-boot-starter-aop` → `spring-boot-starter-aspectj` 개명 · Flyway autoconfig 가 `spring-boot-flyway` 모듈로 분리돼 의존 추가 필요 | 2·3·8차 |
| 빌드 — 테스트 | Boot 4 테스트 모듈 분할: `DataJpaTest`·`AutoConfigureMockMvc`·`AutoConfigureTestDatabase` 는 `spring-boot-starter-data-jpa-test`·`spring-boot-starter-webmvc-test`·`spring-boot-starter-jdbc-test` 계열 · Testcontainers 2.0.5 좌표 개명(`testcontainers-postgresql`·`-mariadb`·`-mysql`·`-mssqlserver`·`-oracle-free`·`-junit-jupiter`) · testFixtures 의 Jackson 2 모듈(`jackson-datatype-jsr310`·`jackson-module-parameter-names`) 명시 | 6~8차 |
| 본체 코드 | `-Werror` 아래 Framework 7 deprecation: `org.springframework.lang.NonNull/Nullable` → JSpecify(foundation 42건, 온라인 모듈 전체 51파일 사용) · `@EntityScan` → `org.springframework.boot.persistence.autoconfigure` · `DataSourceAutoConfiguration` → `org.springframework.boot.jdbc.autoconfigure` · `MultipartProperties` → `org.springframework.boot.servlet.autoconfigure` · Security 7 `AuthorizationManager.check` → `authorize(Supplier<? extends Authentication>, T)`(`OperationAuthorizationManager`) · `FlywayMigrationStrategy`(위 모듈 추가 후 재배치) | 2~8차, 6파일 |
| 테스트 코드 | `HibernatePropertiesCustomizer` → `org.springframework.boot.hibernate.autoconfigure` 외 위 테스트 모듈 재배치 | 7~8차 |

13차에 **`compileJava`·`compileTestFixturesJava`·`compileTestJava` 가 5개 모듈 전부 통과**했다(BUILD SUCCESSFUL).
위 표의 빌드·코드 보정 외에 추가로 필요했던 것은 `spring-boot-starter-test` → `spring-boot-starter-test-classic`(테스트
slice 모듈 분할을 다시 모으는 starter), `WebMvcTest`·`AutoConfigureMockMvc` 등의 패키지 재배치(25+4 파일), Spring Messaging 7
에서 모호해진 `convertAndSend(String, Map)` 오버로드 1건이다.

### 결과 — 런타임(컨텍스트 기동·eGovFrame)

컴파일이 끝난 뒤 전체 Spring 컨텍스트를 올려 봤다(`@SpringBootTest(classes = ApiServerApplication.class)`). 두 층이 더 막혔고
둘 다 **메이저 축 전환**이라 이행 비용의 실제 무게는 여기에 있다.

| 막힌 층 | 증상 | 뜻 |
|---|---|---|
| JUnit | `NoSuchMethodError: ExtensionContext$Store.computeIfAbsent(...)` (SpringExtension) | Boot 4 BOM 은 **JUnit Jupiter 6.0.3** 을 관리한다. 저장소는 `junit-bom:5.12.2` + `resolutionStrategy` 로 platform 1.11.4·jupiter 5.11.4 를 강제하는데, Spring 7 의 `SpringExtension` 은 JUnit 6 API 를 요구한다. 고정을 풀자 해소됐다(JUnit 5 → 6 메이저 이행이 전제) |
| Jackson | `NoSuchBeanDefinitionException: com.fasterxml.jackson.databind.ObjectMapper` | Boot 4 는 **Jackson 3**(`tools.jackson`)가 기본이라 자동 설정이 Jackson 2 `ObjectMapper` 빈을 더 이상 만들지 않는다. 그 타입을 주입받는 빈이 컨텍스트 로드 단계에서 실패한다(실측: `AttachmentIntegrityReportStore`) |

⚠ **애노테이션은 영향이 없다.** Jackson 3 도 `com.fasterxml.jackson.annotation` 패키지를 유지하므로 DTO 의 `@JsonProperty`·
`@JsonInclude` 38파일은 그대로다. 이행 대상은 `databind`·`core` 를 쓰는 **main 11파일**(migration-tool 6 · 온라인 5)이다.

Jackson 2 `ObjectMapper` 를 임시 빈으로 공급하자 **컨텍스트가 올라왔다** — `SecurityHardeningRegressionTest` 3/3 통과.
그 컨텍스트에는 `ProjectCryptoConfig` 의 eGovFrame 빈(`EgovARIACryptoServiceImpl`·`EgovPasswordEncoder`)이 포함된다.
이어서 eGovFrame 암호를 실제로 호출하는 테스트도 통과했다 — `CryptoUtilTest`(ARIA 암·복호, 약한 키 경고, 레거시 래퍼) **18/18**,
`RrnoEncryptionConverterTest`(주민번호 암호화 컨버터) **9/9**.

⚠ 즉 **가장 큰 미지수였던 eGovFrame 5.0.0 의 Spring Framework 7 런타임 호환은 이 범위에서 확인됐다.** Spring 6 기준으로
컴파일된 eGovFrame jar 가 Framework 7 위에서 빈 생성·암호 연산을 수행했다. 다만 이것은 컨텍스트 기동과 암호 경로의 증거이며,
eGovFrame 의 배치·엑셀·ID 생성 등 다른 모듈의 런타임 증거는 아니다.
### 4.1.1 재실측 — 전체 검증 (2026-09-24)

전환 목표가 다음 minor 이므로 같은 프로브에 `main`(2071e5984)을 병합하고 **Boot 4.1.1**(현재 최신 GA, 4.2 는 M1)로 올려
위에서 측정하지 않은 항목을 전부 돌렸다. 4.0.8 → 4.1.1 에서 새로 막히는 컴파일은 없었다.

첫 전체 테스트는 3,778건 중 **206건이 실패**했고(하네스 98건은 통과) 그중 205건이 Jackson 2 `ObjectMapper` 빈 부재였다(테스트 64파일이 필드로
주입받고, 본체 `AttachmentIntegrityReportStore` 가 주입받아 business-core·app 통합 컨텍스트가 연쇄로 뜨지 못했다). 그래서
Boot 4 의 **Jackson 2 호환 모듈** `spring-boot-jackson2`(deprecated)를 붙이고 HTTP 변환기를
`spring.http.converters.preferred-json-mapper: jackson2` 로 두었다. 이 모듈은 테스트 슬라이스(`AutoConfigureJson`)에도 등록된다.

| 검증 | Boot 4.1.1 + Jackson 2 호환 결과 | 비교 |
|---|---|---|
| 전 모듈 컴파일 | 통과 | — |
| 전체 테스트(JUnit 6) | 3,778건 중 실패 2 | 둘 다 아래 ② 의 standalone MockMvc — 원인 확정 |
| 하네스 | 98/98 | — |
| 실제 PostgreSQL 스키마 검증 | 74/74 | Hibernate 7.2 매핑·Flyway 새 모듈·Testcontainers 2.x |
| PIT(foundation-jwt) | 63 중 59 사멸(94%), 테스트 강도 97% | main 과 같다(DEC-OPS-094) |
| `api-docs.json` | 줄 끝을 맞추면 **바이트까지 동일** | 생성 zod·타입 무변경 |
| 격리 E2E | 136건 기대대로, 재시도 통과 0 | main 도 같다 |

**JUnit 6 는 코드 비용이 거의 없다** — 전체 테스트와 PIT(JUnit 5 플러그인 1.2.1)가 그대로 돌았다. eGovFrame 은 본체가 쓰는
것이 암호 계열(ARIA·비밀번호 인코더·환경 암호 서비스)뿐이라, 위 "암호 외 모듈" 은 측정할 런타임 사용처가 없다.

**전환에서 챙길 것** — ①·⑤·⑥은 테스트와 E2E 가 **모두 통과하는 채로** 조용히 바뀌므로 점검 목록으로 둔다.

1. **Jackson 설정 키** — Boot 4 에서 `spring.jackson.*` 은 Jackson 3 에만 적용된다. 앱의 `fail-on-unknown-properties: true`
   등을 `spring.jackson2.*` 로도 주지 않으면 **모르는 필드가 든 요청의 거부가 풀린다.**
2. **Jackson 2 타입을 쓰는 DTO** — `MemoInstructionRequest` 의 `JsonNode` 필드는 Jackson 3 변환기에서 500 이다. 호환 모듈
   단계에서는 문제가 없고 Jackson 3 단계의 이행 대상이다. 남은 테스트 실패 2건은 standalone MockMvc 가 Boot 설정 밖에서
   Spring 7 기본값(Jackson 3)을 써서 이 DTO 를 읽지 못한 것이다.
3. **Spring 7 내부 필드 변경** — `EgovMessageConfigTest` 가 리플렉션으로 읽던 `defaultEncoding` 이 `defaultCharset` 으로
   바뀌었다. 게터로 읽으면 Spring 6·7 양쪽에서 통해 먼저 반영할 수 있다(반영함).
4. **Hibernate 7 로그** — SQL 오류가 `SqlExceptionHelper` ERROR 대신 `org.hibernate.orm.jdbc.error` WARN 으로 남는다.
   로그 등급·이름으로 경보를 거는 곳이 있으면 바뀐다. Hibernate Validator 9 는 `List` 에 붙인 `@Valid` 를 deprecated 로
   경고한다(E2E 로그 11건 — 원소 타입에 옮긴다).
5. **추적이 꺼진다** — Boot 4 는 추적 자동 설정을 actuator 에서 `spring-boot-micrometer-tracing*` 모듈로 뺐다.
   `micrometer-tracing-bridge-otel`·OTLP 라이브러리만 있으면 Tracer 가 생기지 않아 로그의 `[traceId-spanId]` 와 OTLP
   내보내기가 사라진다. `spring-boot-starter-opentelemetry` 를 붙이자 되살아났다. 메트릭(Prometheus)은 영향이 없다.
6. **스케줄 작업 스레드** — `@Scheduled` 작업이 main 에서는 `scheduling-*` 스레드에서, Boot 4 에서는 WebSocket 브로커 스케줄러
   (`MessageBroker-*`)에서 돈다. 하트비트용 풀을 나눠 쓰게 되므로 전용 스케줄러를 명시한다.

E2E 백엔드 로그의 "사용자 활동 로그 누적 실패"·`tb_user_log` 외래 키 위반 약 40건은 main(Boot 3.5.16)에도 같은 수가 있어
**Boot 4 와 무관**하다.

### 측정하지 않은 것

- Jackson 3 로 옮긴 뒤의 응답 직렬화 차이 — 위 결과는 호환 모듈로 Jackson 2 를 유지한 상태다.
- 재사용 생성기(`base:verify`) 세 프로필과 PIT 나머지 스코프, CodeQL·릴리스 이미지 빌드 — CI 에서만 도는 경로다.
- 호환 모듈 `spring-boot-jackson2` 의 제거 시점 — deprecated 로 표시돼 있고 제거 버전은 확인하지 않았다.

### 지원 라인 선택지

지원 종료일은 2026-09-23 [endoflife.date](https://endoflife.date/spring-boot) 조회다. 상용 지원은 Broadcom 의
유료 구독(Tanzu Spring)을 뜻하며, 패치가 Maven Central 이 아니라 **구독자 전용 비공개 저장소**로만 배포된다.

| 라인 | OSS 지원 종료 | 상용 지원 종료 |
|---|---|---|
| Boot 3.5 · Framework 6.2 (전환 전) | 2026-06-30 | 2032-06-30 |
| Boot 4.0 · Framework 7.0 | 2026-12-31 · 2027-07-31 | 2027-12-31 · 2028-07-31 |
| Boot 4.1 (현행, [ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md)) | 2027-07-31 | 2028-07-31 |

⚠ **상용 지원(ⓑ)은 이 저장소가 내릴 수 있는 결정이 아니다.** 여기는 재사용 템플릿이고 구독 자격증명은 저장소·CI·
생성 산출물 어디에도 넣을 수 없으므로, 도입 기관이 각자의 구독으로 선택하는 축이다(이미 구독이 있는 기관에는 코드
변경 0 인 선택지다). eGovFrame 센터가 Spring 패치를 백포트하지 않으므로 그 경로도 ⓑ 의 대안이 아니다.

⚠ ⓐ 를 택할 때 목표는 4.0 이 아니라 **다음 minor** 다. 4.0 의 OSS 지원은 2026-12-31 에 끝나므로 지금 4.0 으로 올리면
연내에 다시 올려야 한다. OSS 라인을 따라가는 선택은 minor 상향이 정례 작업이 된다는 뜻이다.

### 판정

컴파일 수준의 이행 표면은 **작다**(빌드 보정 약 14건, 본체 7파일, 테스트 import 재배치 30여 파일). 가장 컸던 미지수인
**eGovFrame 런타임 호환은 확인됐다.** 대신 실측이 드러낸 진짜 비용은 **두 개의 메이저 축 전환**이다.

1. **JUnit 5 → 6** — Boot 4 가 Jupiter 6.0.3 을 관리하고 Spring 7 의 `SpringExtension` 이 그 API 를 요구한다. 선택이 아니라 전제다.
2. **Jackson 2 → 3** — 자동 설정이 Jackson 2 `ObjectMapper` 를 주지 않는다. main 11파일이 대상이고, 응답 직렬화 계약(`api-docs.json`·생성 zod)에 주는 차이는 아직 측정하지 않았다.

두 축 모두 이 저장소의 게이트(생성 계약·하네스·PIT·재사용 산출물)가 직접 보는 영역이라, 이행은 "버전만 올리는 일" 이 아니다.
다음 단계는 사용자 결정(ⓐ 전환 ADR → 두 축의 이행 계획과 게이트 영향 산정 / ⓑ 상용 지원 / ⓒ accepted-risk)이며 GAP-DEP-002 가 추적한다.

**2026-09-24 재실측으로 판정을 고친다.** JUnit 6 는 전제이지만 코드 비용이 거의 없고, Jackson 3 는 호환 모듈로 뒤로 미룰
수 있다. 그래서 ⓐ 는 두 단계로 나뉜다.

1. **Boot 4.1 + Jackson 2 호환** — 빌드 보정과 위 "전환에서 챙길 것" ①·③~⑥. 테스트·하네스·스키마·PIT·E2E·API 계약이
   이 단계에서 유지됨을 확인했다. 4.1 의 OSS 지원은 2027-07-31 까지다.
2. **Jackson 3 이행** — 본체 11파일·테스트 64파일, Jackson 2 타입 DTO, standalone MockMvc 테스트, `spring.jackson2.*` →
   `spring.jackson.*` 되돌림. 호환 모듈이 deprecated 이므로 그 제거 전에 마쳐야 한다.

### 1단계 적용 결과 (2026-09-24)

[ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md) 1단계를 `main`(04db2b3c5) 위에 정식
변경으로 옮겼다. 프로브와 달리 `-Werror -Xlint:deprecation`을 끄지 않았고, 프로브 보정 표식을 모두 걷었다. 적용하면서
프로브가 보지 못한 것이 다섯 드러났다. 모두 테스트가 통과한 채로 지나갈 수 있던 것이다.

| 발견 | 증상 | 조치 |
|---|---|---|
| 테스트와 운영의 JSON 변환기 불일치 | api-server 테스트 `application.yml`이 main의 같은 이름 파일을 가려, 테스트 컨텍스트에만 매퍼 선택이 없었다. 테스트는 Jackson 3, 운영·E2E는 Jackson 2로 HTTP 본문을 읽었다. 프로브의 "전체 테스트 실패 2"는 이 차이를 가리고 있었다. | 테스트 설정에 같은 선택을 두고 [동등성 테스트](../../api-server/src/test/java/nuri/api/config/JsonConverterParityIntegrationTest.java)로 고정. 두 매퍼에서 해석이 갈리던 `MemoInstructionRequest`는 `Object` 위임 생성자로 바꿨다. WebSocket 메시지 변환도 같은 매퍼에 둔다. |
| `@Scheduled` 스레드 | Boot는 `TaskScheduler` 빈이 하나라도 있으면 기본 스케줄러를 만들지 않는다. WebSocket 브로커의 스케줄러 때문에 로그 누적 작업이 `MessageBroker-*`에서 돌았다. | Boot 빌더로 `taskScheduler` 명시, [스케줄러 테스트](../../foundation/src/test/java/nuri/foundation/core/config/SchedulingTaskSchedulerTest.java) |
| HV000271 | 컨테이너에 붙인 `@Valid`가 Hibernate Validator 9에서 deprecated다(E2E 로그 11건). | DTO 8곳·컨트롤러 파라미터 4곳을 원소 타입으로. 입력 계약 게이트가 원소 타입 `@Valid`를 요구하고 컨테이너 쪽을 거부한다. |
| JSpecify와 springdoc | JSpecify `@NonNull`은 TYPE_USE 전용이라 springdoc이 필드 선언에서 읽지 못해 `UserAuthorityDto.scrtyDcsnTrgtId`의 required가 빠졌다. Lombok null 검사는 이름으로 인식해 종전과 같다(null 검사 클래스 10개 동일). | `@Schema(requiredMode = REQUIRED)`로 보존. `api-docs.json` 차이는 설명 문구 한 줄뿐이다. |
| JSpecify와 결합 스캐너 | `pkg.@NonNull Type` 형태가 한정 이름을 쪼개 결합 원장의 edge 하나를 가렸다. | import와 단순 이름으로 되돌림 |

PR의 dependency review가 하나를 더 잡았다. 4.1.1 BOM의 Tomcat 11.0.24에는 10.1.x에서 막았던 Critical 3건
(GHSA-gcx9-497g-6cp6·GHSA-9xv2-5v5q-p794·GHSA-h3x4-894j-xpx5, 수정 11.0.25)이 그대로 걸려, 첫 적용본이 "BOM이
수정선을 충족한다"고 적은 주석은 틀렸다. WebSocket 보안 제약 우회 등 Important 수정을 더 담은 11.0.26으로 고정했다.

그 밖에 okhttp 5 경유 `kotlin-stdlib`가 1.9.25에서 2.3.21로 바뀌어 NVD 오탐 억제의 버전을 옮겼고, SAST 예외 4건의 보완
소스를 재검토해 해시를 재결속했다. Testcontainers 2의 컨테이너 클래스가 제네릭이 아니어서 CI 이미지 사전 pull 계약의
정규식을 두 형태 모두 읽게 고쳤다.

로컬 검증: 5개 모듈 컴파일(`-Werror`), 전체 테스트 3,788건(foundation 338·business-core 962·business-app 841·
api-server 689·migration-tool 958), 하네스 99/99, SAST 예외 계약 17/17. migration-tool의 자식 JVM 종료·재개 시험
1건은 Docker 재기동 직후 다른 컨테이너와 겹친 부하에서 90초 제한을 넘었고, 단독 재실행에서 82초(재개 단계 21초)로
통과했다. `api-docs.json`은 설명 문구 한 줄만 달라 생성 계약은 그대로다. 실제 PostgreSQL 스키마 검증·PIT·격리 E2E·
재사용 산출물 세 프로필은 PR의 required CI로 확인한다.

⚠ **2단계에 쓸 사실 하나.** 프로브의 전체 통합 테스트는 모르는 사이 HTTP 본문을 Jackson 3로 검증했고,
`JsonNode` DTO 하나 말고는 통과했다. Jackson 3 변환기 쪽 HTTP 계층의 위험은 그만큼 작다는 증거다.

### 2단계 적용 결과 (2026-09-24)

온라인 앱의 HTTP·WebSocket 변환기와 Boot 매퍼를 Jackson 3로 옮기고 호환 모듈 `spring-boot-jackson2`를 걷었다.
본체 5개·테스트 57개 파일이 `tools.jackson`으로 옮겨졌다.

**wire 규칙은 설정 두 줄로 유지한다.** Jackson 3는 기본값이 바뀌었다(날짜 타임스탬프, primitive의 null, 뒤따르는 토큰,
속성 알파벳 정렬, 파라미터 이름 감지 등). `spring.jackson.use-jackson2-defaults: true`는 Boot가 Jackson 3의
`MapperBuilder.configureForJackson2()`를 부르게 해 대부분을 되돌린다. 다만 그 메서드는 순수 Jackson 2 기본값이라
파라미터 이름 감지를 끈다 — Boot 3.5는 파라미터 이름 모듈을 등록해 켜 두었으므로
`spring.jackson.mapper.detect-parameter-names: true`로 되돌렸다.
[동등성 테스트](../../api-server/src/test/java/nuri/api/config/JsonConverterParityIntegrationTest.java)가 Boot 매퍼의 기능값 8개를 고정한다.

| 발견 | 증상 | 조치 |
|---|---|---|
| 알 수 없는 필드 메시지 | 예외 처리기가 원인을 Jackson 2 예외 타입으로 판별해, Jackson 3 변환기에서는 조용히 빗나가 필드 이름이 없는 일반 메시지가 된다. 기존 단위 테스트는 원인 예외를 직접 만들어 넣어 이것을 보지 못한다. | Jackson 3 타입으로 판별하고, 실제 변환기를 거치는 테스트를 추가 |
| `api-docs.json` 포맷터 | 빈 컨테이너를 `[]`로 쓰던 PrettyPrinter 서브클래스가 Jackson 3 API와 맞지 않았다. | Jackson 3 `Separators`의 빈 컨테이너 구분자로 대체. 재생성본이 main과 바이트까지 같다 |
| 기계적 이름 바꾸기 | JsonNode의 `fields()` → `properties()` 치환이 같은 이름의 record 접근자 17곳까지 건드렸다(H4). | 컴파일 오류로 드러나 그 파일만 되돌림 |
| SAST 예외의 행 결속 | FP-008 탐지 파일에 주석 한 줄을 더하면 탐지 행(69)이 밀려 CodeQL 예외가 빗나간다. | 줄 수를 유지하고 보완 소스를 재검토 |

**migration-tool은 Jackson 2에 둔다.** 온라인 앱과 분리된 CLI라 Boot의 HTTP 변환기를 쓰지 않고, 승인 산출물이
정규화 JSON의 digest에 결속돼 직렬화가 조금만 달라져도 기존 승인이 무효가 된다. deprecated인 것은 Boot 호환
모듈이지 Jackson 2 자체가 아니다(DEC-OPS-124).

로컬 검증: 전체 테스트 3,790건(foundation 339·business-core 962·business-app 841·api-server 690·migration-tool 958).
migration-tool 종료·재개 시험 1건은 1단계와 같은 부하 조건에서 90초를 넘었고 단독 재실행에서 통과했다.
하네스 99/99, SAST 예외 계약 17/17, `api-docs.json` 바이트 동일, red 증명 3종(예외 타입 오판·Jackson 2 기본값
제거·파라미터 이름 끄기가 각각 해당 테스트만 실패).

### 후속 정리 (2026-09-24)

**NVD 확인.** #734 병합 뒤 main(f93c19d7c)에서 주간 스캔을 수동 실행했다(run 35968660686). 억제되지 않은 CVSS 7 이상
탐지가 기준선(2026-09-20 주간 실행) **198건 → 0건**이다. 모듈별 전체 탐지도 약 300건에서 6건(모두 7 미만)으로 줄었고,
Spring Framework 6.2.19(12종)·Security 6.5.11(2종)·Integration 6.5.10(3종)의 CVE가 모두 사라졌다. 리포트는 루트와 5개
모듈(migration-tool 포함) 6개다. kotlin-stdlib 2.3.21·OpenTelemetry 오탐은 기한부 억제가 적용됐다.

**테스트 starter 축소.** 이행용 `spring-boot-starter-test-classic`을 기술별 test starter로 좁혔다. 공통은
`spring-boot-starter-test`이고, business-core 테스트 픽스처가 webmvc·data-jpa·security·opentelemetry test starter를,
api-server가 직접 쓰는 webmvc·security·opentelemetry test starter를 선언한다. 5개 모듈의 테스트 실행 클래스패스를
main과 비교했을 때 빠진 것은 쓰지 않는 test 모듈(cache·data-cassandra 등 20여 개)뿐이고 공통 라이브러리의 버전
변화는 0건이다. 조심할 곳은 import 없이 클래스패스만으로 동작하는 두 모듈이다.

| 모듈 | 빠뜨리면 | 고정 |
|---|---|---|
| security-test | `@WebMvcTest`가 앱의 보안 필터를 빼고 MockMvc가 테스트 보안 컨텍스트를 잃는다 | 두 선언처에서 빼면 `ApiSecurityConfigTest` 2건 red(실측) |
| opentelemetry-test | 전체 컨텍스트 테스트에서 메트릭·추적 export가 켜지고 OTLP가 기본 주소로 전송을 시도한다 — 어떤 테스트도 실패하지 않는다 | [관측성 차단 테스트](../../api-server/src/test/java/nuri/api/config/TestObservabilityIsolationIntegrationTest.java) 신설, 빼면 red(실측) |

**spring-retry는 유지한다.** Spring Framework 7 core retry(`@EnableResilientMethods`·`org.springframework.resilience`의
`@Retryable`)로 옮기는 안을 조사 1건과 반박 검증 3건으로 검토했고, 옮기지 않기로 했다. 근거는 넷이다.

1. **동작이 바뀐다.** Spring 7에는 `@Recover`가 없어 대체 처리를 호출부 catch로 옮겨야 한다. 그러면 (가) SMS 발송
   루프에서 `NoClassDefFoundError` 같은 `Error`가 루프를 멈춰 남은 수신자가 `P`로 남고(지금은 `ExhaustedRetryException`
   으로 감싸져 다음 수신자로 넘어간다), (나) 백오프 중 인터럽트가 지금과 달리 `F` 기록을 시도하며, (다) 지연값
   placeholder 해석 실패가 발송 없이 모든 메일·SMS를 `F`로 기록하는 경로가 생긴다. 시도 횟수 표기도 다르다
   (`maxAttempts=3`은 `maxRetries=2`).
2. **공급망 이득이 없다.** spring-retry 2.0.13은 사용처 0건인 Spring Batch(spring-batch-infrastructure 6.0.5, compile)
   경유로 api-server bootJar에 그대로 남는다.
3. **헌법 문구가 바뀐다.** 백엔드 헌법 제10조 1항이 'Spring Retry'와 '@Recover'를 명시한다 — 사용자의 명시적 요청이 필요하다.
4. **지금 동작한다.** Framework 7.0.9에서 재시도 경계 테스트(발송 3회 시도·커밋 재시도·소진 후 기록)가 모두 통과한다.

재검토 조건: Framework 7 minor에서 spring-retry 호환이 깨지거나, Spring Batch·egovframe-rte-bat-core 의존을 걷어
spring-retry가 bootJar에서도 빠질 때. 그때는 위 세 가지 의미 차이를 테스트로 먼저 고정한 뒤 옮긴다.

2026-10-19 Spring Batch·egovframe-rte-bat-core 를 사용처 0건으로 걷었다(품질 평가 과제 7). spring-retry 는 foundation·business-core·business-app 이
직접 선언하므로 bootJar 에 그대로 남는다 — 재검토 조건의 둘째(bootJar 에서도 빠질 때)는 성립하지 않고, 유지 판단은 그대로다.

## 통합 검토 후속 (2026-09-25)

Gemini·Codex 작업 브랜치(도메인 정합성·코어 개선)를 main에 통합하며 검토한 결과, 아래 결함을 근본에서 고쳤다.
결정은 [DEC-OPS-131](../../.agent/memory/decisions.md)이다.

| 대상 | 발견 | 수정 | 회귀 검증 |
|---|---|---|---|
| 통계 | 날짜를 호출부마다 바로 해석해 형식 오류가 500이었다. 컨트롤러가 부르지 않는 조회 7개가 남아 있었고, 그중 목록 쿼리는 없는 컬럼을 가리켰다. | 기간 해석을 한 곳에 모아 형식 오류·역순 기간을 400으로 거부하고, 호출처 없는 조회와 전용 쿼리를 걷었다. | [서비스](../../business-core/src/test/java/nuri/business/service/stats/ReportStatsServiceTest.java) |
| 대시보드 | 오늘 게시글 수를 5초 방송마다 날짜별 GROUP BY로 세어 합쳤다. 연결 상태 문구가 집계 가용 여부를 섞어 말했고, 모든 사용자의 미읽음 합계를 '알림'이라는 이름과 빨간 강조로 보였다. | 기간 COUNT 포트를 두고 같은 한국 날짜에서 30초 재사용한다(실패는 재사용하지 않는다). 연결 상태는 연결만 말하고, 카드는 '전체 미읽음 알림'으로 부른다. | [서비스](../../business-app/src/test/java/nuri/business/service/dashboard/RealTimeDashboardServiceTest.java), [COUNT 경계](../../business-app/src/test/java/nuri/business/domain/board/BoardPostDateStatsTest.java), [화면](../../frontend/src/components/features/dashboard/__tests__/RealTimeDashboard.test.tsx) |
| 커뮤니티 | 탈퇴 전이가 서비스에만 있어 도달할 수 없었고, 탈퇴한 사용자가 다시 가입하면 409였다. 운영자 위임은 `mngrYn`을 읽는 인가 판정이 없어 켜도 아무 권한이 생기지 않았다. | 본인 탈퇴와 관리자 강제 탈퇴 경로를 잇고, 재가입은 같은 행을 새 신청으로 되돌린다. 운영자 위임은 걷었다. | [서비스](../../business-app/src/test/java/nuri/business/service/community/CommunityServiceImplTest.java), [관리 화면](../../frontend/src/components/business/community/__tests__/CommunityMembersPanel.test.tsx), [상세 화면](../../frontend/src/app/cop/cmy/selectCommunityDetail/[id]/CommunityDetailHubClient.pending.test.tsx) |
| HPCM | 목록과 같은 값을 주는 단건 조회를 화면 고아 래칫을 내리려고 배선했다(DEC-OPS-062 위반). | 배선과 래칫 변경을 되돌렸다. | [operation census](../../config/governance/operation-consumer-census.json) |
| 폼 검증 census | 쓰기 동사 어휘에 `withdraw`가 없어 강제 탈퇴 버튼이 탐지되지 않았다(`leave`는 있었다). | 쓰기·파괴 동사에 `withdraw`를 더하고 탐지 계약에 사례를 추가했다. | [census 계약](../../frontend/scripts/frontend-form-validation-census.test.mjs) |

게시글 생성 이벤트(`PostCreatedEvent`)는 마지막 구독자였던 대시보드가 DB 집계로 바뀌어 저장소 안 구독자가 없다.
파생 제품의 확장 지점으로 남기고 클래스 주석과 README 예시를 사실에 맞췄다. 대시보드 게시글 COUNT가 쓰는
`crt_dt` 범위 조건의 인덱스는 사용자 승인 뒤 V2_105로 따로 넣었다(아래 절).

red 증명은 수정마다 되돌려 새 테스트만 실패하는 것으로 확인했다: 통계 5건, 대시보드 TTL 1건, 커뮤니티 재가입·타인
탈퇴 차단 2건, 화면 6건, census 어휘 1건.

### 게시글 작성일 인덱스 (2026-09-25)

OCI 읽기 실측에서 `tb_bbs_item`에는 PK·스레드 위치·작성자·첨부·상위 글 인덱스만 있고 `crt_dt` 인덱스가 없었다.
현재 378행(304kB)이라 대시보드 조건의 실행 계획은 순차 스캔(비용 25)이다. 그래도 넣은 이유는 부하의 형태다.
대시보드는 인스턴스마다 30초에 한 번 모든 게시판의 오늘 건수를 세고 게시물 통계도 같은 범위를 집계하므로,
인덱스가 없으면 사용자 활동과 무관하게 게시글 전체를 계속 훑고 그 비용이 게시글 수에 비례해 커진다.
로그 날짜 인덱스(V2_97)와 같은 방식으로 `ix_tb_bbs_item_crt_dt`를 잠금 5초·실행 60초 제한 안에서 만든다.

[마이그레이션 검증](../../api-server/src/test/java/nuri/api/schema/BoardPostDateIndexMigrationIntegrationTest.java)은
게시글 1만 행에서 잠금 경합 시 인덱스 없이 롤백되는 것, 적용 뒤 행 수 보존, 대시보드 오늘 건수·통계 날짜별 집계와
같은 조건의 실행 계획이 인덱스를 쓰는 것을 확인한다. 인덱스를 다른 컬럼에 만들면 계획 단언이 실패한다.
게시판 목록의 작성일 정렬은 대부분 게시판 조건과 함께 쓰이므로 이 인덱스의 효과를 주장하지 않는다.
대규모 운영 복제본은 유지보수 창에서 생성 시간을 먼저 측정한다.

## 프록시 연결 재사용 경합 (GAP-FE-002, 2026-09-30)

main CI run 36648015885(attempt 1, e2e 2/2)에서 `GET /api/v1/notifications` 가 한 번 500 이 됐고 frontend.log 에
`Failed to proxy http://127.0.0.1:8080/api/v1/notifications Error: socket hang up`(code `ECONNRESET`)이 남았다.

**확인한 사실**

- Next 16.3.6 의 rewrite 는 `proxy-request.js` 에서 agent 없이 httpxy `ProxyServer` 를 만든다. 실패하면 `Failed to proxy` 를 남기고 500 을 쓴다.
- compiled httpxy 는 `http.globalAgent` 가 아니라 모듈 전역 전용 Agent `{keepAlive: true, maxSockets: 256, maxFreeSockets: 64}` 를 쓴다. 이 Agent 에는 timeout 이 없다. Node 22 는 서버의 `Keep-Alive: timeout=N` 힌트를 기존 agent timeout 보다 작을 때만 적용하므로, 유휴 소켓은 클라이언트 쪽에서 무기한 풀에 남는다.
- 백엔드는 Boot 4.1.1·Tomcat 11.0.26 기본값이다. `server.tomcat` 설정이 없어 connectionTimeout·keepAliveTimeout 이 20초이고, 응답에 `Keep-Alive: timeout=20` 을 싣는다.
- 그래서 유휴 수명이 "클라이언트 무기한 > 서버 20초" 로 역전돼 있다. Tomcat 유지 시간을 늘려도 경합 경계가 뒤로 밀려 빈도만 줄어들 뿐 역전은 그대로다.
- CI 발생 빈도: e2e-diagnostics 아티팩트가 남은 run 190개 중 frontend.log 기준 1건이다. 09-26 run 36214940019 의 Playwright `read ECONNRESET` 1건은 frontend.log 에 흔적이 없어 같은 원인으로 확정하지 않았다. 아티팩트 보관 기간(7일) 밖인 run 은 판정할 수 없다.
- API 컨테이너는 두 경우 모두 재시작 없이 healthy 였다. API 로그는 e2e 진단 아티팩트에 없다.

**재현 (격리 Tomcat 11.0.26 컨테이너, 기본 `connectionTimeout="20000"`, Node 22.17)**

httpxy 와 같은 설정의 Agent 로 한 번 요청한 뒤 유휴 시간을 두고 같은 Agent 로 다시 요청했다.

| 조건 | 결과 |
|---|---|
| 이벤트 루프가 한가함. 유휴 19.0~21.0초, 8구간 × 3회 | 실패 0/24. 20.05초부터는 Node 가 서버의 FIN 을 먼저 처리해 새 연결로 요청했다(`reusedSocket=false`). |
| 19.8·19.9·19.95초에 깨어나 이벤트 루프를 400ms 점유한 뒤 요청, 각 5회 | **실패 15/15**. 모두 재사용 소켓이고 `socket hang up`(code `ECONNRESET`) 이다. |
| 대조군: 20.1초에 깨어나 400ms 점유 | 실패 0/5 |

결론: 서버가 20초 유휴 종료로 연결을 닫는 순간 Next 의 이벤트 루프가 SSR 등으로 바빠 FIN 을 처리하지 못하면, 풀은 그 소켓을 아직 살아 있다고 보고 요청을 싣는다. CI 로그와 같은 오류가 결정적으로 재현된다. CI 에서 실패한 요청이 실제로 재사용 소켓이었는지는 직접 측정하지 않았다.

**아직 모르는 것과 경계**

- **운영 형상 확인(2026-09-30)**: edge nginx 는 비업그레이드 요청에 `Connection: close` 를 싣는다(`config/edge/default.conf.template` 의 `map $http_upgrade` 기본값 `close`). 같은 main 소스를 `next start`(운영 빌드·미들웨어 포함)로 띄우고 요청 헤더와 연결을 기록하는 가짜 백엔드로 확인했다. 들어온 요청이 `Connection: close` 면 백엔드도 `close` 를 받고 요청마다 새 연결이었다(원격 포트 3개 모두 다름). keep-alive 요청은 같은 연결을 재사용했다(원격 포트 1개). 따라서 edge 를 거치는 운영 형상에서는 이 경합이 없고, Next 에 직접 붙는 CI e2e·로컬 개발·edge 없는 배포에서만 생긴다.
- 남은 영향은 CI 의 드문 flaky(재실행 비용)와 edge 없는 배포다. 조치는 동작을 바꾸므로 결정이 필요하다. 후보별 효과가 다르다.
  - 프록시 쪽 유휴 수명을 서버보다 짧게 한다. 원인을 제거하지만 rewrite 는 Agent 를 주입할 수단이 없어 프록시 경로를 바꿔야 한다.
  - 백엔드 요청에 `Connection: close` 를 싣는다. 재사용을 없애지만 요청마다 새 연결을 맺는다.
  - Tomcat 유지 시간을 늘린다. 빈도만 줄어든다.
- 하지 않는다: flaky 차단 계약 완화, 재시도로 덮기, `node_modules` 패치, 측정 없는 timeout 조정.

**조치와 전후 재현 (2026-10-16, DEC-OPS-333)**

설치된 Next 16.4.0 의 `proxy-request.js` 는 agent 를 넘기지 않고 httpxy `ProxyServer` 를 만든다. `rewrites()` 에는 Agent·유휴 수명 설정이 없다. 대신 httpxy 는 요청 `Connection` 헤더가 upgrade 가 아니면 keep-alive 전용 Agent 를 쓰고, `Connection: close` 를 받으면 그 값을 백엔드에 그대로 보내 요청마다 새 연결을 맺는다. 미들웨어의 요청 헤더 덮어쓰기는 rewrite 요청에 반영되고(`next dev` + 기록용 백엔드로 확인: 백엔드가 `connection: close` 와 요청마다 다른 원격 포트를 받았다), `connection` 은 미들웨어 응답 헤더 필터(`ipcForbiddenHeaders`)와 무관한 경로다.

- **치른 비용(적대적 검토 P2)**: httpxy 응답 미들웨어가 백엔드의 `Connection: close` 를 브라우저 응답에도 복사한다. 그래서 edge 없이 Next 를 직접 노출한 배포(HTTP/1.1)에서는 `/api/v1` 호출마다 브라우저↔Next 연결도 새로 맺는다(실측: 클라이언트 free 소켓 0개, 대조군 keep-alive 1개). 운영 형상은 edge 가 이미 비업그레이드 요청에 `close` 를 싣고 로컬 loopback 은 비용이 미미해 영향이 작다. edge 없는 직접 노출 배포는 이 설정과 맞지 않으니 권장하지 않는다.
- 후보 선택: ① Agent 주입은 수단이 없고 ② Tomcat 유지 시간 연장은 경계만 미룬다. ③ 요청에 `Connection: close` 를 싣는 것이 "클라이언트가 먼저 닫는다" 를 구조로 만든다. 비용은 요청마다 새 연결(루프백·같은 망 TCP)이며 edge 운영 형상은 이미 같다.
- (A) 격리 Tomcat 11.0.26(기본 `connectionTimeout=20000`) + 설치된 httpxy + Node 22.23, 이벤트 루프 400ms 점유 후 요청:

| 구간 | 수정 전 | 수정 후 |
|---|---|---|
| 19.8초 점유 | 0/5 실패 | 0/5 |
| 19.9초 점유 | 2/5 실패 (`socket hang up`) | 0/5 |
| 19.95초 점유 | 4/5 실패 | 0/5 |
| 20.1초 점유 | 3/5 실패 | 0/5 |
| 유휴만 19.0~21.0초(8구간×3) | 0/24 | 0/24 |

  수정 전 합계 9/20(재사용 소켓 20/20), 수정 후 0/20(재사용 소켓 0/20). 2026-09-30 기록의 15/15 와 수치가 다른 것은 이번 실행이 다른 에이전트의 Gradle·빌드와 같은 기계에서 돌아 타이머 편차가 컸기 때문이다. 같은 원인(재사용 소켓의 `ECONNRESET`)이고 경계는 같다.
- (B) Playwright 1.63 요청 컨텍스트는 `new http.Agent({ keepAlive: true })`(timeout 없음)를 컨텍스트 수명 동안 쓰고, Node HTTP 서버의 `keepAliveTimeout` 기본은 5초(+1초 버퍼)다. 같은 클라이언트 구성으로 서버를 기본값과 `keepAliveTimeout=3600000` 으로 비교했다(서버 응답 `Keep-Alive: timeout=5` 대 `timeout=3600`).

| 구간(경계 6초) | 기본 서버 | 수정 서버 |
|---|---|---|
| 5.8·5.9·5.95초 점유 후 요청, 각 5회 | 15/15 실패 (`ECONNRESET`, 재사용 소켓) | 0/15 |
| 6.1초 점유(경계 뒤 대조군) | 0/5 | 0/5 |
| 유휴만 5.0~7.0초 | 1/21 실패(5.95초) | 0/21 |

  수정은 러너가 `next start` 에 `--keepAliveTimeout 3600000` 을 넘기는 것이다. 값은 e2e 잡 한도(30분)보다 길어야 하며 계약이 비교한다. 요청 컨텍스트는 한 실행보다 오래 살 수 없으므로 클라이언트 유휴가 서버 유휴를 넘지 못한다.
- 회귀 방지: `scripts/frontend-proxy-keepalive-contract.test.mjs`(운영 계약)가 미들웨어의 `Connection: close` 배선, 러너 인자, 서버 유휴 수명 > e2e 잡 한도, 설치된 Next `proxyRequest` 의 연결 재사용 대조(keep-alive 는 같은 포트 재사용, close 는 요청마다 다른 포트)를 고정하고, `proxy.test.ts` 가 헤더 덮어쓰기와 WebSocket 업그레이드 예외를 고정한다.
- 증명하지 못한 것: CI e2e 의 실제 flaky 감소는 실행이 쌓여야 알 수 있다. 격리 재현은 같은 오류의 결정적 발생과 소멸을 보여 줄 뿐 CI 빈도를 예측하지 않는다. 운영 edge 형상과 `next start` 가 아닌 standalone 서버(`node server.js`, 컨테이너 이미지)의 유휴 수명은 바꾸지 않았다.
