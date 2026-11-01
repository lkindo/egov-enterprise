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
 * 벤더마다 오류를 만드는 문장과 식별 값이 다르다. PostgreSQL 은 SQLState, Oracle 은 오류 번호로 본다.
 */
@Tag("schema-validation")
class DatabaseExceptionTranslationIntegrationTest extends SharedPostgresMigrationTestSupport {

    static Stream<Arguments> inputAndCalculationFailures() {
        return VendorTestSql.vendorRun() ? Stream.of(
                arguments("1438", "SELECT CAST(? AS NUMBER(3)) FROM DUAL", "40000", 400, "C001"),
                arguments("1841", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "invalid-date", 400, "C001"),
                arguments("1847", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-02-32", 400, "C001"),
                arguments("1839", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-02-31", 400, "C001"),
                arguments("1843", "SELECT TO_DATE(?, 'YYYY-MM-DD') FROM DUAL", "2026-13-01", 400, "C001"),
                arguments("1722", "SELECT CAST(? AS NUMBER) FROM DUAL", "private-database-detail", 400, "C001"),
                arguments("1476", "SELECT 1 / CAST(? AS NUMBER) FROM DUAL", "0", 500, "C004"))
                : Stream.of(
                arguments("22003", "SELECT CAST(? AS SMALLINT)", "40000", 400, "C001"),
                arguments("22007", "SELECT CAST(? AS DATE)", "invalid-date", 400, "C001"),
                arguments("22008", "SELECT CAST(? AS DATE)", "2026-02-31", 400, "C001"),
                arguments("22P02", "SELECT CAST(? AS INTEGER)", "private-database-detail", 400, "C001"),
                arguments("22012", "SELECT 1 / CAST(? AS INTEGER)", "0", 500, "C004"));
    }

    static Stream<Arguments> constraintFailures() {
        return VendorTestSql.vendorRun() ? Stream.of(
                arguments("1400", null, 400, "C001"), arguments("2290", "-1", 400, "C001"), arguments("1", "1", 409, "C008"))
                : Stream.of(
                arguments("23502", null, 400, "C001"), arguments("23514", "-1", 400, "C001"), arguments("23505", "1", 409, "C008"));
    }

    @ParameterizedTest
    @MethodSource("inputAndCalculationFailures")
    void actualInputAndCalculationStatesKeepTheirDistinctHttpMeaning(
            String state, String sql, String input, int status, String code) throws Exception {
        try (Connection connection = openConnection()) {
            DataAccessException failure = queryFailure(jdbc(connection), sql, input);
            assertSqlState(failure, state);
            assertHttpResponse(failure, status, code, null);
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
                assertSqlState(failure, VendorTestSql.vendorRun() ? "12899" : "22001");
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
            try {
                jdbc.update("INSERT INTO response_constraint_probe(probe_value) VALUES (1)");
                DataAccessException failure = queryFailure(jdbc,
                        "INSERT INTO response_constraint_probe(probe_value) VALUES (CAST(? AS INTEGER))", input);
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
                    ownerJdbc.queryForObject("SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE", Integer.class);
                    JdbcTemplate contenderJdbc = jdbc(contender);
                    VendorTestSql.boundLockWait(contenderJdbc, "100ms");
                    // Oracle 에는 세션 범위 대기 상한이 없어 잠금 문장이 대기를 정한다.
                    DataAccessException failure = queryFailure(contenderJdbc,
                            "SELECT id FROM response_lock_probe WHERE id=CAST(? AS INTEGER) FOR UPDATE"
                                    + (VendorTestSql.vendorRun() ? " WAIT 1" : ""), "1");
                    // Oracle 23 실측은 54 다. 30006 도 같은 대기 초과이고 제품은 둘 다 충돌로 본다.
                    if (VendorTestSql.vendorRun()) {
                        assertSqlState(failure, "54", "30006");
                    } else {
                        assertSqlState(failure, "55P03");
                    }
                    assertHttpResponse(failure, 409, "C013", null);
                } finally {
                    contender.rollback();
                    owner.rollback();
                }
                // 첫 잠금이 풀린 뒤 같은 요청은 실제로 진행할 수 있다.
                assertEquals(1, jdbc(contender).queryForObject(
                        "SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE NOWAIT", Integer.class));
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
            if (VendorTestSql.vendorRun()) {
                failure = cancelledByDriverTimeout(jdbc);
            } else {
                jdbc.execute("SET statement_timeout = '100ms'");
                failure = queryFailure(jdbc, "SELECT pg_sleep(CAST(? AS DOUBLE PRECISION))", "5");
            }
            assertSqlState(failure, VendorTestSql.vendorRun() ? "1013" : "57014");
            assertHttpResponse(failure, 503, "S002", "5");
            assertEquals(1, jdbc.queryForObject(VendorTestSql.vendorRun() ? "SELECT 1 FROM DUAL" : "SELECT 1", Integer.class));
        }
    }

    @Test
    void actualForeignKeyViolationIsAConflict() throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("CREATE TABLE response_parent_probe (id integer PRIMARY KEY)");
            jdbc.execute("CREATE TABLE response_child_probe (parent_id integer REFERENCES response_parent_probe (id))");
            try {
                jdbc.update("INSERT INTO response_parent_probe (id) VALUES (1)");
                jdbc.update("INSERT INTO response_child_probe (parent_id) VALUES (1)");
                DataAccessException failure = queryFailure(jdbc, "DELETE FROM response_parent_probe WHERE id = CAST(? AS INTEGER)", "1");
                assertSqlState(failure, VendorTestSql.vendorRun() ? "2292" : "23503");
                assertHttpResponse(failure, 409, "C008", null);
            } finally {
                jdbc.execute("DROP TABLE response_child_probe");
                jdbc.execute("DROP TABLE response_parent_probe");
            }
        }
    }

    /** 다른 세션이 쥔 행을 기다리는 질의를 드라이버의 문장 시간 초과로 취소한다. Oracle 에는 세션 범위 문장 상한이 없다. */
    private DataAccessException cancelledByDriverTimeout(JdbcTemplate jdbc) throws SQLException {
        jdbc.execute("CREATE TABLE response_timeout_probe (id integer PRIMARY KEY)");
        jdbc.update("INSERT INTO response_timeout_probe (id) VALUES (1)");
        try (Connection holder = openConnection()) {
            holder.setAutoCommit(false);
            jdbc(holder).queryForObject("SELECT id FROM response_timeout_probe WHERE id=1 FOR UPDATE", Integer.class);
            jdbc.setQueryTimeout(1);
            try {
                return queryFailure(jdbc, "SELECT id FROM response_timeout_probe WHERE id=CAST(? AS INTEGER) FOR UPDATE", "1");
            } finally {
                jdbc.setQueryTimeout(-1);
                holder.rollback();
            }
        } finally {
            jdbc.execute("DROP TABLE response_timeout_probe");
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
                statement.execute();
            }
            return null;
        }));
    }

    private void assertSqlState(Throwable failure, String... states) {
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                assertTrue(java.util.List.of(states).contains(VendorTestSql.vendorRun() ? Integer.toString(sql.getErrorCode()) : sql.getSQLState()),
                        () -> "DB 오류 " + sql.getErrorCode() + "/" + sql.getSQLState());
                return;
            }
        }
        fail("The database error was not preserved by the exception translator");
    }

    private void assertHttpResponse(RuntimeException failure, int status, String code, String retryAfter)
            throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new DatabaseProbeController(failure))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
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
