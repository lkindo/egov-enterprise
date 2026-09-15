package nuri.migration.jdbc;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.Objects;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Fatal cleanup failures must cross the bounded ordinary SQL Server value boundary. */
class JdbcLobReaderFatalCloseTest {
    @ParameterizedTest(name = "JDBC type {0}: IO read failure followed by {1}")
    @MethodSource("variableTypesAndFatalFailures")
    void fatalCloseIsNotHiddenUnderAnIoReadFailure(int type, String fatalKind) throws Exception {
        Error fatal = fatal(fatalKind);
        Fixture fixture = fixture(type, ReadOutcome.IO_FAILURE, null, fatal);

        assertThatThrownBy(() -> JdbcLobReader.read(fixture.result(), 1, true)).isSameAs(fatal);

        assertReleasedWithoutGetObject(fixture);
    }

    @ParameterizedTest(name = "JDBC type {0}: size limit failure followed by {1}")
    @MethodSource("variableTypesAndFatalFailures")
    void fatalCloseIsNotHiddenUnderAContentSizeFailure(int type, String fatalKind) throws Exception {
        Error fatal = fatal(fatalKind);
        Fixture fixture = fixture(type, ReadOutcome.SIZE_FAILURE, null, fatal);

        assertThatThrownBy(() -> JdbcLobReader.read(fixture.result(), 1, true)).isSameAs(fatal);

        long maximum = type == Types.VARBINARY
                ? JdbcLobReader.MAX_BLOB_BYTES : JdbcLobReader.MAX_CLOB_CHARACTERS;
        assertThat(fixture.state().supplied).isEqualTo(maximum + 1L);
        assertReleasedWithoutGetObject(fixture);
    }

    @ParameterizedTest(name = "JDBC type {0}: {1} read failure followed by ordinary IO close failure")
    @MethodSource("variableTypesAndFatalFailures")
    void fatalReadRemainsTheOriginalFailureWhenCloseFailsOrdinarily(int type, String fatalKind) throws Exception {
        Error fatal = fatal(fatalKind);
        IOException closeFailure = new IOException("synthetic close failure");
        Fixture fixture = fixture(type, ReadOutcome.FATAL_FAILURE, fatal, closeFailure);

        assertThatThrownBy(() -> JdbcLobReader.read(fixture.result(), 1, true)).isSameAs(fatal);

        assertThat(fatal.getSuppressed()).containsExactly(closeFailure);
        assertReleasedWithoutGetObject(fixture);
    }

    @ParameterizedTest(name = "JDBC type {0}: fatal read remains primary when close is also fatal")
    @ValueSource(ints = {Types.VARBINARY, Types.VARCHAR, Types.NVARCHAR})
    void originalFatalReadWinsOverASecondFatalFromClose(int type) throws Exception {
        OutOfMemoryError readFailure = new OutOfMemoryError("synthetic first fatal failure");
        StackOverflowError closeFailure = new StackOverflowError("synthetic second fatal failure");
        Fixture fixture = fixture(type, ReadOutcome.FATAL_FAILURE, readFailure, closeFailure);

        assertThatThrownBy(() -> JdbcLobReader.read(fixture.result(), 1, true)).isSameAs(readFailure);

        assertThat(readFailure.getSuppressed()).containsExactly(closeFailure);
        assertReleasedWithoutGetObject(fixture);
    }

    @ParameterizedTest(name = "JDBC type {0}: successful read followed by {1}")
    @MethodSource("variableTypesAndFatalFailures")
    void fatalCloseAfterASuccessfulReadPropagatesUnchanged(int type, String fatalKind) throws Exception {
        Error fatal = fatal(fatalKind);
        Fixture fixture = fixture(type, ReadOutcome.SUCCESS, null, fatal);

        assertThatThrownBy(() -> JdbcLobReader.read(fixture.result(), 1, true)).isSameAs(fatal);

        assertThat(fixture.state().supplied).isEqualTo(3);
        assertReleasedWithoutGetObject(fixture);
    }

    private static Stream<Arguments> variableTypesAndFatalFailures() {
        return Stream.of(Types.VARBINARY, Types.VARCHAR, Types.NVARCHAR)
                .flatMap(type -> Stream.of("OutOfMemoryError", "StackOverflowError", "ThreadDeath")
                        .map(fatalKind -> Arguments.of(type, fatalKind)));
    }

    private static Error fatal(String kind) throws ReflectiveOperationException {
        return switch (kind) {
            case "OutOfMemoryError" -> new OutOfMemoryError("synthetic cleanup failure");
            case "StackOverflowError" -> new StackOverflowError("synthetic cleanup failure");
            // Avoid statically depending on the deprecated-for-removal ThreadDeath API.
            case "ThreadDeath" -> (Error) Class.forName("java.lang.ThreadDeath").getConstructor().newInstance();
            default -> throw new IllegalArgumentException("unknown synthetic fatal kind");
        };
    }

    private static Fixture fixture(int type, ReadOutcome outcome, Error readFailure,
                                   Throwable closeFailure) throws Exception {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(result.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnType(1)).thenReturn(type);
        long maximum = type == Types.VARBINARY
                ? JdbcLobReader.MAX_BLOB_BYTES : JdbcLobReader.MAX_CLOB_CHARACTERS;
        StreamState state = new StreamState(outcome, readFailure, closeFailure,
                outcome == ReadOutcome.SIZE_FAILURE ? maximum + 1L : 3L);
        if (type == Types.VARBINARY) {
            when(result.getBinaryStream(1)).thenReturn(new SyntheticBinary(state));
        } else {
            when(result.getCharacterStream(1)).thenReturn(new SyntheticText(state));
        }
        return new Fixture(result, state);
    }

    private static void assertReleasedWithoutGetObject(Fixture fixture) throws Exception {
        assertThat(fixture.state().closed).isTrue();
        assertThat(fixture.state().closeCalls).isEqualTo(1);
        verify(fixture.result(), never()).getObject(1);
    }

    private enum ReadOutcome { SUCCESS, SIZE_FAILURE, IO_FAILURE, FATAL_FAILURE }
    private record Fixture(ResultSet result, StreamState state) { }

    private static final class StreamState {
        private final ReadOutcome outcome;
        private final Error readFailure;
        private final Throwable closeFailure;
        private final long length;
        private long supplied;
        private boolean closed;
        private int closeCalls;

        private StreamState(ReadOutcome outcome, Error readFailure, Throwable closeFailure, long length) {
            this.outcome = outcome;
            this.readFailure = readFailure;
            this.closeFailure = closeFailure;
            this.length = length;
        }

        private void beforeRead() throws IOException {
            if (outcome == ReadOutcome.IO_FAILURE) throw new IOException("synthetic read failure");
            if (outcome == ReadOutcome.FATAL_FAILURE) throw readFailure;
        }

        private void close() throws IOException {
            closed = true;
            closeCalls++;
            if (closeFailure instanceof Error fatal) throw fatal;
            if (closeFailure instanceof IOException ordinary) throw ordinary;
        }
    }

    /** Generate only the array requested by the reader, without retaining a second complete fixture. */
    private static final class SyntheticBinary extends InputStream {
        private final StreamState state;

        private SyntheticBinary(StreamState state) { this.state = state; }

        @Override
        public int read() throws IOException {
            state.beforeRead();
            if (state.supplied == state.length) return -1;
            state.supplied++;
            return 42;
        }

        @Override
        public byte[] readNBytes(int requested) throws IOException {
            if (requested < 0) throw new IllegalArgumentException("negative read length");
            state.beforeRead();
            int count = (int) Math.min(requested, state.length - state.supplied);
            state.supplied += count;
            return new byte[count];
        }

        @Override public void close() throws IOException { state.close(); }
    }

    /** Generate supplementary characters directly into the reader's small buffer. */
    private static final class SyntheticText extends Reader {
        private final StreamState state;

        private SyntheticText(StreamState state) { this.state = state; }

        @Override
        public int read(char[] characters, int offset, int requested) throws IOException {
            Objects.checkFromIndexSize(offset, requested, characters.length);
            state.beforeRead();
            if (requested == 0) return 0;
            if (state.supplied == state.length) return -1;
            int count = (int) Math.min(requested, state.length - state.supplied);
            for (int index = 0; index < count; index++) {
                characters[offset + index] = ((state.supplied + index) & 1) == 0 ? '\uD83D' : '\uDE42';
            }
            state.supplied += count;
            return count;
        }

        @Override public void close() throws IOException { state.close(); }
    }
}
