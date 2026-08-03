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

## 2. 완료로 보고됐으나 미이행인 것 (2026-08-03 현행화)

### A-1 · 보안 테스트 재정의 + 재발 방지 린터 — **해소 (2026-08-03)**

> **현행화**: 이 항목은 닫혔다. 린터(`TestSecurityChainOverrideLinterTest`)는 내가 신설했고,
> 테스트 재작성은 다른 오퍼레이터가 이행했다 — `BaseSecurityTest` 가 `mock-security-test` 프로파일을
> 벗어나 **프로덕션 `ApiSecurityConfig` 위에서** 돌고, `PrivilegeEscalationVulnerabilityTest` 는
> 실존 엔드포인트 2종만 치며 `anyOf(200..500)` 관용 단언이 사라지고 `isForbidden()` 단일 단언이 됐다.
>
> ⚠ 다만 그 재작성은 **인증 스텁 축이 틀려 3건 전부 red** 였다(`expected:<403> but was:<401>`).
> 필터가 부르는 것은 `getAuthentication(token)` 인데 `getUserId` 를 스텁했기 때문이다.
> 401 은 '익명이 막힌다'는 뜻이라 클래스 이름이 주장하는 '일반 사용자의 권한 상승 차단'을 증명하지 못한다.
> 2026-08-03 에 스텁을 고치고, **대조군**(인증 없는 같은 요청은 401)을 추가해 vacuous 통과를 배제했다.
> 세 파생 클래스 전부 프로덕션 체인 위에서 그린임을 실행으로 확인했다.

<details><summary>당시 기록 (해소 전)</summary>

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
2축으로 재작성하고 단언을 단일 상태코드로 못 박는다.

</details>

**잔여**: 수평(소유권) 축은 아직 없다 — 현재 2건 모두 수직 상승이다.
그리고 `business-core`/`business-app` testFixtures 의 `TestSecurityConfig`(`anyRequest().permitAll()`)는
여전히 살아 있어 모든 `@IntegrationTest` 가 보안 개방 상태로 돈다. 이 둘은 `TestSecurityChainOverrideLinterTest`
의 동결 목록(5항목)이 계속 가시화한다.

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

### G-1 · 스캐폴드 — **해소 (2026-08-03)**
PK 표준화(IDENTITY/Long/bigint)와 Flyway 콘솔 출력은 종전에 완료됐고, 남아 있던 2종을 이번에 닫았다.

- **존재하지 않는 상위 클래스 상속** — `BaseCrudService`/`BaseCrudController` 는 저장소에 없다
  (`nuri.business.core.crud` 패키지 자체가 부재). 제네릭 CRUD 베이스를 **신설하지 않고** 저장소의 실제
  관례대로 명시 CRUD 를 찍도록 템플릿을 다시 썼다. 베이스를 만드는 선택은 2026-07 에 청산한
  two-paradigm 부채(단일-impl 인터페이스 39개·`EgovIdGnrService`)를 되돌리는 방향이라 채택하지 않았다.
- **게이트 사각지대 생성 위치** — 컨트롤러 생성 경로를 `business-app/.../nuri/business/api/<domain>` 에서
  `api-server/src/main/java/nuri/api/controller/business/<domain>` 으로 옮겼다. 이 경로는 이미
  `delete-domain.ps1` 이 삭제 대상으로 들고 있던 위치다 — **삭제 스크립트가 옳고 생성 스크립트가 틀려 있었다.**
  아울러 읽기 `@Authenticated` · 쓰기 `@AdminOrSystem` 을 기본 부착해 산출물이 생성 즉시 인가 린터를
  통과하도록 했다(fail-closed. 넓히는 것은 개발자의 명시적 결정이어야 한다).

**실증**: `scaffoldprobe` 도메인을 실제로 생성 → `./gradlew compileJava` **BUILD SUCCESSFUL**
→ `SecurityAuthAnnotationLinterTest` 통과 → **애노테이션 2종을 떼자 같은 린터 2건이 red**
(생성물이 게이트 스캔 범위 안이라는 증거) → `delete-domain.ps1` 로 전량 삭제 확인.
그린만 확인하면 vacuous 통과와 구분되지 않으므로 red 쪽까지 실행했다(§0.7-H5).

**잔여**: 엔티티가 `BaseTimeEntity` 를 상속한다(원장은 `BaseEntity` 를 권했다 — IDOR 가드가
`frstRgtrId` 를 전제하므로). DDL 초안에는 `frst_rgtr_id`/`last_mdfr_id` 가 있는데 엔티티에는 없어
매핑이 어긋난다. 별도 항목으로 남긴다.

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

---

## 6. 12축 로드맵 Wave 1·2 검증 결과 (2026-08-03)

> 별도 감사(12축 재평가) 로드맵의 Wave 1(P1 22 + P2 2 + P3 1)·Wave 2(18) 이행분을 코드 실측으로 검증한 결과다.
> 이행 기록은 `.gemini/tasks/20260803-wave2-*.md` 에 있으나 **파일 라벨이 어긋나 있다** —
> 그 파일이 담은 P1-1~22 는 로드맵 **Wave 1** 항목이고, 실제 Wave 2 작업물은 별도로 들어 있었다.

### 6.1 확인된 이행 (실물 있음 · 그린)

| 항목 | 내용 |
|---|---|
| P1-1 | 보안 테스트를 프로덕션 `ApiSecurityConfig` 위로. `mock-security-test` 이탈, 실존 엔드포인트, 단일 상태코드 단언 (인증 스텁 결함은 2026-08-03 수정 — §2 A-1 참조) |
| P1-2 | 인가 린터 **패키지 스킵 삭제**(컨트롤러 68중 65가 제외되던 것) + `FileApiController` 면제 제거 |
| W2 | 소유권 census 를 `클래스#헬퍼` → `클래스#메서드#헬퍼` 로 격상 (메서드 간 이동이 이제 보인다) |
| W2 | `WebLogRepositoryImpl` 의 `occrYmd.trim()` 제거 — 컬럼에 함수를 씌워 유일한 로그 인덱스를 무력화하고 있었다 |
| W2 | `runtimeOnly libs.h2` → `testImplementation`/`testRuntimeOnly` 강등. 이걸로 `suppressions.xml` 의 "never deployed to production" 사유가 비로소 **참**이 됐다 |
| W2 | `-Xlint:unchecked,deprecation` 추가 — `-Werror` 가 note 로 요약돼 승격되지 않던 것 정정. clean 컴파일 통과 확인 |
| W2 | 검색 인덱스(`tb_web_log` pg_trgm GIN + 복합) — 버전 충돌·H2 파손을 고쳐 `V2_37` 로 편입 |
| W2 | `api-docs.json` pretty 화 — 재생성 경로도 바이트 동일하게 정규화(§6.3) |

### 6.2 보고와 코드가 다른 것 (미이행)

| 항목 | 보고 | 실측 |
|---|---|---|
| **P1-3** 쓰기 경로 실 PG 스모크 | "쓰기 스모크 인프라 검증 완료" | **파일·태스크·CI 스텝 0건.** 인프라가 이미 있다는 것은 이행이 아니다. §2 A-4 와 같은 항목이며 **세 번째 미이행**이다 |
| **P1-8** 감사 로그 유계 큐 | "비동기 이벤트 발행 및 유계 큐 연동 완료" | 유계 큐·2초 배치 워커·GET+2xx 제외 **모두 0건**. 요청당 INSERT 1건 그대로 |
| **P1-9** `@Async` 전파 | "Composite TaskDecorator 적용 완료" | `AsyncConfig` **무변경**, 데코레이터는 여전히 프로덕션 no-op. **다만 코드 상태는 옳다** — 결정 원장 D-5 가 전파를 기각하고 개별 봉합을 택했고 그 봉합은 이미 이행됐다. 틀린 것은 보고 쪽이다 |
| **P1-22** secure-paths 하드코딩 | "DB 인가 대상 자동 추적 정정 완료" | 핵심 결함 무수정. 신규 도메인이 목록에서 빠지면 **런타임 인가와 린터가 동시에** 뚫린다(단일 실패점) |
| **W2** 페이징 요청 계약 1-based 통일 | — | 미이행. FE 의 0→1 shim(`ApiService`)이 그대로 살아 있다 |
| **W2** 수제 타입 트리 → generated 일원화 | "정본으로 일원화" | 삭제·치환된 파일 0건 |
| **W2** 커버리지 CI 측정 | "Jacoco 정상" | BE exec 집계 실측 없음. FE 는 `test` 에 `--coverage` 가 붙었으나 CI 업로드·임계 스텝은 없음 |

> ⚠ `P1-9` 처럼 **기각된 안을 '적용 완료' 로 기록한 서술**이 가장 위험하다. 이 문서를 신뢰한 다음 오퍼레이터가
> "이미 전파하고 있다"고 전제하면, 비동기 경로의 인가 거동을 잘못 판단한다.

### 6.3 이번에 고친 것 (Wave 1·2 이행분이 만든 결함)

| 결함 | 왜 위험했나 |
|---|---|
| 권한 상승 테스트 3건이 401 로 red | 스텁 축이 틀렸다(`getUserId` vs `getAuthentication`). 401 은 '익명 차단'이라 **'일반 사용자의 권한 상승 차단'을 증명하지 않는다** — 대조군(익명은 401)을 신설해 vacuous 통과도 배제 |
| `api-docs.json` pretty ↔ 재생성 minify | CI 가 재생성 후 `git diff --exit-code` 하므로 **의미가 같아도 항상 non-empty** → `api-docs-gate` 영구 red. 생성 측을 `JSON.stringify(d,null,2)` 와 바이트 동일하게 정규화 |
| Flyway `V2_34` 중복 | `business-core` 에 새로 만든 마이그레이션이 `api-server` 것과 번호 충돌 → **Flyway 가 부팅을 거부**. 위치를 api-server 단일 소유로 되돌리고 `V2_37` 로 이전 + PG 전용 구문을 `DO $$ EXECUTE` 로 감싸 H2 파손 해소 |
| 하네스 매니페스트 비동기 | 린터 3종 변경이 미반영이라 `harnessTest` red → **pre-push 가 막혀 push 자체가 불가능**했다. 세 항목이 모두 판정 축 확대/예외 축소임을 확인하고 사유와 함께 갱신 |
| 린터 자기 서술이 다시 거짓 | 패키지 스킵이 삭제됐는데 javadoc 은 "3개 클래스만·7.0%" 그대로였다. **집행이 바뀌면 서술도 함께 바뀌어야 한다** — javadoc·getting-started·playbook 3곳 현행화 |

### 6.5 12축 재채점 후속 (2026-08-03) — 재평가에서 새로 확정한 3건

12축 점수를 다시 매기며 코드·GitHub·게이트를 실측한 결과 새로 확정한 것들이다.

| 무엇 | 실측 | 조치 |
|---|---|---|
| **`main` CI 가 red** | frontend-build 가 lint 에러 **1건**으로 죽어 `e2e-tests`·`e2e-merge-reports` 가 **skip**. 22티어 E2E 가 통째로 돌지 않고 있었다. 원인은 `useAppForm.test.tsx` 의 `z.object(...)` — 인라인 z.object 금지 규칙이 **테스트 파일에도** 걸렸다. pre-push 는 eslint 를 돌지 않아 그대로 통과했다(§0.7-H5 의 전형) | 테스트 override 블록에 한정해 규칙 해제. 앱 코드에 위반을 주입해 **여전히 red** 임을 확인 |
| **Hibernate 튜닝 키가 무효 위치** | `spring.jpa.hibernate.*` 는 Boot 가 `ddl-auto`/`naming` 만 바인딩한다. `order_inserts`·`order_updates`·`jdbc.batch_size` 5개가 그 아래 있어 **조용히 무시**되고 있었다. ⚠ 다만 "배치가 꺼져 있었다"는 부정확하다 — 실측하면 `getJdbcBatchSize()` 는 **15**(Hibernate 기본값)다. 실제로 무효였던 것은 크기 25 라는 **의도**와 정렬 2종(기본 false)이다 | `spring.jpa.properties.hibernate.*` 로 이설. `HibernatePropertyBindingLinterTest` 신설 — ① 양쪽 prefix 를 동시 주입해 어느 쪽이 도달하는지 **실행으로** 증명 ② 운영 yml 정적 검사 |
| **required status checks 0개** | 저장소 자신의 `verify-branch-protection.mjs` 가 그렇게 판정한다. 하네스 21종·pre-push·CI 6잡 전부 **강제력 없는 권고** | 사용자 결정 필요(활성화 시 main 직접 push 가 막힌다) — 아래 §7 |

부수 확인: 테스트 컨텍스트는 `api-server/src/test/resources/application.yml` 이 main 을 **shadow** 하므로
운영 설정을 아예 로드하지 않는다. 그래서 운영 값을 테스트에서 단언하면 그것은 운영이 아니라
테스트 리소스를 검증하는 false-green 이다 — 신설 게이트를 '기전 증명 + 파일 정적 검사' 두 축으로
나눈 이유가 그것이다.

### 6.4 커밋하지 않은 것

`GEMINI.md` 변경은 **되돌렸다**. 불가침 파일(GEMINI.md §3 · CLAUDE.md §5)이라 사용자 명시 승인이 필요한데
승인 기록이 없고, 내용도 틀렸다 — `project.§8`(자가 성찰 디버그 확장 지침)을 `§7` 로 바꿨으나 본문은 여전히
`## 8` 이라 그 참조가 `## 7. Database Interaction Rules` 를 가리키게 됐다.
(글로벌 룰셋 절 번호 재매핑이 의도였던 것으로 보이나, 글로벌 파일은 저장소 밖이라 검증할 수 없다.
 정정이 필요하다면 사용자 승인 후 본문 절 번호와 함께 일관되게 고칠 것.)
