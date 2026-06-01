# DB-BE-FE 강제 매핑 및 명명 규칙 불일치 분석 보고서 (Mapping Mismatch Analysis)

## 1. 개요 (Overview)
본 문서는 eGov Enterprise 프로젝트 내 데이터베이스(DB), 백엔드(BE) Entity/DTO, 프론트엔드(FE) 전반에 걸쳐 필드명이 불일치하여 수동(강제) 매핑이 발생하거나 잠재적인 부채(Technical Debt)가 될 수 있는 영역을 전수 조사한 결과입니다.

최근 `UserAbsence` 및 `User` 도메인에 대한 표준화 작업을 완료하였으며, 이를 기반으로 프로젝트 전체의 추가적인 불일치 요소를 식별하고 장기적인 표준화 방안(Long-term Strategy)을 수립하기 위해 작성되었습니다.

## 2. 점검 범위 및 방법 (Scope & Methodology)
*   **DB vs BE (Entity)**: 정규식을 활용한 커스텀 스크립트(`check-mismatches.js`)를 통해 `@Column(name="...")` 어노테이션의 스네이크 케이스와 Entity 필드의 카멜 케이스 일치 여부 전수 검증.
*   **BE (Entity) vs BE (DTO)**: `grep`을 통해 `*Mapper.java` 파일 내 `@Mapping(target=..., source=...)`로 강제 바인딩된 속성 추적.
*   **BE vs FE**: 프론트엔드 코드 내 매핑 로직 확인 (OpenAPI 기반 `codegen:ts` 작동 방식 고려).

## 3. 주요 발견 사항 (Key Findings)

### 3.1. [PASS] DB 컬럼과 BE Entity 필드 간의 일치도
*   **결과**: DB 컬럼명(`snake_case`)과 Entity 필드명(`camelCase`) 간의 불일치는 발견되지 않음.
*   **분석**: `nuri.business.domain` 하위의 모든 엔티티에서 `@Column`에 명시된 이름과 Java 필드명이 규칙에 맞게 1:1로 매핑되어 있습니다. (예: `@Column(name = "qna_stts_cd")` -> `qnaSttsCd`)

### 3.2. [WARNING] BE Entity와 DTO 간의 강제 매핑 (MapStruct)
가장 심각한 불일치가 발생하는 지점은 **Entity를 DTO로 변환하는 Mapper 계층**입니다. 특정 도메인에서 도메인의 속성명(Entity)과 외부 노출 속성명(DTO)이 완전히 달라 수십 개의 `@Mapping` 어노테이션이 사용되고 있습니다.

> [!WARNING]
> **Board 도메인 (`BoardMapper.java`)**
> 
> `Board` 엔티티와 `BoardDto` 간에 극심한 명명 불일치가 존재합니다. 이는 레거시 테이블 구조나 과거 기획의 잔재로 보이며, 프론트엔드까지 의미가 모호한 필드명(`knoNm`, `knoId`)이 전파되는 원인이 됩니다.

**주요 불일치 목록 (BoardMapper.java):**
*   `pstId` (Entity) ➔ `knoId` (DTO)
*   `pstTtl` (Entity) ➔ `knoNm` (DTO) : "게시물 제목(Post Title)"이 "지식 명칭(Knowledge Name)"으로 변질됨.
*   `pstCn` (Entity) ➔ `knoCn` (DTO)
*   `qnaSttsCd` (Entity) ➔ `statusCd` (DTO)
*   `qnaCatCd` (Entity) ➔ `categoryCd` (DTO)
*   `frstRegisterNm` (Entity) ➔ `userNm` (DTO)

### 3.3. BE vs FE 간의 영향
*   **결과**: 프론트엔드는 `npm run codegen:ts`를 통해 백엔드의 DTO를 그대로 TypeScript 인터페이스로 변환하므로 타입 에러가 직접적으로 발생하지는 않습니다.
*   **잠재적 문제점**: 백엔드 DTO가 `knoNm`(지식명)이라는 모호한 필드명을 프론트엔드로 전달하면, 프론트엔드 개발자는 게시판 UI를 구성할 때 `title`이나 `postTitle` 대신 `knoNm`이라는 어색한 필드에 의존해야 합니다. 이는 컴포넌트 Props 매핑 시 혼란을 초래하며 UI 유지보수성을 크게 떨어뜨립니다.

## 4. 장기 방안 및 권고사항 (Long-term Strategy & Recommendations)

> [!TIP]
> **단일 진실의 원천(SSOT) 확립**: DB 메타데이터 테이블의 표준 용어를 기준으로 DTO 및 FE 컴포넌트까지 단일화된 네이밍을 강제해야 합니다.

1.  **Board 도메인 표준화 (Next Target)**
    *   `BoardDto`의 필드명(`knoId`, `knoNm` 등)을 Entity 구조(`pstId`, `pstTtl` 등)와 일치시킵니다.
    *   또는 반대로 기획/설계상 `kno`(지식)이 올바른 용어라면, 엔티티와 DB 컬럼을 변경해야 합니다. (일반 게시판이라면 `pstId`, `pstTtl`로 통일하는 것이 바람직함).
    *   `BoardMapper.java`의 수동 `@Mapping` 로직을 모두 제거하고 MapStruct의 자동 바인딩을 활용합니다.
2.  **DTO 리팩토링 후 프론트엔드 일괄 수정**
    *   DTO 수정 완료 후 `npm run codegen:ts` 실행.
    *   프론트엔드 코드 내 `knoNm` -> `pstTtl` (또는 `title`), `knoId` -> `pstId` (또는 `id`)로 컴포넌트 상태 및 API 바인딩 수정.
3.  **코드 리뷰 컨벤션 강화 (api-contract-guardian 스킬 활용)**
    *   향후 신규 API 개발 시 DTO 필드명과 Entity 필드명이 다를 경우, PR 단계에서 경고를 띄우도록 규칙을 강화해야 합니다.

## 5. 결론
시스템 전반을 스캔한 결과, `UserAbsence`와 `User`에 이어 **`Board` 도메인**이 가장 큰 기술 부채(명명 불일치 및 강제 매핑)를 안고 있음을 확인했습니다. 장기적인 구조 개선을 위해 다음 작업(Task)으로 `Board` 도메인 표준화를 제안합니다.
