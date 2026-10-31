package nuri.foundation.core.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.TimeZone;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ServiceTimeTest {

    private final TimeZone original = TimeZone.getDefault();

    @AfterEach
    void restoreJvmDefault() {
        TimeZone.setDefault(original);
    }

    @Test
    @DisplayName("서비스 시간대는 한국 표준시다")
    void zoneIsKorea() {
        assertThat(ServiceTime.ZONE).isEqualTo(ZoneId.of("Asia/Seoul"));
        assertThat(ServiceTime.clock().getZone()).isEqualTo(ServiceTime.ZONE);
    }

    @Test
    @DisplayName("순간을 한국 벽시계 값으로 바꾼다 — UTC 자정은 한국 오전 9시다")
    void convertsAnInstantToKoreanWallClock() {
        assertThat(ServiceTime.toLocal(Instant.parse("2026-11-01T00:00:00Z")))
                .isEqualTo(LocalDateTime.of(2026, 11, 1, 9, 0));
    }

    @Test
    @DisplayName("한국 벽시계 값을 같은 순간으로 되돌린다")
    void convertsAKoreanWallClockBackToTheSameInstant() {
        assertThat(ServiceTime.toInstant(LocalDateTime.of(2026, 11, 1, 9, 0)))
                .isEqualTo(Instant.parse("2026-11-01T00:00:00Z"));
    }

    @Test
    @DisplayName("현재 시각은 JVM 기본 시간대와 무관하게 한국 시각이다")
    void nowIgnoresTheJvmDefault() {
        TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));

        assertThat(Duration.between(ServiceTime.now(), ServiceTime.toLocal(Instant.now())).abs())
                .isLessThan(Duration.ofSeconds(5));
    }

    @Test
    @DisplayName("JVM 기본 시간대를 한국으로 고정한다")
    void appliesToTheJvm() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        ServiceTime.applyToJvm();

        assertThat(TimeZone.getDefault().toZoneId()).isEqualTo(ServiceTime.ZONE);
    }
}
