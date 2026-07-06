# DB-BE-FE 강제 매핑 및 명명 규칙 불일치 분석 보고서 (Mapping Mismatch Analysis v2)

## 1. 개요 (Overview)
본 보고서는 eGov Enterprise 프로젝트 내 데이터베이스(DB), 백엔드(BE) Entity/DTO, 프론트엔드(FE) 전반에 걸쳐 필드명이 불일치하거나 레거시 별칭(Legacy Aliases) 처리를 위해 수동(강제) 매핑을 사용하여 발생하는 기술적 잠재 리스크를 전수 조사한 결과입니다.

이전 단계에서 `Board` 및 `UserAbsence` 도메인의 표면적 불일치를 정돈하였으나, 소스 전체를 전수 스캔한 결과 백엔드 DTO 및 엔티티 전반에 걸쳐 **전자정부 레거시 명명축약어(eGov Legacy)**와 **현대적 카멜케이스 표준(Modern CamelCase)**을 동시 지원하기 위해 작성된 **"수동 Getter/Setter 별칭(Aliases)"**이 대거 발견되었습니다. 이로 인한 API 오염 및 타입 불안정성 등 구체적인 리스크를 보고합니다.

---

## 2. 점검 범위 및 방법 (Scope & Methodology)
*   **DB vs BE (Entity)**: `@Column(name="...")` 어노테이션의 스네이크 케이스와 Entity 필드의 카멜 케이스 일치도 검증 (커스텀 스크립트 실행).
*   **BE (Entity) vs BE (DTO) - MapStruct**: `*Mapper.java` 내 `@Mapping` 속성을 통한 강제 바인딩 분석.
*   **BE vs FE (Jackson & OpenAPI Spec)**: DTO 내부에 명시적으로 선언된 수동 Getter/Setter 메서드가 Jackson 직렬화 시 프론트엔드 타입(`generated-api.d.ts`)에 중복 필드로 공존하는 현상 정밀 추적.

---

## 3. 핵심 발견 사항 (Key Findings)

### 3.1. DB 컬럼과 BE Entity 간의 일치도 [PASS]
*   **결과**: DB 컬럼명(`snake_case`)과 Entity 필드명(`camelCase`) 간의 변환 규칙(Naming Strategy) 불일치는 발견되지 않았습니다. 
*   **증거**: `check-mismatches.js` 검증 결과 불일치 컬럼 `0`건. JPA 엔티티 내 `@Column`의 `name` 속성과 자바 변수명은 논리적 표준 변환을 충실히 따르고 있습니다.

### 3.2. BE Entity와 DTO 간의 Legacy Aliasing (수동 Getter/Setter 중복 노출) [RESOLVED]
이전 버전에서 DTO와 Entity 계층에 존재했던 수동 Legacy Getter/Setter(예: `passwordCnsr`, `reprtId` 등)로 인한 중복 직렬화 부채는 **이전 리팩토링 단계(`8f209d6d3` 및 `42bf701b8` 커밋 등)에서 완전히 정리**되었습니다.
모든 DTO 및 Entity가 롬복 어노테이션 기반의 단일 현대적 카멜케이스 속성(SSOT)으로 통일되어, Jackson 직렬화 중복 및 OpenAPI 명세(`generated-api.d.ts`)의 불일치 이슈가 해결 완료되었습니다.

#### ① User 도메인 (`UserDto.java`) [RESOLVED]
*   **조치 내용**: `passwordCnsr`, `homeadres`, `detailAdres` 등의 레거시 수동 getter/setter가 전면 제거되었으며, 표준 카멜케이스 변수(`pswdCrans`, `homeAddr`, `daddr`)로 완전 단일화되었습니다.
*   **현황**: OpenAPI 명세 및 직렬화 중복 노출 차단 완료.

#### ② WorkReport 도메인 (`WorkReportDto.java`) [RESOLVED]
*   **조치 내용**: `reprtId`, `reprtTtl`, `reprtCn` 레거시 메서드를 제거하고 표준 `rptId`, `rptTtl`, `rptCn`으로 표준화되었습니다.

#### ③ MemoReport 도메인 (`MemoReportDto.java`) [RESOLVED]
*   **조치 내용**: 다중 앨리어스가 존재하던 구조를 단일 표준 필드(`rptId`, `rptTtl`, `rptCn`, `memoRptYmd`, `userId`, `rptrInqDt`) 구조로 전면 리팩토링 및 맵핑 완료하였습니다.

#### ④ 기타 도메인 (Entity 및 Result DTO 수준의 별칭) [RESOLVED]
*   `AddressBookUserSearchResult.java`, `Blog.java`, `FileDetail.java`, `InformalSanction.java` 내의 불필요한 레거시 별칭 및 수동 게터들을 완전히 삭제하고 단일 현대 표준으로 현행화 완료되었습니다.
*   `BoardMaster.java` 내에 존재하던 `@Transient` 쉐도우 메타데이터 필드와 JPA 생명주기 콜백 기반의 수동 데이터 동기화 브릿지를 완전히 철폐하고, 명시적 연관관계 처리 체계(`registerOption`)로 정화 완료하였습니다.

---

## 4. 잠재적 위험 및 문제점 (Potential Risks)

> [!CAUTION]
> **1. 데이터 정합성(Consistency) 오염**
> 프론트엔드에서 API 요청(POST/PUT)을 보낼 때, `mblTelno`(표준)와 `moblphonNo`(레거시) 중 하나만 채워서 보내거나 양쪽에 서로 다른 값을 담아 보낼 경우, DTO 바인딩에서 데이터가 유실되거나 덮어써져 DB에 훼손된 데이터가 저장될 수 있습니다.

> [!WARNING]
> **2. OpenAPI 타입 오염 및 프론트엔드 혼선**
> `npm run codegen:ts`를 실행하면 중복된 필드가 모조리 프론트엔드 TypeScript 타입 인터페이스에 생성됩니다. 프론트엔드 개발자는 두 개 이상의 유사 필드 중 무엇이 최신 명세인지 파악하기 어렵고, 컴포넌트 프롭스 전달 과정에서 속성이 어긋나 화면에 데이터가 누락되는 비주얼 버그가 발생합니다.

> [!NOTE]
> **3. 불필요한 네트워크 페이로드 증가**
> 동일한 문자열 정보가 하나의 JSON 바디에 중복 키-값 쌍으로 매번 실려 전송되므로, 대량 목록 조회 시 불필요한 대역폭 소모를 유발하고 직렬화/역직렬화 성능을 갉아먹습니다.

---

## 5. 해결 방안 (Recommended Solutions)

### 단기적 방안 (Safe & Immediate Mitigation)
프론트엔드와의 당장 깨지는 API 규약을 유지하되, **OpenAPI 명세 및 직렬화 찌꺼기를 제거**하기 위해 Jackson 어노테이션 및 `@JsonIgnore`를 정교하게 도입합니다.
*   **적용**: DTO 내의 레거시 Getter/Setter 메서드 위에 `@JsonIgnore`를 명시적으로 붙여, 직렬화 시 중복 노출되지 않도록 차단하고 OpenAPI 스펙에서도 깔끔하게 제거합니다.
*   이렇게 하면 프론트엔드는 점진적으로 백엔드의 표준 카멜케이스 필드(`pswdHint`, `mblTelno` 등)만 사용하게 유도할 수 있습니다.

### 장기적 방안 (Complete Standardization - Expand and Contract)
1.  **점진적 이관(Expand)**: 프론트엔드 소스코드 내 레거시 바인딩(예: `moblphonNo`)을 탐색하여 백엔드 표준 필드명(`mblTelno`)으로 일괄 교체합니다.
2.  **타입 테스트 검증**: E2E 및 단위 테스트를 통해 기능 정합성 확인.
3.  **레거시 제거(Contract)**: 프론트엔드 이관이 100% 완료되면 백엔드 DTO 내의 `Legacy Aliases` Getter/Setter 메서드를 완전히 영구 삭제(Contract)하여 단일 진실의 원천(SSOT)을 완성합니다.

---

## 6. 결론
스캔 결과, 시스템 전반에 eGov 프레임워크 고유의 축약 규칙과 신규 카멜케이스 규칙이 공존하며 생성된 **"Getter 기반 이중 필드 노출 부채"**가 다수 식별되었습니다. 

가장 빈번하게 사용되고 프론트엔드 연동 범위가 넓은 **`UserDto`** 및 **`WorkReportDto` / `MemoReportDto`**가 최우선 개선 및 리스크 관리 대상입니다.
