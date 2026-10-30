package nuri.api.schema;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Flyway 자동 적용 경로 밖의 로그 소요시간 Expand/Sync 제안을 클래스 전용 PostgreSQL에서 리허설한다.
 *
 * <p>메타 충돌·잘못된 초기 상태는 savepoint로 DDL까지 되돌린다. 정상 이행과 두 연결의 쓰기 경합은 한 시험 안에서
 * 이어지므로 시험 순서에 의존하지 않는다. 커밋한 리허설 데이터도 공용 support의 클래스별 database 삭제로 정리된다.
 * 이 시험은 공유 DB 적용이나 신규 writer 활성화를 승인하지 않는다.
 */
@Tag("schema-validation")
@DisplayName("로그 밀리초 표준 전환 제안의 실제 PostgreSQL 이행·거부·경합")
class LogDurationTransitionProposalIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String PROPOSALS = "db/proposals/log-duration/";
    private static final String LEGACY = "prcs_tm";
    private static final String TARGET = "prcs_req_msec";
    private static final List<Ledger> LEDGERS = List.of(
            new Ledger("tb_sys_log", "sys_log_sn", "tr_sync_sys_log_prcs_req_msec"),
            new Ledger("tb_web_log", "web_log_sn", "tr_sync_web_log_prcs_req_msec"));
    private static final List<Long> MILLIS = Arrays.asList(
            0L, 1L, 999L, 1_000L, 60_000L, 86_400_000L, 2_147_483_648L,
            Long.MAX_VALUE, Long.MIN_VALUE, null);
    private final AtomicInteger requestIds = new AtomicInteger();

    @BeforeAll
    void migrateCurrentPhysicalModel() throws SQLException {
        migrateThroughAuthorizationCutover();
    }

    @Test
    @DisplayName("메타 충돌을 원복하고, 501행 경계·NULL·64비트 값·구신 writer 경합을 보존한다")
    void rehearsesTransitionWithoutChangingUnitsOrWeakeningExistingGuards() throws Exception {
        assertMetadataWriterLocksSerializeExpand();
        assertExpandRejectsRepeatableRead();
        try (Connection connection = openConnection()) {
            connection.setAutoCommit(false);
            try {
                List<String> auditGuards = auditGuardDefinitions(connection);
                assertThat(auditGuards).hasSize(3);
                assertWholeExpandRollsBackOnLaterFailure(connection);
                assertMetadataConflictsRollback(connection);
                assertExistingTargetColumnIsRejected(connection);
                assertExactMetadataCanBeReusedOnEmptyTables(connection);
                assertExpandRejectsReplicaSession(connection);
                assertNonNullDriftIsRejectedWithoutOverwritingIt(connection);

                Map<Ledger, Map<Long, Long>> originals = seedExistingDurations(connection);
                Map<Ledger, String> originalRows = ledgerSnapshots(connection);
                execute(connection, proposal("expand.sql"));
                assertExpandedSchemaAndMetadata(connection);
                assertThat(auditGuardDefinitions(connection)).isEqualTo(auditGuards);
                assertInitialNullClearDoesNotMeanAnExplicitClear(connection, originals);
                assertLaterTableFailureRollsBackBothBatches(connection, originalRows);
                assertBackfillRejectsChangedTriggerContract(connection);
                assertBackfillRejectsReplicaSession(connection);

                assertBatch(connection, 500);
                assertParity(connection, 1, 0);
                connection.commit();

                assertBackfillRejectsRepeatableRead();
                // SKIP LOCKED가 0행을 반환해도 잠긴 미이행 행이 남으면 완료가 아니다.
                assertLockedPendingRowsDoNotLookComplete(connection);
                assertBatch(connection, 1);
                assertBatch(connection, 0);
                assertParity(connection, 0, 0);
                assertThat(ledgerSnapshots(connection)).isEqualTo(originalRows);
                for (Ledger ledger : LEDGERS) {
                    assertThat(durations(connection, ledger, LEGACY)).isEqualTo(originals.get(ledger));
                    assertThat(durations(connection, ledger, TARGET)).isEqualTo(originals.get(ledger));
                    assertWriterValuesAndConflicts(connection, ledger);
                }
                connection.commit();

                for (Ledger ledger : LEDGERS) {
                    assertConcurrentWritersSerialize(connection, ledger, LEGACY, TARGET);
                    assertConcurrentWritersSerialize(connection, ledger, TARGET, LEGACY);
                }
                assertParity(connection, 0, 0);
                assertThat(auditGuardDefinitions(connection)).isEqualTo(auditGuards);
                assertRollbackPreservesMetadataAndLegacyWrites(connection);
                connection.commit();
            } finally {
                connection.rollback();
            }
        }
    }

    private void assertWholeExpandRollsBackOnLaterFailure(Connection connection) throws Exception {
        List<Long> before = metadataCounts(connection);
        String failAfterExpand = """
                DO $test_failure$ BEGIN
                    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='isolated rollback probe';
                END; $test_failure$;
                """;
        assertRejected(connection, proposal("expand.sql") + "\n" + failAfterExpand, "23514");
        assertThat(metadataCounts(connection)).isEqualTo(before);
        assertThat(targetColumnCount(connection)).isZero();
        assertThat(scalar(connection, "SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace"
                + " AND proname IN ('fn_sync_sys_log_prcs_req_msec','fn_sync_web_log_prcs_req_msec')")).isZero();
    }

    private void assertMetadataConflictsRollback(Connection connection) throws Exception {
        List<String> collisions = List.of(
                "INSERT INTO meta_standard_words(word_name,eng_abbr) VALUES ('밀리초','D02_ALT_MSEC')",
                "INSERT INTO meta_standard_words(word_name,eng_abbr) VALUES ('다른시간단위','MSEC')",
                "INSERT INTO meta_standard_words(word_name,eng_abbr) VALUES ('밀리초','msec')",
                "INSERT INTO meta_standard_terms(term_name,eng_abbr,domain_name)"
                        + " VALUES ('처리소요밀리초','D02_ALT_DURATION','수N10')",
                "INSERT INTO meta_standard_terms(term_name,eng_abbr,domain_name)"
                        + " VALUES ('다른처리시간','PRCS_REQ_MSEC','수N10')",
                "INSERT INTO meta_standard_terms(term_name,eng_abbr,domain_name)"
                        + " VALUES ('처리소요밀리초','prcs_req_msec','수N10')",
                "INSERT INTO meta_standard_domains(domain_group,domain_name,data_type,data_length)"
                        + " VALUES ('수량','밀리초N19','INTEGER',19)");
        for (String collision : collisions) {
            Savepoint fixture = connection.setSavepoint();
            try {
                execute(connection, collision);
                List<Long> before = metadataCounts(connection);
                assertRejected(connection, proposal("expand.sql"), "23514");
                assertThat(metadataCounts(connection)).as("충돌 사전과 기존 사전을 덮어쓰면 안 된다").isEqualTo(before);
                assertThat(targetColumnCount(connection)).as("실패한 Expand의 DDL이 남으면 안 된다").isZero();
            } finally {
                connection.rollback(fixture);
                connection.releaseSavepoint(fixture);
            }
        }
    }

    private void assertExistingTargetColumnIsRejected(Connection connection) throws Exception {
        for (Ledger ledger : LEDGERS) {
            Savepoint fixture = connection.setSavepoint();
            try {
                execute(connection, "ALTER TABLE " + ledger.table() + " ADD COLUMN prcs_req_msec BIGINT");
                List<Long> before = metadataCounts(connection);
                assertRejected(connection, proposal("expand.sql"), "55000");
                assertThat(targetColumnCount(connection)).isEqualTo(1);
                assertThat(metadataCounts(connection)).isEqualTo(before);
            } finally {
                connection.rollback(fixture);
                connection.releaseSavepoint(fixture);
            }
        }
    }

    private void assertMetadataWriterLocksSerializeExpand() throws Exception {
        List<MetadataCollision> collisions = List.of(
                new MetadataCollision("meta_standard_words",
                        "INSERT INTO meta_standard_words(word_name,eng_abbr) VALUES ('밀리초','D02_PENDING_MSEC')",
                        "word_name='밀리초' AND eng_abbr='D02_PENDING_MSEC'"),
                new MetadataCollision("meta_standard_domains",
                        "INSERT INTO meta_standard_domains(domain_group,domain_name,data_type,data_length)"
                                + " VALUES ('수량','밀리초N19','INTEGER',19)", "domain_name='밀리초N19'"),
                new MetadataCollision("meta_standard_terms",
                        "INSERT INTO meta_standard_terms(term_name,eng_abbr,domain_name)"
                                + " VALUES ('처리소요밀리초','D02_PENDING_DURATION','수N10')",
                        "eng_abbr='D02_PENDING_DURATION'"));
        for (MetadataCollision collision : collisions) {
            try (Connection writer = openConnection(); Connection contender = openConnection()) {
                writer.setAutoCommit(false);
                contender.setAutoCommit(false);
                try {
                    execute(writer, collision.insert());
                    assertRejected(contender, proposal("expand.sql"), "55P03");
                    assertThat(targetColumnCount(contender)).isZero();
                    writer.commit();
                    Map<String, String> committedMetadata = metadataSnapshots(contender);
                    assertRejected(contender, proposal("expand.sql"), "23514");
                    assertThat(metadataSnapshots(contender)).isEqualTo(committedMetadata);
                    assertThat(targetColumnCount(contender)).isZero();
                } finally {
                    contender.rollback();
                    writer.rollback();
                    // 이 클래스만 쓰는 격리 DB에 커밋한 충돌 fixture를 정확한 키로 회수한다.
                    execute(writer, "DELETE FROM " + collision.table() + " WHERE " + collision.keyPredicate());
                    writer.commit();
                }
            }
        }
    }

    private void assertExactMetadataCanBeReusedOnEmptyTables(Connection connection) throws Exception {
        Savepoint fixture = connection.setSavepoint();
        try {
            String expand = proposal("expand.sql");
            int ddlStart = expand.indexOf("ALTER TABLE public.tb_sys_log ADD COLUMN prcs_req_msec");
            assertThat(ddlStart).isGreaterThan(0);
            execute(connection, expand.substring(0, ddlStart));
            Map<String, String> exactMetadata = metadataSnapshots(connection);
            execute(connection, expand);
            assertExpandedSchemaAndMetadata(connection);
            assertThat(metadataSnapshots(connection)).isEqualTo(exactMetadata);
            assertBatch(connection, 0);
            assertParity(connection, 0, 0);
        } finally {
            connection.rollback(fixture);
            connection.releaseSavepoint(fixture);
        }
    }

    private void assertExpandRejectsRepeatableRead() throws Exception {
        assertRejectsRepeatableRead("expand.sql");
    }

    private void assertBackfillRejectsRepeatableRead() throws Exception {
        assertRejectsRepeatableRead("backfill.sql");
    }

    private void assertRejectsRepeatableRead(String filename) throws Exception {
        try (Connection connection = openConnection()) {
            connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            connection.setAutoCommit(false);
            try {
                assertRejected(connection, proposal(filename), "55000");
            } finally {
                connection.rollback();
            }
        }
    }

    private void assertExpandRejectsReplicaSession(Connection connection) throws Exception {
        assertRejectsReplicaSession(connection, "expand.sql");
    }

    private void assertBackfillRejectsReplicaSession(Connection connection) throws Exception {
        assertRejectsReplicaSession(connection, "backfill.sql");
    }

    private void assertRejectsReplicaSession(Connection connection, String filename) throws Exception {
        Savepoint fixture = connection.setSavepoint();
        try {
            // 공유/운영 보호를 끄지 않는다. 전용 격리 DB의 미지원 연결 상태를 잠깐 만든다.
            execute(connection, "SET LOCAL session_replication_role=replica");
            assertRejected(connection, proposal(filename), "55000");
        } finally {
            connection.rollback(fixture);
            connection.releaseSavepoint(fixture);
        }
    }

    private void assertBackfillRejectsChangedTriggerContract(Connection connection) throws Exception {
        for (Ledger ledger : LEDGERS) {
            List<String> mutations = List.of(
                    "ALTER TABLE " + ledger.table() + " DISABLE TRIGGER " + ledger.trigger(),
                    "DROP TRIGGER " + ledger.trigger() + " ON " + ledger.table() + "; CREATE TRIGGER "
                            + ledger.trigger() + " AFTER INSERT OR UPDATE OF prcs_tm,prcs_req_msec ON "
                            + ledger.table() + " FOR EACH ROW EXECUTE FUNCTION " + ledger.function() + "()",
                    "DROP TRIGGER " + ledger.trigger() + " ON " + ledger.table() + "; CREATE TRIGGER "
                            + ledger.trigger() + " BEFORE INSERT ON " + ledger.table()
                            + " FOR EACH ROW EXECUTE FUNCTION " + ledger.function() + "()",
                    "DROP TRIGGER " + ledger.trigger() + " ON " + ledger.table() + "; CREATE TRIGGER "
                            + ledger.trigger() + " BEFORE INSERT OR UPDATE OF prcs_tm ON " + ledger.table()
                            + " FOR EACH ROW EXECUTE FUNCTION " + ledger.function() + "()");
            for (String mutation : mutations) {
                Savepoint fixture = connection.setSavepoint();
                try {
                    execute(connection, mutation);
                    Map<Ledger, String> before = ledgerSnapshots(connection);
                    assertRejected(connection, proposal("backfill.sql"), "55000");
                    assertThat(ledgerSnapshots(connection)).isEqualTo(before);
                    assertParity(connection, 501, 0);
                } finally {
                    connection.rollback(fixture);
                    connection.releaseSavepoint(fixture);
                }
            }
        }
    }

    private void assertNonNullDriftIsRejectedWithoutOverwritingIt(Connection connection) throws Exception {
        String expand = proposal("expand.sql");
        for (Ledger ledger : LEDGERS) {
            Savepoint fixture = connection.setSavepoint();
            try {
                // 격리 DB의 최초 설치 중, 보호가 아직 없는 지점에만 잘못된 초기 상태를 만든다.
                // 이어지는 두 조각은 실제 Expand 원문 전체다. 이미 있는 trigger를 끄거나 바꾸지 않는다.
                String anchor = "CREATE TRIGGER " + ledger.trigger();
                int split = expand.indexOf(anchor);
                assertThat(split).as("정확한 실제 CREATE TRIGGER 분할점").isGreaterThan(0);
                assertThat(expand.lastIndexOf(anchor)).isEqualTo(split);
                execute(connection, expand.substring(0, split));
                long id = insertPair(connection, ledger, 17L, 19L);
                execute(connection, expand.substring(split));
                assertRejected(connection, proposal("backfill.sql"), "23514");
                assertRejected(connection, proposal("rollback.sql"), "23514");
                assertRejected(connection, "UPDATE " + ledger.table() + " SET prcs_tm=23 WHERE "
                        + ledger.id() + "=" + id, "23514");
                assertPair(connection, ledger, id, 17L, 19L);
                assertParity(connection, 0, 1);
            } finally {
                connection.rollback(fixture);
                connection.releaseSavepoint(fixture);
            }
        }
    }

    private Map<Ledger, Map<Long, Long>> seedExistingDurations(Connection connection) throws SQLException {
        Map<Ledger, Map<Long, Long>> result = new LinkedHashMap<>();
        for (Ledger ledger : LEDGERS) {
            assertThat(scalar(connection, "SELECT count(*) FROM " + ledger.table())).isZero();
            execute(connection, """
                    INSERT INTO %s (%sprcs_tm)
                    SELECT %sCASE n
                        WHEN 1 THEN 0::bigint WHEN 2 THEN 1::bigint WHEN 3 THEN 999::bigint
                        WHEN 4 THEN 1000::bigint WHEN 5 THEN 60000::bigint WHEN 6 THEN 86400000::bigint
                        WHEN 7 THEN 2147483648::bigint WHEN 8 THEN 9223372036854775807::bigint
                        WHEN 9 THEN (-9223372036854775807::bigint - 1) ELSE n::bigint END
                    FROM generate_series(1,501) AS n
                    """.formatted(ledger.table(), ledger.requiresRequestId() ? "dmnd_id," : "",
                            ledger.requiresRequestId() ? "'D02_B_' || n, " : ""));
            insertValue(connection, ledger, LEGACY, null);
            execute(connection, "UPDATE " + ledger.table() + " SET crt_dt=TIMESTAMP '2024-01-02 03:04:05.123456',"
                    + " mdfcn_dt=TIMESTAMP '2024-02-03 04:05:06.654321',"
                    + " frst_rgtr_id='D02_SEED_CREATOR',last_mdfr_id='D02_SEED_MODIFIER'");
            result.put(ledger, durations(connection, ledger, LEGACY));
            assertThat(result.get(ledger)).hasSize(502);
        }
        return result;
    }

    private void assertExpandedSchemaAndMetadata(Connection connection) throws SQLException {
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT table_name,column_name,data_type,is_nullable,column_default
                FROM information_schema.columns WHERE table_schema='public'
                  AND table_name IN ('tb_sys_log','tb_web_log') AND column_name IN ('prcs_tm','prcs_req_msec')
                """)) {
            int count = 0;
            while (rows.next()) {
                assertThat(rows.getString("data_type")).isEqualTo("bigint");
                assertThat(rows.getString("is_nullable")).isEqualTo("YES");
                assertThat(rows.getString("column_default")).isNull();
                count++;
            }
            assertThat(count).isEqualTo(4);
        }
        assertThat(scalar(connection, "SELECT count(*) FROM meta_standard_words WHERE word_name='밀리초'"
                + " AND eng_abbr='MSEC' AND rprs_yn='Y'")).isEqualTo(1);
        assertThat(scalar(connection, "SELECT count(*) FROM meta_standard_domains WHERE domain_group='수량'"
                + " AND domain_name='밀리초N19' AND data_type='BIGINT' AND data_length=19")).isEqualTo(1);
        assertThat(scalar(connection, "SELECT count(*) FROM meta_standard_terms WHERE term_name='처리소요밀리초'"
                + " AND eng_abbr='PRCS_REQ_MSEC' AND domain_name='밀리초N19' AND deprecated_yn='N'"
                + " AND synonyms IS NULL AND allowed_values IS NULL")).isEqualTo(1);
    }

    private void assertInitialNullClearDoesNotMeanAnExplicitClear(
            Connection connection, Map<Ledger, Map<Long, Long>> originals) throws SQLException {
        Savepoint fixture = connection.setSavepoint();
        try {
            for (Ledger ledger : LEDGERS) {
                long id = originals.get(ledger).keySet().iterator().next();
                Long oldValue = originals.get(ledger).get(id);
                assertPair(connection, ledger, id, oldValue, null);
                updateValue(connection, ledger, id, TARGET, null);
                // 초기 미이행 NULL에는 명시적 삭제와 값 미제공을 구별할 정보가 없다.
                // 신규 writer는 parity=0 전에 활성화하지 않는다는 제안의 한계를 고정한다.
                assertPair(connection, ledger, id, oldValue, oldValue);
            }
        } finally {
            connection.rollback(fixture);
            connection.releaseSavepoint(fixture);
        }
    }

    private void assertLaterTableFailureRollsBackBothBatches(
            Connection connection, Map<Ledger, String> originalRows) throws Exception {
        Savepoint fixture = connection.setSavepoint();
        try {
            assertParity(connection, 501, 0);
            for (Ledger ledger : LEDGERS) {
                assertThat(scalar(connection, "SELECT count(*) FROM " + ledger.table()
                        + " WHERE prcs_req_msec IS NOT NULL")).isZero();
            }
            execute(connection, "ALTER TABLE tb_web_log ADD CONSTRAINT d02_test_target_stays_null"
                    + " CHECK (prcs_req_msec IS NULL)");
            // 실제 파일의 sys 500행 변경 후 web CHECK가 실패해도 같은 배치 트랜잭션 전체를 원복한다.
            assertRejected(connection, proposal("backfill.sql"), "23514");
            assertParity(connection, 501, 0);
            assertThat(ledgerSnapshots(connection)).isEqualTo(originalRows);
            for (Ledger ledger : LEDGERS) {
                assertThat(scalar(connection, "SELECT count(*) FROM " + ledger.table()
                        + " WHERE prcs_req_msec IS NOT NULL")).isZero();
            }
        } finally {
            connection.rollback(fixture);
            connection.releaseSavepoint(fixture);
        }
    }

    private void assertLockedPendingRowsDoNotLookComplete(Connection observer) throws Exception {
        try (Connection blocker = openConnection()) {
            blocker.setAutoCommit(false);
            try {
                for (Ledger ledger : LEDGERS) {
                    try (var statement = blocker.createStatement(); ResultSet rows = statement.executeQuery(
                            "SELECT " + ledger.id() + " FROM " + ledger.table()
                                    + " WHERE prcs_req_msec IS NULL AND prcs_tm IS NOT NULL FOR UPDATE")) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.next()).as("첫 배치 뒤 정확히 1행만 남는다").isFalse();
                    }
                }
                try (var executor = Executors.newSingleThreadExecutor()) {
                    var batch = executor.submit(() -> {
                        try (Connection writer = openConnection()) {
                            writer.setAutoCommit(false);
                            try {
                                execute(writer, "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='8s'");
                                List<BatchCount> counts = backfill(writer);
                                writer.commit();
                                return counts;
                            } finally {
                                writer.rollback();
                            }
                        }
                    });
                    assertCounts(batch.get(10, TimeUnit.SECONDS), 0);
                    assertParity(observer, 1, 0);
                }
            } finally {
                blocker.rollback();
            }
        }
    }

    private void assertWriterValuesAndConflicts(Connection connection, Ledger ledger) throws SQLException {
        for (Long value : MILLIS) {
            for (String column : List.of(LEGACY, TARGET)) {
                long id = insertValue(connection, ledger, column, value);
                assertPair(connection, ledger, id, value, value);
                updateValue(connection, ledger, id, column, value);
                assertPair(connection, ledger, id, value, value);
                updateValue(connection, ledger, id, column, null);
                assertPair(connection, ledger, id, null, null);
            }
        }
        long id = insertValue(connection, ledger, LEGACY, 5L);
        assertRejected(connection, "UPDATE " + ledger.table()
                + " SET prcs_tm=6,prcs_req_msec=7 WHERE " + ledger.id() + "=" + id, "23514");
        assertPair(connection, ledger, id, 5L, 5L);
        execute(connection, "UPDATE " + ledger.table()
                + " SET prcs_tm=9,prcs_req_msec=9 WHERE " + ledger.id() + "=" + id);
        assertPair(connection, ledger, id, 9L, 9L);
        long before = scalar(connection, "SELECT count(*) FROM " + ledger.table());
        String requestColumn = ledger.requiresRequestId() ? "dmnd_id," : "";
        String requestValue = ledger.requiresRequestId() ? "'" + nextRequestId() + "'," : "";
        assertRejected(connection, "INSERT INTO " + ledger.table()
                + "(" + requestColumn + "prcs_tm,prcs_req_msec) VALUES (" + requestValue + "10,11)", "23514");
        assertThat(scalar(connection, "SELECT count(*) FROM " + ledger.table())).isEqualTo(before);
    }

    private void assertConcurrentWritersSerialize(
            Connection observer, Ledger ledger, String firstColumn, String secondColumn) throws Exception {
        long id = insertValue(observer, ledger, LEGACY, 1L);
        observer.commit();
        try (Connection first = openConnection(); Connection second = openConnection()) {
            first.setAutoCommit(false);
            second.setAutoCommit(false);
            execute(second, "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='8s'");
            int firstPid = (int) scalar(first, "SELECT pg_backend_pid()");
            int secondPid = (int) scalar(second, "SELECT pg_backend_pid()");
            updateValue(first, ledger, id, firstColumn, 11L);
            try (var executor = Executors.newSingleThreadExecutor()) {
                var follower = executor.submit(() -> {
                    try {
                        updateValue(second, ledger, id, secondColumn, 22L);
                        second.commit();
                    } finally {
                        second.rollback();
                    }
                    return true;
                });
                try {
                    awaitRowLock(observer, firstPid, secondPid);
                    first.commit();
                    assertThat(follower.get(10, TimeUnit.SECONDS)).isTrue();
                    assertPair(observer, ledger, id, 22L, 22L);
                } finally {
                    first.rollback();
                }
            }
        }
    }

    private void awaitRowLock(Connection observer, int blocker, int waiter) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(4);
        try (var query = observer.prepareStatement("SELECT ? = ANY(pg_blocking_pids(?))")) {
            query.setInt(1, blocker);
            query.setInt(2, waiter);
            do {
                try (ResultSet row = query.executeQuery()) {
                    assertThat(row.next()).isTrue();
                    if (row.getBoolean(1)) return;
                }
                TimeUnit.MILLISECONDS.sleep(20);
            } while (System.nanoTime() < deadline);
        }
        throw new AssertionError("후행 writer가 선행 writer의 실제 행 잠금을 기다리지 않았다");
    }

    private void assertParity(Connection connection, long pendingPerTable, long totalDrift) throws Exception {
        long drift = 0;
        List<String> targets = new ArrayList<>();
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery(proposal("verify-parity.sql"))) {
            while (rows.next()) {
                targets.add(rows.getString("target"));
                assertThat(rows.getLong("pending_rows")).isEqualTo(pendingPerTable);
                assertThat(rows.getLong("mismatches"))
                        .isEqualTo(rows.getLong("pending_rows") + rows.getLong("nonnull_drift_rows"));
                if (pendingPerTable == 0 && totalDrift == 0) {
                    assertThat(rows.getLong("legacy_null_rows")).isEqualTo(rows.getLong("target_null_rows"));
                }
                drift += rows.getLong("nonnull_drift_rows");
            }
        }
        assertThat(targets).containsExactlyInAnyOrderElementsOf(LEDGERS.stream().map(Ledger::target).toList());
        assertThat(drift).isEqualTo(totalDrift);
    }

    private void assertRollbackPreservesMetadataAndLegacyWrites(Connection connection) throws Exception {
        Map<Ledger, String> beforeRows = ledgerSnapshots(connection);
        Map<String, String> beforeMetadata = metadataSnapshots(connection);
        Savepoint fixture = connection.setSavepoint();
        try {
            execute(connection, proposal("rollback.sql"));
            assertThat(targetColumnCount(connection)).isZero();
            assertThat(scalar(connection, "SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace"
                    + " AND proname IN ('fn_sync_sys_log_prcs_req_msec','fn_sync_web_log_prcs_req_msec')")).isZero();
            assertThat(ledgerSnapshots(connection)).isEqualTo(beforeRows);
            assertThat(metadataSnapshots(connection)).isEqualTo(beforeMetadata);
            for (Ledger ledger : LEDGERS) {
                long id = insertValue(connection, ledger, LEGACY, 23L);
                assertThat(durations(connection, ledger, LEGACY)).containsEntry(id, 23L);
                updateValue(connection, ledger, id, LEGACY, null);
                assertThat(durations(connection, ledger, LEGACY)).containsEntry(id, null);
            }
        } finally {
            connection.rollback(fixture);
            connection.releaseSavepoint(fixture);
        }
        assertThat(targetColumnCount(connection)).isEqualTo(2);
        assertParity(connection, 0, 0);
    }

    private void assertBatch(Connection connection, long expectedPerTable) throws Exception {
        assertCounts(backfill(connection), expectedPerTable);
    }

    private void assertCounts(List<BatchCount> counts, long expectedPerTable) {
        assertThat(counts).containsExactly(
                new BatchCount(LEDGERS.get(0).target(), expectedPerTable),
                new BatchCount(LEDGERS.get(1).target(), expectedPerTable));
        assertThat(counts).allSatisfy(count -> assertThat(count.changedRows()).isBetween(0L, 500L));
    }

    private List<BatchCount> backfill(Connection connection) throws SQLException, IOException {
        List<BatchCount> result = new ArrayList<>();
        try (var statement = connection.createStatement()) {
            boolean hasRows = statement.execute(proposal("backfill.sql"));
            while (hasRows || statement.getUpdateCount() != -1) {
                if (hasRows) {
                    try (ResultSet rows = statement.getResultSet()) {
                        while (rows.next()) result.add(new BatchCount(rows.getString("target"), rows.getLong("changed_rows")));
                    }
                }
                hasRows = statement.getMoreResults();
            }
        }
        return result;
    }

    private void assertRejected(Connection connection, String sql, String state) throws SQLException {
        Savepoint attempt = connection.setSavepoint();
        try {
            assertThatThrownBy(() -> execute(connection, sql)).isInstanceOf(SQLException.class)
                    .satisfies(failure -> assertThat(((SQLException) failure).getSQLState()).isEqualTo(state));
        } finally {
            connection.rollback(attempt);
            connection.releaseSavepoint(attempt);
        }
    }

    private long insertValue(Connection connection, Ledger ledger, String column, Long value) throws SQLException {
        String requestColumn = ledger.requiresRequestId() ? "dmnd_id," : "";
        String requestParameter = ledger.requiresRequestId() ? "?," : "";
        try (var statement = connection.prepareStatement("INSERT INTO " + ledger.table()
                + " (" + requestColumn + column + ") VALUES (" + requestParameter + "?) RETURNING " + ledger.id())) {
            int parameter = 1;
            if (ledger.requiresRequestId()) statement.setString(parameter++, nextRequestId());
            setNullableLong(statement, parameter, value);
            try (ResultSet row = statement.executeQuery()) {
                assertThat(row.next()).isTrue();
                return row.getLong(1);
            }
        }
    }

    private long insertPair(Connection connection, Ledger ledger, Long oldValue, Long newValue) throws SQLException {
        String requestColumn = ledger.requiresRequestId() ? "dmnd_id," : "";
        String requestParameter = ledger.requiresRequestId() ? "?," : "";
        try (var statement = connection.prepareStatement("INSERT INTO " + ledger.table()
                + " (" + requestColumn + "prcs_tm,prcs_req_msec) VALUES (" + requestParameter + "?,?) RETURNING " + ledger.id())) {
            int parameter = 1;
            if (ledger.requiresRequestId()) statement.setString(parameter++, nextRequestId());
            setNullableLong(statement, parameter++, oldValue);
            setNullableLong(statement, parameter, newValue);
            try (ResultSet row = statement.executeQuery()) {
                assertThat(row.next()).isTrue();
                return row.getLong(1);
            }
        }
    }

    private String nextRequestId() {
        return "D02_T_" + requestIds.incrementAndGet();
    }

    private void updateValue(Connection connection, Ledger ledger, long id, String column, Long value) throws SQLException {
        try (var statement = connection.prepareStatement("UPDATE " + ledger.table()
                + " SET " + column + "=? WHERE " + ledger.id() + "=?")) {
            setNullableLong(statement, 1, value);
            statement.setLong(2, id);
            assertThat(statement.executeUpdate()).isEqualTo(1);
        }
    }

    private static void setNullableLong(java.sql.PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) statement.setNull(index, Types.BIGINT);
        else statement.setLong(index, value);
    }

    private void assertPair(Connection connection, Ledger ledger, long id, Long oldValue, Long newValue) throws SQLException {
        try (var statement = connection.prepareStatement("SELECT prcs_tm,prcs_req_msec FROM "
                + ledger.table() + " WHERE " + ledger.id() + "=?")) {
            statement.setLong(1, id);
            try (ResultSet row = statement.executeQuery()) {
                assertThat(row.next()).isTrue();
                assertThat(row.getObject(1, Long.class)).as("%s legacy", ledger.table()).isEqualTo(oldValue);
                assertThat(row.getObject(2, Long.class)).as("%s target", ledger.table()).isEqualTo(newValue);
                assertThat(row.next()).isFalse();
            }
        }
    }

    private Map<Long, Long> durations(Connection connection, Ledger ledger, String column) throws SQLException {
        Map<Long, Long> values = new LinkedHashMap<>();
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT " + ledger.id() + "," + column + " FROM " + ledger.table() + " ORDER BY " + ledger.id())) {
            while (rows.next()) values.put(rows.getLong(1), rows.getObject(2, Long.class));
        }
        return values;
    }

    private Map<Ledger, String> ledgerSnapshots(Connection connection) throws SQLException {
        Map<Ledger, String> snapshots = new LinkedHashMap<>();
        for (Ledger ledger : LEDGERS) {
            try (var statement = connection.createStatement(); ResultSet row = statement.executeQuery(
                    "SELECT COALESCE(jsonb_agg(to_jsonb(log_row)-'prcs_req_msec' ORDER BY log_row."
                            + ledger.id() + "),'[]'::jsonb)::text FROM " + ledger.table() + " AS log_row")) {
                assertThat(row.next()).isTrue();
                snapshots.put(ledger, row.getString(1));
                assertThat(row.next()).isFalse();
            }
        }
        return snapshots;
    }

    private List<Long> metadataCounts(Connection connection) throws SQLException {
        List<Long> counts = new ArrayList<>();
        for (String table : List.of("meta_standard_words", "meta_standard_domains", "meta_standard_terms")) {
            counts.add(scalar(connection, "SELECT count(*) FROM " + table));
        }
        return counts;
    }

    private Map<String, String> metadataSnapshots(Connection connection) throws SQLException {
        Map<String, String> snapshots = new LinkedHashMap<>();
        for (String table : List.of("meta_standard_words", "meta_standard_domains", "meta_standard_terms")) {
            try (var statement = connection.createStatement(); ResultSet row = statement.executeQuery(
                    "SELECT md5(COALESCE(jsonb_agg(to_jsonb(meta_row) ORDER BY to_jsonb(meta_row)::text),"
                            + "'[]'::jsonb)::text) FROM " + table + " AS meta_row")) {
                assertThat(row.next()).isTrue();
                snapshots.put(table, row.getString(1));
                assertThat(row.next()).isFalse();
            }
        }
        return snapshots;
    }

    private long targetColumnCount(Connection connection) throws SQLException {
        return scalar(connection, "SELECT count(*) FROM information_schema.columns WHERE table_schema='public'"
                + " AND table_name IN ('tb_sys_log','tb_web_log') AND column_name='prcs_req_msec'");
    }

    private List<String> auditGuardDefinitions(Connection connection) throws SQLException {
        List<String> guards = new ArrayList<>();
        try (var statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT pg_get_triggerdef(oid) || E'\n' || pg_get_functiondef(tgfoid) AS definition
                FROM pg_trigger WHERE NOT tgisinternal
                  AND tgrelid IN ('tb_sys_adt_log'::regclass,'tb_authrt_chg_hstry'::regclass,'tb_privacy_log'::regclass)
                ORDER BY tgname
                """)) {
            while (rows.next()) guards.add(rows.getString(1));
        }
        return guards;
    }

    private static long scalar(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement(); ResultSet row = statement.executeQuery(sql)) {
            assertThat(row.next()).isTrue();
            return row.getLong(1);
        }
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            boolean hasRows = statement.execute(sql);
            while (hasRows || statement.getUpdateCount() != -1) {
                if (hasRows) statement.getResultSet().close();
                hasRows = statement.getMoreResults();
            }
        }
    }

    private static String proposal(String filename) throws IOException {
        try (var stream = new ClassPathResource(PROPOSALS + filename).getInputStream()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private record Ledger(String table, String id, String trigger) {
        String target() { return table + "." + TARGET; }
        String function() { return trigger.replaceFirst("^tr_", "fn_"); }
        boolean requiresRequestId() { return table.equals("tb_sys_log"); }
    }

    private record MetadataCollision(String table, String insert, String keyPredicate) { }

    private record BatchCount(String target, long changedRows) { }
}
