package nuri.migration.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 표준 도메인 범주는 이름 접두와 데이터 타입으로 정하고, 판정 순서가 뜻이다(ADR-0029 L3a-2). */
class DomainCategoryTest {

    @Test
    void namePrefixesDecideTheFixedFormatCategories() {
        assertThat(DomainCategory.of("연월일C8", "CHAR")).isEqualTo(DomainCategory.DATE8);
        assertThat(DomainCategory.of("연월일시분초C14", "CHAR")).isEqualTo(DomainCategory.DATETIME14);
        assertThat(DomainCategory.of("시분초C6", "CHAR")).isEqualTo(DomainCategory.TIME6);
        assertThat(DomainCategory.of("여부C1", "CHAR")).isEqualTo(DomainCategory.YN);
        assertThat(DomainCategory.of("유무C1", "CHAR")).isEqualTo(DomainCategory.YN);
        assertThat(DomainCategory.of("코드C3", "VARCHAR")).isEqualTo(DomainCategory.CODE);
        assertThat(DomainCategory.of("명V100", "VARCHAR")).isEqualTo(DomainCategory.TEXT);
    }

    @Test
    void dataTypesDecideTemporalAndNumericAndIgnoreCase() {
        assertThat(DomainCategory.of("연월일D", "DATE")).isEqualTo(DomainCategory.TEMPORAL);
        assertThat(DomainCategory.of("연월일시분초D", "DATETIME")).isEqualTo(DomainCategory.TEMPORAL);
        assertThat(DomainCategory.of("일시", "timestamp")).isEqualTo(DomainCategory.TEMPORAL);
        assertThat(DomainCategory.of("금액N15", "NUMERIC")).isEqualTo(DomainCategory.NUMERIC);
        assertThat(DomainCategory.of("수량", "number")).isEqualTo(DomainCategory.NUMERIC);
        assertThat(DomainCategory.of("일련번호N10", "INTEGER")).isEqualTo(DomainCategory.NUMERIC);
        assertThat(DomainCategory.of("일련번호N19", "BIGINT")).isEqualTo(DomainCategory.NUMERIC);
        assertThat(DomainCategory.of("명V100", "VARCHAR2")).isEqualTo(DomainCategory.TEXT);
    }

    @Test
    void theOrderOfJudgementIsPartOfTheMeaning() {
        // 8자리·14자리 이름은 날짜 타입보다 먼저다.
        assertThat(DomainCategory.of("연월일C8", "DATE")).isEqualTo(DomainCategory.DATE8);
        assertThat(DomainCategory.of("연월일시분초C14", "TIMESTAMP")).isEqualTo(DomainCategory.DATETIME14);
        // 시각·여부 이름은 날짜 타입보다 뒤다.
        assertThat(DomainCategory.of("시분초C6", "TIMESTAMP")).isEqualTo(DomainCategory.TEMPORAL);
        assertThat(DomainCategory.of("여부C1", "DATE")).isEqualTo(DomainCategory.TEMPORAL);
        // 여부 이름은 숫자 타입보다 먼저고, 숫자 타입은 코드 이름보다 먼저다.
        assertThat(DomainCategory.of("여부N1", "NUMERIC")).isEqualTo(DomainCategory.YN);
        assertThat(DomainCategory.of("코드N3", "NUMERIC")).isEqualTo(DomainCategory.NUMERIC);
    }

    @Test
    void onlyPrefixesCountAndMissingPartsAreEmpty() {
        assertThat(DomainCategory.of("변경연월일C8", "CHAR")).isEqualTo(DomainCategory.TEXT);
        assertThat(DomainCategory.of("사용여부", "CHAR")).isEqualTo(DomainCategory.TEXT);
        assertThat(DomainCategory.of("상태코드", "VARCHAR")).isEqualTo(DomainCategory.TEXT);
        assertThat(DomainCategory.of(null, null)).isEqualTo(DomainCategory.TEXT);
        assertThat(DomainCategory.of(null, "DATE")).isEqualTo(DomainCategory.TEMPORAL);
        assertThat(DomainCategory.of("연월일C8", null)).isEqualTo(DomainCategory.DATE8);
        assertThat(DomainCategory.of("", "")).isEqualTo(DomainCategory.TEXT);
    }
}
