# 표준 데이터 조회·적용 가이드

이 문서는 [DB 표준 헌법](./constitution.md)의 실무 진입점이다. 단어·용어·도메인의 정본은 실행 대상 DB의 `meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`이며, 이 문서의 정적 목록은 정본이 아니다.

## 조회 순서

1. 실제 대상 환경의 메타 테이블을 읽기 전용으로 조회한다.
2. `meta_standard_words`에서 단어와 영문 약어를 확인한다.
3. `meta_standard_terms`에서 용어의 `eng_abbr`와 `domain_name`을 확인한다.
4. `meta_standard_domains`에서 물리 타입과 길이를 확인한다.
5. 저장소 Flyway와 엔티티·DTO·생성 타입의 영향을 함께 검토한다.

```sql
SELECT
    t.term_name,
    t.eng_abbr AS column_name,
    t.domain_name,
    d.data_type,
    d.data_length
FROM meta_standard_terms AS t
JOIN meta_standard_domains AS d
  ON d.domain_name = t.domain_name
WHERE t.term_name = '사용자명';
```

메타데이터 조회에는 `.agent/scripts/db-bridge.js`의 읽기 전용 SQL allowlist를 사용할 수 있다. 이 도구는 `SELECT`, `WITH`, `SHOW`, 읽기 전용 `EXPLAIN`, `VALUES`만 허용하며 DDL 검증기는 아니다.

## 적용 원칙

- 승인된 용어가 있으면 그 약어·도메인·물리 타입과 길이를 그대로 사용한다.
- 같은 의미를 가진 새 약어·타입을 Flyway에 임의로 만들지 않는다.
- 필요한 용어 또는 도메인이 없으면 메타 자산 추가와 실제 스키마 변경을 같은 변경 세트로 설계한다.
- 프로젝트 확장 용어와 BIGINT 내부키의 이력은 관련 Flyway가 정본이다. 문서에 버전 범위나 컬럼 전수 목록을 복제하지 않는다.
- live 메타에 접근할 수 없으면 저장소 Flyway만으로 준수 완료를 선언하지 않고, 검증 한계를 명시한다.

## 검증 경계

`schemaValidation`과 명명·도메인 하네스는 저장소 스키마의 회귀를 줄이지만 대상 환경의 live 메타 정합성을 대신하지 않는다. 운영 적용 전에는 대상 DB 메타 조회, Flyway 적용 결과, JPA 매핑을 각각 확인한다.
