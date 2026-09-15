package nuri.migration.etl;

import nuri.migration.jdbc.JdbcLobReader;
import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;

import java.io.Reader;
import java.lang.reflect.InvocationTargetException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Self-reference key reservation must apply the same SQL Server MAX bound as row reads. */
class SqlServerSelfReferenceReadTest {
    private static final String SOURCE_TABLE = "dbo.tb_self_reference";
    private static final String KEY_SQL = "SELECT legacy_key FROM " + SOURCE_TABLE + " ORDER BY legacy_key";

    public interface ResponseBuffered {
        void setResponseBuffering(String value) throws SQLException;
        String getResponseBuffering() throws SQLException;
    }

    @Test
    void oversizedSqlServerMaxSourceKeyFailsBeforeIdGenerationOrTargetAccessAndClosesResources() throws Exception {
        Connection source = sourceConnection("Microsoft SQL Server", "Microsoft JDBC Driver 13.6 for SQL Server");
        when(source.getMetaData().getDriverVersion()).thenReturn("13.6.0.0");
        PreparedStatement statement = mock(PreparedStatement.class, withSettings().extraInterfaces(ResponseBuffered.class));
        when(source.prepareStatement(KEY_SQL, ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY))
                .thenReturn(statement);
        when(((ResponseBuffered) statement).getResponseBuffering()).thenReturn("adaptive");
        ResultSet rows = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnType(1)).thenReturn(Types.NVARCHAR);
        var reader = new RepeatingUnicodeReader(JdbcLobReader.MAX_CLOB_CHARACTERS + 1L);
        when(rows.getCharacterStream(1)).thenReturn(reader);
        when(rows.getObject(1)).thenThrow(new AssertionError("SQL Server MAX source keys must use bounded streams"));
        Connection target = mock(Connection.class);
        var registry = new RejectingMintRegistry();

        assertThatThrownBy(() -> preMint(source, target, registry))
                .isInstanceOf(JdbcLobReader.ContentReadException.class)
                .hasMessage("LOB_SIZE_LIMIT_EXCEEDED").hasNoCause();

        assertThat(reader.supplied).isEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS + 1L);
        assertThat(reader.maximumRequested).isEqualTo(8192);
        assertThat(reader.closed).isTrue();
        assertThat(registry.mintCalls).isZero();
        assertThat(registry.hasPending()).isFalse();
        assertThat(registry.hasMappingFor(SOURCE_TABLE)).isFalse();
        verifyNoInteractions(target);
        verify(rows, never()).getObject(anyInt());
        verify(rows).close();
        verify(statement).close();
        verify(source, never()).prepareStatement(anyString());
        var preparation = inOrder(statement);
        preparation.verify((ResponseBuffered) statement).setResponseBuffering("adaptive");
        preparation.verify((ResponseBuffered) statement).getResponseBuffering();
        preparation.verify(statement).setFetchSize(1);
        preparation.verify(statement).executeQuery();
    }

    @Test
    void genericSourceRetainsItsScalarGetObjectContractForSelfReferenceKeys() throws Exception {
        Connection source = sourceConnection("H2", "H2 JDBC Driver");
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(source.prepareStatement(KEY_SQL)).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getObject(1)).thenReturn("tiny-source-key");
        var registry = new KeyMapRegistry("self-reference-unit", "synthetic-source");

        preMint(source, null, registry);

        assertThat(registry.translate(SOURCE_TABLE, "tiny-source-key")).startsWith("TEST_");
        assertThat(registry.hasPending()).isFalse();
        verify(rows).getObject(1);
        verify(rows, never()).getMetaData();
        verify(rows, never()).getCharacterStream(anyInt());
        verify(rows).close();
        verify(statement).close();
        verify(statement).setFetchSize(1);
        verify(source, never()).prepareStatement(anyString(), anyInt(), anyInt());
    }

    private static Connection sourceConnection(String product, String driver) throws SQLException {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(metadata.getDriverName()).thenReturn(driver);
        return connection;
    }

    private static void preMint(Connection source, Connection target, KeyMapRegistry registry) throws Exception {
        var table = new TableMapping(SOURCE_TABLE, "public.tb_self_reference", null, null,
                List.of("legacy_key"), "id", List.of(
                new ColumnMapping("legacy_key", "id", null, "text", null, null, null),
                new ColumnMapping("parent_key", "parent_id", null, "text", null, SOURCE_TABLE, null)),
                new IdStrategy("id", "TEST_", "legacy_key"));
        var executor = new EtlExecutor(mock(SourceIntrospector.class), new TransformerRegistry());
        var helper = EtlExecutor.class.getDeclaredMethod("preMintSelfReferences", Connection.class,
                Connection.class, TableMapping.class, KeyMapRegistry.class);
        helper.setAccessible(true);
        try {
            helper.invoke(executor, source, target, table, registry);
        } catch (InvocationTargetException failure) {
            if (failure.getCause() instanceof Exception cause) throw cause;
            if (failure.getCause() instanceof Error cause) throw cause;
            throw failure;
        }
    }

    /** The first ID reservation is forbidden, so the size failure must occur before generation. */
    private static final class RejectingMintRegistry extends KeyMapRegistry {
        private int mintCalls;

        @Override
        public String mintOrGet(String sourceTable, String legacyKey, String generatorPrefix) {
            mintCalls++;
            throw new AssertionError("oversized SQL Server source key reached ID generation");
        }
    }

    /** Generates UTF-16 surrogate pairs without retaining a second complete source value. */
    private static final class RepeatingUnicodeReader extends Reader {
        private final long length;
        private long supplied;
        private int maximumRequested;
        private boolean closed;

        private RepeatingUnicodeReader(long length) { this.length = length; }

        @Override
        public int read(char[] characters, int offset, int requested) {
            Objects.checkFromIndexSize(offset, requested, characters.length);
            maximumRequested = Math.max(maximumRequested, requested);
            if (requested == 0) return 0;
            if (supplied == length) return -1;
            int count = (int) Math.min(requested, length - supplied);
            for (int index = 0; index < count; index++) {
                characters[offset + index] = ((supplied + index) & 1) == 0 ? '\uD83D' : '\uDE42';
            }
            supplied += count;
            return count;
        }

        @Override public void close() { closed = true; }
    }
}
