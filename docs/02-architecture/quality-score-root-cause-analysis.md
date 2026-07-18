# 품질 스코어 근본원인 분석 (Quality Score Root-Cause Analysis)

> 작성: 2026-07-15 · 기준: 코드 실물 검증 기반 재평가(2026-07-13 baseline → 2026-07-15, 백엔드 하드닝 17커밋 반영)
> **갱신: 2026-07-17 — DB 축 재측정 추가(§1.1). V2_12~V2_23 DB 표준화 스윕 반영, 라이브 OCI DB 실측. 완성도/연결부/단순성 83·79·72 → 89·88·82.**
> **갱신: 2026-07-17(2) — BE 축 재측정 추가(§1.2). 단순성 로드맵 #1~#5(인터페이스 제거·getCurrentUserId 통합·config 정리·에러코드·tx) 반영, 코드 실물 검증. 완성도/연결부/단순성 81·73·56 → 83·74·62.**
> **갱신: 2026-07-18 — BE 단순성 재측정 추가(§1.3). §2.A 대량 작업(egov IdGnr 전면제거·EgovAbstractServiceImpl 상속이탈·死코드/config 삭제·결재PK 버그정정·PK표준 린터) 반영. 단순성 62 → 68(완성도/연결부 83/74 유지).**
> **갱신: 2026-07-18(3) — 점수상승 세션: FE 액센트 토큰화(FE 78/74/63)·프론트 색상/FE-auth 회귀 게이트 신설(SEAM 추적성 60→61)·§2.F FE인증 대부분 해소 확인(HttpOnly+프록시+서명검증, FE 79/76). 최종: DB 89/88/82·BE 84/77/70·FE 79/76/63·SEAM 67/70/61.**
> **갱신: 2026-07-18(2) — FE·SEAM 재측정 추가(§1.4, 07-15 이후 최초). §2.C 게이트화·§2.B 결합역전/브랜딩 토큰화 반영. FE 75/72/55→**77/74/61**·SEAM 65/66/54→**67/70/58**·BE 83/74/68→**84/77/70**(연결부 egov소거+결합역전)·DB **89/88/82 유지**. 상단 표를 07-18 현재값으로 통합. ⚠위임 워크플로우 세션한도 실패로 메인 직접 실측 채점.**
> 방법론: DB/BE/FE/연결부 4차원 독립 assessor가 커밋 메시지가 아닌 **코드 실물을 Read/Grep 로 검증**해 채점 → 메인 재검증. 이 저장소의 감사수치 과장 이력을 감안해 **과장 배제** 원칙 적용.
> 관련: [framework-reusability-assessment.md](framework-reusability-assessment.md) · [log-retention-policy.md](../04-operations/log-retention-policy.md)

---

## 1. 재평가 스코어카드

| 차원 | 축 | Before(07-13) | 07-15 | **07-18(현재)** | 누적 Δ |
|---|---|:---:|:---:|:---:|:---:|
| **DB** | 완성도 / 연결부 / 단순성 | 82 / 78 / 72 | 83 / 79 / 72 | **89 / 88 / 82** | +7 / +10 / +10 |
| **BE(백엔드)** | 완성도 / 연결부 / 단순성 | 76 / 70 / 55 | 81 / 73 / 56 | **84 / 77 / 70** | +8 / +7 / +15 |
| **FE(프론트)** | 완성도 / 연결부 / 단순성 | 74 / 72 / 55 | 75 / 72 / 55 | **79 / 76 / 63** | +5 / +4 / +8 |
| **연결부(seam)** | 계약체인 / 적합성 / 추적성 | 64 / 58 / 48 | 65 / 66 / 54 | **67 / 70 / 61** | +3 / +12 / +13 |

> **07-18(현재) 열 = 하위 재측정 통합**: DB=§1.1(07-17 라이브 실측) · BE=§1.2/§1.3 + §1.4 미세조정 · **FE·SEAM=§1.4(이번 세션 재측정, 07-15 이후 최초)**. 세부 근거·캡은 각 하위 절 참조. 위임 워크플로우가 세션 한도로 실패해 **메인 에이전트 직접 실측**(FK·게이트·slate 잔여 카운트)으로 채점.

**핵심 관찰(누적)**: 최대 이동은 **BE 단순성(+15)·DB 3축(+7~+10)·SEAM 적합성(+12)** — 세션들이 백엔드 정확성/보안 → DB 표준화 → 레거시 소거·횡단관심사 게이트화·재사용성으로 이동한 궤적과 정합. **DB만 80대 후반, BE/FE/SEAM 은 60~80대**에 머무는데, 이는 **버그 때문이 아니라(버그는 대거 수정됨) 구조·아키텍처 부채**(§2.A 잔여 egov 결합·§2.B 프레임워크化 제품결정·§2.D SSOT 파이프라인·FE auth 아키텍처) 때문이다. 이번 세션(07-18)의 이동: FE 단순성 +6(브랜딩 토큰화)·SEAM 적합성/추적성 +4(게이트+관례 SSOT)·BE 연결부 +3(egov 소거+결합역전).

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

**여전히 90대를 못 넘는 캡(정직)**: ① **CHECK 제약 0**(도메인 검증이 앱 레이어에만) ② **FK 미완**(로그/인증 테이블 esntlId/loginId 키혼용 — [user-reference-key-policy.md](user-reference-key-policy.md) 로 문서화됐으나 미통일) ③ **빈 DB 부팅 불가**(프레임워크化 미완, §2.B — 스키마 품질과 별개 축) ④ UNIQUE 의 JPA `@Table(uniqueConstraints)` 미러링 미완 ⑤ currentTimeMillis PK 등 코드 레벨 레거시. **캡의 핵심은 DB 스키마 자체가 아니라 § 2.B(프레임워크化)·§2.D 잔여(불변식 미러)·§2.C(횡단관심사)** 다.

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
- **완성도(+2)**: #4(상태코드 시맨틱 정합 404/400)·#5(tx readOnly 경계 일관)가 직접 기여하는 correctness 개선. 기반 견고(GlobalExceptionHandler 13핸들러·@Valid 44파일/95회·서비스 hasRole 이중검증+SecurityAuthAnnotationLinterTest 전수오딧·컨트롤러 Entity반환 위반 0). #1~#3 은 단순성 성격이라 완성도 기여 한계적.
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

---

## 2. 점수가 높지 않은 근본원인 (깊은 순)

이번 세션이 잡은 것은 대부분 아래 **C·E 의 "인스턴스"(개별 버그)** 다. 점수가 90대로 못 오르는 진짜 이유는 **A·B·D — "레거시를 덜 벗은 미완결 프레임워크"라는 구조 자체** 이며, 이는 국소 수정이 아닌 **아키텍처 결정**으로만 해소된다.

### A. 미완결 레거시 현대화 — 두 패러다임의 공존 (가장 깊은 원인)
eGovFrame 5.0 레거시를 Spring Boot 3.4/Java 21 로 "현대화"했으나 **새 레이어를 위에 얹었을 뿐 재설계하지 않았다.** 구·신 패러다임이 한 코드베이스에 공존한다.
- **증거(표면부채 — 2026-07-17 대부분 해소)**: ~~감사컬럼 `frst_rgtr_id` 오버로드~~(poll 이중투표 fix) · ~~오명명 패키지 `usermanagement`~~(→`service/department` 정명) · ~~`Egov*` 접두 네이밍~~(인터페이스 39·빈ID 12·`EgovAbstractServiceImpl` 상속·死 config 4 제거) · ~~split-package 지뢰~~(core↔app 동일FQN main 중복 0, 잔여 1) · ~~`System.currentTimeMillis()` PK 채번 12곳~~(프로덕션 0).
- **증거(심층결합 — 잔존, [위험-DB설계결정] 티어)**: `EgovIdGnrService` 테이블 채번(ecopseq/ids, config 27빈+서비스 주입) + **PK 채번 6+1전략 공존** · egov 라이브러리 런타임 결합(`EgovPropertyConfig`/`EgovMessageConfig`(classpath:/egovframework/message)/`EgovFrameConfig` LeaveaTrace) · **컴포넌트스캔 벽**(ApiServerApplication basePackages egovframework/org.egovframe + 레거시 web 억제 exclude 17+필터) · 암호결합(`EgovFileScrty` SHA-256·ARIA·EgovEnvCrypto — 레거시 비번 호환). 이들은 라이브 공유 DB·시퀀스·보안계약에 닿아 개별 설계 승인 필요(§2.A 본질=클래스 개명 아닌 egov **런타임 결합 제거**).
- **누르는 점수**: BE 단순성(56) · DB 연결부(79) · SEAM 추적성(54). 코드가 "정리된 하나의 설계"가 아니라 "이행 중 스냅샷"이라 단순성·추적성이 근본적으로 낮다.

### B. "프레임워크"가 목표인데 실체는 샘플 앱 (목적↔현실 괴리)
저장소의 **진짜 목적은 신규 SI 재개발용 베이스 프레임워크**인데, 실체는 factoring 이 안 된 모놀리식 샘플이다.
- **증거(2026-07-11 스냅샷)**: `foundation` 이 껍데기(코어 로직 빈약) · **빈 DB 로 부팅 불가**(bootstrap/admin seed 부재) · 필수 모듈(foundation+admin)과 고유 모듈 미분리 · 재사용성 자체 진단 ≈50/100([framework-reusability-assessment.md](framework-reusability-assessment.md)).
- **✅ 대부분 해소 확인(2026-07-18, 재사용성 실태 감사 `framework-reusability-audit-2026-07-18`)**: 위 진단의 **구조적 절반은 이미 STALE**. 실측 대조: (1) foundation 껍데기 → **해소**(계약3종·JWT백본·UserAuthPort/DashboardItemProvider 포트·BaseEntity 실체 커널 38파일, business 도메인 import 0). (2) 빈 DB 부팅불가 → **거짓**(V2_0 baseline 101테이블 + R__seed_framework 가 webmaster/ROLE_ADMIN 멱등 시드 → 빈 Postgres 에서 마이그레이션→validate→admin 로그인→메뉴 렌더까지 성립, 하드 블로커 0). (3) 필수/샘플 미분리 → **대부분 해소**(business-core 필수16 / business-app 샘플20 물리분할 + 단방향 비순환, business-core→app import 0 → 샘플 삭제해도 컴파일 성립). **재사용 준비도 ≈50→≈70**. 남은 결합 2건도 이번에 역전: DashboardApiController→BoardService 를 `DashboardItemProvider` 포트로(BoardDashboardProvider), UserService(필수)→CommunityUserRepository(샘플)를 `UserDeletionEvent` 리스너로 → **서비스레이어 격리 게이트 신설**(`ServiceLayerIsolationTest`, DomainIsolationTest 의 서비스 사각지대 봉합). **잔여(제품결정)**: 필수/샘플을 제품으로 확정(샘플 삭제/추출)·business-core 내 샘플-in-core(survey/community ≈50파일)·RBAC 하드코딩 83+webmaster23·프론트 slate/gray(2026-07-18 중립 861 토큰화·214 잔여, [design-tokens.md](../03-guides/design-tokens.md))·graphify-out 위생회귀.
- **누르는 점수**: DB 완성도 상한 및 전 차원의 "이걸 그대로 재사용할 수 있는가" 관점. 버그를 아무리 잡아도 "프레임워크로서의 완성"으로 번지지 못해 완성도가 80대 초반에서 막힌다. *(2026-07-18 감사로 "떼어낼 수 있는가(구조)"는 사실상 해결 → 남은 30점은 "떼어낸 뒤 값만 갈아끼우기(RBAC·브랜딩 파라미터화·위생)"의 몫으로 문제 위상이 한 단계 상승.)*

### C. 횡단관심사의 비체계적 적용 — 그래서 버그가 "패턴"으로 재발
인가·정체성·트랜잭션 경계·캐싱 같은 cross-cutting 관심사가 **관례/애스펙트가 아니라 엔드포인트마다 임기응변으로** 적용됐다.
- **증거(전부 "N곳" 패턴)**: currentTimeMillis PK ×12 · 커밋-전-async ×3(Sanction/Board/SMS/Mail) · 함수레벨 인가 누락 ×6 · check-then-act ×5 · split-package ×여러. 이번 세션이 개별 인스턴스를 잡았으나 **체계(관례)는 여전히 없어** 다음 컨트롤러/서비스에서 재발할 구조.
- **✅ 부분 해소(2026-07-18, 체계화 감사 → 게이트+관례 SSOT)**: 관심사별 게이트/관례 현황을 실측(`crosscutting-systematization-audit-2026-07-18`)해 **관례 SSOT 문서 신설**([cross-cutting-conventions.md](../03-guides/cross-cutting-conventions.md) — 6개 관심사 `[관례/근거/집행게이트/미집행갭]`). 최대 갭 2건을 **정적 게이트로 기계강제 전환**: ① `AsyncTransactionalListenerArchTest`(@Async+@TransactionalEventListener 금지) — 종전 `RestrictedTransactionalEventListenerFactory` **팬텀 가드**(주석만 존재·클래스 부재=거짓 안전감)를 실제 게이트로 대체하고 리스너 주석 3정정. ② `ServiceReadOnlyTransactionalLinterTest`(@Service 클래스레벨 readOnly 강제, 미준수 11종 동결·신규 드리프트 차단). 기존 게이트(Security/PkGen/UniqueMirror/SchemaNaming)와 합산해 인가(쓰기축)·PK채번·tx경계는 게이트화. **잔여(문서 방어)**: 인가 읽기축·SpEL, check-then-act 시맨틱, 캐시명 상수화(게이트 0), 정체성 컬럼축.
- **누르는 점수**: BE 단순성·연결부 · SEAM 적합성. 방어가 "단일 레이어 국소 수정"에 의존(실질 인가 경계가 백엔드 @PreAuthorize **한 겹**뿐, DB 엔 FK 8건/CHECK 0건, FE 미들웨어는 위조 가능). *(2026-07-18 게이트화로 재발 방지의 "체계" 축은 일부 확보 — 인스턴스 정정에만 의존하던 구조에서 드리프트-차단 게이트로 이동.)*

### D. SSOT(단일 진실원) 전파 미정합 — 불변식이 한 레이어에만 존재
DB→Entity→DTO→Zod→FE 로 이어지는 진실이 **계층마다 따로 논다.**
- **증거**: 이번에 추가한 UNIQUE 제약(V2_4/V2_5)이 **JPA `@Table(uniqueConstraints)` 에 미러링 안 됨**(불변식이 SQL 에만) · DTO↔Zod wire-shape 드리프트를 계약게이트가 **backend-shape↔api-docs 괴리는 탐지 못함** · ~~meta_standard 가 명명 SSOT 라면서 빌드게이트 미강제~~.
- **✅ 부분 해소(2026-07-17)**: meta_standard **terms→domains 매핑 부재**(당시 5컬럼뿐)가 V2_17 로 100% 복원(13,173/13,173 + FK) → **헌법 제5조 3단계 기계검증 원천 확보**. 명명 검증은 **SchemaNamingLinterTest 신설(P4)** 로 빌드게이트화. **잔여**: UNIQUE↔JPA 미러링·DTO↔Zod backend-shape 게이트는 미해결(계약체인 캡 유지).
- **누르는 점수**: SEAM 계약체인(65, 사실상 정체)·추적성(54). "한 곳 바꾸면 나머지가 자동 정합"이 안 되므로 계약체인 점수가 근본적으로 낮다. *(DB 축 연결부는 §1.1 재측정에서 79→88 로 상승 — SSOT 매핑 복원 반영.)*

### E. 정체성 모델의 근원적 혼란 (esntlId vs loginId)
`getUsername()`=esntlId 인데 감사/소유권=loginId. **두 ID 개념을 상속했지만 사용 계약을 통일하지 않았다.**
- **증거**: 이 footgun 하나가 poll 이중투표·IDOR·OTP 등 **여러 버그의 공통 원인**. 이번에 `SecurityUtil` 로 분리·정정(`getCurrentLoginId` vs `getCurrentEsntlId`, `getCurrentUserId` @Deprecated)했으나 `getCurrentEsntlId` javadoc 이 여전히 "감사는 esntlId 로 일원화"라 **문서가 코드와 자기모순**.
- **누르는 점수**: SEAM 적합성/추적성. 봉합은 했으나 "왜 두 ID 가 있고 어디에 뭘 쓰는가"의 규약이 문서·전 도메인 수준에서 아직 일관되지 않다.

### F. FE 인증 아키텍처의 구조적 취약
- **증거(2026-07 이전 스냅샷)**: 토큰 `localStorage` 저장 · 인증 쿠키 **non-HttpOnly**(document.cookie 기록) · 미들웨어 admin 게이트가 **위조 가능한 `userRole` 쿠키**만 신뢰(devtools 로 `userRole=ADMIN` 우회) · CSP `unsafe-inline`/`unsafe-eval`.
- **✅ 대부분 해소 확인(2026-07-18 실측 감사)**: 위 증거는 **대부분 STALE**. 코드 실물 대조: ① 토큰 localStorage 저장 → **0**(localStorage 는 autosave·tour·popup·theme 등 비-토큰뿐, `client.ts`·`AuthContext` 는 HttpOnly 쿠키 기반). ② accessToken → `api/auth/login/route.ts` 가 **HttpOnly·Secure(prod)·SameSite=Strict** 쿠키로 설정(응답 바디엔 role 만) + 동일출처 프록시(Next route handler + 미들웨어 Authorization 주입). ③ userRole 위조 → 미들웨어가 **Web Crypto `crypto.subtle.verify` 로 서명 JWT 검증**해 role 추출(위조 userRole 쿠키 불신). ④ CSP unsafe-eval → **prod 제거**(`next.config.ts` cspProd=`script-src 'self' 'unsafe-inline'`, object-src/frame-ancestors 'none'). **회귀 방지 게이트 신설**: `fe-auth-hardening.test.ts`(vitest) — 위 4대 불변식(HttpOnly·no-localStorage-token·서명검증·no-prod-unsafe-eval) 정적 못박음. **잔여(제품결정 보류)**: CSP `unsafe-inline` 제거(Next RSC nonce/PPR 인프라 필요)·admin 민감경로 커버리지 확대.
- **누르는 점수(정정)**: FE auth 는 **HttpOnly+프록시+서명검증으로 현대화 완료** → §2.F 는 더 이상 FE 연결부의 주요 캡이 아니다(FE 연결부 상한은 이제 브랜딩·i18n·RBAC 하드코딩이 지배). 잔여 nonce-CSP·admin커버리지는 아키텍처/제품 결정이라 국소 개선 대상 아님.

### G. false-completion 문화 — "scaffold 는 있으나 채택은 0"
로드맵에 [x] 로 표시됐지만 디스크는 다른 항목 다수.
- **증거**: RBAC DB일원화(하드코딩 `hasRole` 잔존) · generic CRUD(BaseCrud 채택 0=死) · route-group 격리(디렉터리 0) · i18n(~2% 채택) · 브랜딩 토큰화(slate/gray 636건 잔존).
- **누르는 점수**: 단순성·추적성·완성도. "존재한다"와 "전면 채택됐다"의 간극이 커서, 기능이 있어도 점수로 인정받지 못한다.

### H. 검증 인프라의 파편화 (신뢰 상한)
- **증거**: **CI 빌링 차단**(검증 못 함) · e2e 이 환경에서 구동 불가 · 테스트 컨텍스트 파편화(2026-07-15 세션에서 async 회귀가 business-app full 미실행으로 누락됐다가 뒤늦게 검출·정정) · 재발방지 린터 allow-list 17개는 수기 신뢰 목록.
- **누르는 점수**: 전 차원의 추적성/신뢰. "실제로 안 깨진다"를 통합 게이트로 증명하기 어려워 상한이 눌린다.

---

## 3. 근본원인 → 점수 매핑 요약

| 근본원인 | 주로 누르는 점수 | 성격 | 해소 수단 |
|---|---|---|---|
| A. 미완결 레거시 현대화 | BE 단순성 · DB 연결부 · 추적성 | 구조 재설계 | 패키지/네이밍 정리, 감사↔업무 식별자 분리 |
| B. 프레임워크化 미완(샘플앱) | DB/전 완성도 상한 | factoring | 모듈 분리, 빈 DB 부팅+시드, foundation 코어化 |
| C. 횡단관심사 비체계적 | BE 단순성 · SEAM 적합성 | 관례/애스펙트 부재 | ID 생성 유틸·tx 경계 유틸·인가 관례 표준화 |
| D. SSOT 전파 미정합 | 계약체인 · 추적성 | 자동 정합 파이프라인 부재 | DB→Entity→DTO→Zod 생성·게이트 강화 |
| E. 정체성 모델 혼란 | 적합성 · 추적성 | 규약 미통일 | loginId/esntlId 사용 규약 문서·전 도메인 정합 |
| F. FE 인증 아키텍처 | ~~FE 완성도·연결부~~ **✅ 대부분 해소** | HttpOnly+프록시+서명검증 완료 | 잔여: nonce-CSP·admin커버리지(제품결정) |
| G. false-completion | 단순성 · 추적성 · 완성도 | 채택률 0 | scaffold 전면 채택(RBAC/토큰/i18n/generic CRUD) |
| H. 검증 파편화 | 전 추적성/신뢰 | 통합 게이트 부재 | CI 복구, 통합 full-suite 게이트, e2e 상시화 |

---

## 4. 결론

- **버그는 잡혔고 기반은 견고해졌다** — BE 완성도 +5, SEAM 적합성 +8 은 실증된 실질 개선이다.
- **그러나 점수가 90대로 못 오르는 이유는 구조** — "레거시를 덜 벗은 미완결 프레임워크"라는 아키텍처 자체다.
- **국소 수정으로는 상한을 못 넘는다** — 점수를 끌어올리는 것은 ① 모듈 factoring·빈 DB 부팅(B) ② SSOT 전파 파이프라인(D) ③ 횡단관심사 관례화(C) ④ 정체성·인가 규약 통일(E) ⑤ FE 인증 아키텍처 전환(F) 같은 **의도된 아키텍처 결정**이다. 이들은 대부분 **개별 승인·설계 검토·e2e** 를 수반한다.

> 한 줄: **"버그는 잡혔으나 프레임워크로서의 뼈대 공사는 아직"** — 그것이 점수가 높지 않은 진짜 이유다.
