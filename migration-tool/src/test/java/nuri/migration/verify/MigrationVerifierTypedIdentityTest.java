package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.state.MigrationStateStore;
import nuri.migration.state.MigrationStateStore.CheckpointEntry;
import nuri.migration.state.RowChecksum;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

class MigrationVerifierTypedIdentityTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void verifiesTypedCompositeKeysWithParameterizedTuplePredicatesAndChecksums() throws Exception {
        Fixture fixture = compositeFixture(true);
        fixture.jdbc().update("INSERT INTO tb_order VALUES ('A', 1, 'one')");
        fixture.jdbc().update("INSERT INTO tb_order VALUES ('B', 2, 'two')");
        addCheckpoint(fixture, "legacy-a", composite("A", 1), row("A", 1, "one"));
        addCheckpoint(fixture, "legacy-b", composite("B", 2), row("B", 2, "two"));

        MigrationReport report = verifier.verify(
                fixture.spec(),
                List.of(new EtlExecutor.TableResult("legacy_order", "tb_order", 2, 2, 2, List.of())),
                fixture.jdbc());

        assertThat(report.overall()).isEqualTo(MigrationReport.Status.PASS);
        assertThat(report.tables().getFirst().targetRows()).isEqualTo(2L);
    }

    @Test
    void verifiesTypedSingleKeyWithoutComparingTkEncodingToThePhysicalPk() throws Exception {
        Fixture fixture = singleFixture();
        fixture.jdbc().update("INSERT INTO tb_single VALUES (101, 'one')");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("payload", "one");
        row.put("id", 101L);
        addCheckpoint(fixture, "legacy-1",
                TypedKeyTuple.of(TypedValue.signedInteger(101)), row);

        MigrationReport report = verifier.verify(
                fixture.spec(),
                List.of(new EtlExecutor.TableResult("legacy_single", "tb_single", 1, 1, 1, List.of())),
                fixture.jdbc());

        assertThat(report.overall()).isEqualTo(MigrationReport.Status.PASS);
    }

    @Test
    void typedParityFailsForZeroRowsDuplicateRowsAndChecksumMismatch() throws Exception {
        Fixture missing = compositeFixture(true);
        addCheckpoint(missing, "legacy-missing", composite("A", 1), row("A", 1, "one"));
        assertThat(verifyOne(missing).tables().getFirst().note())
                .contains("행수=0")
                .doesNotContain("tk1:");

        Fixture duplicate = compositeFixture(false);
        duplicate.jdbc().update("INSERT INTO tb_order VALUES ('A', 1, 'one')");
        duplicate.jdbc().update("INSERT INTO tb_order VALUES ('A', 1, 'one')");
        addCheckpoint(duplicate, "legacy-duplicate", composite("A", 1), row("A", 1, "one"));
        assertThat(verifyOne(duplicate).tables().getFirst().note()).contains("행수=2");

        Fixture checksum = compositeFixture(true);
        checksum.jdbc().update("INSERT INTO tb_order VALUES ('A', 1, 'changed')");
        addCheckpoint(checksum, "legacy-checksum", composite("A", 1), row("A", 1, "original"));
        assertThat(verifyOne(checksum).tables().getFirst().note())
                .contains("checksum")
                .doesNotContain("tk1:");
    }

    @Test
    void tuplePredicateQuotesValidatedIdentifiersAndNeverInterpolatesValues() {
        List<IdentityComponentSpec> components = List.of(
                component("tenant_id", IdentityValueType.TEXT),
                component("order_id", IdentityValueType.SIGNED_INTEGER));

        assertThat(MigrationVerifier.typedTuplePredicate(components, 2))
                .isEqualTo("((tenant_id = ? AND order_id = ?) OR (tenant_id = ? AND order_id = ?))");
        assertThatThrownBy(() -> MigrationVerifier.typedTuplePredicate(
                List.of(component("id) OR 1=1 --", IdentityValueType.TEXT)), 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void typedVerificationReportDoesNotExposeRawTargetFailureMessages() throws Exception {
        Fixture fixture = singleFixture();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("payload", "one");
        row.put("id", 101L);
        addCheckpoint(fixture, "legacy-secret",
                TypedKeyTuple.of(TypedValue.signedInteger(101)), row);
        String secret = "password=credential-sentinel; target-key=value-sentinel";
        JdbcTemplate failingTarget = new JdbcTemplate(fixture.jdbc().getDataSource()) {
            @Override
            public <T> T execute(ConnectionCallback<T> action) {
                throw new DataAccessResourceFailureException(secret);
            }
        };

        MigrationReport report = verifier.verify(
                fixture.spec(),
                List.of(new EtlExecutor.TableResult(
                        "legacy_single", "tb_single", 1, 1, 1, List.of())),
                failingTarget);

        assertThat(report.tables().getFirst().note())
                .isEqualTo("run scoped typed target/checksum batch 대조 실패")
                .doesNotContain("credential-sentinel", "value-sentinel");
        assertThat(report.toSummary())
                .doesNotContain("credential-sentinel", "value-sentinel", "password=");
    }

    @Test
    void targetCursorUsesOneRowFetchAndRestoresItsOwnReadTransaction() throws Exception {
        Fixture fixture = singleFixture();
        fixture.jdbc().update("INSERT INTO tb_single VALUES (101, 'one')");
        addCheckpoint(fixture, "legacy-1", TypedKeyTuple.of(TypedValue.signedInteger(101)),
                Map.of("payload", "one", "id", 101L));
        try (Connection actual = fixture.jdbc().getDataSource().getConnection()) {
            // Observe verifier calls, not H2's internal setAutoCommit(true) -> commit() call.
            Connection connection = mock(Connection.class, delegatesTo(actual));
            List<PreparedStatement> cursors = new ArrayList<>();
            doAnswer(invocation -> {
                assertThat(connection.getAutoCommit()).isFalse();
                PreparedStatement statement = spy(actual.prepareStatement(invocation.getArgument(0),
                        ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY));
                cursors.add(statement);
                return statement;
            }).when(connection).prepareStatement(anyString(),
                    eq(ResultSet.TYPE_FORWARD_ONLY), eq(ResultSet.CONCUR_READ_ONLY));
            JdbcTemplate target = new JdbcTemplate(new SingleConnectionDataSource(connection, true));

            MigrationReport report = verifier.verify(fixture.spec(),
                    List.of(new EtlExecutor.TableResult("legacy_single", "tb_single", 1, 1, 1, List.of())),
                    target);

            assertThat(report.ok()).isTrue();
            assertThat(cursors).hasSize(1);
            var lifecycle = inOrder(connection, cursors.getFirst());
            lifecycle.verify(connection).setReadOnly(true);
            lifecycle.verify(connection).setAutoCommit(false);
            lifecycle.verify(cursors.getFirst()).setFetchSize(1);
            lifecycle.verify(cursors.getFirst()).executeQuery();
            lifecycle.verify(cursors.getFirst()).close();
            lifecycle.verify(connection).rollback();
            lifecycle.verify(connection).setAutoCommit(true);
            lifecycle.verify(connection).setReadOnly(false);
            verify(connection, never()).commit();
            assertThat(connection.getAutoCommit()).isTrue();
            assertThat(connection.isClosed()).isFalse();
        }
    }

    @Test
    void cursorFailureRollsBackAndRestoresOnlyItsOwnTransaction() throws Exception {
        Fixture fixture = singleFixture();
        addCheckpoint(fixture, "legacy-1", TypedKeyTuple.of(TypedValue.signedInteger(101)),
                Map.of("payload", "one", "id", 101L));
        try (Connection actual = fixture.jdbc().getDataSource().getConnection()) {
            Connection connection = mock(Connection.class, delegatesTo(actual));
            doThrow(new SQLException("private-value-sentinel"))
                    .when(connection).prepareStatement(anyString(),
                            eq(ResultSet.TYPE_FORWARD_ONLY), eq(ResultSet.CONCUR_READ_ONLY));
            JdbcTemplate target = new JdbcTemplate(new SingleConnectionDataSource(connection, true));

            MigrationReport report = verifier.verify(fixture.spec(),
                    List.of(new EtlExecutor.TableResult("legacy_single", "tb_single", 1, 1, 1, List.of())),
                    target);

            assertThat(report.ok()).isFalse();
            assertThat(report.tables().getFirst().note())
                    .isEqualTo("run scoped typed target/checksum batch 대조 실패");
            assertThat(report.toSummary()).doesNotContain("private-value-sentinel");
            verify(connection).rollback();
            verify(connection).setAutoCommit(true);
            verify(connection).setReadOnly(false);
            verify(connection, never()).commit();
            assertThat(connection.getAutoCommit()).isTrue();
            assertThat(connection.isClosed()).isFalse();
        }
    }

    @Test
    void verificationDoesNotCommitOrRollBackTheCallerTransaction() throws Exception {
        Fixture fixture = singleFixture();
        addCheckpoint(fixture, "legacy-1", TypedKeyTuple.of(TypedValue.signedInteger(101)),
                Map.of("payload", "one", "id", 101L));
        try (Connection actual = fixture.jdbc().getDataSource().getConnection()) {
            actual.setAutoCommit(false);
            Connection connection = mock(Connection.class, delegatesTo(actual));
            JdbcTemplate target = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            target.update("INSERT INTO tb_single VALUES (101, 'one')");

            MigrationReport report = verifier.verify(fixture.spec(),
                    List.of(new EtlExecutor.TableResult("legacy_single", "tb_single", 1, 1, 1, List.of())),
                    target);

            assertThat(report.ok()).isTrue();
            verify(connection, never()).commit();
            verify(connection, never()).rollback();
            verify(connection, never()).setAutoCommit(true);
            verify(connection, never()).setReadOnly(true);
            assertThat(connection.getAutoCommit()).isFalse();
            assertThat(target.queryForObject("SELECT COUNT(*) FROM tb_single", Long.class)).isEqualTo(1L);
            assertThat(fixture.jdbc().queryForObject("SELECT COUNT(*) FROM tb_single", Long.class)).isZero();
            actual.rollback();
            assertThat(target.queryForObject("SELECT COUNT(*) FROM tb_single", Long.class)).isZero();
        }
    }

    private MigrationReport verifyOne(Fixture fixture) {
        return verifier.verify(
                fixture.spec(),
                List.of(new EtlExecutor.TableResult(
                        fixture.spec().tables().getFirst().source(),
                        fixture.spec().tables().getFirst().target(), 1, 1, 1, List.of())),
                fixture.jdbc());
    }

    private static Fixture compositeFixture(boolean primaryKey) {
        JdbcTemplate jdbc = h2();
        jdbc.execute("CREATE TABLE tb_order (tenant_id varchar(20), order_id bigint, payload varchar(50)"
                + (primaryKey ? ", PRIMARY KEY (tenant_id, order_id))" : ")"));
        TableMapping table = new TableMapping(
                "legacy_order", "tb_order", null, null,
                List.of("TENANT_ID", "ORDER_NO"), null,
                List.of(
                        new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(component("TENANT_ID", IdentityValueType.TEXT),
                                component("ORDER_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("tenant_id", IdentityValueType.TEXT),
                                component("order_id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        return fixture(jdbc, table);
    }

    private static Fixture singleFixture() {
        JdbcTemplate jdbc = h2();
        jdbc.execute("CREATE TABLE tb_single (id bigint PRIMARY KEY, payload varchar(50))");
        TableMapping table = new TableMapping(
                "legacy_single", "tb_single", null, "LEGACY_ID", List.of(), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(component("LEGACY_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        return fixture(jdbc, table);
    }

    private static Fixture fixture(JdbcTemplate jdbc, TableMapping table) {
        new MigrationSchemaManager().migrateAndValidate(jdbc);
        RunContext run = new RunContext("verify-" + SEQUENCE.incrementAndGet(), "legacy");
        new MigrationStateStore(run).initialize(jdbc);
        return new Fixture(jdbc, new MappingSpec(null, null, List.of(table), Map.of(), run));
    }

    private static void addCheckpoint(
            Fixture fixture,
            String source,
            TypedKeyTuple target,
            Map<String, Object> row
    ) throws Exception {
        TableMapping table = fixture.spec().tables().getFirst();
        CheckpointEntry entry = CheckpointEntry.typed(
                table.source(), TypedKeyTuple.of(TypedValue.text(source)),
                table.target(), target,
                RowChecksum.calculate(EtlExecutor.canonicalTargetColumns(table), row));
        MigrationStateStore state = new MigrationStateStore(fixture.spec().run());
        try (Connection connection = fixture.jdbc().getDataSource().getConnection()) {
            connection.setAutoCommit(false);
            state.write(connection, List.of(entry));
            connection.commit();
        }
    }

    private static TypedKeyTuple composite(String tenant, long order) {
        return TypedKeyTuple.of(TypedValue.text(tenant), TypedValue.signedInteger(order));
    }

    private static Map<String, Object> row(String tenant, long order, String payload) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tenant_id", tenant);
        row.put("payload", payload);
        row.put("order_id", order);
        return row;
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }

    private static JdbcTemplate h2() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:typed_verify_" + SEQUENCE.incrementAndGet()
                        + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
        return new JdbcTemplate(dataSource);
    }

    private record Fixture(JdbcTemplate jdbc, MappingSpec spec) {}
}
