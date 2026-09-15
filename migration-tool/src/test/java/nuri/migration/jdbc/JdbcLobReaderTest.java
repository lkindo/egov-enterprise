package nuri.migration.jdbc;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JdbcLobReaderTest {
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
}
