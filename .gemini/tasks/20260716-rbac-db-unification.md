# [위임 패킷] RBAC 인가 DB 일원화 — 하드코딩 인가 규칙 → DB 소싱, 하드코딩 제거

> **작성**: 2026-07-16 · Claude Code (dual-operator) · **등급**: **L2** (보안 핵심 로직·다중 모듈·아키텍처)
> **목적**: 이 문서는 **다른 에이전트/워크플로우에 그대로 위임**하기 위한 자기완결 Task Spec 이다.
> SOP(`docs/03-guides/orchestration-protocol.md`) §2.2 위임 패킷 형식(Task Spec·헌법·파일맵·제약·완료기준)을 따른다.
> **⚠ 보안 불변식**: 이 작업은 접근제어(access control)를 바꾼다. **어느 단계도 인가를 약화시키면 안 되며**, Expand-Contract + 섀도우(shadow) 검증 없이 enforce 를 전환하는 것을 금지한다.

---

## 1. TASK (목표·범위)

### 목표
현재 코드에 하드코딩된 **인가 규칙(누가 어떤 자원에 접근 가능한가)** 을 **DB 데이터로 이관**하고, 하드코딩(`@PreAuthorize("hasRole('ADMIN')")`·`ApiSecurityConfig` 리터럴)을 제거하여 **"DB 에 롤/권한/프로그램을 넣으면 API 가 자동 게이팅된다"** 는 프레임워크 셀링포인트를 실제로 성립시킨다.

### 범위 (In)
- 메서드 인가 63곳(`@PreAuthorize`)의 규칙을 DB 소싱으로 대체.
- URL 인가(`ApiSecurityConfig` 의 `/api/v1/admin/**`→role 등)를 DB(프로그램↔롤 매핑) 구동으로 대체.
- 빈 인가 사슬 테이블 시드: `tb_authrt_role_map`·`tb_prgrm_lst`(·`tb_login_policy` 는 별건, 아래 §7).
- 하드코딩 제거 후에도 **동일한 접근 결정**이 나오는지 섀도우 검증.

### 비범위 (Out)
- 인증(authentication)·JWT·로그인 흐름 변경 (인가만 다룬다).
- 감사컬럼 `frstRgtrId="webmaster"` 하드코딩(별개 리팩터 — §7 참조, 인가 아님).
- FE 미들웨어 인가(별도 로드맵).

---

## 2. 현재 상태 (실측 2026-07-16, db-bridge + grep)

### 2.1 런타임 인가 결정 경로
- **권한 로딩**: [CustomUserDetails.getAuthorities()](../../foundation/src/main/java/nuri/foundation/security/service/CustomUserDetails.java#L36) 는 사용자의 **단일** `authorCode`(없으면 `"ROLE_"+roleName`, 없으면 `ROLE_USER`) **하나만** 반환한다. → `tb_user_authrt_map`(197행)·`tb_authrt_role_map` 을 **런타임에 참조하지 않는다**(denormalized 단일 롤).
- **롤 상속(유일하게 DB화됨)**: [DbRoleHierarchy](../../api-server/src/main/java/nuri/api/config/DbRoleHierarchy.java) 가 `tb_role_hierarchy`(2행: 예 ROLE_SYSTEM>ROLE_ADMIN)를 로드 → `RoleHierarchy` 빈. `SecurityUtil` 도 이 빈을 사용([SecurityUtil.java:73](../../business-core/src/main/java/nuri/business/security/util/SecurityUtil.java#L73)).
- **URL 인가(하드코딩)**: [ApiSecurityConfig.java:92-93](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java#L92) — `/api/v1/admin/**`·`/actuator/**` → `hasAnyRole(ROLE_ADMIN, ROLE_SYSTEM)`. whitelist(permitAll)는 `whitelist` 변수(외부화 여부 확인 필요).
- **메서드 인가(하드코딩)**: `@PreAuthorize` 63곳 = `hasAnyRole('ADMIN','SYSTEM')`×21 + `hasRole('ADMIN')`×19 + 기타, **10개 컨트롤러**(api-server, `grep -rl @PreAuthorize api-server/src/main`).
- **상수**: [SecurityConstants.java](../../foundation/src/main/java/nuri/foundation/security/constants/SecurityConstants.java) `ROLE_ADMIN/ROLE_USER/ROLE_PREFIX`, `nuri.business.security.AuthorityConstants.ROLE_ADMIN/ROLE_SYSTEM`.

### 2.2 DB 인가 사슬 테이블 행수 (OCI 실측)
| 테이블 | 행수 | 역할 | 상태 |
|---|:---:|---|---|
| `tb_authrt_info` | 171 | 권한(authority) 마스터 | 채워짐 |
| `tb_role_info` | 257 | 롤(role) 마스터 | 채워짐 |
| `tb_user_authrt_map` | 197 | 사용자↔권한 | 채워짐(런타임 미사용) |
| **`tb_authrt_role_map`** | **0** | 권한↔롤 매핑 | **빔 — 사슬 단절** |
| **`tb_prgrm_lst`** | **1** | 프로그램/자원(URL) 레지스트리 | **사실상 빔** |
| **`tb_login_policy`** | **0** | 로그인 정책 | 빔(별건) |
| `tb_role_hierarchy` | 2 | 롤 상속 | 채워짐·DB화 완료 |

### 2.3 ⚠ 선결 리스크 — 테이블 의미론 미확정
`권한(authrt)` vs `롤(role)` vs `프로그램(prgrm)` 3계층의 **정확한 의미와 인가 해석 규칙**(어느 테이블이 "URL→요구롤"을 담는가)이 코드에 확립돼 있지 않다(런타임 미사용이라 사실상 미정). **Phase 0 에서 이 의미론을 db-bridge 로 실 데이터를 보고 확정**한 뒤에야 시드/구현이 안전하다. (DB 헌법 제2조: 메타/스키마 실조회 후 설계, 지레짐작 금지.)

---

## 3. 관련 헌법 (준수 조항)
- **백엔드 헌법 제8조** (서비스 레이어 권한 이중검증): 컨트롤러 인가를 옮겨도 서비스단 `SecurityUtil` 소유권/권한 재검증은 유지·강화. [원문](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)
- **백엔드 헌법 제3조** (레이어 격리): 인가 로직은 security 레이어/`AuthorizationManager` 로 응집, 컨트롤러/서비스에 분산 금지.
- **DB 헌법 제2·5조**: 시드 값·컬럼은 `meta_standard`/`information_schema` 실조회로 확정. `tb_`/제약 명명 준수.
- **DB 헌법 제7조**: 시드/스키마 변경은 무중단(Flyway 멱등 마이그레이션).
- **OWASP (owasp-security-auditor / `/security-review`)**: 각 Phase 종료 시 Red-team 관점 — 권한 상승(privilege escalation)·인가 우회·fail-open 여부 검증 **필수**.

---

## 4. 파일 맵 (수정/참조 대상)

### 인가 결정 코어 (수정)
- `foundation/.../security/service/CustomUserDetails.java` — getAuthorities() 권한 소싱.
- `foundation/.../security/service/CustomUserDetailsService.java` (loadUserByUsername — 권한 조립 지점).
- `api-server/.../config/ApiSecurityConfig.java` — URL 인가 규칙.
- `api-server/.../config/DbRoleHierarchy.java` / `RoleHierarchyConfig.java` — 기존 DB 롤 상속(패턴 참조·확장).
- `business-core/.../security/util/SecurityUtil.java` — 메서드/서비스 권한 헬퍼.
- (신규) `AuthorizationManager<RequestAuthorizationContext>` 구현 — DB(프로그램↔롤) 구동 URL 인가.

### 하드코딩 제거 대상 (수정)
- `@PreAuthorize` 63곳 / 10개 컨트롤러: `grep -rl "@PreAuthorize" api-server/src/main/java` 로 확정.
- `ApiSecurityConfig.java:92-93` URL→role 리터럴.

### DB (시드/마이그레이션 신규)
- `api-server/src/main/resources/db/migration/V2_11__seed_authorization_chain.sql` (신규, 멱등) — `tb_authrt_role_map`·`tb_prgrm_lst` 시드.
- 참조 엔티티: `tb_authrt_info`/`tb_role_info`/`tb_authrt_role_map`/`tb_prgrm_lst`/`tb_user_authrt_map` 매핑 엔티티(존재 시) 또는 신규 로더.

### 테스트 (신규/보강)
- `business-core/src/testFixtures/.../TestSecurityConfig.java` (참조).
- 인가 회귀 테스트: 각 보호 URL/메서드에 대해 롤별 200/403 매트릭스.

---

## 5. 제약 조건 (Constraints · 안티패턴)
1. **fail-closed 불변식**: DB 조회 실패·매핑 부재 시 **접근 거부(deny)** 가 기본. fail-open(부재 시 허용) 절대 금지.
2. **Expand-Contract 필수**: 하드코딩과 DB 인가를 **동시 운영**하는 섀도우 단계를 반드시 거친다. 하드코딩을 먼저 지우고 DB 로 갈아끼우는 순서 금지.
3. **섀도우 검증 게이트**: DB 인가 결정과 기존 하드코딩 결정을 **병렬 평가·로그**하여, 전체 인가 회귀 스위트에서 **불일치 0건**을 증명하기 전에는 enforce 전환 금지.
4. **권한 상승 제로**: 시드는 "현재 하드코딩 규칙을 그대로 미러링"하는 것에서 출발(최소권한). 새 권한을 넣지 않는다.
5. **명명/무중단**: DB 헌법 제6·7조(fk_/uk_ 명명, 멱등 마이그레이션). 시드는 `ON CONFLICT DO NOTHING`.
6. **캐싱 주의**: 인가 매핑을 매 요청 DB 조회하지 말고 캐시(Caffeine)하되, 변경 시 무효화 경로를 둔다(성능·정합).

---

## 6. 단계별 실행 (Phased · Expand-and-Contract)

### Phase 0 — 의미론 확정 & 규칙 인벤토리 (조사, 코드 변경 0)
- db-bridge 로 `tb_authrt_info`/`tb_role_info`/`tb_authrt_role_map`(빈)/`tb_user_authrt_map` 실데이터·샘플·컬럼을 조회해 **3계층 의미와 "URL/메서드→요구롤" 해석 규칙을 확정**(§2.3 리스크 해소).
- 하드코딩 규칙 63(@PreAuthorize)+URL(ApiSecurityConfig) 을 **규칙 인벤토리 표**(자원 → 요구롤)로 전량 추출.
- **완료 증거**: 의미론 결정 문서 + 규칙 인벤토리(자원×요구롤) 표.

### Phase 1 — DB 시드 (Expand: DB 가 현재 규칙을 미러링)
- `V2_11` 멱등 마이그레이션으로 `tb_prgrm_lst`(자원/URL 레지스트리)·`tb_authrt_role_map`(또는 프로그램↔롤 매핑)에 **Phase 0 인벤토리를 그대로** 시드. (아직 런타임 미사용 = 무영향.)
- **완료 증거**: 시드 후 행수·매핑이 인벤토리와 1:1. 앱 거동 무변화(회귀 그린).

### Phase 2 — DB 인가 구현 + 섀도우 평가 (Expand: 병행)
- 권한 로딩 확장: `CustomUserDetails.getAuthorities()` 를 `tb_user_authrt_map`(+authrt_role_map) 기반 **다중 권한**으로 확장(현 단일 롤 → 실제 권한 집합).
- 신규 `AuthorizationManager`(URL) + method-security `PermissionEvaluator`(메서드)를 DB 매핑 구동으로 구현.
- **섀도우 모드**: DB 결정과 기존 하드코딩 결정을 **둘 다 평가**해 불일치를 로그(enforce 는 여전히 하드코딩). 인가 회귀 스위트로 **불일치 0** 달성.
- **완료 증거**: 섀도우 로그 불일치 0 + 롤별 200/403 매트릭스 그린 + `/security-review` 통과.

### Phase 3 — 전환 & 하드코딩 제거 (Contract)
- enforce 를 DB 인가로 전환(하드코딩은 잠시 fallback 유지).
- 안정 확인 후 `@PreAuthorize` 63곳·`ApiSecurityConfig` URL 리터럴 제거(또는 DB 구동으로 치환). `webmaster` 분기 제거.
- **완료 증거**: 하드코딩 인가 0건(grep) + 전체 인가 회귀 그린 + `./gradlew compileJava compileTestJava` + 증분 뮤테이션(핵심 인가 서비스 ≥80%, BE헌법 16조) + `/security-review` 재통과.

---

## 7. 완료 기준 (Done Criteria · 객관 증거)
- [ ] `grep -rE "hasRole\(|hasAnyRole\(|@PreAuthorize" api-server/src/main` → 인가 하드코딩 **0건**(또는 DB 구동 표현식만).
- [ ] DB 시드로 보호 자원×요구롤 매핑이 **이전 하드코딩과 동일**(권한 상승 0) — 섀도우 불일치 0 로그 증적.
- [ ] 롤별 접근 매트릭스 통합테스트(200/403) **그린**, 컴파일 게이트 그린.
- [ ] `/security-review`(owasp) — fail-open·권한상승·우회 **없음** 확인.
- [ ] `.gemini/tasks/` 에 검증 로그(섀도우 불일치 0, 매트릭스 결과) 첨부.
- **별건(비범위, 후속 티켓)**: `tb_login_policy` 시드(로그인 정책 DB화), 감사자 `webmaster` 하드코딩 정리, FE 미들웨어 DB 인가.

---

## 8. 위임 실행 힌트 (오퍼레이터용)
- **단일 서브에이전트**로 Phase 0(조사)→Phase 1(시드) 을 먼저 위임하고, 메인이 §2.3 의미론 결정을 재검증한 뒤 Phase 2·3 착수 권장.
- **워크플로우(팬아웃)** 적합 구간: Phase 0 의 63개 `@PreAuthorize` + URL 규칙 전수 추출(파일별 병렬) → 인벤토리 병합.
- 각 Phase 는 **메인 오퍼레이터가 게이트(컴파일·인가 매트릭스·security-review)를 직접 재실행**해야 완료 인정(SOP §2.3).

---
**1줄 요약**: 현재 인가는 단일-롤 + `@PreAuthorize` 63곳·URL 리터럴 하드코딩으로 결정되고 DB 인가 사슬(`authrt_role_map`·`prgrm_lst`)은 비어 미사용이다 — Phase 0(의미론·규칙 인벤토리)→1(현규칙 그대로 DB 시드)→2(DB 인가 구현+섀도우 불일치0)→3(전환·하드코딩 제거)의 Expand-Contract 로, 인가를 약화하지 않고 DB 일원화한다.
