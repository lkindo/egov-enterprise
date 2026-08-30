package nuri.migration.etl;

import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class EtlSourceReadSessionTest {

    private static final String FIRST_SELECT =
            "SELECT 1 AS __migration_row__ FROM LEGACY_FIRST";
    private static final String SECOND_SELECT =
            "SELECT 1 AS __migration_row__ FROM LEGACY_SECOND";

    @Test
    void allTablesShareOneConfiguredSourceSnapshotAndCommitOnlyAfterTheLastRead() throws Exception {
        SourceFixture source = sourceFixture();
        PreparedStatement first = emptyQuery();
        PreparedStatement second = emptyQuery();
        given(source.connection().prepareStatement(FIRST_SELECT)).willReturn(first);
        given(source.connection().prepareStatement(SECOND_SELECT)).willReturn(second);
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.UNVERIFIED, "test");

        List<EtlExecutor.TableResult> results = executor().execute(
                mapping(), MigrationMode.DRY_RUN, source.jdbc(), null, policy, true);

        assertThat(results).hasSize(2)
                .allSatisfy(result -> assertThat(result.errors()).isEmpty());
        verify(source.dataSource(), times(1)).getConnection();
        verify(source.connection(), times(1)).setReadOnly(true);
        verify(source.connection(), times(1)).setTransactionIsolation(policy.jdbcIsolation());
        verify(source.connection(), times(1)).setAutoCommit(false);
        verify(source.connection(), times(1)).commit();
        verify(source.connection(), never()).rollback();
        verify(source.connection(), times(1)).close();

        InOrder lifecycle = inOrder(source.connection(), first, second);
        lifecycle.verify(source.connection()).setReadOnly(true);
        lifecycle.verify(source.connection()).setTransactionIsolation(policy.jdbcIsolation());
        lifecycle.verify(source.connection()).setAutoCommit(false);
        lifecycle.verify(source.connection()).prepareStatement(FIRST_SELECT);
        lifecycle.verify(first).executeQuery();
        lifecycle.verify(source.connection()).prepareStatement(SECOND_SELECT);
        lifecycle.verify(second).executeQuery();
        lifecycle.verify(source.connection()).commit();
        lifecycle.verify(source.connection()).close();
    }

    @Test
    void sourceSqlFailureRollsBackAndClosesTheSharedSessionWithoutReadingRemainingTables()
            throws Exception {
        SourceFixture source = sourceFixture();
        PreparedStatement failing = mock(PreparedStatement.class);
        given(source.connection().prepareStatement(FIRST_SELECT)).willReturn(failing);
        given(failing.executeQuery()).willThrow(new SQLException(
                "jdbc:vendor://sentinel-host/db sentinel-user sentinel-password "
                        + "SELECT secret_value FROM private_table"));
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.UNVERIFIED, "test");

        List<EtlExecutor.TableResult> results = executor().execute(
                mapping(), MigrationMode.DRY_RUN, source.jdbc(), null, policy, true);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.sourceTable()).isEqualTo("LEGACY_FIRST");
            assertThat(result.errors()).singleElement()
                    .isEqualTo("이관 실패(LEGACY_FIRST): SQL_EXECUTION_FAILED");
            assertThat(result.errors().getFirst())
                    .doesNotContain(
                            "jdbc:vendor", "sentinel-host", "sentinel-user", "sentinel-password",
                            "secret_value", "private_table");
        });
        verify(source.dataSource(), times(1)).getConnection();
        verify(source.connection(), never()).prepareStatement(SECOND_SELECT);
        verify(source.connection(), never()).commit();
        verify(source.connection(), times(1)).rollback();
        verify(source.connection(), times(1)).close();

        InOrder lifecycle = inOrder(source.connection(), failing);
        lifecycle.verify(source.connection()).setReadOnly(true);
        lifecycle.verify(source.connection()).setTransactionIsolation(policy.jdbcIsolation());
        lifecycle.verify(source.connection()).setAutoCommit(false);
        lifecycle.verify(source.connection()).prepareStatement(FIRST_SELECT);
        lifecycle.verify(failing).executeQuery();
        lifecycle.verify(source.connection()).rollback();
        lifecycle.verify(source.connection()).close();
    }

    @Test
    void nonFatalErrorRollsBackAndClosesTheSharedSessionBeforeWorkflowSanitizesIt()
            throws Exception {
        SourceFixture source = sourceFixture();
        given(source.connection().prepareStatement(FIRST_SELECT)).willThrow(
                new LinkageError("sentinel-private-linkage-detail"));
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.UNVERIFIED, "test");

        assertThatThrownBy(() -> executor().execute(
                mapping(), MigrationMode.DRY_RUN, source.jdbc(), null, policy, true))
                .isInstanceOf(LinkageError.class);

        verify(source.connection(), never()).prepareStatement(SECOND_SELECT);
        verify(source.connection(), never()).commit();
        verify(source.connection(), times(1)).rollback();
        verify(source.connection(), times(1)).close();
    }

    @Test
    void unsupportedReadSessionPolicyFailsBeforeOpeningOrSelectingFromTheSource() throws Exception {
        SourceFixture source = sourceFixture();
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.unsupported(
                EvidenceLevel.UNVERIFIED, "test");

        assertThatThrownBy(() -> executor().execute(
                mapping(), MigrationMode.DRY_RUN, source.jdbc(), null, policy, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("source read session");

        verify(source.dataSource(), never()).getConnection();
        verifyNoInteractions(source.connection());
    }

    @Test
    void requiredSourceFreezeWithoutAcknowledgementFailsBeforeOpeningOrSelectingFromTheSource()
            throws Exception {
        SourceFixture source = sourceFixture();
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.UNVERIFIED, "test");

        assertThatThrownBy(() -> executor().execute(
                mapping(), MigrationMode.DRY_RUN, source.jdbc(), null, policy, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("source freeze");

        verify(source.dataSource(), never()).getConnection();
        verifyNoInteractions(source.connection());
    }

    private static EtlExecutor executor() {
        return new EtlExecutor(mock(SourceIntrospector.class), new TransformerRegistry());
    }

    private static MappingSpec mapping() {
        return new MappingSpec(
                new DbConfig("jdbc:test:source", "user", "password", "driver"),
                null,
                List.of(table("LEGACY_FIRST", "target_first"),
                        table("LEGACY_SECOND", "target_second")),
                Map.of());
    }

    private static TableMapping table(String source, String target) {
        return new TableMapping(source, target, null, List.of(), null);
    }

    private static SourceFixture sourceFixture() throws SQLException {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        given(jdbc.getDataSource()).willReturn(dataSource);
        given(dataSource.getConnection()).willReturn(connection);
        return new SourceFixture(jdbc, dataSource, connection);
    }

    private static PreparedStatement emptyQuery() throws SQLException {
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        given(statement.executeQuery()).willReturn(result);
        given(result.getMetaData()).willReturn(metadata);
        given(metadata.getColumnCount()).willReturn(0);
        given(result.next()).willReturn(false);
        return statement;
    }

    private record SourceFixture(
            JdbcTemplate jdbc,
            DataSource dataSource,
            Connection connection
    ) {}
}
