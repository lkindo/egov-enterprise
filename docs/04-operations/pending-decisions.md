# 사용자 결정 대기 항목 (Pending Decisions Backlog)

> **목적**: 2026-07-18 대규모 개선 세션(quality-score §2.A~H 현행화 + 점수향상 발굴 + 승인군 A~E)에서
> "에이전트 단독으로 처리 불가 — 사용자/제품/아키텍처 결정이 필요"로 분류된 항목을 한 곳에 모은 백로그.
> **에이전트가 안전하게 할 수 있는 것은 이미 처리·커밋됨**(이 문서엔 미포함). 아래는 전부 결정이 선행돼야 하는 것.
> 각 항목: **[상태] 설명 / 옵션 / 권장 / 영향·축 / 출처**. 결정 후 해당 항목을 처리 지시하면 진행 가능.

---

## 1. 프레임워크 정체성 (§2.B — 가장 큰 결정)

### 1-A. 필수/샘플 분리의 "배포 형태"
- **결정 대상**: 이 저장소를 "복제→불필요 삭제→신규 구축" 베이스로 쓸 때 무엇을 base 로 확정할 것인가.
- **옵션**: (a) **모놀리식 유지 + fork-and-delete** — 초기 비용↓, 파생마다 수작업 삭제 / (b) **admin 을 별도 gradle 모듈로 추출** — 경계 강제·배포 명확, 리팩터 비용↑ / (c) **템플릿 브랜치에서 샘플 ~13 business-app 도메인 실삭제** — 가장 깨끗한 base, 되돌림 불가·데모 상실.
- **현황**: 옵션 (c) 의 핵심은 이미 반영됨 — `template/reusable-base` 브랜치가 로컬·origin 양쪽에 존재하며, business-app 서비스 도메인 main 22 → template 9(샘플 ~13 도메인 제거)로 정리됨.
- **권장**: 재사용을 강조하면 **(c) 템플릿 브랜치**(main 은 데모 보존). 구조는 이미 삭제 가능(business-core→app import 0).
- **영향**: 재사용 준비도(현 ≈70) 전 축. 브랜치는 이미 존재하므로 **남은 결정은 "삭제/추출 실행" 이 아니라 `template/reusable-base` 를 공식 base 로 채택·유지(main 데모 보존 병행)할지**이다.

### 1-B. business-core 내 "샘플-in-core" 처리
- **결정 대상**: `service.system.content.{banner,popup,community}` + `service.system.service.{survey(34파일),consult}` ≈50파일이 코어 모듈에 상주. admin 필수인가 데모인가?
- **옵션**: business-app 이관 / 삭제 / 코어 기능으로 유지.
- **영향**: "코어 모듈=순수 필수" 성립 여부(현재는 샘플 잔류). 판정은 제품 결정.

---

## 2. 보안

### 2-A. webmaster 기본 비밀번호 '1'
- 시드 계정(R__seed_framework)의 dev 편의용 약한 비번. **운영 전환 시 로테이션/최초 강제변경 정책** 필요. (보안 결정)

### 2-B. ssh 개인키 GitHub 커밋 history 퍼지
- 개인키가 커밋(`11366ca48`)에 잔존(언트랙만 됨). **키 로테이션 + history 퍼지** 대기 — 사용자 조치. (이전 pull-sync incident)

### 2-C. 미들웨어 admin 민감경로 커버리지
- 미들웨어가 `/admin/{system,user,security,stats,workflow}` 만 ADMIN 강제, 그 외 /admin/* 는 인증만. **어느 경로가 ADMIN 전용인지** 보안 판단(백엔드 @PreAuthorize 가 실 게이트라 심층방어 완성도 문제).

### 2-D. CSP `unsafe-inline` 제거
- prod CSP 에서 `unsafe-eval` 은 제거됨. `unsafe-inline` 은 **Next RSC nonce/PPR 인프라 도입**이 선행돼야 제거 가능(아키텍처 결정, 이전에 Phase4 포기).

### 2-E. RBAC 데이터주도化 (참고 — 이미 결정됨)
- `hasRole` 하드코딩 24건. **2026-07-11 "하이브리드 유지"로 이미 제품결정**(단일 SI 엔 완전 DB인가 과설계). 방향을 바꾸려면 재결정. (기본: 현행 유지)

---

## 3. DB / 데이터 모델

### 3-A. 코드성 컬럼 무결성: CHECK vs FK
- `user_stts_cd`·`gndr_cd`·`ent_se_cd`·`user_type_cd` 등 코드 컬럼은 `tb_com_dtl_cd`/`tb_com_cd` 공통코드 주도(허용값 런타임 변동). **옵션**: (1) 공통코드 테이블로 **FK 신설**(데이터주도·유연) vs (2) 안정 소수 상태값만 **CHECK 하드코딩**(드리프트 위험). _yn 과 달리 자율 진행 부적합 → DB 소유자 결정. *(_yn 59컬럼 CHECK 는 V2_24 로 이미 처리.)*

### 3-B. `tb_menu_info.route_mdfcn_yn` 데이터모델 정정
- 이름은 `_yn`(불리언)이나 실제 값은 **'2'** 저장(86행). V2_24 CHECK 대상에서 제외함. **컬럼 rename(오명명 해소) 또는 용도 재정의** 필요. (데이터모델 결정)

### 3-C. `tb_com_dtl_cd` 공통상세코드 값 소싱
- 공통 상세코드(성별 M/F·게시판유형 등 드롭다운 실값) 미시드 — repo/라이브덤프에 권위 원천 부재(DB헌법 9조). **표준 코드값 export 제공** or **빈 값(드롭다운 공백) 수용** 결정.

### 3-D. 뮤테이션 게이트 STRICT flip
- 현재 report-only(`STRICT_MUTATION=false`·`mutationThreshold=0`). **임계값은 헌법·게이트·문서 전반 75%로 통일**(2026-07-18). 75% 하드게이트 활성은 **각 대상 클래스 실측 스코어 ≥75% 확인 후** `STRICT_MUTATION=true` 전환. **미달 상태 flip = 빌드 즉시 파손**이라 제품/품질 결정(사용자 선택: report-only 유지). (문서엔 report-only 정직 명시 완료)

### 3-E. DB 표준화 잔여 (이전 세션, 제품결정성)
- `biz_cd`/`etc_cd` 용도·로그 테이블 개인정보 보존정책·`leader_id` FK 부여 등. 비즈니스 요건 결정 사안.

---

## 4. 검증 / CI 인프라

### 4-A. CI 빌링 복구
- CI(ci.yml) 과금 차단 상태 — **사용자 영역**. 복구 시 신설 `verify` 게이트(및 codegen/pitest)를 CI 상시 실행하면 로컬↔CI 정합 성립.

### 4-B. e2e 상시화
- e2e 는 backend(:8080)+FE(:3001) 기동 필요라 통합 `verify` 게이트에서 제외(별도 `test:e2e`). 상시화는 CI 복구 + 환경 결정.

### 4-C. backend-shape ↔ api-docs 필드레벨 게이트
- 경로레벨 커버리지 게이트는 신설 완료(ApiDocsPathCoverageLinterTest). **필드레벨(스키마 property↔DTO 필드) 대조**는 파싱 복잡·오탐 위험이라 스코프 밖 — 도입 여부/설계 결정.

---

## 5. 리팩터 (저우선 · 큰 비용, 착수 승인 필요)

- **5-A. 거대 클라이언트 컴포넌트 분할** — `UserOrgHubClient`(1035줄) 등. 리팩터 회귀 비용이 커 결정 필요.
- **5-B. api-server config 패키지 재배치** — config 가 `nuri.config`·`nuri.api.config`·`nuri.apiserver.config` 3곳 분산 + `AsyncConfig` 이중 선언(무해하나 중복). 재배치 리스크.
- **5-C. `boards/[id]` 고아 등록폼** — params.id 무시·하드코딩 bbsId 인 레거시 폼. 삭제 여부(제품 판정).
- **5-D. i18n 실채택** — next-intl 골격만(≈0.8% 채택), 하드코딩 한글 지배. **로케일 세트·키 추출 전략** 제품 결정(대규모).
- **5-E. FE 잔여 토큰화** — 액센트 잔여(라이트 파스텔 틴트·히트맵 명암스케일)·`surface-inverse-raised`(중첩 다크 패널) 토큰·캐시명 SSOT 상수화. 디자인 결정 일부.
- **5-F. D1② PK 타입 전면통일** — String PK→표준타입 빅뱅(5레이어). **비권장**(위험·저가치).

---

## 6. 참고: 이미 결정됨 / cosmetic (별도 조치 불요)

- **이미 결정**: RBAC 하이브리드 유지 · 멀티테넌시 단일 테넌트 by design · 콘텐츠 보존정책(사용자 삭제 시 webmaster 재귀속).
- **cosmetic(이름만, 안 해도 됨)**: `EgovProperty/MessageConfig`·`EgovPasswordEncoder`·`EgovAuthenticationProvider` 개명 — egov 라이브러리를 설정/사용하는 것이라 이름이 정직(개명=false-completion 경계).
- **전환기 필연(제거 불가)**: ARIA 데이터암호(`ariacryptoService`)·`EgovFileScrty` 레거시 해시 검증(로그인 시 BCrypt 마이그레이션 경로).

---

> **처리 방법**: 위 항목 중 결정을 내리시면(예: "1-A는 (c) 템플릿 브랜치로", "3-B route_mdfcn_yn 을 mfcn_cd 로 rename") 해당 작업을 지시해 주시면 진행합니다.
> *Last updated: 2026-07-18 (session: §2 현행화 + 점수향상 발굴 + 승인군 A~E 완료 직후)*
