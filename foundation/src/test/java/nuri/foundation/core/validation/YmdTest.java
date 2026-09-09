package nuri.foundation.core.validation;

import org.junit.jupiter.api.Test;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.regex.Pattern;
import static org.assertj.core.api.Assertions.assertThat;

class YmdTest {
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
