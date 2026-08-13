# 품질 스코어 근본원인 분석 (Quality Score Root-Cause Analysis)

> 작성: 2026-07-15 · 기준: 코드 실물 검증 기반 재평가(2026-07-13 baseline → 2026-07-15, 백엔드 하드닝 17커밋 반영)
> **갱신: 2026-07-17 — DB 축 재측정 추가(§1.1). V2_12~V2_23 DB 표준화 스윕 반영, 라이브 OCI DB 실측. 완성도/연결부/단순성 83·79·72 → 89·88·82.**
> **갱신: 2026-07-17(2) — BE 축 재측정 추가(§1.2). 단순성 로드맵 #1~#5(인터페이스 제거·getCurrentUserId 통합·config 정리·에러코드·tx) 반영, 코드 실물 검증. 완성도/연결부/단순성 81·73·56 → 83·74·62.**
> **갱신: 2026-07-18 — BE 단순성 재측정 추가(§1.3). §2.A 대량 작업(egov IdGnr 전면제거·EgovAbstractServiceImpl 상속이탈·死코드/config 삭제·결재PK 버그정정·PK표준 린터) 반영. 단순성 62 → 68(완성도/연결부 83/74 유지).**
> **갱신: 2026-07-18(3) — 점수상승 세션: FE 액센트 토큰화(FE 78/74/63)·프론트 색상/FE-auth/정체성축 회귀 게이트 신설(SEAM 추적성 60→62)·§2.F FE인증·§2.E 정체성모델·§2.G false-completion 대부분 해소/현행화. §2.H 통합 검증 게이트(verify.mjs) 신설(SEAM 추적성 63). 최종: DB 89/88/82·BE 84/77/70·FE 79/76/63·SEAM 67/70/63. (§2.D UNIQUE·§2.E 정체성·§2.F FE인증은 실측결과 이미 봉합→감사확인+회귀게이트化. §2.G 는 기록 문제→정직 정정. §2.H 는 통합 verify 게이트로 파편화 봉합)**
> **갱신: 2026-07-18(2) — FE·SEAM 재측정 추가(§1.4, 07-15 이후 최초). §2.C 게이트화·§2.B 결합역전/브랜딩 토큰화 반영. FE 75/72/55→**77/74/61**·SEAM 65/66/54→**67/70/58**·BE 83/74/68→**84/77/70**(연결부 egov소거+결합역전)·DB **89/88/82 유지**. 상단 표를 07-18 현재값으로 통합. ⚠위임 워크플로우 세션한도 실패로 메인 직접 실측 채점.**
> **갱신: 2026-07-28 — 4축 전면 재측정(§1.5). 07-18 이후 119커밋(fix 44·ci 19·test 7) 반영. DB 89/88/82→**91/90/83**(V2_24 CHECK 0→60 실적용)·BE 84/77/70→**87/78/71**(admin P0·Origin 교정·뮤테이션 75% 하드강제)·FE 79/76/63→**81/77/66**(하드코딩 색 207→114)·SEAM 67/70/63→**69/73/70**(하네스 게이트 실행경로 0→pre-push 기계강제, 린터 9→12). 🚨 E2E 3샤드 전량 red 가 추적성 상한을 지배.**
> **갱신: 2026-08-13** — 4축 전면 재측정(§1.6). 07-28 이후 실물·게이트·원격 CI를 재검증해 DB **91/91/85**·BE **90/82/74**·FE **85/83/70**·SEAM **77/84/85**로 현행화했다. 12축 단순평균은 78.0→**83.1(+5.1)**. 07-28의 지배적 캡이던 E2E 3샤드는 required check로 전량 green(131건), 하네스는 29클래스/36테스트, 프런트는 80파일/408테스트다. 별도 위험가중 완성도 점수와 이 구조 성숙도 평균은 혼용하지 않는다.
> 방법론: DB/BE/FE/연결부 4차원 독립 assessor가 커밋 메시지가 아닌 **코드 실물을 Read/Grep 로 검증**해 채점 → 메인 재검증. 이 저장소의 감사수치 과장 이력을 감안해 **과장 배제** 원칙 적용.
> 관련: [framework-reusability-assessment.md](framework-reusability-assessment.md) · [log-retention-policy.md](../04-operations/log-retention-policy.md)

---

## 1. 재평가 스코어카드

| 차원 | 축 | Before(07-13) | 07-15 | 07-18 | 07-28 | **08-13(현재)** | 누적 Δ |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **DB** | 완성도 / 연결부 / 단순성 | 82 / 78 / 72 | 83 / 79 / 72 | 89 / 88 / 82 | 91 / 90 / 83 | **91 / 91 / 85** | +9 / +13 / +13 |
| **BE(백엔드)** | 완성도 / 연결부 / 단순성 | 76 / 70 / 55 | 81 / 73 / 56 | 84 / 77 / 70 | 87 / 78 / 71 | **90 / 82 / 74** | +14 / +12 / +19 |
| **FE(프론트)** | 완성도 / 연결부 / 단순성 | 74 / 72 / 55 | 75 / 72 / 55 | 79 / 76 / 63 | 81 / 77 / 66 | **85 / 83 / 70** | +11 / +11 / +15 |
| **연결부(seam)** | 계약체인 / 적합성 / 추적성 | 64 / 58 / 48 | 65 / 66 / 54 | 67 / 70 / 63 | 69 / 73 / 70 | **77 / 84 / 85** | +13 / +26 / +37 |

> 07-28까지의 열은 당시 스냅샷을 보존한다. **현재값의 근거·상한·미반영 항목은 §1.6이 정본**이다. 특히 §1.5의 E2E red, 하네스 12종, CI 신호 부재는 현재 상태 설명으로 사용하면 안 된다.

**핵심 관찰(현재)**: 최대 누적 이동은 SEAM 추적성 **+37**, 적합성 **+26**, 계약체인 **+13**이다. CI·E2E·하네스가 실제 병합 신호로 바뀐 결과이며, 07-28에 이미 점수화한 OpenAPI/DB 체인은 중복 가산하지 않았다. 반대로 가장 낮은 축은 FE 단순성 70·BE 단순성 74다. 이제 상한은 “검증이 안 돈다”가 아니라 **낮은 FE unit coverage, 읽기 인가 미판정, 수동 PK·암호 호환, i18n/core 경계 제품결정**이다.

### 1.1. DB 축 재측정 (2026-07-17, 라이브 OCI DB 실측)

> 07-15 이후 DB 표준화 스윕(V2_12~V2_23: 고아 정리·FK 확장·메타사전 정규화·terms→domains 매핑·길이/타입 정합·死도메인 제거)이 대량 반영되어 DB 축만 재측정. 방법론 동일(실물 SELECT·과장 배제). **baseline(07-15) 은 델타 추적 위해 상단 표에 보존.**

| 축 | 07-15 | **07-17** | Δ |
|---|:---:|:---:|:---:|
| **완성도** | 83 | **89** | **+6** |
| **연결부** | 79 | **88** | **+9** |
| **단순성** | 72 | **82** | **+10** |

**실측 지표(근거)**: FK 18→**58**(`pg_constraint`), 고아 행 730→**0**(V2_12+FK VALIDATED 구조적 불가), UNIQUE 4→**9**, 테이블 104→**92**(死테이블 정리), 빈(0행) 테이블 **~2**, tb_ 명명 **85/85**·char 고정형 **0**·감사컬럼 4종 **85/85**(전면 준수), cross-type 드리프트 **0**·길이 분열 그룹 **0**(V2_16/18/19), TEXT 잔존 **2**(meta), **SSOT terms→domains 매핑 0→13,173/13,173(100%)+FK**(V2_17), 집행 게이트 1→**3**(+SchemaNaming/+SecurityAuth 린터), Flyway 수렴 **rank 28(V2_23) 전량 success**.

- **연결부(+9, 최대 이동)**: §2.D 가 지목한 "SSOT 전파 미정합(도메인 매핑 컬럼 자체 부재)"이 V2_17 로 100% 해소 → **헌법 제5조 3단계(용어→도메인 타입·길이) 기계검증이 사상 처음 가능**. validate 클린(cross-type/길이분열 0)·FK↔삭제플로우 결속이 보강.
- **단순성(+10)**: cross-type·길이분열 완전 소거 + 死도메인(leader·club 등) 정리 + biz_cd 오용(사업코드↔행사명) 정화 + 명명 드리프트(online→onln) 해소로 "이행 중 스냅샷" 지저분함이 크게 감소.
- **완성도(+6)**: FK 3배 확장·고아 0·수렴 클린·명명/감사 100%·명명 린터 신설.

**여전히 90대를 못 넘는 캡(정직)**: ① ~~**CHECK 제약 0**~~ → **V2_24 로 해소 착수**(_yn 불리언 59컬럼 CHECK IN('Y','N') + meta FK 인덱스; route_mdfcn_yn 은 값'2' 저장 오명명이라 제외. OCI 롤백 트랜잭션 dry-run 62 completed·에러0 실증, ZeroDowntime/SchemaNaming 린터 green. **다음 Flyway 부팅 시 적용** → 적용 후 DB 완성도 재측정 대상). 도메인 검증이 앱 레이어에만 있던 갭 봉합 ② **FK 미완**(로그/인증 테이블 esntlId/loginId 키혼용 — [user-reference-key-policy.md](user-reference-key-policy.md) 로 문서화됐으나 미통일) ③ **빈 DB 부팅 불가**(프레임워크化 미완, §2.B — 스키마 품질과 별개 축) ④ UNIQUE 의 JPA `@Table(uniqueConstraints)` 미러링 미완 ⑤ currentTimeMillis PK 등 코드 레벨 레거시. **캡의 핵심은 DB 스키마 자체가 아니라 § 2.B(프레임워크化)·§2.D 잔여(불변식 미러)·§2.C(횡단관심사)** 다.

> ⚠ 채점 노트: SEAM 적합성 +8 은 정체성 footgun 봉합·인가 일관성·409 표준화·재발방지 린터를 근거로 하며, 하나의 사실오류(ApprovalApiController.confirm 을 "미검증"으로 나열했으나 실제로는 `aprvrId` 소유권 가드 존재)가 있으나 이는 점수를 낮추는 방향이라 66 은 유효(오히려 약간 보수적).

### 1.2. BE 축 재측정 (2026-07-17, 코드 실물 Grep/Read 검증)

> 07-15 이후 BE 단순성 로드맵 #1~#5(커밋 130c512f4·86ed1df7e·ac999c529, 푸시됨)가 반영되어 BE 축만 재측정. 방법론 동일(커밋 메시지 아닌 **코드 실물** 검증·과장 배제). **baseline(07-15) 은 델타 추적 위해 상단 표에 보존.** #1~#5 는 대부분 단순성(naming/dedup/config/consistency) 개선이며, 깊은 구조 캡(§2.A 레거시 공존·§2.B 프레임워크化·§2.C 횡단관심사·§2.D SSOT·§2.G false-completion)은 대부분 잔존한다.

| 축 | 07-15 | **07-17** | Δ |
|---|:---:|:---:|:---:|
| **완성도** | 81 | **83** | **+2** |
| **연결부** | 73 | **74** | **+1** |
| **단순성** | 56 | **62** | **+6** |

**반영된 #1~#5 (5건 전부 코드 실물 일치 — 과장 없음)**: **#1** 단일-impl 서비스 인터페이스 39개(Egov*Service 31+*ServiceImpl 8) 제거→concrete 직접주입, 안티패턴 인터페이스 잔존 **0**(정당 잔여 3: Auth/UserAbsence 정석 계층분리+FileStorageService 헥사고날 포트). **#2** 4컨트롤러(AdministCode/BoardMaster/Scrap/Schedule) private getCurrentUserId 4벌 제거→SecurityUtil 위임(`private \w+ getCurrentUserId` grep **0**). **#3** 死 config 2개(nuri.config.CacheConfig 스텁·nuri.business.config.QuerydslConfig 이중빈) 삭제 확인(canonical nuri.business.core.config.QuerydslConfig 유지). **#4** CommonErrorCode.ENTITY_NOT_FOUND=**HttpStatus.NOT_FOUND(404)**(형제 RESOURCE_NOT_FOUND 정합)+ProgramService null가드=INVALID_INPUT_VALUE(400) 정정. **#5** LogManageService·LoginPolicyManageService 클래스레벨 **@Transactional(readOnly=true)**+쓰기 메서드레벨 오버라이드.

**실측 지표(근거)**: 안티패턴 서비스 인터페이스 39→**0**, 컨트롤러 private getCurrentUserId 4→**0**, 死 config 삭제 **2/2 확인**, ENTITY_NOT_FOUND **404**(C003), tx readOnly 클래스레벨 **2 서비스** 적용. 대비 **잔존 캡 실측**: BaseAbstractService **extends EgovAbstractServiceImpl**(20+서비스 공통상위), EgovIdGnrService 결합 **28곳/설정 2개**, egov 빈ID **12개**(egovUserService 등, 클래스명↔빈ID 불일치), PK 채번 **6전략 파편화**(EgovIdGnr/SEQUENCE/IDENTITY/UUID/native nextval/MAX+1; System.currentTimeMillis PK 는 프로덕션 **0** — 기존 문서 "12곳"은 stale, 회피주석+HealthCheck timestamp 뿐), `extends BaseCrud*` 프로덕션 **0**(死 스캐폴드), getMessage 사용 **1곳**(i18n 死채택), split-package main **1건**(nuri.business.service.log)·core↔app 동일FQN main 중복 **0**.

- **단순성(+6, 최대 이동)**: #1 의 39파일 표면적 정리와 **안티패턴 인터페이스 0 달성**(clutter·계약 축소)이 상승분의 핵심. #2 플러밍 dedup·#3 config 정돈이 보강. split-package 는 실측상 이미 main 1건까지 감소해 이 하위축은 양호. 그러나 단순성을 지배하는 구조 캡(two-paradigm 상속·PK 6전략·egov ID채번 결합·死 i18n 스캐폴드)은 **미해결** → 대약진 근거 없음, Δ 를 '작음~보통'으로 제한.
- **완성도(+2)**: #4(상태코드 시맨틱 정합 404/400)·#5(tx readOnly 경계 일관)가 직접 기여하는 correctness 개선. 기반 견고(GlobalExceptionHandler 13핸들러·@Valid 44파일/95회·서비스 hasRole 이중검증+SecurityAuthAnnotationLinterTest 오딧[⚠ 2026-08-03 현행화: 패키지 skip 삭제로 **전 컨트롤러 순회**가 됐으나, secure-paths 문자열 매칭·소유권 위임·`isAuthenticated()` 만으로도 통과하므로 '모든 인가를 검증'하지는 않는다 — 상세는 린터 javadoc]·컨트롤러 Entity반환 위반 0). #1~#3 은 단순성 성격이라 완성도 기여 한계적.
- **연결부(+1, 최소 이동)**: seam 접점은 #2(DRY·정체성 축 가시성↑)·#3(split-package 아웃라이어 1건)뿐. 모듈/레이어 경계는 ArchUnit 스위트(controller!→entity·layered·domain 단방향·no-cycle·foundation!→business·DomainIsolation ALLOW-LIST 동결)로 이미 강하게 게이트(위반 0)돼 baseline 에 반영됨. **[정정 반영]** 재측정이 짚은 #2 의 잔여(AdministCode/BoardMaster 가 loginId-축 감사컬럼 lastMdfrId 에 getCurrentEsntlId() 주입+"감사=esntlId" 주석)는 **후속 커밋에서 4컨트롤러 loginId 통일로 정정**(create 경로 userId 미사용·update/delete 는 lastMdfrId 로 흘러 loginId 가 정합 축; 감사 flush 가 어차피 loginId 로 덮어써 동작 무변화·테스트 green) → 정체성 축 코드-데이터 일치. seam 상한은 여전히 §2.D(SSOT 자동정합·backend-shape 오프라인 게이트 부재)가 지배.

**여전히 60~80대에 묶는 캡(정직)**: ① **§2.A Two-paradigm 앵커** — BaseAbstractService extends EgovAbstractServiceImpl + EgovIdGnrService 결합(접두 rename 은 표층, egov 패러다임은 상속·ID채번으로 잔존) ② **PK 채번 6전략 파편화**(currentTimeMillis 는 사라졌으나 이질 5~6전략 패치워크가 대체) ③ **egov 빈ID 12개**(명명 불일치 냄새) ④ **§2.G false-completion** — BaseCrud 채택 0·i18n getMessage 1곳(死 스캐폴드+하드코딩 한글 에러메시지) ⑤ **@PreAuthorize 역할 SpEL 하드코딩**(InstitutionCode/CommonCode/DeptJob/ApiSecurityConfig — SecurityUtil.hasRole 은 AuthorityConstants 상수화됐으나 SpEL 특성상 미도달) ⑥ **베이스 상속 부분적**(~20/65 서비스만 BaseAbstractService) ⑦ **§2.D 잔여** — UNIQUE↔@Table 미러 수동 3/~12·무강제+backend-shape→api-docs 하드게이트 CI 편중(과금 차단, 오프라인 결정적 보증 부재). **캡의 핵심은 BE 코드 자체가 아니라 §2.A(레거시 공존)·§2.C(횡단관심사)·§2.D(SSOT 파이프라인)·§2.G(false-completion)** 이며 #1~#5 는 이들에 손대지 않았다.

> ⚠ 채점 노트: #1~#5 는 5건 전부 코드 실물과 커밋 주장이 일치(과장 없음)했다. 단순성 +6 은 '안티패턴 인터페이스 0 달성+플러밍/config 정돈'의 확정 이득에서 나오며, 상한은 egov/JPA 이중 패러다임과 채번 패치워크가 누른다. 완성도·연결부의 소폭 Δ 는 #4/#5(correctness)·#2(DRY)에 한정된 접점을 반영한 보수적 산정이다.

### 1.3. BE 단순성 재측정 (2026-07-18, §2.A 반영)

> 07-17(§1.2) 이후 **§2.A(미완결 레거시 현대화 — 두 패러다임 공존, 본문 A항) 대량 작업**이 반영되어 BE 단순성 축만 재측정. 방법론 동일(커밋 메시지 아닌 **코드 실물 Grep/Read** 검증·과장 배제, 독립 measurer). **baseline(07-17=62) 은 델타 추적 위해 보존.** §2.A 는 §1.2 가 최심층 캡으로 지목한 ①("BaseAbstractService extends EgovAbstractServiceImpl + EgovIdGnrService 결합")의 **상속·ID채번 두 가닥을 모두 실물 제거**한 세션이라 거의 전적으로 **단순성** 축 사건이다.

| 축 | 07-17 | **07-18** | Δ |
|---|:---:|:---:|:---:|
| **완성도** | 83 | **83** | 0 |
| **연결부** | 74 | **74** | 0 |
| **단순성** | 62 | **68** | **+6** |

**반영된 §2.A 작업(전부 코드 실물 일치 — 과장 없음, 전체 백엔드 테스트 BUILD SUCCESSFUL 로 게이트 검증)**: **S1** `BaseAbstractService` POJO화(`BaseAbstractService.java:50`=`public abstract class BaseAbstractService {`, extends 절 없음) · **D1①** egov IdGnr 전면 이관(8서비스 `getNextStringId`→`IdGenerationUtil` + `EgovIdGnrConfig` 16빈·`BusinessIdGnrConfig` 12빈 삭제) · **S2~S4·V1/V4** 死코드/死배선 config 삭제(`EgovMap`/`EgovMailConfig`/`EgovConfig`/`EgovTestDataConfig`/`EgovFrameConfig`) · **D3(a)(b)** LegacyConfig 死·중복 egov IdGnr 8빈 삭제 · **D3(c)** 결재 PK 오채번 버그 정정 · **D1(B)** `PkGenerationStandardLinterTest` 신설.

**실측 지표(근거)**: EgovIdGnrService 런타임 결합 **28곳/설정 2개 → 0**(Grep `getNextStringId|EgovIdGnrService|EgovTableIdGnr` 유일 히트가 `IdGenerationUtil.java:14` 死 javadoc·나머지 주석/docs, 프로덕션 0). `**/*IdGnr*.java` Glob **=0**(config 물리 삭제 확증). `extends EgovAbstractServiceImpl` **0**. PK 채번 전략 **6→5**(egov IdGnr 갈래 통째 소멸, 잔여=수동 IdGenerationUtil / native nextval / SEQUENCE / IDENTITY / UUID). 死배선 5 config grep **0**. `PkGenerationStandardLinterTest` 가동(GRANDFATHERED 69종 census + vacuous-green 가드). 대비 **잔존 캡**: egov security/crypto 빈 프로덕션 활성(`EgovPasswordEncoder`→SecurityConfig:45·ApiSecurityConfig:71, `EgovAuthenticationProvider`→ApiSecurityConfig:95, `EgovFileScrty`·`getBean("ariacryptoService")`), 컴포넌트스캔 벽(basePackages `egovframework`/`org.egovframe` + ~22 REGEX exclude + 3 ASSIGNABLE), PK 수동 편중 **69/74 엔티티**(@GeneratedValue 5뿐), MessageSource 빈 **2중 정의**(LegacyConfig + EgovMessageConfig 동일 빈명), getMessage 실사용 **1곳**.

- **단순성(+6, 유일 이동)**: §1.2 지목 최심층 캡 ①의 **두 명명 가닥(상속 + ID채번)이 모두 실물 소멸** — 상속 체인(§2.A 패러다임 앵커)이 POJO화로 끊기고 egov `getNextStringId` 한 갈래가 통째 사라져 "수동 채번 = `IdGenerationUtil` 단일 경로"로 수렴(config 28빈 + 死배선 5종 제거로 clutter 대폭 감소). §1.2 인터페이스 39제거(+6)와 동급 구조 제거로 동일 Δ. 잔여 egov 결합·PK 93% 편중·신규 死주석이 무거워 **70대 후반 이상은 근거 없음**.
- **완성도(0)**: §2.A 는 死코드 제거(단순성)가 지배. §2.A 커밋들은 **전체 백엔드 테스트 BUILD SUCCESSFUL(11m26s)·실패 0 으로 게이트 검증**됨(D3(c) 결재 PK 정정 포함). 완성도 Δ +0 은 D3(c) 가 **소규모 correctness 정정이라 축 이동이 미세**하기 때문(미검증이 아님).
- **연결부(0)**: 死배선 egov config 제거로 부팅 결합 표면 미세 축소됐으나, 컴포넌트스캔 벽·EgovProperty/MessageConfig·crypto 결합이 그대로라 프로덕션 부팅은 여전히 egov 컨텍스트 결속 → 실질 무변.

**여전히 60대에 묶는 캡(정직)**: ① **§2.A 잔여 egov 결합(남은 절반)** — IdGnr·상속만 벗었을 뿐 security·crypto(EgovFileScrty/ARIA)·property·message·**컴포넌트스캔 벽**이 프로덕션 활성 잔존(오히려 더 손대기 어려운 보안·암호 계약 쪽이 남음) ② **PK 채번 93% 편중**(69/74 수동, @GeneratedValue 5 — "수동 vs JPA관리" 근본 파편은 D1[위험] 동결) ③ **§2.G false-completion 死주석**(소폭 증가) — BoardService.java:40(EgovAbstractServiceImpl/인터페이스 이중 오서술)·BoardMasterService.java:94(EgovTestDataConfig)·ScrapService.java:33(별칭 shim)이 삭제된 스캐폴드 참조 ④ **i18n 반쪽 스캐폴드**(MessageSource 2중 정의 vs 실사용 1곳, 하드코딩 한글 지배) ⑤ **egov 오명명 잔존**(nuri.* Egov* 4종 + egov 빈ID 5종) ⑥ **split-package**(business-app/core 동일 FQN 테스트 중복).

> ⚠ 채점 노트: §2.A 반영분은 실물 확증(EgovIdGnr 런타임 0·config Glob 0·상속 0·死config 0)과 커밋 주장이 일치했고 전체 백엔드 테스트로 게이트 검증됐다. 단순성 +6 은 '최심층 캡의 두 가닥(상속+ID채번) 소멸 + config 28빈·死배선 5종 제거'의 확정 이득이며, 상한은 잔여 egov 런타임 결합(보안·암호·프로퍼티·메시지·스캔)과 PK 93% 편중이 누른다. 이번 세션은 §2.A 의 IdGnr·상속 절반을 손댔다.
>
> ⚠ **후속(2026-07-18, 재측정 이후)**: **D4 컴포넌트스캔 벽 해체**(ApiServerApplication basePackages egovframework/org.egovframe + 제외필터 25줄 제거, 커밋 fdd1efab5) — 실측 결과 우리가 소비하는 egov 는 전부 우리 @Configuration 이 정의하는 라이브러리 인스턴스라 스캔 제거와 무관했다(부팅 egov 결합 소멸). **D5 비번 crypto** 는 재측정이 "미착수"로 오분류했으나 실은 **BCrypt DelegatingPasswordEncoder + 로그인 시 SHA-256→BCrypt 투명 마이그레이션이 이미 완비**(EgovAuthenticationProvider:76-83)돼 있었다. 따라서 위 캡 ①의 "scan/security/crypto 미착수" 서술은 **scan=해체됨·비번=이미 현대화됨**으로 정정한다(잔여 egov 결합은 property/message config·ARIA 데이터암호·레거시 해시검증용 EgovFileScrty 로 축소). 단순성 점수는 재측정 시점(68) 유지 — D4 는 추가 소폭 개선이나 별도 재측정 없이 정성 반영.

### 1.4. FE·SEAM 재측정 + BE 미세조정 (2026-07-18, §2.C·§2.B·브랜딩 반영)

> §1.3 이후 이 세션이 **§2.C(횡단관심사 게이트화)·§2.B(결합역전·서비스레이어 격리 게이트·프론트 브랜딩 토큰화)** 를 추가 수행. §1.2/§1.3 이 다루지 않은 **FE·SEAM 축을 07-15 이후 최초 재측정**하고, BE 는 §2.A egov 소거 완결 + §2.C/§2.B 연결부 기여분을 미세조정. **⚠ 위임 재측정 워크플로우가 세션 사용량 한도로 실패 → 메인 에이전트가 직접 실측**(db-bridge FK·게이트 파일 카운트·slate 잔여 grep). 방법론 동일(코드 실물·과장 배제).

| 차원 | 축 | 07-17/18 | **07-18(현재)** | Δ | 이동 근거(축) |
|---|---|:---:|:---:|:---:|---|
| **DB** | 완성도/연결부/단순성 | 89/88/82 | **89/88/82** | 0/0/0 | 마이그레이션 추가 0 → 스키마 미변경 |
| **BE** | 완성도/연결부/단순성 | 83/74/68 | **84/77/70** | +1/**+3**/+2 | 연결부=egov 소거+결합역전 |
| **FE** | 완성도/연결부/단순성 | 75/72/55 | **77/74/61** | +2/+2/**+6** | 단순성=브랜딩 토큰화 |
| **SEAM** | 계약체인/적합성/추적성 | 65/66/54 | **67/70/58** | +2/**+4**/**+4** | 적합성·추적성=게이트+관례 SSOT |

**FE(75/72/55 → 77/74/61)** — 실측: 중립 팔레트(slate/gray/zinc/neutral/stone) 하드코딩 **1075→196**(69파일; 스윕 861건·`surface-inverse` 토큰 패밀리 신설·[design-tokens.md](../03-guides/design-tokens.md) SSOT). `tsc --noEmit` + 클린 `next build` green, **브라우저 육안검증**(surface-inverse 라이트/다크 다크 렌더·계산색 `rgb(15,23,42)` 실증, 로그인 라이트/다크 정상).
- **단순성 +6(최대)**: 879 산발 색 리터럴 → 시맨틱 토큰 + 토큰 SSOT 문서화(§1.2 인터페이스 39제거와 동급 clutter 제거·리브랜딩=토큰 편집화).
- **완성도 +2·연결부 +2**: 디자인 일관성·다크모드 토큰 일원화(surface-inverse 로 다크서피스 파손 방지)·리브랜딩 seam.
- **+액센트 스윕(07-18 후속)**: blue/indigo/purple 하드코딩 **195건→hub-* 토큰**(48파일·`hub-indigo` 신설, 상태색/중립 불가침 순증감0·클린 build+빌드CSS 생성 확인) → 완성도 77→**78**·단순성 61→**63**.
- **캡(정직)**: 잔여 액센트(라이트 파스텔 틴트·히트맵 명암스케일·인라인 hex)·중립 196·RBAC 하드코딩(제품결정 하이브리드)·**FE auth**(localStorage 토큰·userRole 쿠키 위조·CSP unsafe-inline=아키텍처 보류)가 진입을 막음. 토큰화는 "완성"이 아니라 "색 축 정리".

**SEAM(65/66/54 → 67/70/58)** — 실측: 테스트 하네스 게이트 이번 세션 **+3**(`AsyncTransactionalListenerArchTest`[팬텀 async 가드→실제 기계강제: @Async+@TransactionalEventListener 금지]·`ServiceReadOnlyTransactionalLinterTest`[@Service 클래스레벨 readOnly]·`ServiceLayerIsolationTest`[DomainIsolationTest 의 서비스레이어 사각지대 봉합]) + [cross-cutting-conventions.md](../03-guides/cross-cutting-conventions.md)(6관심사 관례 SSOT).
- **적합성 +4·추적성 +6(최대 이동)**: 관례↔코드 일치가 **기계강제로 전환**(존재하지 않는 클래스를 인용하던 팬텀 가드 → 실제 게이트)·불변식 추적 게이트 확대(하네스 린터 6→9 + **프론트 vitest 색상 게이트** `hardcoded-color-guard`[브랜딩 토큰화 드리프트 차단, 베이스라인 247 동결·신규 하드코딩 팔레트색 차단] → 게이트 커버리지가 처음으로 **FE 축까지 확장**). `DashboardItemProvider` 포트·`UserDeletionEvent` seam 으로 계약체인 +2.
- **캡(정직)**: UNIQUE↔`@Table` 미러 미완·backend-shape→api-docs 오프라인 하드게이트 부재(§2.D)가 계약체인 상한을 지배.

**BE(83/74/68 → 84/77/70)** — 실측: `extends EgovAbstractServiceImpl | EgovIdGnrService | getNextStringId | new EgovTableIdGnr` 프로덕션 **0**(egov 채번·상속 결합 완전 소거 확증).
- **연결부 +3 → 77**: §2.A egov IdGnr 결합 **28→0 완전소거**(§1.2/1.3 상단 표 미반영분) + §2.B 필수→샘플 결합 2건 역전(UserService→community 이벤트化·Dashboard→board 포트化) + `ServiceLayerIsolationTest` 서비스레이어 격리. 모듈/결합 seam 실질 개선.
- **단순성 +2 → 70**: cross-cutting-conventions SSOT·정리배치(死주석3·NoOp footgun·MessageSource 이중정의 해소)·graphify-out 위생.
- **완성도 +1 → 84**: 팬텀 async 가드→실제 기계강제(scout5 회귀 클래스 방지)·결합역전 컴파일 취약 제거.

**DB(89/88/82 유지)** — 이번 세션 DB 마이그레이션 추가 **0** → 스키마 미변경. db-bridge FK **81**(§1.1 측정 58 대비 회귀 없음; 공유 OCI DB 의 추가 개선분은 타 작업 소관, 이번 세션 무관).

> ⚠ 채점 노트: 위임 워크플로우 실패로 서브에이전트 교차검증 없이 메인이 단독 실측·채점했다. 이동폭은 전부 **직접 grep/FK/육안 근거**에 묶어 보수 산정(FE 단순성 +6 은 861→시맨틱토큰의 확정 이득, SEAM +4×2 는 게이트 3신설+관례 SSOT, BE 연결부 +3 은 egov 28→0+결합 2역전). 근거 없는 상승 없음. **여전히 DB 외 3축이 60~80대인 것은 §2.A 잔여 egov(보안·암호·프로퍼티·메시지)·§2.B 프레임워크化 제품결정·§2.D SSOT·FE auth 아키텍처가 미해결이기 때문이며, 이는 국소 개선이 아닌 아키텍처/제품 결정으로만 90대 진입 가능.**

### 1.5. 4축 전면 재측정 (2026-07-28, 07-18 이후 119커밋 반영)

> §1.4 이후 **119커밋 / 515파일 / +33,584−13,379**(`git log --since=2026-07-18`)가 누적돼 4축 전면 재측정.
> 커밋 유형 분포는 **fix 44 · ci 19 · feat 10 · docs 9 · test 7**로 correctness·검증인프라가 지배한다.
> 방법론 동일(코드 실물·라이브 DB 실측·과장 배제). **⚠ 위임 없이 메인 에이전트 직접 실측**(db-bridge·grep·게이트 로직 재현).

| 차원 | 축 | 07-18 | **07-28** | Δ | 이동 근거(축) |
|---|---|:---:|:---:|:---:|---|
| **DB** | 완성도/연결부/단순성 | 89/88/82 | **91/90/83** | **+2**/+2/+1 | 완성도=CHECK 0→60 실적용 |
| **BE** | 완성도/연결부/단순성 | 84/77/70 | **87/78/71** | **+3**/+1/+1 | 완성도=admin P0·Origin 교정·뮤테이션 하드강제 |
| **FE** | 완성도/연결부/단순성 | 79/76/63 | **81/77/66** | +2/+1/**+3** | 단순성=하드코딩 색 207→114 |
| **SEAM** | 계약체인/적합성/추적성 | 67/70/63 | **69/73/70** | +2/+3/**+7** | 추적성=게이트 실행경로 0→pre-push 기계강제 |

#### DB (89/88/82 → 91/90/83)

**라이브 OCI 실측**(`pg_constraint`·`flyway_schema_history`): 마이그레이션 **V2_24~V2_31 8건 신규**, Flyway rank **35 전량 success·실패 0**.

| 지표 | §1.1(07-17) | **07-28** | 비고 |
|---|:---:|:---:|---|
| CHECK 제약(tb_) | **0** | **60** | V2_24 `_yn` 59컬럼 + 1 — §1.1이 명시한 **캡 ①** |
| FK(tb_) | 58 | 57 | 회귀 없음(V2_23·V2_31 테이블 삭제분) |
| 테이블 | 92 | 92 | 유지 |
| UNIQUE(tb_) | 9(보고) | 6 | **개선 근거 없음** — 기준 불일치 가능, 상승 미반영 |

- **완성도 +2**: §1.1이 "적용 후 재측정 대상"으로 남긴 **V2_24 CHECK 가 실제로 적용**(0→60)돼 도메인 검증이 앱 레이어에만 있던 갭이 물리 제약으로 봉합. 추가로 `SchemaValidationIntegrationTest`(빈 PG + Flyway 전량 + `ddl-auto:validate`) 신설로 **"H2 create-drop 은 물리 불일치를 원리적으로 검출 못한다"는 §1.1 경고가 실PG 게이트로 대응**됨.
- **연결부 +2**: `EntitySchemaConformanceLinterTest` 신설 — Flyway 델타를 재생해 엔티티 매핑↔물리 컬럼 타입·길이를 대조. 엔티티↔DB seam 이 처음으로 기계검증된다.
- **단순성 +1**: V2_31 고아 legacy idgen 테이블 삭제(소폭).
- **캡(정직)**: FK 키혼용(esntlId/loginId) 미통일 · UNIQUE↔`@Table` 미러 미완 · 빈 DB 부팅 불가(§2.B) — **전부 잔존**.

#### BE (84/77/70 → 87/78/71)

- **완성도 +3**: ① **관리자 전수감사 P0 일괄 마감**(`4dcee3014` — 데이터 파괴·인가 공백·거짓 성공 제거) + D-9/D-10/D-11/D-14 ② **Origin 검증 취약점 교정** — 부분문자열 비교가 `localhost.attacker.com` 류를 통과시키던 것을 hostname 정확매칭으로(+`OriginValidationFilterTest`) ③ **뮤테이션 75% 하드게이트 활성화** — `ci.yml`이 business-app·business-core 양쪽에 `STRICT_MUTATION: "true"`(종전 report-only). 금일 CI `mutation-test` **success** 실측.
- **연결부 +1**: `OwnershipGuardBaselineLinterTest`(가드 census 동결)·`EntitySchemaConformanceLinterTest`가 레이어 간 계약을 동결. 구조 캡 불변이라 소폭.
- **단순성 +1**: 死서비스 삭제(D-14 SyncAdminService 등). 그러나 아래 캡 불변.
- **캡(정직, 실측)**: egov security/crypto 결합 **잔존** — `EgovPasswordEncoder` **15** · `EgovAuthenticationProvider` **13** · `EgovFileScrty` **5** · `ariacryptoService` **2** 히트. PK **수동 편중 91%**(`@GeneratedValue` 8파일 / `@Entity` 88파일). `EgovAbstractServiceImpl`·`EgovIdGnrService` 프로덕션 **0 유지**(주석 1건뿐).
- ⚠ **Phase 2 사고(07-26)**: 타 오퍼레이터가 "COMPLETED"로 보고한 4건이 실측과 달랐고(PK 69종 일괄변경=런타임 파손·a11y ESLint exit1·뮤테이션 70%·Origin 우회), **P2-1은 전량 롤백**됐다. 점수에는 롤백 후 상태를 반영했다 — 즉 **이 사고로 인한 상승은 0**이며, 대응으로 신설된 게이트만 SEAM 에 반영했다.

#### FE (79/76/63 → 81/77/66)

- **단순성 +3**: 하드코딩 팔레트 색 **207(07-18 동결 census) → 114**(게이트 자체 로직 재현 실측, 334파일 스캔·위반 37파일). §1.4 의 861건 스윕(+6)보다 작은 이득이라 비례 배분.
- **완성도 +2**: admin menu 감사 P0/P1/P2 UI 결함 다수 해소(벌크·물리삭제 404 배선, 권한 매트릭스 허위 표시 정직화, 부서 전량 로드).
- **연결부 +1**: `proxy.test.ts`·`form-action-confirm-deadlock-guard`·`e2e-blind-wait-ratchet` 신설.
- **캡(정직)**: 잔여 하드코딩 114 · RBAC 하드코딩(제품결정) · **E2E 런타임 신호 부재**(아래 SEAM 참조). FE auth(§2.F)는 `fe-auth-hardening.test.ts`(07-18)로 이미 봉합·게이트化 확인 — localStorage 토큰 프로덕션 **0**(가드 테스트 주석만), 미들웨어 role 은 **서명검증 JWT 에서만** 추출(위조 `userRole` 쿠키 직접신뢰 회귀를 테스트가 차단).

#### SEAM (67/70/63 → 69/73/70) — 이번 기간 최대 이동

- **추적성 +7(최대)**: **하네스 린터가 "실행 경로 0"이던 구조가 해소**됐다. 07-26 이전 11종 린터는 CI 과금차단 + pre-push 미포함으로 **어디서도 돌지 않았다**(= 없는 게이트). 현재 `.githooks/pre-push`가 **컴파일 → tsc → codegen 드리프트 ×2 → `:api-server:harnessTest`(12종)** 를 기계강제하며, 금일 실제 푸시에서 `[pre-push] ✅ 컴파일 + 계약 + 하네스 게이트 통과` 로 **실증**됐다. 추가로 `localGate` 태스크(실PG 스키마검증 + 전 모듈 테스트) 신설, **CI 과금차단 해제**로 backend-build·frontend-build·mutation-test 가 실제로 green.
- **적합성 +3**: 하네스 린터 **9 → 12** — `EntitySchemaConformanceLinterTest`(H1) · **`HarnessBaselineIntegrityTest`(H2, 동결 베이스라인 변조·신설·소멸 3종 탐지)** · `OwnershipGuardBaselineLinterTest`(H3). H2 는 "예외목록을 늘려 red 를 지우는" 신호 은폐 자체를 게이트화한 것으로, Phase 2 사고의 직접 대응이다.
- **계약체인 +2**: api-docs 계약 드리프트 게이트가 pre-push 에 결속(`codegen:verify`/`codegen:verify:zod`).
- 🚨 **상승을 제한한 것 — E2E 전량 red**: CI 가 되살아났으나 **E2E 3샤드 전량 실패**(shard1 실측 28 failed / 12 passed). 미들웨어가 유효 토큰을 거부하는 단일 원인으로 추적됐고([20260728-ci-e2e-token-expiry-root-cause.md](../../.gemini/tasks/20260728-ci-e2e-token-expiry-root-cause.md) §11), **22-tier 스위트가 현재 회귀 신호를 전혀 주지 못한다.** 07-18 시점도 CI 차단으로 E2E 신호가 0 이었으므로 *악화는 아니나*, 추적성이 70 을 넘지 못하는 지배적 이유다. 이것이 해소되면 추적성은 단독으로 크게 오를 여지가 있다.
- **부수 관측(게이트 위생)**: FE 색상 가드 `BASELINE=207` 이 실측 114 대비 **93 만큼 느슨**하다. 하향 래칫을 하지 않으면 신규 하드코딩 93건까지 조용히 통과한다 — 게이트가 있으나 감도가 낮은 상태.

> ⚠ 채점 노트: 위임 워크플로우·서브에이전트 없이 메인이 단독 실측했다(사용자 지시 범위). 모든 Δ 는 **라이브 DB 쿼리·grep 카운트·게이트 로직 재현·금일 CI 실측**에 묶었다. **상승 미반영 항목을 명시한다** — UNIQUE(tb_) 는 6 으로 종전 보고(9)보다 낮아 개선으로 세지 않았고, Phase 2 의 PK 일괄변경은 롤백됐으므로 0 으로 처리했다. 90 대 진입은 DB 축뿐이며 BE/FE/SEAM 이 70~80 대에 머무는 이유는 §1.4 와 동일하다 — **§2.A 잔여 egov(보안·암호·프로퍼티·메시지) · §2.B 프레임워크化 제품결정 · §2.D SSOT 파이프라인**은 이번 기간에도 손대지 않았다. 이번 119커밋은 **correctness(fix 44)와 검증인프라(ci 19·test 7)** 에 집중됐고, 점수 이동도 정확히 그 두 축(완성도·추적성)에 나타난다.

### 1.6. 4축 전면 재측정 (2026-08-13, 07-28 이후 실물·CI 재검증)

> **척도 분리**: 이 절은 DB/BE/FE/SEAM의 구조 성숙도 12축을 같은 비중으로 평가한다. [개선 루프 완료 원장](../../.gemini/tasks/20260812-quality-score-improvement-loop.md)의 보안·운영 위험 가중 점수와 목적·가중치가 다르므로 숫자를 직접 비교하지 않는다.
> 방법은 이전과 같다. 커밋 수나 완료 문구를 점수 근거로 쓰지 않고 코드 census, 테스트 결과, active ruleset, 원격 CI 결과만 반영했다. 독립 검토에서 제시된 축별 보수안을 채택했고, 특히 07-28에 이미 반영한 Entity↔Schema·OpenAPI path/schema·codegen 게이트는 계약체인 상승 근거로 중복 계상하지 않았다.

| 차원 | 축 | 07-28 | **08-13** | Δ | 상승의 직접 근거 |
|---|---|:---:|:---:|:---:|---|
| **DB** | 완성도/연결부/단순성 | 91/90/83 | **91/91/85** | 0/+1/+2 | V2_32~V2_48, 死도메인 제거, 빈 PG17 스키마 게이트 |
| **BE** | 완성도/연결부/단순성 | 87/78/71 | **90/82/74** | +3/+4/+3 | 소유권·인증·업로드 경계 봉합, strict mutation 10범위, 死코드 제거 |
| **FE** | 완성도/연결부/단순성 | 81/77/66 | **85/83/70** | +4/+6/+4 | 408 unit tests, 생성 OpenAPI 타입 정렬, 업로더·로그 계약, 색상 래칫 |
| **SEAM** | 계약체인/적합성/추적성 | 69/73/70 | **77/84/85** | +8/+11/+15 | required E2E 131건 green, 하네스 12→29종, 로그·업로드·소유권 계약 보강(기존 API/DB 게이트 재계상 제외) |
| **12축 단순평균** | — | **78.0** | **83.1** | **+5.1** | `(997 / 12)`, 구조 성숙도 기준 |

#### 실측 근거

- **병합 강제 신호**: active ruleset `12501346`이 `backend-build`·`frontend-build`·`secret-scan`·E2E 3샤드·`mutation-test`의 정확한 7개 context를 required check로 강제한다. 우회 actor는 0이다. PR #398·#399는 이 구조에서 backend/frontend, strict mutation 10범위, E2E 3샤드까지 전부 green으로 병합됐다.
- **E2E 상한 해소**: PR #399 run `31622347297`에서 shard별 47/71/13, 합계 **131건**이 통과했다. §1.5의 “3샤드 전량 red·신호 0”은 역사 기록일 뿐 현재 캡이 아니다.
- **백엔드 검증**: 완료 원장 기준 전수 **2,008 tests/실패 0**, 최신 집계 JaCoCo instruction **89.13%**, branch **77.09%**, line **90.19%**다. mutation은 전체가 아니라 고위험 **10개 범위**를 `STRICT_MUTATION=true`·75%로 강제한다.
- **프런트 검증**: Vitest **80파일/408테스트** 전부 통과. 전체 소스 coverage는 statements **22.94%**, branches **18.36%**, functions **17.80%**, lines **23.51%**이고 하한은 22/18/17/23이다. 숫자가 상승했어도 20%대라 FE 90점대 근거로는 쓰지 않았다.
- **계약 체인**: 하네스는 **29클래스/36테스트·실패 0**이다. 엔티티↔스키마는 80엔티티/83테이블/888컬럼, DTO↔OpenAPI는 276 schema 중 매칭 DTO 91종을 검사하며 drift 0이다. backend가 `api-docs.json`을 오프라인 재생성·diff하고 frontend가 generated TypeScript/Zod drift를 검증한다. 로그 화면도 수제 타입 대신 생성 DTO와 0/1-base·`pageUnit` 계약에 맞췄다.
- **DB**: versioned migration 49개와 repeatable 2개가 존재하며 최신은 V2_48이다. CI는 빈 PostgreSQL 17에 Flyway 전량 적용→Hibernate validate→쓰기 smoke를 무조건 실행한다. 다만 이번 재측정에서는 라이브 OCI 연결정보를 사용하지 않았으므로 실제 적용 rank·FK/CHECK 개수를 새로 측정하지 않았고, 그 불확실성을 DB 완성도 0점 상승에 반영했다.
- **빌드/DX**: Gradle 10 폐기 경고를 0으로 만들고 로컬·CI 명령을 `--warning-mode fail`로 고정했다. `frontendUnitTest`·`harnessTest`·대표 strict PIT에서 configuration cache 문제 0과 저장/재사용을 확인했지만, 전역 활성화와 원격 재사용은 하지 않았다. backend/frontend 병렬 시작은 의존 계약으로 고정했고, 성공 run의 최초 build 시작→후속 E2E fan-out 시작은 직렬 #400 attempt 2(`31624861625`) **608초**에서 병렬 #401 최종(`31627566756`) **428초**로 180초(29.6%) 줄었다. 이는 두 실행의 관측치이며 장기 중앙값은 아니다.

#### 점수를 누르는 현재 캡과 우선순위

| 순위 | 잔여 | 현재 증거 | 다음 종료 조건 |
|---:|---|---|---|
| **1** | 읽기 인가 census | 쓰기 사유로 통과하는 읽기 엔드포인트 **30건**, 클래스 면제 **12건** | 도메인별 소유권 가드 또는 공개 사유로 0까지 판정 |
| **2** | FE 단위 회귀 탐지력 | line 23.51%, functions 17.80% | 인증·admin mutation·업로드·로그부터 30/25/25/30 이상 래칫 |
| **3** | 입력 계약 자동 전파 | `@Column(length=)` 536 vs DTO `@Size` 393, 직접 대응 미측정 | 고위험 DTO 길이·enum 불변식 표적 미러 게이트 |
| **4** | 구조 레거시 | 80엔티티 중 수동 단일 PK 동결 64, `@GeneratedValue` 3; eGov 결합은 비밀번호 호환·ARIA 암호에 좁게 잔존 | 데이터 census 후 도메인별 expand-contract; 일괄 전환 금지 |
| **5** | 제품화 결정 | i18n API 소비 파일 약 0.7%, business-core 안 survey/community 45 Java | 다국어 파일럿/단일언어 선언 및 core/app 경계 결정 |

**이번에 닫힌 false-green**: 색상 가드의 실제 잔여는 **104건**인데 기준선이 207이라 103건 증가를 허용했다. 기준선을 104로 내리고 실제 census와 정확히 같아야 통과하도록 바꿨다. 반대로 103으로 변조했을 때 RED가 나는 것을 확인했다.

**상승 미반영**: 라이브 OCI의 V2_32~V2_48 적용 상태, configuration cache 전역 활성화, CI 병렬화의 장기 중앙값, 실제 운영 배포·백업 복구·DR은 확인하지 않았다. 이 항목은 문서나 로컬 성공만으로 점수를 올리지 않는다.

---

## 2. 점수가 높지 않은 근본원인 (깊은 순)

> **현행 판독 규칙(2026-08-13)**: 아래 A~H는 원인 발견 당시의 증거와 후속 정정을 함께 보존한다. 현재 사실은 §1.6이 우선한다. 특히 컴포넌트 스캔 벽·빈 DB 부팅 불가·E2E/CI 신호 부재·UNIQUE/OpenAPI 무강제·RBAC 미전환은 이미 해소되었으므로 잔여 부채로 다시 세지 않는다.

현재 90점대를 막는 핵심은 **수동 PK·좁게 남은 암호 호환(A), 코어/샘플 및 i18n 제품결정(B), 읽기 인가 census(C), 입력 DTO까지 완전 자동 전파되지 않은 계약(D), 낮은 FE 단위 커버리지(H)**다. 개별 버그 수정보다 도메인별 설계 결정과 단계적 래칫이 필요한 영역이다.

### A. 미완결 레거시 현대화 — 두 패러다임의 공존 (가장 깊은 원인)
eGovFrame 5.0 레거시를 Spring Boot 3.4/Java 21 로 "현대화"했으나 **새 레이어를 위에 얹었을 뿐 재설계하지 않았다.** 구·신 패러다임이 한 코드베이스에 공존한다.
- **증거(표면부채 — 2026-07-17 대부분 해소)**: ~~감사컬럼 `frst_rgtr_id` 오버로드~~(poll 이중투표 fix) · ~~오명명 패키지 `usermanagement`~~(→`service/department` 정명) · ~~`Egov*` 접두 네이밍~~(인터페이스 39·빈ID 12·`EgovAbstractServiceImpl` 상속·死 config 4 제거) · ~~split-package 지뢰~~(core↔app 동일FQN main 중복 0, 잔여 1) · ~~`System.currentTimeMillis()` PK 채번 12곳~~(프로덕션 0).
- **✅ 2026-08-13 정정 — 위 심층결합 목록도 대부분 역사화**: 컴포넌트 스캔은 `nuri`만 대상으로 하고 `EgovIdGnrService`·`EgovPropertyConfig`·`EgovFrameConfig` 프로덕션 사용은 0이다. eGov import는 3파일 4줄로 축소됐고 실제 잔존은 **레거시 SHA-256 비밀번호 호환과 ARIA 주민번호 암호 계약**(`EgovPasswordEncoder`·`EgovAuthenticationProvider`·`EgovFileScrty`·`EgovEnvCrypto`)이다. 이름 정리가 아니라 기존 데이터 호환·키회전 설계 뒤에 제거해야 한다.
- **현재 구조 캡**: 하네스가 스캔하는 80엔티티 중 `@GeneratedValue`는 3개, 수동 단일 PK 동결은 64개다. 참조관계 census 없이 일괄 자동채번으로 바꾸는 것은 금지하며, 이 수동 편중과 좁게 남은 암호 호환이 BE 단순성 74의 주된 상한이다.

### B. "프레임워크"가 목표인데 실체는 샘플 앱 (목적↔현실 괴리)
저장소의 **진짜 목적은 신규 SI 재개발용 베이스 프레임워크**인데, 실체는 factoring 이 안 된 모놀리식 샘플이다.
- **증거(2026-07-11 스냅샷)**: `foundation` 이 껍데기(코어 로직 빈약) · **빈 DB 로 부팅 불가**(bootstrap/admin seed 부재) · 필수 모듈(foundation+admin)과 고유 모듈 미분리 · 재사용성 자체 진단 ≈50/100([framework-reusability-assessment.md](framework-reusability-assessment.md)).
- **✅ 대부분 해소 확인(2026-08-13 재확인)**: foundation은 41 Java이고 business 도메인 import 0, business-core→business-app import도 0이며 isolation gate가 이 방향을 강제한다. 빈 PostgreSQL 부팅·Flyway·validate는 CI 필수 게이트다. RBAC도 `rbac.db-auth.enabled:true`와 `DbUrlAuthorizationManager`로 DB 집행 중이며 `graphify-out` 추적 파일은 0이다.
- **현재 제품결정 캡**: business-core 안 survey/community **45 Java**를 필수 코어로 볼지 app으로 옮길지, i18n을 실제 제품 기능으로 확장할지 단일언어로 선언하고 scaffold를 제거할지가 남았다. 프런트 i18n API 소비는 약 0.7%이고 색상 잔여는 104건이다. “떼어낼 수 없음”보다 **떼어낸 뒤 무엇을 제품 표준으로 둘지**가 현재 문제다.

### C. 횡단관심사의 비체계적 적용 — 그래서 버그가 "패턴"으로 재발
인가·정체성·트랜잭션 경계·캐싱 같은 cross-cutting 관심사가 **관례/애스펙트가 아니라 엔드포인트마다 임기응변으로** 적용됐다.
- **증거(전부 "N곳" 패턴)**: currentTimeMillis PK ×12 · 커밋-전-async ×3(Sanction/Board/SMS/Mail) · 함수레벨 인가 누락 ×6 · check-then-act ×5 · split-package ×여러. 이번 세션이 개별 인스턴스를 잡았으나 **체계(관례)는 여전히 없어** 다음 컨트롤러/서비스에서 재발할 구조.
- **✅ 부분 해소(2026-07-18, 체계화 감사 → 게이트+관례 SSOT)**: 관심사별 게이트/관례 현황을 실측(`crosscutting-systematization-audit-2026-07-18`)해 **관례 SSOT 문서 신설**([cross-cutting-conventions.md](../03-guides/cross-cutting-conventions.md) — 6개 관심사 `[관례/근거/집행게이트/미집행갭]`). 최대 갭 2건을 **정적 게이트로 기계강제 전환**: ① `AsyncTransactionalListenerArchTest`(@Async+@TransactionalEventListener 금지) — 종전 `RestrictedTransactionalEventListenerFactory` **팬텀 가드**(주석만 존재·클래스 부재=거짓 안전감)를 실제 게이트로 대체하고 리스너 주석 3정정. ② `ServiceReadOnlyTransactionalLinterTest`(@Service 클래스레벨 readOnly 강제, 미준수 11종 동결·신규 드리프트 차단). 기존 게이트(Security/PkGen/UniqueMirror/SchemaNaming)와 합산해 인가(쓰기축)·PK채번·tx경계는 게이트화. **잔여(문서 방어)**: 인가 읽기축·SpEL, check-then-act 시맨틱, 정체성 컬럼축.
- **✅ 추가 해소(2026-07-28, 캐싱 = 마지막 무게이트 영역)**: 6개 관심사 중 **유일하게 집행 게이트가 0** 이던 캐싱을 `CachingInvalidationMatrixLinterTest`(양방향 매트릭스 — `NO_EVICT` 영구 stale / `DEAD_EVICT` 오타·잔재)로 봉합. 신설 첫 실행에서 **실존 결함 1건 검출**: `InstitutionCodeService` 의 `@CacheEvict("institutionCodes")` 를 채우는 `@Cacheable` 이 저장소에 없어 **아무것도 무효화하지 않으면서 거짓 안전감만 주던** 死 애노테이션(위치도 오배치 — 수신 로그 메서드에 붙어 있었다). 제거 완료. ⚠ `CacheConfig` 가 `@Profile("!test")` 라 **테스트에서는 캐싱이 꺼져 있어 어떤 테스트도 이 계열을 잡을 수 없다** — 정적 게이트만이 유효한 영역이었다. 캐시명 상수화는 44개 애노테이션 일괄 치환이라 §0.7-H4 상 별도 판단으로 남긴다(오타·rename 무음미스는 매트릭스가 이미 차단).
- **현재 잔여**: 29종 하네스와 DB/FE 인증 게이트로 “체계 없음” 상태는 끝났다. 다만 `WRITE_AUTHZ_GUARDED_ELSEWHERE`의 쓰기 사유로 통과하는 읽기 엔드포인트 30건과 클래스 면제 12건은 소유권·공개성 판단을 증명하지 못한다. 이 census를 도메인별로 판정하는 일이 SEAM 적합성의 최우선 잔여다.

### D. SSOT(단일 진실원) 전파 미정합 — 불변식이 한 레이어에만 존재
DB→Entity→DTO→Zod→FE 로 이어지는 진실이 **계층마다 따로 논다.**
- **증거**: 이번에 추가한 UNIQUE 제약(V2_4/V2_5)이 **JPA `@Table(uniqueConstraints)` 에 미러링 안 됨**(불변식이 SQL 에만) · DTO↔Zod wire-shape 드리프트를 계약게이트가 **backend-shape↔api-docs 괴리는 탐지 못함** · ~~meta_standard 가 명명 SSOT 라면서 빌드게이트 미강제~~.
- **✅ 부분 해소(2026-07-17)**: meta_standard **terms→domains 매핑 부재**(당시 5컬럼뿐)가 V2_17 로 100% 복원(13,173/13,173 + FK) → **헌법 제5조 3단계 기계검증 원천 확보**. 명명 검증은 **SchemaNamingLinterTest 신설(P4)** 로 빌드게이트화.
- **✅ 위 '증거' 2건은 2026-07-28 기준 전부 해소됨 — 서술이 stale 이었다**: ① **UNIQUE↔JPA 미러링**은 `UniqueConstraintMirrorLinterTest`(2026-07-17 신설, 3가지 인정방식+vacuous 가드)가 이미 기계강제 중이며 green. ② **backend-shape↔api-docs 괴리**는 `ApiDocsPathCoverageLinterTest`(07-18, **경로**)에 이어 **`ApiDocsSchemaFieldLinterTest`(07-28, **필드**)** 로 닫혔다 — DTO 필드 추가·삭제·개명 후 api-docs 재생성을 잊으면 red 가 된다(스키마 271건 중 매칭 DTO 87건 검사, 동결 0건).
- **✅ 추가 해소(2026-07-28) — 제약의 '종류'가 API 응답 의미로 전파되지 않던 갭**: V2_24 로 `_yn` 컬럼 **60개에 CHECK** 가 생겼으나 DTO 측 Y/N 검증은 **4곳**뿐이었고, `GlobalExceptionHandler` 는 **모든 무결성 위반을 409 "이미 존재하거나 사용 중인 값"** 으로 뭉갰다. 즉 클라이언트가 `dltYn:"X"` 같은 **허용되지 않는 값**을 보내도 "중복입니다" 라는 **의미가 틀린 409** 를 받았다 — 불변식이 DB 에만 살아 있고 API 로 전파되지 않은 전형이다. DTO 56곳에 `@Pattern` 을 뿌리는 대신(§0.7-H4 일괄치환 회피) **SQLState 로 분기**해 CHECK(23514)·NOT NULL(23502) → **400**, UNIQUE(23505)·FK(23503) → 409 유지로 정정했다. 한 곳 수정으로 CHECK 60개 전부가 정합된다. 회귀 가드 4건 포함(분기 무력화 시 2건 red 확인).
- **✅ 2026-08-13 현행**: api-docs는 212 paths/276 schemas이고 생성 TypeScript 17,196줄·Zod 3,904줄이다. backend 오프라인 생성·tracked diff, DTO 필드 하네스, frontend codegen drift가 pre-push와 CI에 결속돼 “backend→api-docs 무보호”는 해소됐다.
- **잔여**: Entity↔DTO는 투영 관계라 전수 동일성으로 볼 수 없다. 길이 제약은 `@Column(length=)` **536** vs DTO `@Size` **393**이고 필드 단위 직접 대응을 측정하지 않았다. 따라서 현재 계약체인 상한은 경로/필드 존재가 아니라 **입력 길이·enum·도메인 의미의 표적 자동전파**다.

### E. 정체성 모델의 근원적 혼란 (esntlId vs loginId)
`getUsername()`=esntlId 인데 감사/소유권=loginId. **두 ID 개념을 상속했지만 사용 계약을 통일하지 않았다.**
- **증거(이전 스냅샷)**: 이 footgun 하나가 poll 이중투표·IDOR·OTP 등 **여러 버그의 공통 원인**. `SecurityUtil` 로 분리·정정(`getCurrentLoginId` vs `getCurrentEsntlId`, `getCurrentUserId` @Deprecated)했으나 `getCurrentEsntlId` javadoc 이 여전히 "감사는 esntlId 로 일원화"라 문서 자기모순.
- **✅ 대부분 해소 확인(2026-07-18 실측 감사)**: 위 잔여는 **STALE**. 코드 실물 대조: ① `getCurrentUserId` 프로덕션 호출 **0**(SecurityUtil 정의부·테스트만) ② JPA 감사(`LoginUserAuditorAware`)·운영감사(`OperationalAuditInterceptor`) 모두 `CustomUserDetails.getUserId()`=**loginId** 반환(getName()=esntlId 는 비표준 principal fallback뿐, javadoc 명시) ③ `getCurrentEsntlId` javadoc 자기모순 **정정됨**(감사엔 loginId 쓰라 명기) ④ `identity-model-guide.md`(§1~§6)·`user-reference-key-policy.md` 규약 문서화. **회귀 방지 게이트 신설**: `IdentityAxisLinterTest`(harness) — 축 뒤섞던 `getCurrentUserId` 프로덕션 호출 0 유지 + SecurityContext 직접접근을 인프라 7종으로 동결(도메인 코드는 SecurityUtil 경유 강제). **잔여**: esntlId축 소유권 도메인(InformalSanction.aplcntId·Board.userId)은 제품 모델(문서화됨), 축 통일 자체는 설계 잔재.
- **누르는 점수(정정)**: SecurityUtil·IdentityAxisLinter와 최근 알림/결재/쪽지 소유권 가드로 §2.E는 주요 캡이 아니다. 남은 식별자 축은 도메인·FK 모델 결정이며, 현재 SEAM 상한은 읽기 인가 census와 입력 DTO 의미 계약이 지배한다.

### F. FE 인증 아키텍처의 구조적 취약
- **증거(2026-07 이전 스냅샷)**: 토큰 `localStorage` 저장 · 인증 쿠키 **non-HttpOnly**(document.cookie 기록) · 미들웨어 admin 게이트가 **위조 가능한 `userRole` 쿠키**만 신뢰(devtools 로 `userRole=ADMIN` 우회) · CSP `unsafe-inline`/`unsafe-eval`.
- **✅ 대부분 해소 확인(2026-07-18 실측 감사)**: 위 증거는 **대부분 STALE**. 코드 실물 대조: ① 토큰 localStorage 저장 → **0**(localStorage 는 autosave·tour·popup·theme 등 비-토큰뿐, `client.ts`·`AuthContext` 는 HttpOnly 쿠키 기반). ② accessToken → `api/auth/login/route.ts` 가 **HttpOnly·Secure(prod)·SameSite=Strict** 쿠키로 설정(응답 바디엔 role 만) + 동일출처 프록시(Next route handler + 미들웨어 Authorization 주입). ③ userRole 위조 → 미들웨어가 **Web Crypto `crypto.subtle.verify` 로 서명 JWT 검증**해 role 추출(위조 userRole 쿠키 불신). ④ CSP unsafe-eval → **prod 제거**(`next.config.ts` cspProd=`script-src 'self' 'unsafe-inline'`, object-src/frame-ancestors 'none'). **회귀 방지 게이트 신설**: `fe-auth-hardening.test.ts`(vitest) — 위 4대 불변식(HttpOnly·no-localStorage-token·서명검증·no-prod-unsafe-eval) 정적 못박음. **잔여(제품결정 보류)**: CSP `unsafe-inline` 제거(Next RSC nonce/PPR 인프라 필요). *(admin 민감경로 커버리지는 2026-07-20 `401c43f4c` 미들웨어 deny-by-default 반전으로 해소.)*
- **누르는 점수(정정)**: FE auth는 **HttpOnly+프록시+서명검증으로 현대화 완료**했고 DB RBAC도 집행 중이다. FE 상한은 이제 20%대 unit coverage·i18n 미결정·잔여 색상 104건이며, 보안 쪽 제품결정은 nonce 기반 CSP다.

### G. false-completion 문화 — "scaffold 는 있으나 채택은 0"
로드맵에 [x] 로 표시됐지만 디스크는 다른 항목 다수.
- **증거(이전 스냅샷)**: RBAC DB일원화(하드코딩 `hasRole` 잔존) · generic CRUD(BaseCrud 채택 0=死) · route-group 격리(디렉터리 0) · i18n(~2% 채택) · 브랜딩 토큰화(slate/gray 636건 잔존).
- **✅ 정직한 상태 현행화(2026-07-18 실측)** — §2.G 는 코드 문제가 아니라 **기록 문제**다. 각 [x] 항목의 실제 채택을 실측해 참으로 정정한다(강제채택이 오히려 결정에 反하는 항목 구분):

  | 항목 | 로드맵 | 실측 채택 | 정직한 상태 |
  |---|:---:|:---:|---|
  | RBAC DB일원화 | [x] | `rbac.db-auth.enabled:true` | **✅ DB 집행 중**(`DbUrlAuthorizationManager`). 메서드/소유권 이중검증은 정당하며 비활성 fallback 정리만 잔여 |
  | Generic CRUD | [x] | `extends BaseCrud*` **0** | **✅ explicit CRUD로 결정 종결**. `generate-domain.ps1`도 명시 CRUD를 생성하며 死 BaseCrud 채택 계획 없음 |
  | route-group 격리 | [x] | 괄호 디렉터리 **0** | **미이행**(진짜 false-completion). 조직화 이득 낮아 우선순위 하 |
  | i18n | [x] | i18n API **4/550 파일(~0.7%)** | **반쪽 스캐폴드**. 관리자 1화면 파일럿 후 확장 또는 단일언어 선언+scaffold 제거 결정 필요 |
  | 브랜딩 토큰화 | [x] | 잔여 **104** | **✅ exact 래칫**(`hardcoded-color-guard`, 기준선 여유 103건 제거) |

- **✅ 반-false-completion 관행 현행**: 완료 주장은 active required check나 exact census로 뒷받침한다. RBAC과 CRUD 방향은 이미 결판났고, 미결로 남는 큰 항목은 i18n 제품결정이다. route-group 0은 사실이나 구조 게이트가 이미 모듈 방향을 지키므로 낮은 우선순위다.

### H. 검증 인프라의 파편화 (신뢰 상한)
- **증거**: **CI 빌링 차단**(검증 못 함) · e2e 이 환경에서 구동 불가 · 테스트 컨텍스트 파편화(2026-07-15 세션에서 async 회귀가 business-app full 미실행으로 누락됐다가 뒤늦게 검출·정정) · 재발방지 린터 allow-list 17개는 수기 신뢰 목록.
- **✅ 부분 해소(2026-07-18, 통합 게이트 신설)**: "실제로 안 깨진다"를 **단일 명령으로 증명**하는 통합 검증 게이트 신설 — `node scripts/verify.mjs [all|be|fe]`(= `make verify` / `npm run verify`, 단일 소스). 백엔드 **전 모듈** 컴파일+테스트(하네스 린터 9종+ArchUnit 포함) + 프론트 `tsc --noEmit`+`next build`+`vitest`(색상/fe-auth/identity 회귀 게이트 포함)를 한 번에. **테스트 컨텍스트 파편화(2026-07-15 async 회귀 누락)의 근본 = "전 모듈을 한 번에 안 돌림"을 이 게이트가 봉합**(OS 감지 `.\gradlew.bat`/`./gradlew`, make 불요). *(pre-push 훅은 컴파일+계약 게이트만 = 빠른 관문, verify 는 full-suite 관문.)*
- **✅ 2026-08-13 현행**: CI는 정상 작동하며 7개 정확한 required context가 병합을 강제한다. E2E는 3샤드 131건 green, 하네스는 29클래스/36테스트다. `localGate`와 pre-push도 컴파일·codegen·하네스를 계층적으로 강제한다. 따라서 “CI 빌링 차단·E2E 상시화 미해결”은 현재 사실이 아니다.
- **현재 신뢰 상한**: FE unit coverage 20%대, strict mutation이 고위험 10범위에 한정된 점, configuration cache를 전역 활성화하지 않은 점, 운영 배포·백업복구·DR을 저장소 CI가 증명하지 못하는 점이다.

---

## 3. 근본원인 → 점수 매핑 요약

| 근본원인 | 주로 누르는 점수 | 성격 | 해소 수단 |
|---|---|---|---|
| A. 미완결 레거시 현대화 | BE 단순성 | 수동 PK·암호 데이터 호환 | 도메인별 PK expand-contract, BCrypt/ARIA 호환 census 후 단계 제거 |
| B. 프레임워크 제품경계 | FE/BE 단순성·재사용성 | 제품결정 | survey/community core 귀속, i18n 단일언어/다국어 결정 |
| C. 읽기 인가 census | BE 연결부 · SEAM 적합성 | 소유권 시맨틱 | 30 endpoint·12 class 면제를 도메인별 판정 |
| D. 입력 계약 자동전파 | 계약체인 | 부분 자동화 | DTO 길이·enum 표적 미러 게이트 |
| E. 정체성 모델 혼란 | ~~적합성·추적성~~ **✅ 대부분 해소** | SecurityUtil+문서+IdentityAxisLinter 게이트 | 잔여: esntlId축 소유권=제품모델 |
| F. FE 인증 아키텍처 | ~~FE 완성도·연결부~~ **✅ 대부분 해소** | HttpOnly+프록시+서명검증 완료 | 잔여: nonce-CSP·admin커버리지(제품결정) |
| G. false-completion | 추적성 | **✅ 대부분 해소** | exact census·active ruleset 유지, i18n 상태 정직 표기 |
| H. 검증 파편화 | FE 완성도·운영 신뢰 | **✅ CI/E2E/하네스 통합** | FE coverage 확대, 운영 DR은 별도 실증 |

---

## 4. 결론

- **검증 기반은 7월과 다른 단계다** — E2E 131건·하네스 29종·strict mutation 10범위가 병합을 실제로 막는다. 07-28에 이미 점수화한 API/DB 계약 게이트는 다시 세지 않아도 SEAM은 69/73/70에서 **77/84/85**로 올랐다.
- **남은 낮은 점수는 더 이상 CI 부재 때문이 아니다** — FE unit line 23.51%, 읽기 인가 30건, 수동 PK 61엔티티(주소록 2종 V2_49·도움말 1종 V2_50 BIGINT IDENTITY 전환 완료), i18n 0.7%, DTO 길이 자동전파 미완이 측정 가능한 상한이다.
- **다음 상승은 두 갈래다** — 저장소 내부에서는 읽기 인가·FE coverage·입력 계약 래칫을 계속하고, 구조/제품 영역에서는 i18n·core/app 경계·PK/암호 호환을 명시 결정 후 단계적으로 바꾼다.

> 한 줄: **“검증 뼈대는 완성됐고, 이제 낮은 커버리지와 제품·데이터 계약 결정을 갚는 단계”**다.
