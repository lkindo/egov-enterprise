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

### 3.2. BE Entity와 DTO 간의 Legacy Aliasing (수동 Getter/Setter 중복 노출) [CRITICAL]
가장 심각한 잠재적 오류의 원천은 **DTO와 Entity 계층에 구현된 public Legacy Alias 메서드들**입니다. 이 메서드들은 과거 레거시 시스템과의 호환성이나 프론트엔드 깨짐 방지를 위해 임시방편으로 작성된 것으로 보이나, Jackson 직렬화 엔진이 이 public Getter들을 별도의 프로퍼티로 오인하여 **동일한 데이터를 서로 다른 2개 이상의 API 필드로 중복 노출**시키는 심각한 부작용을 낳고 있습니다.

#### ① User 도메인 (`UserDto.java`)
표준 카멜케이스 변수와 레거시 축약 명칭이 공존하여, Jackson 직렬화 및 OpenAPI 명세(`generated-api.d.ts` Line 4197-4242)에 두 개 필드가 모두 중복 노출되고 있습니다.

*   `pswd` (표준) ➔ `password` (레거시 별칭)
*   `pswdHint` (표준) ➔ `passwordHint` (레거시 별칭)
*   `pswdCrans` (표준) ➔ `passwordCnsr` (레거시 별칭)
*   `homeAddr` (표준) ➔ `homeadres` (레거시 별칭)
*   `daddr` (표준) ➔ `detailAdres` (레거시 별칭)
*   `gndrCd` (표준) ➔ `sexdstnCode` (레거시 별칭)
*   `brthYmd` (표준) ➔ `brth` (레거시 별칭)
*   `faxNo` (표준) ➔ `fxnum` (레거시 별칭)
*   `officeTelno` (표준) ➔ `offmTelno` (레거시 별칭)
*   `mblTelno` (표준) ➔ `moblphonNo` (레거시 별칭)
*   `emlAddr` (표준) ➔ `emailAdres` (레거시 별칭)
*   `userSttsCd` (표준) ➔ `userSttusCode` (레거시 별칭)
*   `lckYn` (표준) ➔ `lockAt` (레거시 별칭)
*   `mberTypeCd` (표준) ➔ `mberTyCode` (레거시 별칭)

#### ② WorkReport 도메인 (`WorkReportDto.java`)
보고서 정보 관련 핵심 필드가 모두 이중 구조로 바인딩되어 통신 오버헤드와 혼선을 유발합니다.
*   `reportId` (표준) ➔ `reprtId` (레거시 별칭)
*   `reportSubject` (표준) ➔ `reprtTtl` (레거시 별칭)
*   `reportContents` (표준) ➔ `reprtCn` (레거시 별칭)

#### ③ MemoReport 도메인 (`MemoReportDto.java`)
이 도메인은 극단적인 삼중 별칭이 선언되어 있어 하나의 데이터가 최대 3개의 필드로 분화되어 전송됩니다.
*   `reportId` (실제 변수) ➔ `reprtId` (표준형 Getter) ➔ `rptId` (축약형 레거시 Getter)
*   `reportSubject` (실제 변수) ➔ `reprtTtl` (표준형 Getter) ➔ `rptTtl` (축약형 레거시 Getter)
*   `reportContents` (실제 변수) ➔ `reprtCn` (표준형 Getter) ➔ `rptCn` (축약형 레거시 Getter)
*   `reprtDe` (실제 변수) ➔ `rptYmd` (레거시 Getter)
*   `reportrId` (실제 변수) ➔ `rptUserId` (레거시 Getter)
*   `reportrInqireDt` (실제 변수) ➔ `rptInqDt` (레거시 Getter)

#### ④ 기타 도메인 (Entity 및 Result DTO 수준의 별칭)
비즈니스 로직과 쿼리 결과 맵핑 계층에서도 동일한 부채가 발견되었습니다.
*   `AddressBookUserSearchResult.java`: `nm` ➔ `userNm` 별칭
*   `Blog.java`: `blogNm` ➔ `blogTtl` / `blogIntrcn` ➔ `blogIntroCn` / `tmplatId` ➔ `tmpltId` 별칭
*   `FileDetail.java` (파일 공통): `fileStreCours` ➔ `fileStrgPath` / `streFileNm` ➔ `strgFileNm` / `orignlFileNm` ➔ `orgnlFileNm` 별칭
*   `InformalSanction.java` (비정형 결재): `informalSanctionId` ➔ `ifmlAtrzId` / `jobSeCode` ➔ `taskSeCd` / `applicantId` ➔ `aplcntId` 별칭

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
