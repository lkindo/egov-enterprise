# Wave 2 이월 과제 — Wave 1 결정 원장의 미이행·오이행 잔여분

> 작성 2026-08-03. 근거: Wave 1 결정 원장(24개 결정 + 결정 불요 6건) 이행분에 대한 **코드 실측 재검증**.
> 이 문서의 목적은 **추적 가능한 소유자를 만드는 것**이다. 소스 주석 안의 '미판정' 고지는 커밋과 함께 묻히고,
> 다음 웨이브 착수 시 자동으로 누락된다 — 그래서 웨이브 경계를 넘는 항목은 여기에 적는다.
>
> ⚠ 이 목록은 **완료로 보고됐으나 실제로는 남아 있는 것**을 포함한다.
> 이행 기록(`.gemini/tasks/20260803-wave1-decision-ledger-execution.md`)은 30개 항목 전부를 `[x] 완료` 로 표시하지만,
> 아래 §2·§3·§4 는 코드 실측 결과 그 표시가 사실과 다른 항목이다. **체크박스와 코드가 갈릴 때 진실은 코드 쪽이다.**
> (그 기록을 여기서 고쳐 쓰지는 않는다 — 다른 오퍼레이터의 작업 기록이므로, 정정은 이 문서로 병기한다.)

---

## 1. 사용자 결정이 필요한 것 (에이전트가 정할 수 없음)

### J-1 · 운영 프록시 토폴로지
원장이 유일하게 "내가 답을 정할 수 없다"고 표시한 항목이며, **아직 답이 저장소에 기록되지 않았다.**

- **질문 1**: 브라우저 → Next(3001) → 백엔드(8080) **단일 홉**이 맞는가? 앞에 LB·nginx·CDN 이 더 있다면
  XFF 에서 오른쪽 몇 개를 신뢰 홉으로 벗겨야 하는지가 달라진다.
- **질문 2**: 운영에서 백엔드 8080 이 **브라우저에 직접 도달 가능**한가? (현재 compose 는 호스트에 직접 노출한다.)
  가능하면 `remoteAddr` 이 두 종류가 되어 프록시 IP 만 신뢰 목록에 넣는 것으로 충분하지 않다.

**현재 상태**: `nuri.security.trusted-proxies` 기본값은 **사설 대역 전체 신뢰**(원장의 기본안이던 '비어 있음'과 다르다).
2026-08-03 에 `application.yml` 에 **명시 선언**해 두었으므로(종전에는 Java `@Value` 기본값에만 있어 운영자에게 보이지 않았다)
답이 나오는 즉시 좁힐 수 있다.

**사내망 XFF 위조 — 2026-08-03 완화(근본 해법은 아직 질문 1·2 에 달려 있다)**

`ClientIpResolver.resolve()` 는 홉이 **전부 신뢰 대역**이면 최좌측 값을 채택했다. 사설 대역 클라이언트가
스스로 `X-Forwarded-For: 10.1.2.3` 을 실어 보내면 그 값이 채택되어, 레이트리밋 키·로그인 IP 제한·감사 IP 를
요청자가 임의로 바꿀 수 있었다.

→ **최우측 채택으로 정정했다.** XFF 는 홉마다 append 하는 헤더이므로 최우측 항목은 *우리에게 가장 가까운
프록시가 기록한 값*이고, 요청자가 끼워넣은 값은 **항상 그 왼쪽에** 온다(앞에 덧붙일 수만 있고 뒤에 쓸 수는 없다).
홉이 하나뿐이면 최우측 = 최좌측이라 **어느 형상에서도 종전보다 나쁘지 않다**(회귀 테스트로 고정).

> `remoteAddr` 폴백 안은 검토 후 **기각했다.** 위조에는 더 강하지만 **사내망 사용자 전원의 IP 가 프록시 1개로
> 수렴**해 레이트리밋이 전 사내 트래픽에 대해 단일 버킷이 된다 — 원장이 경고한 **순서 지뢰 1** 과 같은 계열의
> 가용성 위험이며, 인트라넷 비중이 높은 배포에서는 실제 장애가 된다.

**남은 근본 해법**: 신뢰 대역을 **실제 프록시 IP 로 좁혀** '홉이 전부 신뢰 대역' 분기 자체가 발생하지 않게 하는 것.
질문 1·2 가 답해지면 `TRUSTED_PROXIES`(docker-compose.prod.yml 에 노출) 한 줄로 끝난다.
그때까지는 최우측 채택이 프록시 append 를 전제로 방어한다 — 우리 인프라가 append 하지 않는 형상이라면
그 전제가 깨지므로, **질문 1·2 의 답과 함께 Next 의 XFF 처리(append vs forward)도 실측**할 것.

> **순서 지뢰 1**: 신뢰 대역을 비우는 변경과 **레이트리밋 용량 하향을 같은 배포에 넣지 말 것.**
> 순서는 ① 신뢰 대역 주입 → ② 관측 → ③ 용량 조정이다.

### G-2 · 메뉴 권한 회수 — **해소 (V2_36, 2026-08-03, 사용자 승인)**
ROLE_USER 에게 노출되지만 프론트 미들웨어가 되돌리는 메뉴를 실측 전수 조회해 **13건**을 확인하고,
개별 판정 후 **10건**의 ROLE_USER 매핑을 `V2_36__revoke_user_authority_on_admin_only_menus.sql` 로 회수했다.
(매핑 테이블의 실제 이름은 `tb_menu_crt_dtl` 이다 — `tb_menu_authrt_map` 은 존재하지 않는다.)

**제외한 3건**은 전부 **섹션 헤더**이며, 회수하면 그 아래 사용자 접근 가능한 메뉴가 함께 사라진다(§0.7-H4 개별 판정):

| menu_sn | 이름 | 제외 사유 |
|---|---|---|
| 2000000 | 💬 커뮤니티 및 콘텐츠 | 자식에 설문 참여(`/survey`)·위키·FAQ·Q&A·협업이 달려 있다 |
| 1050000 | 전자결재 및 문서 관리 | 자식 `내 결재함`(`/approvals`)은 `/admin` 밖이라 사용자에게 열려 있다 |
| 2010000 | 설문 및 여론조사 관리 | 자식 `온라인poll참여`는 미들웨어가 **허용**한다 |

이 3건의 문제는 권한이 아니라 **route 가 관리 콘솔을 가리키는 것**이므로 별건의 '경로 정정' 과제로 남긴다.

검증: 대상 10건은 전부 ROLE_ADMIN·ROLE_USER 2개 매핑을 가지며, 회수 후에도 각각 1개(ROLE_ADMIN)가 남아
매핑이 0이 되는 메뉴는 없다(실측). DELETE 는 멱등이고 복원 SQL 을 마이그레이션 주석에 함께 적었다.
V2_2 시드 원본은 이력 보존상 수정하지 않고 델타로만 처리했다(V2_34 선례).

> 실 적용은 다음 부팅 시 Flyway 가 수행한다. `schemaValidationTest`(실 PG)는 Docker 미기동으로 미실행 —
> 스키마 변경이 아닌 순수 DML 이며, 술어가 정확히 10행을 매칭하는 것은 db-bridge 로 사전 확인했다.

---

## 2. 완료로 보고됐으나 미이행인 것

### A-1 · 보안 테스트 재정의 + 재발 방지 린터 (공수 L)
Wave 1 은 인접 3건(`AuthenticationBypassTest` 재작성, `SqlInjectionAndXssDefenseTest` → `SignupInputValidationContractTest`,
`ApiSecurityConfigTest` 보강)을 이행했다. 그러나 **원장이 지목한 대상 자체는 손대지 않았다.**

- `PrivilegeEscalationVulnerabilityTest` 는 Wave 1 전 구간 무변경이며, 여전히 **11개 테스트 전부가 실존하지 않는 경로**를 친다
  (`/api/v1/admin/users`·`/api/v1/admin/roles`·`/api/v1/admin/audit-logs`·`/api/v1/admin/settings`·`/api/v1/admin/dashboard`·
  `/api/v1/users/{id}/role|data|permissions|profile` — 전 모듈 매핑 grep 결과 0건. 실존 admin 계열은
  `/api/v1/admin/system|content|operation/*` 3계열뿐이다).
- 단언이 `status().is(anyOf(is(200),is(400),is(401),is(403),is(404),is(405),is(500)))` 이라
  **권한 상승이 실제로 성공(200)해도 green** 이다. `@DisplayName` 은 "403 Forbidden 반환"을 주장한다.
- **재발 방지 린터(테스트에서 `SecurityFilterChain` `@Bean` 선언 및 `mock-security*` 프로파일 금지)는 신설되지 않았다.**
  `BaseSecurityTest` 는 여전히 `@ActiveProfiles({"test","mock-security-test"})` + `@Import(SecurityTestConfig.class)` 이고,
  `ApiSecurityConfig` 는 그 프로파일에서 **로드조차 되지 않는다**(`@Profile("!mock-security & !mock-security-test & ...")`).
- 더 넓은 사각지대: `business-core`/`business-app` 의 `testFixtures/TestSecurityConfig` 가
  `@Bean @Primary SecurityFilterChain ... anyRequest().permitAll()` 을 유지하고 `IntegrationTest` 가 그것을 물린다 —
  **모든 `@IntegrationTest` 가 보안 전면 개방 상태로 돈다.**

착수 시 원장 추천대로: 수평(타인 소유 `/api/v1/notes/{id}`) · 수직(`DELETE /api/v1/admin/system/roles/{roleCode}`)
2축으로 재작성하고 단언을 단일 상태코드로 못 박는다. 린터 신설 시 현행 3건을 사유와 함께 동결 베이스라인으로 등재하고,
**위반을 의도 주입해 red 를 확인**한다(§0.7-H5).

### A-4 · 실 PostgreSQL 쓰기 스모크 티어 (공수 M)
**전혀 신설되지 않았다.** 기존 `SchemaValidationIntegrationTest` 는 테스트 1건·86줄의 **매핑 검증 전용**이며 쓰기가 0이다.
그 결과 V2_24 류의 CHECK 제약 값 정합 결함과, `GlobalExceptionHandler` 가 CHECK 위반(23514)을
400 "입력이 잘못됐습니다"로 오분류하는 경로가 **여전히 무게이트**다.

착수 시 원장 추천대로 **하이브리드**: 결재 1건만 MockMvc HTTP 계층, 나머지는 서비스 레이어 직접 호출.
**도달 불가 7종은 스모크로 덮지 않는다**(테스트 보증을 붙이면 死코드에 존치 명분이 생긴다).
기존 `schemaValidationTest` 태스크(실 PG + Flyway 전량 + `ddl-auto:validate`)에 편입하면 `localGate`·CI 로
실행 경로가 자동 확보된다 — 새 태스크는 필요 없다.

### A-3(b) · 첨부 도달성 인가
Wave 1 은 (a) 면제 사유의 정직화만 이행했다. (b) **게시글 열람 권한 상속 기반 도달성 검증**은 미이행이며
원장은 이것을 "다음 웨이브의 명시 목표로 기록" 하라고 했다 — 그 기록이 이 항목이다.

현재 인증만 통과하면 임의 `atchFileId` 로 남의 첨부를 읽을 수 있다. `FileMaster` 에 소유자 컬럼이 없으므로
소유자 전용 잠금은 불가하며(적용하면 기존 첨부 전량 403), 참조원(게시글·결재 등) census 를 선행해야 한다.
`FileApiController` 의 `GET /{atchFileId}` 가 대상이다.

---

## 3. 오이행 — 채택된 안이 원장 추천과 다른 것

### F-2 · OpenAPI 파라미터 평탄화
원장 추천은 **(b) 국소 `@ParameterObject`** (28파일 35개소)였으나, 이행분은 명시적 차선안인
**(a) 전역 스위치** `springdoc.default-flat-param-object: true` 다(`@ParameterObject` 부착 개소 실측 **0건**).

산출 스펙의 수치 결과는 같지만, 국소 부착을 권한 이유인 **적용 범위 통제**가 사라졌다 — 앞으로 추가되는
모든 객체 query 파라미터가 리뷰 없이 자동 평탄화되고, 그것을 다시 세는 게이트도 없다.
부수적으로 이 설정은 `application.yml` 과 `OpenApiDocumentationTest` **두 곳에 중복 선언**돼 있으며
동기화를 강제하는 것은 양쪽 주석뿐이다(기계 게이트 없음 → §0.7-H5 의 '실행 경로 없는 규칙').

되돌릴지 유지할지는 비용 판단이다. 유지한다면 최소한 두 선언의 동기화를 게이트로 묶을 것.

---

## 4. 절반만 이행된 것

### D-2 · 운영 로그 수집 스택
파일 appender 폐기 + stdout 전환은 완료. 그러나 원장이 **"같이 정해야 한다"**고 못 박은 뒷절반
(수집 스택을 세울 것인가)이 결정되지 않았다. 현재 운영 로그는 **컨테이너 수명에 종속**되어 재배포 시 전량 소실된다.
2026-08-03 에 json-file 드라이버의 크기·개수 상한만 걸어 무제한 증가는 차단했다 — 보존성은 여전히 미해결이다.

부수 잔여: `application-prod.yml` 의 `logging.file.name` 계열 선언이 남아 설정 표면에서는 파일 로그가 있는 것처럼 읽히며,
`loki-logback-appender` 의존성도 정리되지 않아 死 의존성으로 클래스패스에 남아 있다.

### E-2 · 감사 로그 내구성
executor 풀 분리(순서 지뢰 2 해제)와 `logLogin` 부활은 완료. 그러나:
- **유계 큐 + 배치 워커가 미구현**이다. 현재는 `SimpleAsyncTaskExecutor` 의 concurrencyLimit(64) 세마포어라,
  포화 시 요청 스레드가 **블로킹**되고 요청당 1 INSERT 의 왕복 비용도 그대로다.
- **유실 카운터가 Micrometer 메트릭이 아니다.** 프로세스 내부 `AtomicLong` 이며 외부에서 관측할 수 없고,
  catch 위치가 트랜잭션 커밋보다 안쪽이라 **지배적 실패 모드(커밋 시 INSERT 실패)를 세지 못한다** —
  "유실을 관측 가능하게" 라는 추천의 핵심이 실효를 갖지 못한다.

### G-1 · 스캐폴드
PK 표준화(IDENTITY/Long/bigint)와 Flyway 콘솔 출력은 완료. 그러나 원장이 'G-1 스캐폴드 3종 파손'의
상황으로 명시한 나머지 2종이 남았다:
- 존재하지 않는 상위 클래스(`BaseCrudService`/`BaseCrudController`) 상속을 제거하지 않아 **산출물이 여전히 컴파일 불가**.
- 컨트롤러가 `nuri.business.api.*` 에 생성되어 `SecurityAuthAnnotationLinterTest` 의 `nuri.api.controller` 접두 필터
  **밖**이다 — 인가 없는 쓰기 엔드포인트가 게이트에 잡히지 않는다. 현재는 경고 문구(`Write-Host`)로 대체돼 있는데,
  이는 실행 경로 없는 '문서형 게이트' 라 §0.7-H5 의 반대편이다.

### 인가 린터 커버리지 (A-2 잔여)
원장이 "Step A만" 이라고 명시적으로 범위를 좁힌 항목이므로 **미이행이 아니다.** 다만 다음 웨이브의 대상으로 남는다:
`.business`/`.foundation` 패키지의 **읽기** 엔드포인트 49건은 Test#1 은 패키지로, Test#2 는 HTTP 메서드로
각각 제외해 **어느 쪽도 보지 않는다**. 읽기 IDOR 은 현재 무게이트다.
(문서상 "전수 조사" 라는 거짓 서술은 2026-08-03 에 3개 문서에서 정정했다.)

---

## 5. 참고 — 2026-08-03 재검증에서 함께 고친 것

원장 항목은 아니지만 Wave 1 이행 과정에서 새로 생긴 결함이라 같은 날 봉합했다.

| 무엇 | 왜 위험했나 |
|---|---|
| prod 헬스체크가 8080 을 찌름 | 관리 포트 분리 후 404 → 영구 unhealthy → frontend 미기동 (운영 배포 정지) |
| `/actuator/prometheus` 가 분리 포트에서도 401 | Boot 가 부모 시큐리티 체인을 관리 자식 컨텍스트에 복제 → **스크레이프 불가라는 원래 문제가 그대로** 남아 있었다 |
| `pnpm-lock.yaml` 미재생성 | `--frozen-lockfile` 실패 → CI·Docker 빌드 전면 파손 |
| Node 22 선언 지점 7곳 누락 | 선언부와 실행부가 서로 다른 Node 를 가리킴 (다이제스트 핀은 태그만 바꾸면 무효) |
| 댓글 수 갱신이 감사 컬럼·`@Version` 발화 | 비동기 스레드라 수정자가 `SYSTEM` 으로 덮이고, E-1 이 없앤 409 위양성이 재생산 |
| 하네스 매니페스트 헤더 소실 | §0.7-H2 가드레일의 자기 문서가 사라져 '자동 산출물이니 덮어쓰면 된다'로 오인될 상태 |
| `useAppForm.applyServerErrors` 타입 미노출 | 런타임에는 있는데 호출하면 TS2339 — 헬퍼가 사실상 호출 불가 |
| 숨김 글에 좋아요 증가 허용 | 네이티브 UPDATE 가 softDeleteFilter 를 통과하지 않아 404 계약이 깨짐 |
| **컨트롤러 테스트 26건이 컨텍스트 로딩 단계에서 red** | J-1 이 `OperationalAuditInterceptor` 에 `ClientIpResolver` 의존을 추가했는데 그 빈은 `foundation` 의 `@Component` 라 `@WebMvcTest` 슬라이스가 스캔하지 않는다. **pre-push 는 `:api-server:test` 를 돌지 않아** 조용히 깨져 있었다(§0.7-H5 의 전형) |
| A-1 재발 방지 린터 부재 | 원장이 요구한 린터가 미신설 — `TestSecurityChainOverrideLinterTest` 신설(현행 6항목 동결, 위반 주입 red 확인) |

---
*이 문서는 운영성 자산이다. 항목이 해소되면 해당 절을 지우지 말고 '해소 (커밋 sha, 날짜)' 로 표시해 이력을 남길 것.*
