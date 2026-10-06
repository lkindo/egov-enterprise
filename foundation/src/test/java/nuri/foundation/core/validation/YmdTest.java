package nuri.foundation.core.validation;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.regex.Pattern;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class YmdTest {
    @Test
    void compatibleDatesPreserveOptionalValuesAndCompactOnlyValidIsoDates() {
        for (String value : new String[] {null, "", "00010101", "20000229", "20240229", "99991231"}) {
            assertThatCode(() -> Ymd.validateCompatible(value)).doesNotThrowAnyException();
            assertThat(Ymd.compact(value)).isEqualTo(value);
        }
        for (String value : new String[] {"0001-01-01", "2000-02-29", "2024-02-29", "9999-12-31"}) {
            assertThatCode(() -> Ymd.validateCompatible(value)).doesNotThrowAnyException();
            assertThat(Ymd.compact(value)).isEqualTo(value.replace("-", ""));
        }
    }

    @Test
    void compatibleDatesRejectInvalidCalendarValuesAndMalformedSeparators() {
        for (String value : new String[] {"00000101", "0000-01-01", "19000229", "2100-02-29", "20260229",
                "2026-04-31", "2026-13-01", "2026--09-10", "202-609-10", "20260910-", "2026", " ",
                " 20260910", "20260910 ", "20260910\n", "２０２６０９１０"}) {
            assertThatThrownBy(() -> Ymd.validateCompatible(value)).as(value)
                    .isInstanceOf(BusinessException.class).extracting("errorCode")
                    .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
            assertThatThrownBy(() -> Ymd.compact(value)).as(value).isInstanceOf(BusinessException.class);
        }
    }

    @Test
    void patternMatchesGregorianCalendarIncludingCenturyLeapRules() {
        var pattern = Pattern.compile(Ymd.OPTIONAL_PATTERN);
        for (int year : new int[] {0, 1, 4, 99, 100, 400, 1900, 2000, 2024, 2026, 2100, 2400, 9999}) {
            for (int month = 0; month <= 13; month++) {
                for (int day = 0; day <= 32; day++) {
                    boolean valid;
                    try {
                        LocalDate.of(year, month, day);
                        valid = year > 0;
                    } catch (DateTimeException invalid) {
                        valid = false;
                    }
                    String value = "%04d%02d%02d".formatted(year, month, day);
                    assertThat(pattern.matcher(value).matches()).as(value).isEqualTo(valid);
                }
            }
        }
        assertThat(pattern.matcher("").matches()).isTrue();
        for (String invalid : new String[] {" ", "2026-09-10", "20260910 ", "2026091", "２０２６０９１０", "20260910\n"}) {
            assertThat(pattern.matcher(invalid).matches()).as(invalid).isFalse();
        }
    }
}
