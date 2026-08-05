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

### J-1 · 운영 프록시 토폴로지 — **해소 (2026-08-04, 사용자 답변)**

**답**: ① 브라우저 → Next(3001) → 백엔드(8080) **단일 홉** ② 백엔드 8080 은 브라우저에서 **직접 도달 가능**.

②가 결정적이다. 8080 이 직접 도달 가능하면 `remoteAddr` 이 두 종류가 되는데, 신뢰 목록이 사설 대역
전체였으므로 **사내망 클라이언트가 8080 을 직접 치면 자기 자신이 '신뢰 프록시' 로 판정**됐다.
그러면 `ClientIpResolver` 가 XFF 를 읽고 그 XFF 는 요청자가 만든 값이다 — 레이트리밋 키·로그인 IP
제한·감사 IP 를 요청자가 바꿀 수 있었다. 2026-08-03 의 최우측 채택 정정은 이 표면을 좁혔지만
없애지 못했다(홉이 하나뿐인 직접 접근에서는 최우측 = 요청자가 넣은 값이다).

**조치**: `egov-net` 에 명시 서브넷(`172.28.0.0/24`)을 주고 운영 `TRUSTED_PROXIES` 기본값을 그 대역
하나로 좁혔다. 프록시 경유 요청만 XFF 를 신뢰받고, 직접 접근은 `remoteAddr` 을 쓴다.
**IP 수렴은 일어나지 않는다** — 수렴은 신뢰 목록을 *비웠을 때* 생기는 문제이고, 프록시는 여전히 신뢰된다.

**게이트**: 이 경계는 두 파일에 걸쳐 성립하므로(compose 서브넷 ↔ prod `TRUSTED_PROXIES`)
`ConfigSafetyLinterTest` 에 판정 축 2개를 추가했다 — 광역 사설 대역 재유입(무결성)과 두 값의 이탈(가용성).
양방향으로 위반을 주입해 각각 red 확인.

> **남은 전제**: 앞단에 LB·nginx·CDN 을 추가하면 홉이 늘어나므로 이 값을 다시 판정해야 한다.
> Next 의 rewrite 가 XFF 를 append 한다는 전제 위에 서 있으므로 프록시 구현을 바꾸면 함께 실측할 것.
> ⚠ 실제 컨테이너 기동 검증은 하지 않았다 — 배포 시 `docker network inspect` 로 서브넷 배정을 확인할 것.

<details><summary>당시 기록 (해소 전)</summary>

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

</details>

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

**잔여 ①(수평 축) — 해소 (2026-08-04)**: `PrivilegeEscalationVulnerabilityTest` 에 수평 축 2건을 신설했다
(타인 첨부 403 + 대조군 자기 첨부 200). 대상은 A-3(b) 에서 닫은 `GET /api/v1/files/{atchFileId}` 다.

**잔여 ②**: testFixtures 의 `TestSecurityConfig`(`anyRequest().permitAll()`)는 여전히 살아 있어
`@IntegrationTest` 가 보안 개방 상태로 돈다. `TestSecurityChainOverrideLinterTest` 의 동결 목록이 계속 가시화한다.

> **2026-08-05 정정 — "이 둘" 이 아니라 이제 하나다.** `business-app/src/testFixtures` 는 `business-core` 와
> **FQN 까지 동일한 18파일 복제**였고(18/18 바이트 동일), `api-server` 가 양쪽을 동시에 의존해 같은 이름의
> 클래스가 클래스패스 순서로 서로를 가리고 있었다. 사본을 제거하고 재노출 구조로 바꿨다(PR #287).
> **⚠ 위반이 상환된 것이 아니다** — `permitAll()` 은 business-core 사본에 그대로 살아 있고,
> 동결 건수가 2→1 로 준 것은 **중복이 사라졌기 때문**이다. 부채는 1건으로 남아 계속 신호를 낸다.

> **우선순위 정정(2026-08-04 실측)**: "모든 `@IntegrationTest`" 라는 서술은 맞지만 **규모가 오해를 부른다** —
> `@IntegrationTest` 실사용은 7개 클래스이고 전부 **서비스 레이어 직접 호출**(HTTP 미경유)이라
> 필터 체인을 타지 않는다. 즉 `permitAll` 이 실제로 무력화하는 인가 판정은 현재 거의 없다.
> 고쳐야 할 부채인 것은 맞으나, 이 문서를 근거로 "인가 검증이 통째로 비어 있다" 고 읽으면 과대평가다.

### A-4 · 실 PostgreSQL 쓰기 스모크 티어 (공수 M)
**전혀 신설되지 않았다.** 기존 `SchemaValidationIntegrationTest` 는 테스트 1건·86줄의 **매핑 검증 전용**이며 쓰기가 0이다.
그 결과 V2_24 류의 CHECK 제약 값 정합 결함과, ~~`GlobalExceptionHandler` 가 CHECK 위반(23514)을
400 "입력이 잘못됐습니다"로 오분류하는 경로가~~ **여전히 무게이트**다.

> **실측 정정 (2026-08-04)** — 위 두 번째 근거(`GlobalExceptionHandler`)는 **두 가지 모두 사실이 아니다.**
> ① **오분류가 아니다.** 23514/23502 → 400, 23505/23503 → 409 는 2026-07-28 §2.D 에서 **의도적으로 도입한
> 계약**이며 근거가 코드 주석에 남아 있다. 종전에는 모든 무결성 위반을 409 "이미 존재하는 값" 으로 뭉개서
> `dltYn:"X"` 같은 허용되지 않는 값에 **의미가 틀린 409** 가 나가고 있었고, 그것을 고친 것이다.
> ② **무게이트가 아니다.** `GlobalExceptionHandlerTest` 에 SQLState 4분기(23514·23502·23505·23503)를
> 각각 고정하는 테스트가 **이미 5건** 있다(191~246행). 분기를 무력화해 주입하면 red 가 된다(확인).
>
> 따라서 A-4 에 남는 실질은 **첫 번째 근거 하나** — "쓰기가 0" 이다. `ddl-auto: validate` 는 컬럼의
> 존재·타입·길이만 대조하고 **CHECK 제약은 보지 않는다**. 그래서 마이그레이션이 건 CHECK 의 허용값과
> 애플리케이션이 실제로 쓰는 값이 어긋나도 validate 는 통과하고 운영 첫 INSERT 에서 터진다.

착수 시 원장 추천대로 **하이브리드**: 결재 1건만 MockMvc HTTP 계층, 나머지는 서비스 레이어 직접 호출.
**도달 불가 7종은 스모크로 덮지 않는다**(테스트 보증을 붙이면 死코드에 존치 명분이 생긴다).
기존 `schemaValidationTest` 태스크(실 PG + Flyway 전량 + `ddl-auto:validate`)에 편입하면 `localGate`·CI 로
실행 경로가 자동 확보된다 — 새 태스크는 필요 없다.

**해소 (2026-08-04)** — `WriteSmokeIntegrationTest` 신설. 기존 `schemaValidationTest` 태스크에
`@Tag("schema-validation")` 으로 편입해 새 태스크를 만들지 않았다(실행 경로가 이미 확보된 곳에 붙인다).

판정 축 3개: ① 애플리케이션이 자기 기본값으로 쓴 행이 실 스키마에 실제로 들어간다
② 허용되지 않는 `_yn` 값과 varchar 길이 초과를 실 DB 가 거부한다(제약이 실재함)
③ 모든 `%_yn` 컬럼에 CHECK 이 걸려 있다(V2_24 의 약속이 신규 컬럼에도 유지되는지).

> **왜 `validate` 로 부족한가**: `ddl-auto: validate` 는 컬럼의 존재·타입·길이만 대조하고
> **CHECK 제약은 보지 않는다**. 그래서 마이그레이션이 건 CHECK 의 허용값과 애플리케이션이 실제로
> 쓰는 값이 어긋나도 validate 는 통과하고 운영 첫 INSERT 에서 터진다.

**함께 고친 결함**: 축 ③ 을 라이브에 대조하니 `_yn` 61컬럼 중 CHECK 없는 것이 2개였고,
그중 `meta_standard_words.rprs_yn` 은 진짜 불리언이었다(라이브 DISTINCT = {'Y','N'}).
V2_24 가 `tb_` 접두만 훑어 `meta_` 테이블이 통째로 빠져 있었다 → **V2_39** 로 채웠다.
스모크의 예외 목록에 적는 값싼 길을 택하지 않았다(§0.7-H2). 남는 예외는 오명명 1건
(`tb_menu_info.route_mdfcn_yn`, 값이 '2')뿐이다.

**실행 증적**: `./gradlew :api-server:schemaValidationTest` — 실 PostgreSQL 17(Testcontainers)
+ Flyway 전량 적용 후 `SchemaValidationIntegrationTest` 1건 · `WriteSmokeIntegrationTest` 3건 그린.
**V2_39 를 제거해 축 ③ 이 red 가 되는 것까지 확인했다**(§0.7-H5 — 그린만 보면 vacuous 통과와 구분되지 않는다).

> ⚠ 원장이 추천한 "결재 1건 MockMvc HTTP 계층" 은 **이번 범위에 넣지 않았다.** 축 ①~③ 이
> 원장이 지목한 결함(CHECK 값 정합)을 직접 겨냥하는 반면, 결재 HTTP 스모크는 별도의 픽스처
> 설계가 필요하다. 미이행으로 남긴다 — 완료로 적지 않는다.

### A-3(b) · 첨부 도달성 인가 — **해소 (2026-08-04)**

<details><summary>당시 기록 (해소 전)</summary>

Wave 1 은 (a) 면제 사유의 정직화만 이행했다. (b) **게시글 열람 권한 상속 기반 도달성 검증**은 미이행이며
원장은 이것을 "다음 웨이브의 명시 목표로 기록" 하라고 했다 — 그 기록이 이 항목이다.

현재 인증만 통과하면 임의 `atchFileId` 로 남의 첨부를 읽을 수 있다. `FileMaster` 에 소유자 컬럼이 없으므로
소유자 전용 잠금은 불가하며(적용하면 기존 첨부 전량 403), 참조원(게시글·결재 등) census 를 선행해야 한다.
`FileApiController` 의 `GET /{atchFileId}` 가 대상이다.

</details>

**기록 정정 — "`FileMaster` 에 소유자 컬럼이 없다" 는 사실이 아니다.** 물리 실측(2026-08-04) 결과
`tb_file_master` 에는 `frst_rgtr_id varchar(20)` 이 있고, `FileMaster extends BaseEntity` 이므로
JPA auditing 이 **업로더 loginId** 를 채운다(라이브 125행 전부 채워져 있다 — NULL 0건).
이 한 줄의 오인이 "소유자 잠금 불가 → 큰 설계 필요" 라는 결론을 만들고 있었다.

**참조원 census (실측)** — `information_schema` 전수 조회로 `atch_file_id` 보유 테이블은
저장소 자신(`tb_file_master`/`tb_file_detail`)을 빼면 **정확히 13종**이고, 코드의 `atchFileId` 보유
`@Entity` 13종과 1:1 대응한다. (참조 실사용은 배너 2건뿐이고 `tb_file_master` 125행은 **어떤 업무 행에서도
참조되지 않는 고아**다 — 첨부 기능이 실질적으로 쓰이지 않아 왔다는 뜻이며, fail-closed 전환의 위험도 그만큼 낮다.)

**구현** — `FileAccessPolicy`(business-core)가 도달성으로 판정한다. 판정 표는 위에서부터:
① 업로더 본인(loginId) → 허용(업로드 직후 미첨부 창) ② 참조 행의 소유자·당사자 → 허용
③ 공유 콘텐츠(비밀글 아닌 게시글·FAQ·배너·일정 등) → 인증 사용자 허용
④ 관리자 → 허용하되 **개인 귀속(쪽지·상벌·업무보고 등) 참조원이 하나라도 있으면 불허**(§0.7-H3 프라이버시)
⑤ 그 외 → 403. 적용 지점은 `FileService.getFileList` / `getFileResource` / `getFileDetail` 이다
(호출부 실측 결과 이 셋의 진입점은 `FileApiController` 2개 HTTP 경로뿐이라 폭발 반경이 좁다).

**신원 축**은 컬럼별로 실측해 고정했다 — `frst_rgtr_id`=loginId, `tb_bbs_item.user_id`=esntlId(`USRCNFRM_…`),
`tb_note_sndng.sndr_id`·`tb_note_rcptn.rcvr_id`=esntlId(`NoteApiController` 가 `getUsername()` 을 넘긴다).

**게이트**
- `FileAccessPolicyTest`(business-core, 12건) — 판정 표 전량. 참조원 조회를 포트로 분리해 **DB 없이** 검증한다.
  가드를 무력화해 주입하면 **12건 중 5건 red**(거부 단언 전부)임을 확인했다(§0.7-H5).
- `AttachmentSourceRegistryLinterTest`(harness, pre-push) — 레지스트리 ↔ 엔티티 정합을 누락·유령 2축으로 고정.
  예외 목록을 두지 않는다. 레지스트리에서 `tb_bbs_item` 을 빼는 위반을 주입해 red 확인.
- `PrivilegeEscalationVulnerabilityTest` — **수평 축 신설**(아래 A-1 잔여와 같은 항목). 프로덕션 체인 위에서
  타인 첨부 403 + **대조군으로 자기 첨부 200**. 대조군이 없으면 "첨부가 전부 막혔다" 와 구분되지 않는다.
- `V2_38` — 참조원 13종 + 쪽지 발신/수신 `note_id` 인덱스. 가드를 붙이면서 전수 스캔을 같이 심지 않도록 함께 넣는다.

**의도적으로 남긴 보수적 지점(잔여)**
- 개인 귀속 도메인의 소유 축은 **`frst_rgtr_id`(loginId)** 와 쪽지 발신/수신만 근거로 쓴다.
  `tb_memo_rpt_info.user_id`·`rptr_id`, `tb_rpt_info.user_id`, `tb_rward_manage.rwrd_user_id`·`atrzr_id` 는
  축(loginId/esntlId)이 미확정이라 **근거에서 제외**했다 — 잘못 고르면 뚫리거나 잠기는데, 잠김은 보이고
  뚫림은 보이지 않는다. 해당 테이블 전부 라이브 0행이라 현재 영향은 없다. 축을 실측하면 근거로 편입할 것.
- 쓰기 경로(`updateFiles`/`deleteFile(s)`)는 이번 범위에 넣지 않았다. HTTP 미노출이며(`FileApiController` 에
  DELETE 매핑이 없다) 유일한 호출부인 `BoardService` 는 자체 인가를 선행한다.
- **별건 발견 — 배너/팝업 이미지가 구조적으로 깨져 있었다(2겹)** → **해소 (`9db5e3343`, 옵션 3 채택)**.
  아래 세 선택지 중 **3(FE 가 blob 으로 가져온다)** 으로 결정·이행됐다. 실측(2026-08-05):
  프론트 전체에 `files/download` 호출 **0건**, `FileService.fetchBlob(atchFileId, fileSn)` 존재.
  백엔드 계약 변경 없이 1층(없는 경로)·2층(헤더 인증)을 함께 닫았다.
  ⚠ 아래 원 기록은 **당시 상태**이며 "현재 세 화면 모두 깨진 이미지가 보인다" 는 서술은 이제 사실이 아니다.

  **1층 · 없는 경로를 부른다.** 프론트 3개소가 `/api/v1/files/download?fileId=…` 를 만든다
  ([BannerAdminClient.tsx:310](../../frontend/src/app/admin/system/banner/BannerAdminClient.tsx#L310)·
  [:342](../../frontend/src/app/admin/system/banner/BannerAdminClient.tsx#L342)·
  [BannerSlider.tsx:62](../../frontend/src/app/components/dashboard/BannerSlider.tsx#L62)).
  백엔드 전 모듈에 `download` 매핑은 **0건**이다(실존은 `GET /{atchFileId}` 와 `GET /{atchFileId}/{fileSn}`).
  따라서 이 요청은 `atchFileId="download"` 로 해석돼 404 가 된다.

  **2층 · URL 을 고쳐도 인증이 안 된다.** `JwtTokenProvider.resolveToken` 은 `Authorization: Bearer`
  **헤더만** 읽는다(쿠키 폴백 없음). `next.config.js` 의 `/api/v1/:path*` rewrite 는 헤더를 주입하지 않는
  **투명 프록시**다. `<img src>` 는 헤더를 실을 수 없으므로, 경로를 `/api/v1/files/{id}/1` 로 고쳐도 401 이다.
  같은 이유로 `FileService.downloadFile` 의 `window.open(url)` 도 인증되지 않는다.

  **필요한 결정 (셋 중 하나)**
  1. **공개 이미지 엔드포인트 시설** — 배너는 공개 콘텐츠이므로 무인증 이미지 경로를 연다.
     가장 단순하지만 **공개 표면이 늘어난다**(첨부 도달성 인가를 우회하는 경로가 생기지 않도록,
     배너가 참조하는 첨부로 대상을 좁혀야 한다).
  2. **쿠키 인증 수용** — 다운로드 경로에 한해 쿠키 토큰을 허용한다. CSRF 표면이 생기므로
     `SameSite`·메서드 제한과 함께 판단해야 한다. FE auth 클러스터(pending-decisions §2-D 계열)와 같은 축이다.
  3. **FE 가 blob 으로 가져온다** — axios(헤더 포함)로 받아 `URL.createObjectURL` 로 렌더한다.
     백엔드 계약 변경이 없어 가장 안전하지만, 이미지마다 JS 왕복이 생기고 `next/image` 최적화를 잃는다.

  현재 상태로는 세 화면 모두 **깨진 이미지**가 보인다(라이브 배너 2건 모두 `atch_file_id` 를 갖고 있다).
  부수: FE `FileService.deleteFile` 은 `DELETE /{atchFileId}/{fileSn}` 를 치는데 컨트롤러에 DELETE 매핑이 없다(405).

---

## 3. 오이행 — 채택된 안이 원장 추천과 다른 것

### F-2 · OpenAPI 파라미터 평탄화 — **해소 (2026-08-04)**

**결정: 전역 스위치를 유지한다.** 산출 스펙의 수치 결과가 같고, 35개소 `@ParameterObject` 부착으로
되돌리는 것은 순수 비용이다. 원장이 권한 이유인 '적용 범위 통제'는 게이트로 대체한다.

같은 값이 두 곳(운영 `application.yml` · `OpenApiDocumentationTest`)에 있는 이유는 테스트 리소스가
main 을 **shadow** 하기 때문이다. 둘이 갈라지면 **산출된 문서가 운영 API 를 서술하지 못하고**, 그
드리프트는 조용하다 — 계약 게이트(`codegen:verify`)는 *생성된 스펙끼리만* 비교한다.
종전 강제 수단은 양쪽 **주석** 뿐이었다(§0.7-H5 의 '실행 경로 없는 규칙').
→ `SpringdocDeclarationSyncLinterTest` 신설(pre-push). 테스트 선언을 `false` 로 바꿔 red 확인.

<details><summary>당시 기록 (해소 전)</summary>
원장 추천은 **(b) 국소 `@ParameterObject`** (28파일 35개소)였으나, 이행분은 명시적 차선안인
**(a) 전역 스위치** `springdoc.default-flat-param-object: true` 다(`@ParameterObject` 부착 개소 실측 **0건**).

산출 스펙의 수치 결과는 같지만, 국소 부착을 권한 이유인 **적용 범위 통제**가 사라졌다 — 앞으로 추가되는
모든 객체 query 파라미터가 리뷰 없이 자동 평탄화되고, 그것을 다시 세는 게이트도 없다.
부수적으로 이 설정은 `application.yml` 과 `OpenApiDocumentationTest` **두 곳에 중복 선언**돼 있으며
동기화를 강제하는 것은 양쪽 주석뿐이다(기계 게이트 없음 → §0.7-H5 의 '실행 경로 없는 규칙').

되돌릴지 유지할지는 비용 판단이다. 유지한다면 최소한 두 선언의 동기화를 게이트로 묶을 것.

</details>

---

## 4. 절반만 이행된 것

### D-2 · 운영 로그 수집 스택
파일 appender 폐기 + stdout 전환은 완료. 그러나 원장이 **"같이 정해야 한다"**고 못 박은 뒷절반
(수집 스택을 세울 것인가)이 결정되지 않았다. 현재 운영 로그는 **컨테이너 수명에 종속**되어 재배포 시 전량 소실된다.
2026-08-03 에 json-file 드라이버의 크기·개수 상한만 걸어 무제한 증가는 차단했다 — 보존성은 여전히 미해결이다.
**(이 절반은 여전히 사용자 결정 대기다.)**

~~부수 잔여: `application-prod.yml` 의 `logging.file.name` 계열 선언이 남아 …~~ →
**해소 (2026-08-04 실측)**: `application-prod.yml` 에 `logging.file` 계열 선언은 **없고**,
`loki-logback-appender` 의존성도 이미 제거돼 있다(`03d8879b7`). 이 부수 잔여는 원장이 낡은 것이었다.

### E-2 · 감사 로그 내구성 — **해소 (2026-08-04)**
executor 풀 분리(순서 지뢰 2 해제)와 `logLogin` 부활은 종전에 완료됐고, 남아 있던 2종을 이번에 닫았다.

- **유실 카운터** — 두 가지가 틀려 있었다. ① `onAuditEvent` 에 `@Transactional` 이 있어 실제 INSERT 가
  메서드 반환 **이후** 커밋 시점에 flush 됐고, 그래서 **지배적 실패 모드가 메서드 안의 catch 를 통과하지
  못했다** — 카운터는 0 을 유지했고 "유실을 센다"는 진술이 정작 가장 흔한 유실에는 거짓이었다.
  `@Transactional` 을 떼어 `save()` 안에서 커밋·실패하도록 했다. ② 카운터가 프로세스 내부 `AtomicLong`
  이라 외부에서 볼 수 없었다 → Micrometer 카운터 `audit.log.persist.failure` 를 함께 올린다.
  `MeterRegistry` 는 `ObjectProvider` 로 지연 조회한다 — 강제 주입하면 그 빈이 없는 슬라이스에서
  리스너 생성이 실패해 **감사 로깅이 통째로 빠진 채 테스트가 초록**이 된다.
- **유계 큐** — `SimpleAsyncTaskExecutor.setConcurrencyLimit(64)` 는 세마포어라 포화 시 `execute()` 가
  **호출 스레드를 블로킹**했다. 감사 이벤트는 요청 처리 중 동기 발행되므로 블로킹되는 것은 요청
  스레드였다 — 부가 기능이 본 기능을 인질로 잡는 형태이고, "백프레셔" 라는 이름이 그것을 가렸다.
  유계 큐(2000)를 둔 스레드풀 + 논블로킹 거부로 바꾸고, 버린 수를 `audit.log.executor.rejected` 로 계측한다.
  풀 크기 8 — Hikari 최대 풀(20)을 감사가 다 가져가면 요청 처리가 커넥션을 얻지 못한다.

**게이트**: `WebAuditLogListenerTest` 5건(`@Transactional` 재주입 시 red) · `AuditExecutorTest` 3건
(포화를 실제로 만들어 제출 논블로킹 확인, 종전 구조 되돌리면 3건 red).

> **남긴 것**: 원장이 함께 권한 **배치 워커**(N건을 모아 한 번에 INSERT)는 넣지 않았다.
> 요청당 1 INSERT 왕복 비용은 그대로다. 배치는 유실 창(window)과 순서 보장을 함께 설계해야 하는
> 별개 과제다 — **미이행으로 남긴다. 완료로 적지 않는다.**

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

~~**잔여**: 엔티티가 `BaseTimeEntity` 를 상속한다…~~ →
**해소 (2026-08-04 실측)**: `scripts/generate-domain.ps1` 은 이미 `BaseEntity` 를 상속하도록 바뀌어 있다
(`03d8879b7`, 템플릿 주석에 사유까지 기록됨). 이 잔여는 원장이 낡은 것이었다.

### 인가 린터 커버리지 (A-2 잔여) — **부분 해소 (2026-08-04)**
원장이 "Step A만" 이라고 명시적으로 범위를 좁힌 항목이므로 **미이행이 아니다.**
(문서상 "전수 조사" 라는 거짓 서술은 2026-08-03 에 3개 문서에서 정정했다.)

**실측 정정**: 종전 서술은 "읽기 엔드포인트 **49건**" 이라고 적었으나 실측은 **38건**이다.
그리고 원인 서술도 부정확했다 — Test#1 의 패키지 스킵은 2026-08-03 에 이미 삭제됐다.
지금 읽기를 통과시키는 것은 **`WRITE_AUTHZ_GUARDED_ELSEWHERE` 면제**다.
그 목록의 등재 사유는 전부 **쓰기** 소유권 가드인데 Test#1 이 같은 클래스의 **읽기**까지 통과시킨다 —
"수정은 본인만" 을 근거로 "조회도 안전하다" 를 주장하는 셈이고, 그 둘은 다른 명제다.

**조치**: `Test#3`(`auditReadEndpointsCoveredOnlyByWriteRationale`) 신설 —
그 간극을 **없애는 대신 세고 고정**한다. 38건을 `클래스#메서드` 단위로 양방향 동결했다.
새 읽기 엔드포인트가 같은 면제를 타면 red 이고(실제로 하나 추가해 확인), 항목이 사라져도 red 다.

> ⚠ **이 목록은 '안전한 것' 이 아니라 부채다.** 전부가 취약점인 것도 아니다 — 일부는 이미 서비스
> 계층에 읽기 소유권 가드가 있다(`NoteService.getNoteDetail` 은 발신/수신 본인만 통과시킨다).
> 목록이 말하는 것은 "린터가 그 사실을 확인하지 않는다" 이지 "가드가 없다" 가 아니다.
>
> **남은 것(미이행)**: 38건을 도메인별로 판정해 실제 읽기 가드를 붙이거나 공개 사유를 명시하는 일.
> 일괄 처리해서는 안 된다(§0.7-H4) — 개인 귀속(쪽지·메모보고·상벌)과 공용 콘텐츠(게시판·일정)는
> 판정이 정반대다. 첨부(A-3(b))가 그 개별 판정의 첫 사례다.

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
| **P1-3** 쓰기 경로 실 PG 스모크 | "쓰기 스모크 인프라 검증 완료" | ~~파일·태스크·CI 스텝 0건~~ → **해소 (2026-08-04)**: `WriteSmokeIntegrationTest` 신설, 실 PG 에서 그린·red 양방향 확인. §2 A-4 참조 |
| **P1-8** 감사 로그 유계 큐 | "비동기 이벤트 발행 및 유계 큐 연동 완료" | ~~유계 큐 0건~~ → **부분 해소 (2026-08-04)**: 유계 큐(2000)+논블로킹 거부+거부 계측 완료. **배치 워커는 여전히 미이행**(요청당 INSERT 1건 그대로). §4 E-2 참조 |
| **P1-9** `@Async` 전파 | "Composite TaskDecorator 적용 완료" | `AsyncConfig` **무변경**, 데코레이터는 여전히 프로덕션 no-op. **다만 코드 상태는 옳다** — 결정 원장 D-5 가 전파를 기각하고 개별 봉합을 택했고 그 봉합은 이미 이행됐다. 틀린 것은 보고 쪽이다 |
| **P1-22** secure-paths 하드코딩 | "DB 인가 대상 자동 추적 정정 완료" | 핵심 결함 무수정. ~~신규 도메인이 목록에서 빠지면 **런타임 인가와 린터가 동시에** 뚫린다(단일 실패점)~~ → **아래 §6.6 에서 실측 정정** |
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
| ~~**required status checks 0개**~~ | ~~하네스 21종·pre-push·CI 6잡 전부 강제력 없는 권고~~ | **해소 (2026-08-05 실측)** — 아래 §7 참조 |

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

### 6.6 P1-22 `secure-paths` — **실측 정정 + 부분 조치 (2026-08-04)**

§6.2 는 이 항목을 "신규 도메인이 목록에서 빠지면 **런타임 인가와 린터가 동시에** 뚫린다(단일 실패점)"
이라고 적었다. **그 서술은 측정으로 지지되지 않는다.** 판정 로직(`SecurityAuthAnnotationLinterTest.isDbProtected`)
을 계측해 확인한 사실은 다음과 같다.

| 무엇 | 실측 (2026-08-04, `nuri.api.controller` 전 엔드포인트 계측) |
|---|---|
| 인가 애노테이션으로 통과 | 32 |
| **`secure-paths` 매칭으로만 통과** | **235** |
| 공개 화이트리스트 | 10 |
| `secure-paths` 항목 수 | **12** |
| 역방향 매치(엔드포인트를 패턴으로 써서 매칭)로만 통과 | **0건** |

- **"동시에 뚫린다" 는 성립하지 않는다.** 신규 경로가 목록에 없으면 `isDbProtected` 가 false 가 되고,
  애노테이션도 없으면 린터는 **red 를 낸다**. 목록에서 항목을 빼는 경우도 같다 — 해당 엔드포인트들이
  즉시 위반으로 뜬다. 즉 린터는 누락·축소 양방향에서 신호를 낸다.
- **역방향 매치 우려도 실측 0건**이다(`pathMatcher.match(pattern, protectedPattern)` 로 인한 거짓 보호 없음).
- **진짜 남는 것은 다른 것이다.** ① 엔드포인트의 **67%가 12줄짜리 문자열 목록**에 얹혀 있고,
  ② URL 단위 인가는 원리적으로 **소유권(IDOR)을 표현하지 못한다** — 등재됐다는 사실이 그 도메인의
  인가가 충분하다는 뜻이 아니다(이번에 고친 첨부 IDOR 이 바로 그 사례다. `/api/v1/files/**` 는
  애초에 목록에 없었고, 있었더라도 "인증된 누구나" 이상을 막지 못했을 것이다).
  ③ 같은 값이 **세 곳에 복제**돼 있는데 동기화를 강제하는 것이 없었다.

**조치**: ③만 게이트로 닫았다 — `SecurePathsDeclarationSyncLinterTest`(harness, pre-push).
운영 `application.yml` · `application-test.yml` · `RbacAuthorizationMatrixTest` 세 선언의 일치를 강제한다.
셋이 갈라지면 **테스트는 운영 경계가 아닌 것을 검증하게 되고 그 그린은 아무것도 증명하지 않는다.**
테스트 프로파일에서 `/actuator/**` 를 빼는 드리프트를 주입해 red 확인.

**남은 것(제품/설계 결정)**: ①②는 게이트로 닫히지 않는다. URL 목록을 잘게 쪼개는 것은 관리 비용만 늘리고
소유권 문제를 해결하지 못한다. 방향은 **소유권이 필요한 도메인을 식별해 서비스 계층 가드로 내리는 것**이며,
그 판정은 도메인별로 개별 수행해야 한다(§0.7-H4). 첨부(A-3(b))가 그 첫 사례다.

---

## 7. 브랜치 보호 · required status checks — **해소 (2026-08-05 실측)**

> ⚠ **이 절은 종전에 존재하지 않았다.** §6.5 가 "아래 §7" 로 참조했으나 문서는 §6.6 에서 끝나 있었고,
> 그래서 **사용자 결정이 필요하다고 표시된 항목 하나가 원장에서 통째로 유실**돼 있었다.
> 참조는 남고 대상이 사라지는 것은 조용한 실패다 — 다음 오퍼레이터가 §6.5 를 읽고 §7 을 찾다가 포기한다.

**종전 기록(2026-08-03)**: 저장소 자신의 `verify-branch-protection.mjs` 가 required status checks **0개**로
판정했다. 하네스 21종·pre-push·CI 6잡이 전부 **강제력 없는 권고**였고, 활성화는 사용자 결정 사항이었다
(활성화하면 `main` 직접 push 가 막힌다).

**실측 (2026-08-05)** — **그 사이 활성화됐다.** `main` 에 대한 직접 push 를 시도하니 원격이 거부한다:

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - 3 of 3 required status checks are expected.
```

필수 검사 3종 (`gh api repos/lkindo/egov-enterprise/rules/branches/main` 실측):
`backend-build` · `frontend-build` · `secret-scan`.

**부수 정정 — CI 과금 차단도 해소됐다.** [pending-decisions.md §4-A](pending-decisions.md) 는 CI 를
"과금 차단 상태 — 사용자 영역" 으로 적고 있으나, 2026-08-05 PR #287 에서 `secret-scan` 이 19초 만에
pass 하고 `backend-build` 가 실제로 기동했다. **CI 는 돌고 있다.** 이 서술에 의존해
"E2E 는 어차피 안 돈다" 고 전제하면 틀린다 — 특히 [코드 간결화 계획](../../.gemini/tasks/20260805-code-simplification-plan.md)
의 Phase 4 는 "CI 빌링 복구" 를 선결 조건으로 걸고 있는데, 그 조건이 이미 충족돼 있을 수 있다.
(⚠ 다만 E2E 잡까지 그린인지는 이 시점에 미확인이다 — 착수 전 실측할 것.)

**남은 것**: 없음. 다만 `main` 직접 push 가 막혔으므로 **모든 변경은 PR 경유**다.
이중 오퍼레이터 환경에서 `git commit --only` 규율에 더해 **브랜치 + PR 흐름**이 강제된다는 점을
[orchestration-protocol.md §5](../03-guides/orchestration-protocol.md) 의 공유 워킹트리 규율과 함께 읽을 것.
