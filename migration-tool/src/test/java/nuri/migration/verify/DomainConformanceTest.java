package nuri.migration.verify;

import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.DomainViolation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 대상 문자 값의 형식 도메인 적합. 표준 표기는 변환기의 고정점이고, 거부되거나 값이 바뀌면 위반이다.
 */
@DisplayName("형식 도메인 적합")
class DomainConformanceTest {

    @Test
    @DisplayName("표준 표기는 통과하고 NULL 은 판정하지 않는다")
    void standardValuesPass() {
        assertThat(DomainConformance.check(DomainCategory.DATE8, "20240131")).isNull();
        assertThat(DomainConformance.check(DomainCategory.DATE8, "20240229")).isNull();
        assertThat(DomainConformance.check(DomainCategory.DATETIME14, "20240131235959")).isNull();
        assertThat(DomainConformance.check(DomainCategory.TIME6, "235959")).isNull();
        assertThat(DomainConformance.check(DomainCategory.YN, "Y")).isNull();
        assertThat(DomainConformance.check(DomainCategory.YN, "N")).isNull();
        assertThat(DomainConformance.check(DomainCategory.DATE8, null)).isNull();
    }

    @Test
    @DisplayName("달력에 없는 날짜·자리표시 날짜·시각 범위 밖은 그 위반 코드다")
    void rejectedValuesReportTheViolation() {
        assertThat(DomainConformance.check(DomainCategory.DATE8, "20240230")).isEqualTo(DomainViolation.INVALID_DATE);
        assertThat(DomainConformance.check(DomainCategory.DATE8, "20230229")).isEqualTo(DomainViolation.INVALID_DATE);
        assertThat(DomainConformance.check(DomainCategory.DATE8, "00000000"))
                .isEqualTo(DomainViolation.PLACEHOLDER_DATE);
        assertThat(DomainConformance.check(DomainCategory.TIME6, "235960")).isEqualTo(DomainViolation.FORMAT);
        assertThat(DomainConformance.check(DomainCategory.DATETIME14, "20240131")).isEqualTo(DomainViolation.FORMAT);
        assertThat(DomainConformance.check(DomainCategory.DATE8, "   ")).isEqualTo(DomainViolation.BLANK);
    }

    @Test
    @DisplayName("변환기가 받지만 표기를 바꾸는 값은 FORMAT 이다 — 소문자·앞뒤 공백·구분자")
    void normalizedValuesAreFormatViolations() {
        assertThat(DomainConformance.check(DomainCategory.YN, "y")).isEqualTo(DomainViolation.FORMAT);
        assertThat(DomainConformance.check(DomainCategory.DATE8, " 20240131")).isEqualTo(DomainViolation.FORMAT);
        assertThat(DomainConformance.check(DomainCategory.DATE8, "2024-01-31")).isEqualTo(DomainViolation.FORMAT);
    }

    @Test
    @DisplayName("형식 도메인이 아닌 범주는 받지 않는다")
    void nonFormatCategoryIsRejected() {
        assertThatThrownBy(() -> DomainConformance.check(DomainCategory.CODE, "A"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
