package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("빈 표 정비창에 한정된 숫자 세 컬럼의 실제 Flyway 전환")
class EmptyNumericColumnsMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    private static final MigrationVersion PREVIOUS = MigrationVersion.fromVersion("2.143");
    private static final MigrationVersion TARGET = MigrationVersion.fromVersion("2.144");
    private static final String TABLES = "'public.tb_dept_task_info'::regclass,'public.tb_popup_info'::regclass";

    @Test
    @DisplayName("비어 있지 않음·잠금·메타·의존성과 후속 DDL 실패는 전체 거부하고 빈 표만 원자 전환한다")
    void appliesOnlyToTwoEmptyTablesAndPreservesSchemaAndHistory() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(PREVIOUS));
        List<String> original = protectedSchema();
        List<String> metadata = metadata();
        assertColumnTypes(false);

        assertFixtureRejected("INSERT INTO tb_dept_task_info DEFAULT VALUES",
                "DELETE FROM tb_dept_task_info", "55000");
        assertFixtureRejected("INSERT INTO tb_popup_info(popup_ttl_nm) VALUES ('empty-guard-fixture')",
                "DELETE FROM tb_popup_info", "55000");
        assertFixtureRejected("UPDATE meta_standard_domains SET data_length=11 WHERE domain_name='수N10'",
                "UPDATE meta_standard_domains SET data_length=10 WHERE domain_name='수N10'", "23514");
        assertFixtureRejected("UPDATE meta_standard_words SET rprs_yn='N' WHERE word_name='우선' AND eng_abbr='PRRTY'",
                "UPDATE meta_standard_words SET rprs_yn='Y' WHERE word_name='우선' AND eng_abbr='PRRTY'", "23514");
        assertFixtureRejected("INSERT INTO meta_standard_terms(term_name,eng_abbr,domain_name)"
                        + " VALUES ('숫자검사시험용어','prrty_rnk','수N10')",
                "DELETE FROM meta_standard_terms WHERE term_name='숫자검사시험용어' AND eng_abbr='prrty_rnk'", "23514");
        assertFixtureRejected("ALTER TABLE tb_popup_info ALTER COLUMN popup_wdth_sz SET DEFAULT '400'",
                "ALTER TABLE tb_popup_info ALTER COLUMN popup_wdth_sz DROP DEFAULT", "55000");
        assertFixtureRejected("CREATE VIEW vw_numeric_guard_fixture AS SELECT popup_wdth_sz FROM tb_popup_info",
                "DROP VIEW vw_numeric_guard_fixture", "55000");
        assertFixtureRejected("ALTER TABLE tb_dept_task_info ENABLE ROW LEVEL SECURITY",
                "ALTER TABLE tb_dept_task_info DISABLE ROW LEVEL SECURITY", "55000");
        assertFixtureRejected("CREATE TABLE numeric_inherited_fixture () INHERITS (tb_popup_info)",
                "DROP TABLE numeric_inherited_fixture", "55000");
        assertFixtureRejected("CREATE RULE numeric_rule_fixture AS ON DELETE TO tb_popup_info DO INSTEAD NOTHING",
                "DROP RULE numeric_rule_fixture ON tb_popup_info", "55000");
        assertRepeatableReadRejected();
        assertFixtureRejected("CREATE FUNCTION fn_numeric_guard_fixture() RETURNS trigger LANGUAGE plpgsql AS $$"
                        + " BEGIN RETURN NEW; END $$; CREATE TRIGGER tr_numeric_guard_fixture BEFORE INSERT ON tb_popup_info"
                        + " FOR EACH ROW EXECUTE FUNCTION fn_numeric_guard_fixture()",
                "DROP TRIGGER tr_numeric_guard_fixture ON tb_popup_info; DROP FUNCTION fn_numeric_guard_fixture()", "55000");
        assertLockContention("LOCK TABLE tb_popup_info IN ACCESS SHARE MODE");
        assertLockContention("LOCK TABLE meta_standard_terms IN ROW EXCLUSIVE MODE");
        assertSecondDdlFailureRollsBackFirst();
        assertWholeTransactionBudgetRollsBackDdl();
        assertThat(protectedSchema()).isEqualTo(original);
        assertThat(metadata()).isEqualTo(metadata);

        flyway(TARGET).migrate();
        assertColumnTypes(true);
        assertThat(protectedSchema()).isEqualTo(original);
        assertThat(metadata()).isEqualTo(metadata);
        assertThat(scalar("SELECT count(*) FROM flyway_schema_history WHERE version='2.144' AND success")).isEqualTo(1);
        assertThat(scalar("SELECT count(*) FROM tb_dept_task_info") + scalar("SELECT count(*) FROM tb_popup_info")).isZero();
        assertRollbackCandidate();
        assertColumnTypes(true);
        assertThat(protectedSchema()).isEqualTo(original);
    }

    private void assertFixtureRejected(String fixture, String cleanup, String state) throws Exception {
        execute(fixture);
        try {
            List<String> rows = businessRows();
            assertFlywayRejected(state);
            assertThat(businessRows()).as("거부된 이행은 기존 업무 행을 바꾸지 않는다").isEqualTo(rows);
        } finally {
            execute(cleanup);
        }
        assertColumnTypes(false);
    }

    private void assertRepeatableReadRejected() throws Exception {
        try (Connection connection = openConnection()) {
            connection.setAutoCommit(false);
            connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            try {
                assertThatThrownBy(() -> execute(connection, resource("db/migration/V2_144__align_empty_numeric_columns.sql")))
                        .isInstanceOf(SQLException.class)
                        .satisfies(failure -> assertThat(((SQLException) failure).getSQLState()).isEqualTo("55000"));
            } finally {
                connection.rollback();
            }
        }
        assertColumnTypes(false);
    }

    private void assertLockContention(String lock) throws Exception {
        try (Connection blocker = openConnection()) {
            blocker.setAutoCommit(false);
            try {
                execute(blocker, lock);
                assertFlywayRejected("55P03");
            } finally {
                blocker.rollback();
            }
        }
        assertColumnTypes(false);
    }

    private void assertSecondDdlFailureRollsBackFirst() throws Exception {
        execute("""
                CREATE FUNCTION fn_numeric_test_fail_second_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_TAG='ALTER TABLE'
                       AND EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='tb_popup_info'
                             AND column_name='popup_wdth_sz' AND data_type='numeric') THEN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_schema='public' AND table_name='tb_dept_task_info'
                              AND column_name='prrty_rnk' AND data_type='numeric') THEN
                            RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='first DDL did not execute';
                        END IF;
                        RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='isolated second DDL failure';
                    END IF;
                END $$;
                CREATE EVENT TRIGGER numeric_test_second_ddl ON ddl_command_end
                    EXECUTE FUNCTION fn_numeric_test_fail_second_ddl();
                """);
        try {
            assertFlywayRejected("P0001");
        } finally {
            execute("DROP EVENT TRIGGER numeric_test_second_ddl; DROP FUNCTION fn_numeric_test_fail_second_ddl()");
        }
        assertColumnTypes(false);
    }

    private void assertFlywayRejected(String state) throws SQLException {
        assertThatThrownBy(() -> flyway(TARGET).migrate()).isInstanceOf(FlywayException.class)
                .satisfies(failure -> assertThat(sqlStates(failure)).contains(state));
        // Deliberately malformed default/metadata fixtures remain in place until caller cleanup.
        assertThat(scalar("SELECT count(*) FROM information_schema.columns WHERE table_schema='public'"
                + " AND data_type='character varying' AND character_maximum_length=12"
                + " AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk')"
                + " OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz')))"))
                .isEqualTo(3);
        assertThat(scalar("SELECT count(*) FROM flyway_schema_history WHERE version='2.144'")).isZero();
    }

    private void assertWholeTransactionBudgetRollsBackDdl() throws Exception {
        try (Connection connection = openConnection()) {
            connection.setAutoCommit(false);
            execute(connection, resource("db/migration/V2_144__align_empty_numeric_columns.sql"));
            assertColumnTypes(connection, true);
            // Each statement is below statement_timeout. Only the actual 15s transaction budget
            // can end this connection while successful short statements continue.
            assertThatThrownBy(() -> {
                for (int second = 0; second < 20; second++) execute(connection, "SELECT pg_sleep(1)");
            }).isInstanceOf(SQLException.class).hasMessageContaining("transaction timeout");
        }
        assertColumnTypes(false);
        assertThat(scalar("SELECT count(*) FROM flyway_schema_history WHERE version='2.144'")).isZero();
    }

    private List<String> sqlStates(Throwable failure) {
        List<String> states = new ArrayList<>();
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) states.add(sql.getSQLState());
        }
        return states;
    }

    private void assertRollbackCandidate() throws Exception {
        String rollback = resource("db/proposals/numeric-empty/rollback.sql");
        try (Connection connection = openConnection()) {
            connection.setAutoCommit(false);
            try {
                execute(connection, rollback);
                assertColumnTypes(connection, false);
                execute(connection, "INSERT INTO tb_dept_task_info(prrty_rnk) VALUES ('1')");
                execute(connection, "INSERT INTO tb_popup_info(popup_ttl_nm,popup_wdth_sz,popup_vrtc_sz)"
                        + " VALUES ('old-writer-fixture','400','300')");
            } finally {
                connection.rollback();
            }
        }
        for (String fixture : List.of("INSERT INTO tb_dept_task_info DEFAULT VALUES",
                "INSERT INTO tb_popup_info(popup_ttl_nm) VALUES ('rollback-row-fixture')")) {
            try (Connection connection = openConnection()) {
                connection.setAutoCommit(false);
                try {
                    execute(connection, fixture);
                    var before = connection.setSavepoint();
                    assertThatThrownBy(() -> execute(connection, rollback)).isInstanceOf(SQLException.class)
                            .satisfies(failure -> assertThat(((SQLException) failure).getSQLState()).isEqualTo("55000"));
                    connection.rollback(before);
                    assertColumnTypes(connection, true);
                } finally {
                    connection.rollback();
                }
            }
        }
        assertThat(scalar("SELECT count(*) FROM flyway_schema_history WHERE version='2.144' AND success")).isEqualTo(1);
    }

    private void assertColumnTypes(boolean numeric) throws SQLException {
        try (Connection connection = openConnection()) {
            assertColumnTypes(connection, numeric);
        }
    }

    private void assertColumnTypes(Connection connection, boolean numeric) throws SQLException {
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT table_name,column_name,data_type,character_maximum_length,numeric_precision,numeric_scale,
                       is_nullable,column_default FROM information_schema.columns WHERE table_schema='public'
                  AND ((table_name='tb_dept_task_info' AND column_name='prrty_rnk')
                    OR (table_name='tb_popup_info' AND column_name IN ('popup_wdth_sz','popup_vrtc_sz')))
                """)) {
            int count = 0;
            while (rows.next()) {
                assertThat(rows.getString("is_nullable")).isEqualTo("YES");
                assertThat(rows.getString("column_default")).isNull();
                assertThat(rows.getString("data_type")).isEqualTo(numeric ? "numeric" : "character varying");
                if (numeric) {
                    assertThat(rows.getInt("numeric_scale")).isZero();
                    assertThat(rows.getInt("numeric_precision"))
                            .isEqualTo(rows.getString("column_name").equals("prrty_rnk") ? 10 : 7);
                } else assertThat(rows.getInt("character_maximum_length")).isEqualTo(12);
                count++;
            }
            assertThat(count).isEqualTo(3);
        }
    }

    private List<String> protectedSchema() throws SQLException {
        List<String> snapshot = query("SELECT a.attrelid::regclass::text || ':' || a.attname || ':' || "
                + "CASE WHEN a.attname IN ('prrty_rnk','popup_wdth_sz','popup_vrtc_sz') THEN '<target>' "
                + "ELSE format_type(a.atttypid,a.atttypmod) END || ':' || a.attnotnull || ':' || "
                + "coalesce(pg_get_expr(d.adbin,d.adrelid),'') || ':' || coalesce(col_description(a.attrelid,a.attnum),'') "
                + "FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum "
                + "WHERE a.attrelid IN (" + TABLES + ") AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attrelid,a.attnum");
        snapshot.addAll(query("SELECT conrelid::regclass::text || ':' || conname || ':' || pg_get_constraintdef(oid) "
                + "FROM pg_constraint WHERE conrelid IN (" + TABLES + ") OR confrelid IN (" + TABLES + ") ORDER BY conname"));
        snapshot.addAll(query("SELECT pg_get_indexdef(indexrelid) FROM pg_index WHERE indrelid IN (" + TABLES + ") ORDER BY indexrelid"));
        return snapshot;
    }

    private List<String> metadata() throws SQLException {
        return query("SELECT 'term:' || to_jsonb(t)::text FROM meta_standard_terms t WHERE eng_abbr IN "
                + "('PRRTY_RNK','POPUP_WDTH_SZ','POPUP_VRTC_SZ') UNION ALL SELECT 'domain:' || to_jsonb(d)::text "
                + "FROM meta_standard_domains d WHERE domain_name IN ('수N10','수N7') ORDER BY 1");
    }

    private List<String> businessRows() throws SQLException {
        return query("SELECT 'dept:' || to_jsonb(t)::text FROM tb_dept_task_info t UNION ALL "
                + "SELECT 'popup:' || to_jsonb(p)::text FROM tb_popup_info p ORDER BY 1");
    }

    private List<String> query(String sql) throws SQLException {
        try (Connection connection = openConnection(); var statement = connection.createStatement();
             ResultSet rows = statement.executeQuery(sql)) {
            List<String> result = new ArrayList<>();
            while (rows.next()) result.add(rows.getString(1));
            return result;
        }
    }

    private long scalar(String sql) throws SQLException { return Long.parseLong(query(sql).getFirst()); }

    private void execute(String sql) throws SQLException {
        try (Connection connection = openConnection()) { execute(connection, sql); }
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement()) { statement.execute(sql); }
    }

    private static String resource(String name) throws IOException {
        try (var stream = new ClassPathResource(name).getInputStream()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
