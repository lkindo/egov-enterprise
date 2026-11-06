package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import java.util.stream.Stream;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * DB 가 실제 만든 오류를 JdbcTemplate과 HTTP advice까지 전달한다. 운영 DB에는 접근하지 않는다.
 * 벤더마다 오류를 만드는 문장과 식별 값이 다르다. PostgreSQL 은 SQLState, 나머지는 오류 번호로 본다({@link VendorTestSql#errorIdentity}).
 * 처리기는 운영 문맥처럼 이 벤더의 오류 번호 표를 받는다.
 */
@Tag("schema-validation")
class DatabaseExceptionTranslationIntegrationTest extends SharedPostgresMigrationTestSupport {

    /** MySQL·MariaDB 의 입력 오류를 받을 표. 그 엔진은 SELECT 의 형 변환 실패를 경고로 넘기고 엄격 모드도 쓰기 문장에만 건다(2026-11-04 실측). */
    private static final String INPUT_PROBE_TABLE =
            "CREATE TABLE response_input_probe (decimal_value DECIMAL(3,0), date_value DATETIME, int_value INT)";
    private static final String INPUT_PROBE_INSERT = "INSERT INTO response_input_probe";

    static Stream<Arguments> inputAndCalculationFailures() {
        return switch (VendorTestSql.vendor()) {
            case POSTGRESQL -> Stream.of(
                    arguments("22003", "SELECT CAST(? AS SMALLINT)", "40000", 400, "C001"),
                    arguments("22007", "SELECT CAST(? AS DATE)", "invalid-date", 400, "C001"),
                    arguments("22008", "SELECT CAST(? AS DATE)", "2026-02-31", 400, "C001"),
                    arguments("22P02", "SELECT CAST(? AS INTEGER)", "private-database-detail", 400, "C001"),
                    arguments("22012", "SELECT 1 / CAST(? AS INTEGER)", "0", 500, "C004"));
            case ORACLE -> Stream.of(
                    arguments("1438", "SELECT CAST(? AS NUMBER(3)) FROM DUAL", "40000", 400, "C001"),
                    arguments("1841", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "invalid-date", 400, "C001"),
                    arguments("1847", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-02-32", 400, "C001"),
                    arguments("1839", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-02-31", 400, "C001"),
                    arguments("1843", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-13-01", 400, "C001"),
                    arguments("1722", "SELECT CAST(? AS NUMBER) FROM DUAL", "private-database-detail", 400, "C001"),
                    arguments("1476", "SELECT 1 / CAST(? AS NUMBER) FROM DUAL", "0", 500, "C004"));
            case MARIADB -> Stream.of(
                    arguments("1264", INPUT_PROBE_INSERT + " (decimal_value) VALUES (?)", "40000", 400, "C001"),
                    arguments("1292", INPUT_PROBE_INSERT + " (date_value) VALUES (?)", "invalid-date", 400, "C001"),
                    arguments("1366", INPUT_PROBE_INSERT + " (int_value) VALUES (?)", "private-database-detail", 400, "C001"),
                    arguments("1365", INPUT_PROBE_INSERT + " (int_value) VALUES (1 / CAST(? AS SIGNED))", "0", 500, "C004"));
            // 잘못된 날짜는 MySQL 에서 재지 않아 넣지 않는다. Connector/J 는 0 나누기(1365)도 자르기와 같은 22001 로 올리지만(2026-11-04 실측)
            // 오류 번호는 남아, 처리기가 번호로 다른 벤더처럼 서버 결함(500)으로 가른다.
            case MYSQL -> Stream.of(
                    arguments("1264", INPUT_PROBE_INSERT + " (decimal_value) VALUES (?)", "40000", 400, "C001"),
                    arguments("1366", INPUT_PROBE_INSERT + " (int_value) VALUES (?)", "private-database-detail", 400, "C001"),
                    arguments("1365", INPUT_PROBE_INSERT + " (int_value) VALUES (1 / CAST(? AS SIGNED))", "0", 500, "C004"));
            // 범위·형식·날짜 오류는 SQLState 가 S0001·S0002 라 번호로 가른다. 없는 날짜(2월 31일)도 형식 오류(241)다(2026-11-04 실측).
            case MSSQL -> Stream.of(
                    arguments("8115", "SELECT CAST(? AS DECIMAL(3,0))", "40000", 400, "C001"),
                    arguments("241", "SELECT CAST(? AS DATE)", "invalid-date", 400, "C001"),
                    arguments("241", "SELECT CAST(? AS DATE)", "2026-02-31", 400, "C001"),
                    arguments("245", "SELECT CAST(? AS INTEGER)", "private-database-detail", 400, "C001"),
                    arguments("8134", "SELECT 1 / CAST(? AS INTEGER)", "0", 500, "C004"));
            // 바인딩 값의 범위·형식·날짜 오류는 모두 -494(호스트 변수 변환 실패)이고 SQLState 가 없다. 처리기가 문구로 가른다(2026-11-05 실측).
            case CUBRID -> Stream.of(
                    arguments("-494", "SELECT CAST(? AS NUMERIC(3,0)) FROM db_root", "40000", 400, "C001"),
                    arguments("-494", "SELECT CAST(? AS DATE) FROM db_root", "invalid-date", 400, "C001"),
                    arguments("-494", "SELECT CAST(? AS DATE) FROM db_root", "2026-02-31", 400, "C001"),
                    arguments("-494", "SELECT CAST(? AS INTEGER) FROM db_root", "private-database-detail", 400, "C001"),
                    arguments("-539", "SELECT 1 / CAST(? AS INTEGER) FROM db_root", "0", 500, "C004"));
        };
    }

    static Stream<Arguments> constraintFailures() {
        return switch (VendorTestSql.vendor()) {
            case POSTGRESQL -> Stream.of(
                    arguments("23502", null, 400, "C001"), arguments("23514", "-1", 400, "C001"), arguments("23505", "1", 409, "C008"));
            case ORACLE -> Stream.of(
                    arguments("1400", null, 400, "C001"), arguments("2290", "-1", 400, "C001"), arguments("1", "1", 409, "C008"));
            // CHECK 위반 번호만 다르다. 셋 다 SQLState 로는 가를 수 없어 처리기가 번호로 가른다.
            case MARIADB -> Stream.of(
                    arguments("1048", null, 400, "C001"), arguments("4025", "-1", 400, "C001"), arguments("1062", "1", 409, "C008"));
            case MYSQL -> Stream.of(
                    arguments("1048", null, 400, "C001"), arguments("3819", "-1", 400, "C001"), arguments("1062", "1", 409, "C008"));
            // CHECK 는 FK 와 같은 547 이라 처리기가 메시지의 제약 종류로 가른다. FK 쪽은 actualForeignKeyViolationIsAConflict 가 본다.
            case MSSQL -> Stream.of(
                    arguments("515", null, 400, "C001"), arguments("547", "-1", 400, "C001"), arguments("2627", "1", 409, "C008"));
            // CHECK 는 엔진이 집행하지 않아 어댑터처럼 ck_ 트리거로 둔다. 거부(-517)를 처리기가 트리거 이름으로 CHECK 위반으로 가른다.
            case CUBRID -> Stream.of(
                    // BEFORE 트리거가 있는 표의 NOT NULL 위반은 -631 이 아니라 -205 다(2026-11-06 실측). 운영 스키마의 CHECK 트리거 표가 그렇다.
                    arguments("-205", null, 400, "C001"), arguments("-517", "-1", 400, "C001"), arguments("-670", "1", 409, "C008"));
        };
    }

    @ParameterizedTest
    @MethodSource("inputAndCalculationFailures")
    void actualInputAndCalculationStatesKeepTheirDistinctHttpMeaning(
            String state, String sql, String input, int status, String code) throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            boolean probeTable = sql.startsWith(INPUT_PROBE_INSERT);
            if (probeTable) {
                jdbc.execute(INPUT_PROBE_TABLE);
            }
            try {
                DataAccessException failure = queryFailure(jdbc, sql, input);
                assertSqlState(failure, state);
                assertHttpResponse(failure, status, code, null);
            } finally {
                if (probeTable) {
                    jdbc.execute("DROP TABLE response_input_probe");
                }
            }
        }
    }

    @Test
    void actualLengthViolationIsAnInputError() throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("CREATE TABLE response_length_probe (probe_value varchar(2))");
            try {
                DataAccessException failure = queryFailure(jdbc,
                        "INSERT INTO response_length_probe(probe_value) VALUES (?)", "private-database-detail");
                assertSqlState(failure, switch (VendorTestSql.vendor()) {
                    case POSTGRESQL -> "22001";
                    case ORACLE -> "12899";
                    case MARIADB, MYSQL -> "1406";
                    case MSSQL -> "2628";
                    case CUBRID -> "-494";
                });
                assertHttpResponse(failure, 400, "C001", null);
            } finally {
                jdbc.execute("DROP TABLE response_length_probe");
            }
        }
    }

    @ParameterizedTest
    @MethodSource("constraintFailures")
    void existingConstraintContractsArePreserved(String state, String input, int status, String code)
            throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("CREATE TABLE response_constraint_probe (probe_value integer NOT NULL UNIQUE CHECK (probe_value > 0))");
            if (VendorTestSql.vendor() == VendorTestSql.Vendor.CUBRID) {
                jdbc.execute("CREATE TRIGGER ck_response_constraint_probe_i BEFORE INSERT ON response_constraint_probe"
                        + " IF (new.probe_value IS NOT NULL AND new.probe_value <= 0) EXECUTE REJECT");
            }
            try {
                jdbc.update("INSERT INTO response_constraint_probe(probe_value) VALUES (1)");
                DataAccessException failure = queryFailure(jdbc, VendorTestSql.sql(jdbc,
                        "INSERT INTO response_constraint_probe(probe_value) VALUES (CAST(? AS INTEGER))"), input);
                assertSqlState(failure, state);
                assertHttpResponse(failure, status, code, null);
            } finally {
                jdbc.execute("DROP TABLE response_constraint_probe");
            }
        }
    }

    @Test
    void realRowLockTimeoutIsAConflictAndReleasesItsTransaction() throws Exception {
        // 클래스별 격리 DB의 fixture다. 운영 timeout과 스키마에는 영향을 주지 않는다.
        try (Connection owner = openConnection(); Connection contender = openConnection()) {
            JdbcTemplate ownerJdbc = jdbc(owner);
            ownerJdbc.execute("CREATE TABLE response_lock_probe (id integer PRIMARY KEY)");
            try {
                ownerJdbc.update("INSERT INTO response_lock_probe(id) VALUES (1)");
                owner.setAutoCommit(false);
                contender.setAutoCommit(false);
                try {
                    ownerJdbc.queryForObject(VendorTestSql.rowLock("SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE"), Integer.class);
                    JdbcTemplate contenderJdbc = jdbc(contender);
                    VendorTestSql.boundLockWait(contenderJdbc, "100ms");
                    // 세션 범위 대기 상한이 없는 벤더는 잠금 문장이 대기를 정한다. 이 연결은 시험이 닫는다.
                    DataAccessException failure = queryFailure(contenderJdbc, VendorTestSql.withRowLockWait(contenderJdbc,
                            VendorTestSql.sql(contenderJdbc, "SELECT id FROM response_lock_probe WHERE id=CAST(? AS INTEGER) FOR UPDATE"), 1), "1");
                    // Oracle 23 실측은 54 다. 30006 도 같은 대기 초과이고 제품은 둘 다 충돌로 본다. MySQL·MariaDB 는 1205 다.
                    assertTrue(VendorTestSql.isRowLockTimeout(contenderJdbc, databaseError(failure)),
                            () -> "행 잠금 대기 초과여야 한다: " + VendorTestSql.describe(databaseError(failure)));
                    assertHttpResponse(failure, 409, "C013", null);
                } finally {
                    contender.rollback();
                    owner.rollback();
                }
                // 첫 잠금이 풀린 뒤 같은 요청은 실제로 진행할 수 있다.
                assertEquals(1, jdbc(contender).queryForObject(
                        VendorTestSql.rowLock("SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE NOWAIT"), Integer.class));
                contender.rollback();
            } finally {
                owner.setAutoCommit(true);
                ownerJdbc.execute("DROP TABLE response_lock_probe");
            }
        }
    }

    @Test
    void realStatementTimeoutIsUnavailableAndConnectionCanRecover() throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            DataAccessException failure;
            switch (VendorTestSql.vendor()) {
                case POSTGRESQL -> {
                    jdbc.execute("SET statement_timeout = '100ms'");
                    failure = queryFailure(jdbc, "SELECT pg_sleep(CAST(? AS DOUBLE PRECISION))", "5");
                }
                case ORACLE -> {
                    // 도는 질의를 드라이버의 문장 시간 초과로 취소한다. 잠금 대기 취소는 Docker 포트 매핑을 거치면 20분 뒤에야 닿는다(실측).
                    jdbc.setQueryTimeout(1);
                    failure = queryFailure(jdbc, "SELECT COUNT(*) FROM all_objects a, all_objects b, all_objects c "
                            + "WHERE a.object_id + b.object_id + c.object_id > CAST(? AS NUMBER)", "5");
                    jdbc.setQueryTimeout(-1);
                }
                // 드라이버가 SLEEP 을 KILL QUERY 로 끊고 SQLTimeoutException 으로 올린다(2026-11-04 실측).
                case MARIADB, MYSQL -> {
                    jdbc.setQueryTimeout(1);
                    failure = queryFailure(jdbc, "SELECT SLEEP(CAST(? AS SIGNED))", "5");
                    jdbc.setQueryTimeout(-1);
                }
                // 드라이버가 WAITFOR 를 문장 취소로 끊고 번호 없는 SQLTimeoutException(HY008)으로 올린다(2026-11-04 실측).
                case MSSQL -> {
                    jdbc.setQueryTimeout(1);
                    failure = queryFailure(jdbc, "DECLARE @nuri_wait INT = CAST(? AS INT); WAITFOR DELAY '00:00:05'", "5");
                    jdbc.setQueryTimeout(-1);
                }
                // SLEEP 이 없어 Oracle 처럼 오래 도는 질의를 드라이버의 문장 시간 초과로 끊는다.
                case CUBRID -> {
                    jdbc.setQueryTimeout(1);
                    failure = queryFailure(jdbc, "SELECT COUNT(*) FROM db_attribute a, db_attribute b, db_attribute c "
                            + "WHERE a.def_order + b.def_order + c.def_order > CAST(? AS INTEGER)", "5");
                    jdbc.setQueryTimeout(-1);
                }
                default -> throw new IllegalStateException();
            }
            assertTrue(VendorTestSql.isStatementTimeout(jdbc, databaseError(failure)),
                    () -> "문장 시간 초과여야 한다: " + VendorTestSql.describe(databaseError(failure)));
            assertHttpResponse(failure, 503, "S002", "5");
            // FROM DUAL 은 Oracle 19c 가 요구하고 MySQL·MariaDB 도 받는다. PostgreSQL 과 SQL Server 는 받지 않는다.
            boolean dual = VendorTestSql.vendorRun() && VendorTestSql.vendor() != VendorTestSql.Vendor.MSSQL
                    && VendorTestSql.vendor() != VendorTestSql.Vendor.CUBRID;
            assertEquals(1, jdbc.queryForObject(dual ? "SELECT 1 FROM DUAL" : "SELECT 1", Integer.class));
        }
    }

    @Test
    void actualForeignKeyViolationIsAConflict() throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("CREATE TABLE response_parent_probe (id integer PRIMARY KEY)");
            // 컬럼에 붙인 REFERENCES 는 MySQL 이 읽기만 하고 버린다. 표 수준 FOREIGN KEY 는 모든 벤더가 만든다.
            jdbc.execute("CREATE TABLE response_child_probe (parent_id integer, FOREIGN KEY (parent_id) REFERENCES response_parent_probe (id))");
            try {
                jdbc.update("INSERT INTO response_parent_probe (id) VALUES (1)");
                jdbc.update("INSERT INTO response_child_probe (parent_id) VALUES (1)");
                DataAccessException failure = queryFailure(jdbc,
                        VendorTestSql.sql(jdbc, "DELETE FROM response_parent_probe WHERE id = CAST(? AS INTEGER)"), "1");
                assertSqlState(failure, switch (VendorTestSql.vendor()) {
                    case POSTGRESQL -> "23503";
                    case ORACLE -> "2292";
                    case MARIADB, MYSQL -> "1451";
                    case MSSQL -> "547";
                    case CUBRID -> "-924";
                });
                assertHttpResponse(failure, 409, "C008", null);
            } finally {
                jdbc.execute("DROP TABLE response_child_probe");
                jdbc.execute("DROP TABLE response_parent_probe");
            }
        }
    }

    private JdbcTemplate jdbc(Connection connection) {
        return new JdbcTemplate(new SingleConnectionDataSource(connection, true));
    }

    private DataAccessException queryFailure(JdbcTemplate jdbc, String sql, String input) {
        return assertThrows(DataAccessException.class, () -> jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement(sql)) {
                statement.setString(1, input);
                if (jdbc.getQueryTimeout() > 0) {
                    statement.setQueryTimeout(jdbc.getQueryTimeout());
                }
                // 행을 끝까지 읽는다. SQL Server 는 SELECT 식의 오류와 행 잠금 대기 초과를 행을 낼 때 올린다(2026-11-04 실측).
                if (statement.execute()) {
                    try (var rows = statement.getResultSet()) {
                        while (rows.next()) {
                            rows.getObject(1);
                        }
                    }
                }
            }
            return null;
        }));
    }

    private void assertSqlState(Throwable failure, String... states) {
        SQLException sql = databaseError(failure);
        assertTrue(java.util.List.of(states).contains(VendorTestSql.errorIdentity(sql)), () -> "DB 오류 " + VendorTestSql.describe(sql));
    }

    /** 변환기가 보존한 첫 DB 오류. 없으면 실패한다. */
    private static SQLException databaseError(Throwable failure) {
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                return sql;
            }
        }
        return fail("The database error was not preserved by the exception translator");
    }

    private void assertHttpResponse(RuntimeException failure, int status, String code, String retryAfter)
            throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new DatabaseProbeController(failure))
                .setControllerAdvice(new GlobalExceptionHandler(VendorTestSql.errorCodes())).build();
        var response = mvc.perform(post("/database-probe")).andReturn().getResponse();
        assertEquals(status, response.getStatus());
        assertEquals(retryAfter, response.getHeader("Retry-After"));
        var body = tools.jackson.databind.json.JsonMapper.builder().build().readTree(response.getContentAsString());
        assertEquals(status, body.path("status").asInt());
        assertEquals(code, body.path("code").asString());
        assertFalse(body.path("success").asBoolean());
        assertFalse(response.getContentAsString().contains("private-database-detail"));
        assertFalse(response.getContentAsString().contains("response_"));
        assertFalse(response.getContentAsString().contains("SELECT"));
    }

    @RestController
    @org.springframework.context.annotation.Profile("database-response-contract-probe")
    static class DatabaseProbeController {
        private final RuntimeException failure;
        DatabaseProbeController(RuntimeException failure) { this.failure = failure; }
        @PostMapping("/database-probe")
        void execute() { throw failure; }
    }
}
