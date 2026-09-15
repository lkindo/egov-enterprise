package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.Arrays;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JdbcLobReaderTest {
    @Test
    void sqlServerVariableTypesStreamUnicodeBinaryNullAndEmptyBeforeGetObject() throws Exception {
        for (int type : new int[]{Types.VARCHAR, Types.NVARCHAR}) {
            ResultSet result = longResult(type);
            StringReader input = org.mockito.Mockito.spy(new StringReader("본문🙂-"));
            when(result.getCharacterStream(1)).thenReturn(input, new StringReader(""), null);
            assertThat(JdbcLobReader.read(result, 1, true)).isEqualTo("본문🙂-");
            assertThat(JdbcLobReader.read(result, 1, true)).isEqualTo("");
            assertThat(JdbcLobReader.read(result, 1, true)).isNull();
            verify(input).close();
            verify(result, never()).getObject(1);
        }
        ResultSet result = longResult(Types.VARBINARY);
        var input = org.mockito.Mockito.spy(new ByteArrayInputStream(new byte[]{0, -1, 42}));
        when(result.getBinaryStream(1)).thenReturn(input, new ByteArrayInputStream(new byte[0]), null);
        assertThat(JdbcLobReader.read(result, 1, true)).isEqualTo(new byte[]{0, -1, 42});
        assertThat(JdbcLobReader.read(result, 1, true)).isEqualTo(new byte[0]);
        assertThat(JdbcLobReader.read(result, 1, true)).isNull();
        verify(input).close();
        verify(result, never()).getObject(1);
    }

    @Test
    void sqlServerOrdinaryMaxBinaryCannotBypassTheSizeLimit() throws Exception {
        ResultSet result = longResult(Types.VARBINARY);
        var input = new RepeatingBinary(JdbcLobReader.MAX_BLOB_BYTES + 8192L);
        when(result.getBinaryStream(1)).thenReturn(input);
        when(result.getObject(1)).thenReturn(new byte[0]);
        assertThatThrownBy(() -> JdbcLobReader.read(result, 1, true))
                .isInstanceOf(SQLException.class).hasMessage("LOB_SIZE_LIMIT_EXCEEDED");
        assertThat(input.supplied).isEqualTo(JdbcLobReader.MAX_BLOB_BYTES + 1L);
        assertThat(input.closed).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void sqlServerOrdinaryMaxTextCannotBypassTheCharacterLimit() throws Exception {
        for (int type : new int[]{Types.VARCHAR, Types.NVARCHAR}) {
            ResultSet result = longResult(type);
            var input = new RepeatingUnicodeReader(JdbcLobReader.MAX_CLOB_CHARACTERS + 8192L);
            when(result.getCharacterStream(1)).thenReturn(input);
            when(result.getObject(1)).thenReturn("");
            assertThatThrownBy(() -> JdbcLobReader.read(result, 1, true))
                    .isInstanceOf(SQLException.class).hasMessage("LOB_SIZE_LIMIT_EXCEEDED");
            assertThat(input.supplied).isLessThanOrEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS + 8192L);
            assertThat(input.closed).isTrue();
            verify(result, never()).getObject(1);
        }
    }

    @Test
    void scalarReadingAndOtherDriversKeepTheirExistingObjectContract() throws Exception {
        for (int type : new int[]{Types.VARCHAR, Types.NVARCHAR, Types.VARBINARY, Types.CHAR, Types.INTEGER}) {
            ResultSet result = longResult(type);
            Object value = type == Types.VARBINARY ? new byte[]{42} : "scalar";
            when(result.getObject(1)).thenReturn(value);
            assertThat(JdbcLobReader.read(result, 1, false)).isSameAs(value);
            verify(result).getObject(1);
            verify(result, never()).getBinaryStream(1);
            verify(result, never()).getCharacterStream(1);
        }
        ResultSet result = longResult(Types.CHAR);
        when(result.getObject(1)).thenReturn("uuid");
        assertThat(JdbcLobReader.read(result, 1, true)).isEqualTo("uuid");
        verify(result, never()).getCharacterStream(1);
    }

    @Test
    void longValuesUseStreamsPreserveNullAndEmptyAndCloseResources() throws Exception {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(result.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnType(1)).thenReturn(Types.LONGVARBINARY);
        when(metadata.getColumnType(2)).thenReturn(Types.LONGVARCHAR);
        byte[] bytes = {0, -1, 42};
        String text = "본문🙂-";
        var binary = org.mockito.Mockito.spy(new ByteArrayInputStream(bytes));
        var reader = org.mockito.Mockito.spy(new StringReader(text));
        when(result.getBinaryStream(1)).thenReturn(binary, new ByteArrayInputStream(new byte[0]), null);
        when(result.getCharacterStream(2)).thenReturn(reader, new StringReader(""), null);
        assertThat(JdbcLobReader.read(result, 1)).isEqualTo(bytes);
        assertThat(JdbcLobReader.read(result, 2)).isEqualTo(text);
        assertThat(JdbcLobReader.read(result, 1)).isEqualTo(new byte[0]);
        assertThat(JdbcLobReader.read(result, 2)).isEqualTo("");
        assertThat(JdbcLobReader.read(result, 1)).isNull();
        assertThat(JdbcLobReader.read(result, 2)).isNull();
        verify(binary).close();
        verify(reader).close();
        verify(result, never()).getObject(org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void longReaderFailuresAreSanitizedAndClosed() throws Exception {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(result.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnType(1)).thenReturn(Types.LONGVARCHAR);
        Reader reader = mock(Reader.class);
        when(result.getCharacterStream(1)).thenReturn(reader);
        when(reader.read(org.mockito.ArgumentMatchers.any(char[].class)))
                .thenThrow(new IOException("private source detail"));
        assertThatThrownBy(() -> JdbcLobReader.read(result, 1)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_READ_FAILED").hasNoCause();
        verify(reader).close();
    }

    @Test
    void longBinaryAcceptsExactlyTheByteLimitAndClosesItsStream() throws Exception {
        ResultSet result = longResult(Types.LONGVARBINARY);
        var input = new RepeatingBinary(JdbcLobReader.MAX_BLOB_BYTES);
        when(result.getBinaryStream(1)).thenReturn(input);

        byte[] copied = (byte[]) JdbcLobReader.read(result, 1);

        assertThat(copied.length).isEqualTo(JdbcLobReader.MAX_BLOB_BYTES);
        assertThat(copied[0]).isEqualTo((byte) 42);
        assertThat(copied[copied.length - 1]).isEqualTo((byte) 42);
        assertThat(input.supplied).isEqualTo(JdbcLobReader.MAX_BLOB_BYTES);
        assertThat(input.closed).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void oversizedLongBinaryReadsAtMostOneByteBeyondTheLimitAndClosesItsStream() throws Exception {
        ResultSet result = longResult(Types.LONGVARBINARY);
        var input = new RepeatingBinary(JdbcLobReader.MAX_BLOB_BYTES + 8192L);
        when(result.getBinaryStream(1)).thenReturn(input);

        assertThatThrownBy(() -> JdbcLobReader.read(result, 1)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_SIZE_LIMIT_EXCEEDED").hasNoCause();

        assertThat(input.supplied).isEqualTo(JdbcLobReader.MAX_BLOB_BYTES + 1L);
        assertThat(input.closed).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void longTextAcceptsExactlyTheUtf16LimitIncludingSupplementaryCharacters() throws Exception {
        ResultSet result = longResult(Types.LONGVARCHAR);
        var reader = new RepeatingUnicodeReader(JdbcLobReader.MAX_CLOB_CHARACTERS);
        when(result.getCharacterStream(1)).thenReturn(reader);

        String copied = (String) JdbcLobReader.read(result, 1);

        assertThat(copied.length()).isEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS);
        assertThat(copied.codePointCount(0, copied.length())).isEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS / 2);
        assertThat(copied.startsWith("🙂")).isTrue();
        assertThat(copied.endsWith("🙂")).isTrue();
        assertThat(reader.supplied).isEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS);
        assertThat(reader.closed).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void longTextRejectsOneUtf16CodeUnitBeyondTheLimitAndClosesItsReader() throws Exception {
        ResultSet result = longResult(Types.LONGVARCHAR);
        var reader = new RepeatingUnicodeReader(JdbcLobReader.MAX_CLOB_CHARACTERS + 1L);
        when(result.getCharacterStream(1)).thenReturn(reader);

        assertThatThrownBy(() -> JdbcLobReader.read(result, 1)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_SIZE_LIMIT_EXCEEDED").hasNoCause();

        assertThat(reader.supplied).isEqualTo(JdbcLobReader.MAX_CLOB_CHARACTERS + 1L);
        assertThat(reader.closed).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void stalledLongTextReaderFailsOnTheFirstZeroReadAndCloses() throws Exception {
        ResultSet result = longResult(Types.LONGVARCHAR);
        Reader reader = mock(Reader.class);
        when(result.getCharacterStream(1)).thenReturn(reader);
        // A second EOF also makes a mutant that ignores the zero read terminate instead of hanging.
        when(reader.read(org.mockito.ArgumentMatchers.any(char[].class))).thenReturn(0, -1);

        assertThatThrownBy(() -> JdbcLobReader.read(result, 1)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_READ_STALLED").hasNoCause();

        verify(reader, times(1)).read(org.mockito.ArgumentMatchers.any(char[].class));
        verify(reader).close();
        verify(result, never()).getObject(1);
    }

    @Test
    void longBinaryIOExceptionIsSanitizedAndItsStreamIsClosed() throws Exception {
        ResultSet result = longResult(Types.LONGVARBINARY);
        boolean[] closed = {false};
        InputStream input = new InputStream() {
            @Override public int read() throws IOException { throw new IOException("private binary source detail"); }
            @Override public void close() { closed[0] = true; }
        };
        when(result.getBinaryStream(1)).thenReturn(input);

        assertThatThrownBy(() -> JdbcLobReader.read(result, 1)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_READ_FAILED").hasNoCause();

        assertThat(closed[0]).isTrue();
        verify(result, never()).getObject(1);
    }

    @Test
    void binaryContentsAreDetachedAndTheLocatorIsFreed() throws Exception {
        Blob blob = mock(Blob.class);
        byte[] original = {0, 1, -1, 42};
        when(blob.length()).thenReturn(4L);
        when(blob.getBinaryStream()).thenReturn(new ByteArrayInputStream(original));
        assertThat(JdbcLobReader.detach(blob)).isEqualTo(original);
        verify(blob).free();
    }

    @Test
    void unicodeSurrogatePairsRemainIntactAcrossSingleCharacterReads() throws Exception {
        String original = "before-본문🙂-after";
        Clob clob = mock(Clob.class);
        when(clob.length()).thenReturn((long) original.length());
        Reader reader = new StringReader(original) {
            @Override public int read(char[] chars, int offset, int length) throws IOException {
                return super.read(chars, offset, Math.min(1, length));
            }
        };
        when(clob.getCharacterStream()).thenReturn(reader);
        assertThat(JdbcLobReader.detach(clob)).isEqualTo(original);
        verify(clob).free();
    }

    @Test
    void emptyLobsRemainDifferentFromNull() throws Exception {
        Blob blob = mock(Blob.class);
        when(blob.length()).thenReturn(0L);
        when(blob.getBinaryStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
        Clob clob = mock(Clob.class);
        when(clob.length()).thenReturn(0L);
        when(clob.getCharacterStream()).thenReturn(new StringReader(""));
        assertThat(JdbcLobReader.detach(blob)).isEqualTo(new byte[0]);
        assertThat(JdbcLobReader.detach(clob)).isEqualTo("");
        assertThat(JdbcLobReader.detach(null)).isNull();
    }

    @Test
    void oversizedLocatorFailsBeforeAllocationAndStillReleasesItsResources() throws Exception {
        Blob blob = mock(Blob.class);
        when(blob.length()).thenReturn(JdbcLobReader.MAX_BLOB_BYTES + 1L);
        assertThatThrownBy(() -> JdbcLobReader.detach(blob)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_SIZE_LIMIT_EXCEEDED");
        verify(blob, never()).getBinaryStream();
        verify(blob).free();
        Clob clob = mock(Clob.class);
        when(clob.length()).thenReturn(JdbcLobReader.MAX_CLOB_CHARACTERS + 1L);
        assertThatThrownBy(() -> JdbcLobReader.detach(clob)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_SIZE_LIMIT_EXCEEDED");
        verify(clob, never()).getCharacterStream();
        verify(clob).free();
    }

    @Test
    void shortOrLongStreamsCannotSilentlyTruncateContent() throws Exception {
        for (int declared : new int[]{1, 3}) {
            Blob blob = mock(Blob.class);
            when(blob.length()).thenReturn((long) declared);
            when(blob.getBinaryStream()).thenReturn(new ByteArrayInputStream(new byte[]{1, 2}));
            assertThatThrownBy(() -> JdbcLobReader.detach(blob)).isInstanceOf(SQLException.class)
                    .hasMessage("LOB_LENGTH_MISMATCH");
            verify(blob).free();
            Clob clob = mock(Clob.class);
            when(clob.length()).thenReturn((long) declared);
            when(clob.getCharacterStream()).thenReturn(new StringReader("ab"));
            assertThatThrownBy(() -> JdbcLobReader.detach(clob)).isInstanceOf(SQLException.class)
                    .hasMessage("LOB_LENGTH_MISMATCH");
            verify(clob).free();
        }
    }

    @Test
    void readerFailureClosesAndFreesWithoutExposingTheDriverMessage() throws Exception {
        Clob clob = mock(Clob.class);
        Reader reader = mock(Reader.class);
        when(clob.length()).thenReturn(1L);
        when(clob.getCharacterStream()).thenReturn(reader);
        when(reader.read(org.mockito.ArgumentMatchers.any(char[].class), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt())).thenThrow(new IOException("sensitive source detail"));
        assertThatThrownBy(() -> JdbcLobReader.detach(clob)).isInstanceOf(SQLException.class)
                .hasMessage("LOB_READ_FAILED").hasNoCause();
        verify(reader).close();
        verify(clob).free();
    }

    private static ResultSet longResult(int type) throws SQLException {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(result.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnType(1)).thenReturn(type);
        return result;
    }

    /** Generates fixture bytes without retaining another complete binary payload. */
    private static final class RepeatingBinary extends InputStream {
        private final long length;
        private long supplied;
        private boolean closed;

        private RepeatingBinary(long length) { this.length = length; }

        @Override
        public int read() {
            if (supplied == length) return -1;
            supplied++;
            return 42;
        }

        @Override
        public int read(byte[] bytes, int offset, int requested) {
            Objects.checkFromIndexSize(offset, requested, bytes.length);
            if (requested == 0) return 0;
            if (supplied == length) return -1;
            int count = (int) Math.min(requested, length - supplied);
            Arrays.fill(bytes, offset, offset + count, (byte) 42);
            supplied += count;
            return count;
        }

        @Override public void close() { closed = true; }
    }

    /** Generates surrogate pairs while measuring the policy in UTF-16 code units. */
    private static final class RepeatingUnicodeReader extends Reader {
        private final long length;
        private long supplied;
        private boolean closed;

        private RepeatingUnicodeReader(long length) { this.length = length; }

        @Override
        public int read(char[] characters, int offset, int requested) {
            Objects.checkFromIndexSize(offset, requested, characters.length);
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
