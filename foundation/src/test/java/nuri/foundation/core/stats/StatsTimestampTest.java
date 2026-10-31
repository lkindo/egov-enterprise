package nuri.foundation.core.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StatsTimestampTest {

    @Test
    @DisplayName("통계 경계 문자열을 시각으로 읽는다")
    void parsesBoundary() {
        assertThat(StatsTimestamp.parse("2024-02-29 00:00:00")).isEqualTo(LocalDateTime.of(2024, 2, 29, 0, 0));
    }

    @Test
    @DisplayName("형식이 다르면 조용히 넘기지 않는다")
    void rejectsOtherFormats() {
        assertThatThrownBy(() -> StatsTimestamp.parse("20240229")).isInstanceOf(DateTimeParseException.class);
    }
}
