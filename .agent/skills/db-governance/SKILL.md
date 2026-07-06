# Database Governance Skill (db-governance)

이 스킬은 eGov Enterprise 프로젝트의 데이터 무결성과 헌법 합치성을 수호하기 위한 전용 스킬이다. 서브에이전트는 이 스킬을 호출받았을 때 아래 지침을 최우선으로 준수하여 작업을 수행한다.

## 1. 핵심 임무 (Core Mission)
1. **헌법 준수**: 모든 DB 오브젝트 변경 시 [DB 표준화 헌법]을 100% 준수한다.
2. **SSOT 동기화**: `meta_standard_words`, `meta_standard_terms`, `meta_standard_domains` 테이블의 데이터를 진실의 원천으로 삼는다.
3. **무결성 보장**: 변경 전후의 데이터 정합성을 검증하고, 성능 영향을 분석한다.

## 2. 표준 진단 워크플로우 (Audit Workflow)

### [Step 1] 메타 데이터 및 코멘트 인출
1. **코멘트 확보**: 작업 대상 컬럼의 **코멘트(한글)**를 인출한다.
   - 코멘트 존재 시: 해당 한글명을 기준으로 표준 약어를 확인한다.
   - 코멘트 부재 시: 컬럼명의 의도를 파악하여 **'추천 한글명'**을 먼저 생성하고, 이를 확정 코멘트로 제안한다.
2. **표준 약어 확인 (복합어 우선)**:
   - **[필수]** 추출/생성된 한글명을 `meta_standard_terms`에서 먼저 검색하여 **복합어 약어**가 존재하는지 확인한다. (예: '상세주소' -> `DADDR` 존재 시 이를 우선 사용)
   - 복합어가 없을 경우에만 `meta_standard_words`를 통해 개별 단어 단위로 조합한다.
3. **도메인 확인**: 매핑된 용어/단어의 표준 도메인(타입/길이)을 `meta_standard_domains`에서 확인한다.

### [Step 1.1] 명칭-코멘트 일치성 검증
- **'예상 표준 명칭'**과 **'실제 물리 컬럼명'**이 일치하는지 대조한다.
- 불일치 시, 확정된 코멘트(한글명)의 의미에 맞게 컬럼명을 수정하는 DDL 작성을 검토한다.

### [Step 2] 물리 스키마 대조
- `db-bridge.js`를 사용하여 실제 DB의 컬럼 정보를 추출한다.
- 메타 데이터와 물리 스키마 간의 차이(Gap)를 식별한다.

### [Step 3] 개선안(DDL) 생성
- 표준에 부합하지 않는 항목에 대해 `ALTER TABLE` 등 수정 DDL을 작성한다.
- 데이터 유실 가능성을 검토하고, 필요시 임시 테이블을 통한 마이그레이션 전략을 수립한다.

## 3. 강제 규정 (Hard-Stop Rules)
- **추측 금지**: 메타 테이블에 없는 용어는 임의로 축약하거나 생성하지 않는다. 반드시 사용자에게 보고하고 표준 등록을 요청한다.
- **타입 강제**: 플래그성 컬럼은 무조건 `CHAR(1)`이며, _CD 코드는 표준도메인을 무시하고 varchar(12)로 고정한다.
- **승인 필수**: 모든 `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER` 작업은 실행 전 사용자에게 SQL 전문을 공개하고 명시적 승인을 받아야 한다.

## 4. 도구 활용 (Tools)
- **DB Bridge**: `node .agent/scripts/db-bridge.js "QUERY"`
- **Schema View**: `information_schema.columns`, `information_schema.tables` 적극 활용.

---
*Created At: 2026-05-14*
*Governed by: Antigravity Enterprise Governance*
