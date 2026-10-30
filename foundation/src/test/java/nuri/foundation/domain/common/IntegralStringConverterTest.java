package nuri.foundation.domain.common;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IntegralStringConverterTest {

    private final IntegralStringConverter converter = new IntegralStringConverter();

    @Test
    void preservesNullInBothDirections() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1", "4000", "5000", "9999999", "9999999999",
            "123456789012345678901234567890"})
    void bindsExactDecimalWithoutBusinessRangeOrIntegerOverflow(String value) {
        BigDecimal stored = converter.convertToDatabaseColumn(value);
        assertThat(stored).isEqualTo(new BigDecimal(value));
        assertThat(converter.convertToEntityAttribute(stored)).isEqualTo(value);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "01", "-0", "+1", "1.0", "1.5", "1e2", " 1", "1 ", "１", "--1"})
    void rejectsNoncanonicalWritesInsteadOfNormalizingThem(String value) {
        assertThatThrownBy(() -> converter.convertToDatabaseColumn(value))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @CsvSource({"12.000,12", "-12.000,-12", "1E+7,10000000", "0.00,0"})
    void readsIntegralDatabaseValuesAsPlainIntegerStrings(String stored, String expected) {
        assertThat(converter.convertToEntityAttribute(new BigDecimal(stored))).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "-0.1", "12.5"})
    void neverRoundsFractionalDatabaseValues(String stored) {
        assertThatThrownBy(() -> converter.convertToEntityAttribute(new BigDecimal(stored)))
                .isInstanceOf(ArithmeticException.class);
    }
}
