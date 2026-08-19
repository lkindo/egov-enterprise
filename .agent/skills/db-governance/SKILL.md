---
name: db-governance
description: DB 오브젝트 변경을 live 메타 표준, 물리 스키마, Flyway, JPA 매핑과 대조해 설계한다.
version: 2.0.0
---

# Database Governance

## 정본

1. `AGENTS.md`와 DB 표준 헌법
2. 대상 환경의 `meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`
3. 대상 환경의 `information_schema`
4. 저장소 Flyway와 JPA 매핑

live DB를 조회하지 못한 경우 저장소 스키마만으로 “표준 100% 준수”를 선언하지 않고 검증 한계를 명시한다.

## 진단 절차

1. 대상 컬럼의 한글 comment와 업무 의미를 확인한다.
2. `meta_standard_terms`의 복합 용어를 먼저 조회하고, 없을 때만 표준 단어 조합을 검토한다.
3. 용어의 `domain_name`으로 `meta_standard_domains`를 조회해 타입과 길이를 결정한다.
4. 실제 물리 컬럼·constraint·index와 Flyway·JPA·DTO 영향을 대조한다.
5. 변경이 필요하면 Expand → Migrate → Contract 단계, 데이터 보존, rollback·재시도 조건을 설계한다.

## 하드 스톱

- 메타에 없는 약어·용어·도메인을 임의 생성하지 않는다.
- `CHAR(1)`, `_CD varchar(12)` 같은 별도 관행으로 메타 도메인을 덮어쓰지 않는다. DB 헌법은 `CHAR` 사용을 금지하며 표준 도메인과의 일치를 요구한다.
- 이미 적용된 Flyway를 수정하지 않는다. 후속 migration으로 교정한다.
- 운영 DB write·DDL은 사용자의 명시 승인과 운영 절차 없이 실행하지 않는다.
- 논리 삭제를 모든 테이블의 보편 규칙으로 가정하지 않는다.

## 도구 경계

```bash
node .agent/scripts/db-bridge.js "SELECT ..."
```

`db-bridge.js`는 `SELECT`, `WITH`, `SHOW`, 읽기 전용 `EXPLAIN`, `VALUES`만 허용하는 조회 도구다. DDL 실행·transaction 검증에 사용하지 않는다. DDL은 Flyway와 격리된 테스트 DB에서 검증한다.

## 결과

메타 근거, 현재 물리 상태, 제안 DDL, 데이터·lock 위험, 단계별 배포, 실행한 검증과 미확인 항목을 구분해 보고한다.
