package nuri.foundation.core.util;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.TimeZone;

/**
 * 서비스 시간대. 이 앱의 모든 날짜와 시각은 한국 표준시다(DEC-OPS-396).
 *
 * <p>시간대 없는 컬럼에 저장한 값은 한국 시각의 벽시계 값이다. 순간 값과 저장 값을 오갈 때는 여기를 거친다.
 */
public final class ServiceTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private ServiceTime() {
    }

    /** JVM 기본 시간대를 고정한다. {@code LocalDateTime.now()}, JDBC 세션 시간대, 로그 시각이 이 값을 따른다. */
    public static void applyToJvm() {
        TimeZone.setDefault(TimeZone.getTimeZone(ZONE));
    }

    public static Clock clock() {
        return Clock.system(ZONE);
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDateTime toLocal(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZONE);
    }

    public static Instant toInstant(LocalDateTime value) {
        return value.atZone(ZONE).toInstant();
    }
}
