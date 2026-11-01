package nuri.api.schema;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import nuri.foundation.core.persistence.OracleSqlDialect;
import nuri.foundation.core.persistence.PostgresqlSqlDialect;
import nuri.foundation.core.persistence.VendorSqlDialect;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.ArgumentPreparedStatementSetter;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.support.GeneratedKeyHolder;

/**
 * 통합 시험이 벤더마다 달리 써야 하는 문장을 모은다(ADR-0047 D-10). 시나리오와 단언은 벤더 공통이고, 픽스처와 세션 관측만 여기서 갈린다.
 * 벤더를 고르는 값은 연결한 DB 제품이다. 한 시험 JVM 은 한 DB 만 본다.
 */
final class VendorTestSql {

    /** 행 잠금을 기다리는 세션. {@code session} 은 {@link #nameSession} 으로 붙인 이름이고 {@code statement} 는 소문자다. */
    record LockWait(String session, long id, String statement, Set<Long> blockers) {
        boolean blockedBy(long session) {
            return blockers.contains(session);
        }

        boolean touches(String table) {
            return statement != null && statement.contains(table);
        }
    }

    private static volatile Boolean oracle;

    private VendorTestSql() {
    }

    static boolean isOracle(JdbcTemplate jdbc) {
        Boolean known = oracle;
        if (known == null) {
            known = jdbc.execute((ConnectionCallback<Boolean>) connection ->
                    connection.getMetaData().getDatabaseProductName().contains("Oracle"));
            oracle = known;
        }
        return Boolean.TRUE.equals(known);
    }

    /** 실행 도구가 벤더 DB 를 준 실행인가. 빌드 시점이 아니라 실행 시점 값이라 시험을 고르는 데도 쓴다. */
    static boolean vendorRun() {
        String url = System.getenv("VENDOR_TEST_URL");
        return url != null && !url.isBlank();
    }

    static Connection openVendorConnection() throws SQLException {
        return DriverManager.getConnection(System.getenv("VENDOR_TEST_URL"),
                System.getenv("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_PASSWORD"));
    }

    /** 쿼리마다 연결을 여는 시험의 벤더 풀. Oracle 리스너는 그 속도로 세션을 만들지 못한다(ORA-12516). 운영도 풀을 쓴다. */
    static HikariDataSource vendorPool() {
        var pool = new HikariDataSource();
        pool.setJdbcUrl(System.getenv("VENDOR_TEST_URL"));
        pool.setUsername(System.getenv("SPRING_DATASOURCE_USERNAME"));
        pool.setPassword(System.getenv("SPRING_DATASOURCE_PASSWORD"));
        pool.setMaximumPoolSize(6);
        return pool;
    }

    /** 이 DB 의 SQL 포트. */
    static VendorSqlDialect dialect(JdbcTemplate jdbc) {
        return isOracle(jdbc) ? new OracleSqlDialect() : new PostgresqlSqlDialect();
    }

    /** 시험이 따로 쥔 연결에서 문장을 돌린다. 연결은 닫지 않는다. */
    static JdbcTemplate on(Connection connection) {
        return new JdbcTemplate(new SingleConnectionDataSource(connection, true));
    }

    /**
     * 일회용 시험 DB 인지 본다. 시험이 쓰고 지우는 행이 다른 DB 에 닿지 않게 한다. 벤더 DB 는 주소만으로 알 수 없어, 실행 도구가 자기가 띄운
     * DB 에 남긴 토큰을 대조한다.
     */
    static void assertDisposable(Environment environment, JdbcTemplate jdbc) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (!isOracle(jdbc)) {
            assertThat(url).startsWith("jdbc:tc:postgresql:17:");
            return;
        }
        assertOwned(url, environment.getProperty("vendor.test.owner"), jdbc);
    }

    /** 스프링 문맥 없이 벤더 DB 를 쓰는 시험의 같은 확인. */
    static void assertOwnedVendorDatabase(JdbcTemplate jdbc) {
        assertOwned(System.getenv("VENDOR_TEST_URL"), System.getenv("VENDOR_TEST_OWNER"), jdbc);
    }

    private static void assertOwned(String url, String owner, JdbcTemplate jdbc) {
        assertThat(url).startsWith("jdbc:oracle:thin:@//127.0.0.1:");
        assertThat(owner).as("벤더 시험은 실행 도구로 돌린다").isNotBlank();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM vendor_test_owner WHERE token = ?", Integer.class, owner)).isEqualTo(1);
    }

    /** 시험 문장의 벤더 차이를 바꾼다. PostgreSQL 문장은 그대로 지나간다. */
    static String sql(JdbcTemplate jdbc, String statement) {
        if (!isOracle(jdbc)) {
            return statement;
        }
        return statement
                .replaceAll("(\\w+)::jsonb->>'(\\w+)'", "JSON_VALUE($1, '\\$.$2')")
                .replaceAll("nextval\\('(\\w+)'\\)", "$1.NEXTVAL")
                .replaceAll("(\\w+_id)::text", "LOWER(REGEXP_REPLACE(RAWTOHEX($1), '^(.{8})(.{4})(.{4})(.{4})(.{12})\\$', '\\\\1-\\\\2-\\\\3-\\\\4-\\\\5'))")
                .replaceAll("(\\w+)::text", "TO_CHAR($1)");
    }

    /** 입력이 만든 키를 돌려준다. RETURNING 절 대신 JDBC 키 조회를 쓴다. */
    static long insertKey(JdbcTemplate jdbc, String statement, String keyColumn, Object... arguments) {
        return ((Number) generatedKey(jdbc, statement, keyColumn, arguments)).longValue();
    }

    /** 숫자가 아닌 키. Oracle 의 UUID 컬럼은 RAW(16) 이다. */
    static String insertTextKey(JdbcTemplate jdbc, String statement, String keyColumn, Object... arguments) {
        Object key = generatedKey(jdbc, statement, keyColumn, arguments);
        if (key instanceof byte[] raw && raw.length == 16) {
            var bytes = java.nio.ByteBuffer.wrap(raw);
            return new java.util.UUID(bytes.getLong(), bytes.getLong()).toString();
        }
        return String.valueOf(key);
    }

    private static Object generatedKey(JdbcTemplate jdbc, String statement, String keyColumn, Object[] arguments) {
        String column = isOracle(jdbc) ? keyColumn.toUpperCase(Locale.ROOT) : keyColumn;
        var keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement prepared = connection.prepareStatement(sql(jdbc, statement), new String[] {column});
            new ArgumentPreparedStatementSetter(arguments).setValues(prepared);
            return prepared;
        }, keys);
        Map<String, Object> row = keys.getKeys();
        if (row == null || row.isEmpty()) {
            throw new IllegalStateException("입력이 키를 돌려주지 않았다: " + keyColumn);
        }
        return row.values().iterator().next();
    }

    static int sessionId(JdbcTemplate jdbc) {
        return isOracle(jdbc)
                ? jdbc.queryForObject("SELECT TO_NUMBER(SYS_CONTEXT('USERENV', 'SID')) FROM DUAL", Integer.class)
                : jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
    }

    /** 다른 세션에서 찾을 수 있게 이 트랜잭션의 세션에 이름을 붙인다. */
    static void nameSession(JdbcTemplate jdbc, String name) {
        if (isOracle(jdbc)) {
            jdbc.update("BEGIN DBMS_SESSION.SET_IDENTIFIER(?); END;", name);
        } else {
            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, name);
        }
    }

    /** 이 트랜잭션의 잠금 대기를 묶는다. Oracle 에는 트랜잭션 범위 설정이 없고 잠금 문장의 대기가 맡는다. */
    static void boundLockWait(JdbcTemplate jdbc, String postgresqlValue) {
        if (!isOracle(jdbc)) {
            jdbc.queryForObject("SELECT set_config('lock_timeout', ?, true)", String.class, postgresqlValue);
        }
    }

    /** 이름이 패턴에 맞고 잠금을 기다리는 세션들. */
    static List<LockWait> lockWaits(JdbcTemplate jdbc, String sessionPattern) {
        List<LockWait> waits = new ArrayList<>();
        if (isOracle(jdbc)) {
            jdbc.query("""
                    SELECT s.client_identifier AS session_name, s.sid AS session_id, LOWER(q.sql_text) AS statement,
                           s.blocking_session
                    FROM v$session s LEFT JOIN v$sql q ON q.sql_id = s.sql_id AND q.child_number = s.sql_child_number
                    WHERE s.state = 'WAITING' AND s.event LIKE 'enq: %' AND NVL(s.client_identifier, ' ') LIKE ?
                    """, (RowCallbackHandler) row -> {
                long blocker = row.getLong("blocking_session");
                Set<Long> blockers = row.wasNull() ? Set.of() : Set.of(blocker);
                waits.add(new LockWait(row.getString("session_name"), row.getLong("session_id"), row.getString("statement"), blockers));
            }, sessionPattern);
        } else {
            jdbc.query("""
                    SELECT application_name, pid, lower(query) AS statement, pg_blocking_pids(pid) AS blockers
                    FROM pg_stat_activity
                    WHERE datname=current_database() AND wait_event_type='Lock' AND application_name LIKE ?
                    """, (RowCallbackHandler) row -> waits.add(new LockWait(row.getString("application_name"), row.getLong("pid"),
                    row.getString("statement"), Arrays.stream((Integer[]) row.getArray("blockers").getArray())
                            .map(Integer::longValue).collect(Collectors.toSet()))), sessionPattern);
        }
        return waits;
    }

    static int waitingSessions(JdbcTemplate jdbc, String sessionPattern) {
        return lockWaits(jdbc, sessionPattern).size();
    }

    /** 이름 붙은 세션이 {@code blocker} 세션을 기다리는가. {@code table} 이 있으면 그 표를 건드리는 문장이어야 한다. */
    static boolean waitsOn(JdbcTemplate jdbc, String session, long blocker, String table) {
        return lockWaits(jdbc, session).stream()
                .anyMatch(wait -> wait.blockedBy(blocker) && (table == null || wait.touches(table)));
    }

    /** {@code blocker} 뒤에 줄 선 세션 수. 기다리는 세션을 기다리는 세션도 센다. */
    static int waitersBehind(JdbcTemplate jdbc, long blocker) {
        List<LockWait> waits = lockWaits(jdbc, "%");
        Set<Long> chain = new HashSet<>(Set.of(blocker));
        boolean grew = true;
        while (grew) {
            grew = false;
            for (LockWait wait : waits) {
                if (!chain.contains(wait.id()) && wait.blockers().stream().anyMatch(chain::contains)) {
                    grew = chain.add(wait.id());
                }
            }
        }
        return chain.size() - 1;
    }

    /**
     * 이 세션을 기다리는 세션이 있는가. 잠금을 쥔 트랜잭션 안에서 되풀이해 묻는 시험용이다. PostgreSQL 의 pg_stat_activity 는 트랜잭션 안에서
     * 첫 조회 값을 재사용해 늦게 줄 선 세션을 보지 못하므로 실시간인 pg_locks 를 본다.
     */
    static boolean hasWaiters(JdbcTemplate jdbc, long blocker) {
        return isOracle(jdbc)
                ? waitersBehind(jdbc, blocker) > 0
                : Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE NOT granted AND ?=ANY(pg_blocking_pids(pid)))",
                        Boolean.class, blocker));
    }

    /** 응용 잠금을 기다리는 세션 수. PostgreSQL 은 advisory 잠금, Oracle 은 슬롯 행이다. */
    static int waitingOnApplicationLock(JdbcTemplate jdbc, String session) {
        if (isOracle(jdbc)) {
            return (int) lockWaits(jdbc, session).stream().filter(wait -> wait.touches("tb_sys_lock_slot")).count();
        }
        return jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                + "AND application_name=? AND wait_event_type='Lock' AND wait_event='advisory'", Integer.class, session);
    }

    /** 시험을 묶는 문장 대기 상한. Oracle 에는 트랜잭션 범위 설정이 없다. */
    static void boundStatement(JdbcTemplate jdbc, String postgresqlValue) {
        if (!isOracle(jdbc)) {
            jdbc.queryForObject("SELECT set_config('statement_timeout', ?, true)", String.class, postgresqlValue);
        }
    }

    /** 실패를 주입하는 시험 트리거. 조건의 {@code NEW.}·{@code OLD.} 는 두 벤더 모두 이 표기로 쓴다. */
    static void failingTrigger(JdbcTemplate jdbc, String name, String timing, String table, String condition, String message) {
        if (isOracle(jdbc)) {
            jdbc.execute("CREATE OR REPLACE TRIGGER " + name + " " + timing + " ON " + table + " FOR EACH ROW BEGIN IF "
                    + condition.replaceAll("\\b(NEW|OLD)\\.", ":$1.") + " THEN RAISE_APPLICATION_ERROR(-20099, '" + message + "'); END IF; END;");
        } else {
            jdbc.execute("CREATE FUNCTION " + name + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF " + condition
                    + " THEN RAISE EXCEPTION '" + message + "'; END IF; RETURN NEW; END $$");
            jdbc.execute("CREATE TRIGGER " + name + " " + timing + " ON " + table + " FOR EACH ROW EXECUTE FUNCTION " + name + "()");
        }
    }

    /** 조건에 맞는 둘째 행 삭제에서 실패한다. Oracle 의 행 트리거는 자기 표를 읽지 못해(ORA-04091) 시퀀스로 센다. */
    static void failingSecondDeleteOnOracle(JdbcTemplate jdbc, String name, String table, String condition, String message) {
        jdbc.execute("CREATE SEQUENCE " + name + "_n");
        jdbc.execute("CREATE OR REPLACE TRIGGER " + name + " BEFORE DELETE ON " + table + " FOR EACH ROW BEGIN IF "
                + condition.replaceAll("\\bOLD\\.", ":OLD.") + " AND " + name + "_n.NEXTVAL > 1 THEN RAISE_APPLICATION_ERROR(-20099, '"
                + message + "'); END IF; END;");
    }

    static void dropSecondDeleteTriggerOnOracle(JdbcTemplate jdbc, String name) {
        jdbc.execute("DROP TRIGGER " + name);
        jdbc.execute("DROP SEQUENCE " + name + "_n");
    }

    static void dropFailingTrigger(JdbcTemplate jdbc, String name, String table) {
        if (isOracle(jdbc)) {
            try {
                jdbc.execute("DROP TRIGGER " + name);
            } catch (org.springframework.dao.DataAccessException absent) {
                // 없으면 지울 것도 없다.
            }
        } else {
            jdbc.execute("DROP TRIGGER IF EXISTS " + name + " ON " + table);
            jdbc.execute("DROP FUNCTION IF EXISTS " + name + "()");
        }
    }

    static boolean tableExists(JdbcTemplate jdbc, String table) {
        return Boolean.TRUE.equals(isOracle(jdbc)
                ? jdbc.queryForObject("SELECT count(*) FROM user_tables WHERE table_name = UPPER(?)", Integer.class, table) > 0
                : jdbc.queryForObject("SELECT to_regclass('public.' || ?) IS NOT NULL", Boolean.class, table));
    }

    static boolean isTextColumn(JdbcTemplate jdbc, String table, String column) {
        if (isOracle(jdbc)) {
            return jdbc.queryForObject("SELECT count(*) FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)"
                    + " AND data_type IN ('VARCHAR2', 'CLOB')", Integer.class, table, column) == 1;
        }
        return List.of("character varying").equals(jdbc.queryForList("SELECT data_type FROM information_schema.columns"
                + " WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?", String.class, table, column));
    }

    static Integer timestampPrecision(JdbcTemplate jdbc, String table, String column) {
        return isOracle(jdbc)
                ? jdbc.queryForObject("SELECT data_scale FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)",
                        Integer.class, table, column)
                : jdbc.queryForObject("SELECT datetime_precision FROM information_schema.columns "
                        + "WHERE table_schema=current_schema() AND table_name=? AND column_name=?", Integer.class, table, column);
    }

    static Integer constraintCount(JdbcTemplate jdbc, String constraint) {
        return isOracle(jdbc)
                ? jdbc.queryForObject("SELECT count(*) FROM user_constraints WHERE constraint_name = UPPER(?)", Integer.class, constraint)
                : jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conname=?", Integer.class, constraint);
    }

    /** 제약이 켜져 있고 기존 행까지 검증됐는가. 제약이 없으면 실패한다. */
    static boolean constraintValidated(JdbcTemplate jdbc, String constraint) {
        return isOracle(jdbc)
                ? "ENABLEDVALIDATED".equals(jdbc.queryForObject("SELECT status || validated FROM user_constraints WHERE constraint_name = UPPER(?)",
                        String.class, constraint))
                : Boolean.TRUE.equals(jdbc.queryForObject("SELECT convalidated FROM pg_constraint WHERE conname = ?", Boolean.class, constraint));
    }

    static boolean indexExists(JdbcTemplate jdbc, String index) {
        return (isOracle(jdbc)
                ? jdbc.queryForObject("SELECT count(*) FROM user_indexes WHERE index_name = UPPER(?)", Integer.class, index)
                : jdbc.queryForObject("SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = ?", Integer.class, index)) == 1;
    }

    /** 표의 외래 키 컬럼 이름. 소문자다. */
    static List<String> foreignKeyColumns(JdbcTemplate jdbc, String table) {
        return isOracle(jdbc)
                ? jdbc.queryForList("""
                        SELECT LOWER(k.column_name) FROM user_constraints c
                        JOIN user_cons_columns k ON k.constraint_name = c.constraint_name
                        WHERE c.table_name = UPPER(?) AND c.constraint_type = 'R'
                        """, String.class, table)
                : jdbc.queryForList("""
                        SELECT a.attname FROM pg_constraint c
                        JOIN unnest(c.conkey) AS k(attnum) ON TRUE
                        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                        WHERE c.conrelid = ?::regclass AND c.contype = 'f'
                        """, String.class, table);
    }

    /** 컬럼 기본값의 정의 문자열. */
    static String columnDefault(JdbcTemplate jdbc, String table, String column) {
        return isOracle(jdbc)
                ? jdbc.queryForObject("SELECT data_default FROM user_tab_columns WHERE table_name = UPPER(?) AND column_name = UPPER(?)",
                        String.class, table, column)
                : jdbc.queryForObject("SELECT column_default FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
                        String.class, table, column);
    }

    /** DB 가 계산한 한국 날짜(yyyyMMdd). */
    static String koreanToday(JdbcTemplate jdbc) {
        return jdbc.queryForObject(isOracle(jdbc)
                ? "SELECT TO_CHAR(SYSTIMESTAMP AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') FROM DUAL"
                : "SELECT to_char((now() AT TIME ZONE 'Asia/Seoul'), 'YYYYMMDD')", String.class);
    }

    /** 한 행을 읽는다. 정수는 컬럼 타입과 상관없이 Long 이다. Oracle 은 정수 컬럼도 NUMBER 로 돌려준다. */
    static Map<String, Object> row(JdbcTemplate jdbc, String statement, Object... arguments) {
        Map<String, Object> row = jdbc.queryForMap(statement, arguments);
        row.replaceAll((column, value) -> value instanceof Number number && isIntegral(number) ? (Object) number.longValue() : value);
        return row;
    }

    private static boolean isIntegral(Number number) {
        return !(number instanceof BigDecimal decimal) || decimal.stripTrailingZeros().scale() <= 0;
    }

    /** 빈 문자열로 저장한 값을 읽으면 나오는 값. Oracle 은 빈 문자열이 NULL 이다. */
    static String storedEmptyText(JdbcTemplate jdbc) {
        return stored(jdbc, "");
    }

    /** 이 값을 저장하고 읽으면 나오는 값. */
    static String stored(JdbcTemplate jdbc, String value) {
        return isOracle(jdbc) && value != null && value.isEmpty() ? null : value;
    }

    /** 외래 키 위반의 SQLState. Oracle 은 무결성 위반이 모두 23000 이다. */
    static String foreignKeyState(JdbcTemplate jdbc) {
        return isOracle(jdbc) ? "23000" : "23503";
    }

    /** 잠금 대기 초과의 SQLState. */
    static String lockTimeoutState(JdbcTemplate jdbc) {
        return isOracle(jdbc) ? "61000" : "55P03";
    }

    static boolean isUniqueViolation(DataIntegrityViolationException failure) {
        Throwable cause = failure.getMostSpecificCause();
        return cause instanceof SQLException sql && "23505".equals(sql.getSQLState())
                || String.valueOf(cause.getMessage()).contains("ORA-00001");
    }

    /** 다른 벤더에서는 볼 것이 없다. PostgreSQL 은 운영과 같은 17 이상이어야 한다. */
    static void assertPostgresql17(JdbcTemplate jdbc) {
        if (!isOracle(jdbc)) {
            assertThat(jdbc.queryForObject("SELECT current_setting('server_version_num')::int", Integer.class))
                    .as("운영과 같은 PostgreSQL 17 이상").isGreaterThanOrEqualTo(170000);
        }
    }

    /** 트랜잭션 잠금 대기 상한이 실제로 걸렸는가. Oracle 은 잠금 문장의 {@code WAIT} 가 맡는다. */
    static void assertPostgresqlLockTimeout(JdbcTemplate jdbc, int milliseconds) {
        if (!isOracle(jdbc)) {
            assertThat(jdbc.queryForObject("SELECT setting::int FROM pg_settings WHERE name='lock_timeout'", Integer.class))
                    .isEqualTo(milliseconds);
        }
    }

    /** Oracle 의 기본 격리는 READ COMMITTED 이고 세션에서 읽을 수단이 없다. */
    static void assertReadCommitted(JdbcTemplate jdbc) {
        if (!isOracle(jdbc)) {
            assertThat(jdbc.queryForObject("SELECT current_setting('transaction_isolation')", String.class)).isEqualTo("read committed");
        }
    }

    /** 감사 원장 행을 지울 허가를 이 트랜잭션에 낸다. 같은 트랜잭션에서 {@link #revokeLedgerPermit} 로 거둔다. */
    static void permitLedgerDeletion(JdbcTemplate jdbc, String key) {
        if (isOracle(jdbc)) {
            jdbc.update("INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?)", key);
        } else {
            jdbc.queryForObject("SELECT set_config(?, 'on', true)", String.class, key);
        }
    }

    /** 커밋 전에 허가를 거둔다. PostgreSQL 은 트랜잭션 지역 설정이라 할 일이 없다. */
    static void revokeLedgerPermit(JdbcTemplate jdbc, String key) {
        if (isOracle(jdbc)) {
            jdbc.update("DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?", key);
        }
    }
}
