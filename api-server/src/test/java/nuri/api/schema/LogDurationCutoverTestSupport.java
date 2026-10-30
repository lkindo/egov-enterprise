package nuri.api.schema;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.core.io.ClassPathResource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Explicit Sync for tests which intentionally carry legacy log rows across the real Flyway boundary. */
final class LogDurationCutoverTestSupport {
    static final String BACKFILL = sql("db/operations/log-duration/backfill.sql");
    static final String PARITY = sql("db/operations/log-duration/verify-parity.sql");
    private LogDurationCutoverTestSupport() {}

    static String sql(String path) {
        try (var stream = new ClassPathResource(path).getInputStream()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException error) { throw new IllegalStateException(error); }
    }

    static void assertRedirectRefusesUnsynchronizedRows(Flyway latest) throws SQLException {
        assertThatThrownBy(latest::migrate).isInstanceOf(FlywayException.class)
                .hasStackTraceContaining("V2_146 requires complete log duration parity");
        try (var connection = latest.getConfiguration().getDataSource().getConnection();
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT count(*) FROM flyway_schema_history WHERE version='2.146'")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getLong(1)).isZero();
        }
    }

    static long pending(Connection connection) throws SQLException {
        long pending = 0;
        int ledgers = 0;
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(PARITY)) {
            while (rows.next()) {
                assertThat(rows.getLong("nonnull_drift_rows")).isZero();
                pending += rows.getLong("mismatches");
                ledgers++;
            }
        }
        assertThat(ledgers).isEqualTo(2);
        return pending;
    }

    static long batch(Connection connection) throws SQLException {
        long changed = 0;
        int ledgers = 0;
        try (var statement = connection.createStatement()) {
            boolean result = statement.execute(BACKFILL);
            do {
                if (result) {
                    try (var rows = statement.getResultSet()) {
                        while (rows.next()) {
                            long size = rows.getLong("changed_rows");
                            assertThat(size).isBetween(0L,500L);
                            changed += size;
                            ledgers++;
                        }
                    }
                }
                result = statement.getMoreResults();
            } while (result || statement.getUpdateCount() != -1);
        }
        assertThat(ledgers).isEqualTo(2);
        return changed;
    }

    static void sync(DataSource source) throws SQLException {
        try (var connection = source.getConnection()) {
            connection.setAutoCommit(false);
            try {
                for (int attempt=0; pending(connection)>0; attempt++) {
                    assertThat(attempt).isLessThan(200);
                    assertThat(batch(connection)).isPositive();
                    connection.commit();
                }
                connection.commit();
            } catch (RuntimeException | SQLException error) {
                connection.rollback();
                throw error;
            }
        }
    }
}
