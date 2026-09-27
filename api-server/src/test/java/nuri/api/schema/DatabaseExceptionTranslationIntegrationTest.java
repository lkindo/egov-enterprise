package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** PostgreSQL이 실제 만든 오류를 JdbcTemplate과 HTTP advice까지 전달한다. 운영 DB에는 접근하지 않는다. */
@Tag("schema-validation")
class DatabaseExceptionTranslationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @ParameterizedTest
    @CsvSource({
            "22003, SELECT CAST(? AS SMALLINT), 40000, 400, C001",
            "22007, SELECT CAST(? AS DATE), invalid-date, 400, C001",
            "22008, SELECT CAST(? AS DATE), 2026-02-31, 400, C001",
            "22P02, SELECT CAST(? AS INTEGER), private-database-detail, 400, C001",
            "22012, SELECT 1 / CAST(? AS INTEGER), 0, 500, C004"
    })
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
            jdbc.execute("CREATE TEMP TABLE response_length_probe (value varchar(2))");
            DataAccessException failure = queryFailure(jdbc,
                    "INSERT INTO response_length_probe(value) VALUES (?)", "private-database-detail");
            assertSqlState(failure, "22001");
            assertHttpResponse(failure, 400, "C001", null);
        }
    }

    @ParameterizedTest
    @CsvSource({"23502, null, 400, C001", "23514, -1, 400, C001", "23505, 1, 409, C008"})
    void existingConstraintContractsArePreserved(String state, String input, int status, String code)
            throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("CREATE TEMP TABLE response_constraint_probe (value integer NOT NULL UNIQUE CHECK (value > 0))");
            jdbc.update("INSERT INTO response_constraint_probe(value) VALUES (1)");
            DataAccessException failure = queryFailure(jdbc,
                    "INSERT INTO response_constraint_probe(value) VALUES (CAST(? AS INTEGER))",
                    "null".equals(input) ? null : input);
            assertSqlState(failure, state);
            assertHttpResponse(failure, status, code, null);
        }
    }

    @Test
    void realRowLockTimeoutIsAConflictAndReleasesItsTransaction() throws Exception {
        // 클래스별 격리 DB의 fixture다. 운영 timeout과 스키마에는 영향을 주지 않는다.
        try (Connection owner = openConnection(); Connection contender = openConnection()) {
            JdbcTemplate ownerJdbc = jdbc(owner);
            ownerJdbc.execute("CREATE TABLE response_lock_probe (id integer PRIMARY KEY)");
            ownerJdbc.update("INSERT INTO response_lock_probe(id) VALUES (1)");
            owner.setAutoCommit(false);
            contender.setAutoCommit(false);
            try {
                ownerJdbc.queryForObject("SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE", Integer.class);
                JdbcTemplate contenderJdbc = jdbc(contender);
                contenderJdbc.execute("SET LOCAL lock_timeout = '100ms'");
                DataAccessException failure = queryFailure(contenderJdbc,
                        "SELECT id FROM response_lock_probe WHERE id=CAST(? AS INTEGER) FOR UPDATE", "1");
                assertSqlState(failure, "55P03");
                assertHttpResponse(failure, 409, "C013", null);
            } finally {
                contender.rollback();
                owner.rollback();
            }
            // 첫 잠금이 풀린 뒤 같은 요청은 실제로 진행할 수 있다.
            assertEquals(1, jdbc(contender).queryForObject(
                    "SELECT id FROM response_lock_probe WHERE id=1 FOR UPDATE NOWAIT", Integer.class));
            contender.rollback();
        }
    }

    @Test
    void realStatementTimeoutIsUnavailableAndConnectionCanRecover() throws Exception {
        try (Connection connection = openConnection()) {
            JdbcTemplate jdbc = jdbc(connection);
            jdbc.execute("SET statement_timeout = '100ms'");
            DataAccessException failure = queryFailure(jdbc, "SELECT pg_sleep(CAST(? AS DOUBLE PRECISION))", "5");
            assertSqlState(failure, "57014");
            assertHttpResponse(failure, 503, "S002", "5");
            assertEquals(1, jdbc.queryForObject("SELECT 1", Integer.class));
        }
    }

    private JdbcTemplate jdbc(Connection connection) {
        return new JdbcTemplate(new SingleConnectionDataSource(connection, true));
    }

    private DataAccessException queryFailure(JdbcTemplate jdbc, String sql, String input) {
        return assertThrows(DataAccessException.class, () -> jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement(sql)) {
                statement.setString(1, input);
                statement.execute();
            }
            return null;
        }));
    }

    private void assertSqlState(Throwable failure, String state) {
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                assertEquals(state, sql.getSQLState());
                return;
            }
        }
        fail("PostgreSQL SQLState was not preserved by the exception translator");
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
