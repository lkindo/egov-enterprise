package nuri.foundation.core.stats;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** 통계 경계 문자열({@code yyyy-MM-dd HH:mm:ss})을 시각으로 바꾼다. 형이 있는 값으로 바인딩해 벤더별 CAST 를 없앤다. */
public final class StatsTimestamp {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private StatsTimestamp() {
    }

    public static LocalDateTime parse(String value) {
        return LocalDateTime.parse(value, FORMAT);
    }
}
