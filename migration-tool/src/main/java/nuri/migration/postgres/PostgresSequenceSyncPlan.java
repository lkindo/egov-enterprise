package nuri.migration.postgres;

import java.util.List;
import java.util.Objects;

/** 실행 기능을 갖지 않는 sequence high-water 동기화 SQL과 바인딩 값. */
public record PostgresSequenceSyncPlan(String sql, List<Object> parameters) {
    public PostgresSequenceSyncPlan {
        Objects.requireNonNull(sql, "sql");
        if (sql.isBlank()) {
            throw new IllegalArgumentException("sequence sync SQL must not be blank");
        }
        parameters = List.copyOf(Objects.requireNonNull(parameters, "parameters"));
    }
}
