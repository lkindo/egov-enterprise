package nuri.migration.jdbc;

import java.io.IOException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.Types;

/** Detaches bounded LOB contents while their JDBC result and connection are still open. */
public final class JdbcLobReader {
    public static final int MAX_BLOB_BYTES = 32 * 1024 * 1024;
    public static final int MAX_CLOB_CHARACTERS = 16 * 1024 * 1024;
    public static final long MAX_ROW_BYTES = 64L * 1024 * 1024;
    public static final long PAGE_BYTES = 8L * 1024 * 1024;

    private JdbcLobReader() { }

    public static Object read(ResultSet result, int column) throws SQLException {
        return read(result, column, false);
    }

    /** SQL Server reports MAX values as ordinary variable types; stream them before materialization. */
    public static Object read(ResultSet result, int column, boolean boundedVariableValues) throws SQLException {
        int type = result.getMetaData().getColumnType(column);
        if (type == Types.LONGVARBINARY || (boundedVariableValues && type == Types.VARBINARY)) {
            try (var input = result.getBinaryStream(column)) {
                if (input == null) return null;
                byte[] bytes = input.readNBytes(MAX_BLOB_BYTES + 1);
                checkedLength(bytes.length, MAX_BLOB_BYTES);
                return bytes;
            } catch (IOException failure) {
                JvmFailureBoundary.rethrowSuppressedFatal(failure);
                throw new ContentReadException("LOB_READ_FAILED");
            } catch (SQLException | RuntimeException | Error failure) {
                JvmFailureBoundary.rethrowSuppressedFatal(failure);
                throw failure;
            }
        }
        if (type == Types.LONGVARCHAR || (boundedVariableValues
                && (type == Types.VARCHAR || type == Types.NVARCHAR))) {
            try (var input = result.getCharacterStream(column)) {
                if (input == null) return null;
                StringBuilder text = new StringBuilder();
                char[] buffer = new char[8192];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (read == 0) throw new ContentReadException("LOB_READ_STALLED");
                    checkedLength((long) text.length() + read, MAX_CLOB_CHARACTERS);
                    text.append(buffer, 0, read);
                }
                return text.toString();
            } catch (IOException failure) {
                JvmFailureBoundary.rethrowSuppressedFatal(failure);
                throw new ContentReadException("LOB_READ_FAILED");
            } catch (SQLException | RuntimeException | Error failure) {
                JvmFailureBoundary.rethrowSuppressedFatal(failure);
                throw failure;
            }
        }
        return detach(result.getObject(column));
    }

    public static Object detach(Object value) throws SQLException {
        if (value instanceof Blob blob) {
            try {
                int length = checkedLength(blob.length(), MAX_BLOB_BYTES);
                try (var input = blob.getBinaryStream()) {
                    byte[] bytes = new byte[length];
                    if (input.readNBytes(bytes, 0, length) != length || input.read() != -1) {
                        throw new ContentReadException("LOB_LENGTH_MISMATCH");
                    }
                    return bytes;
                } catch (IOException failure) {
                    throw new ContentReadException("LOB_READ_FAILED");
                }
            } finally {
                blob.free();
            }
        }
        if (value instanceof Clob clob) {
            try {
                int length = checkedLength(clob.length(), MAX_CLOB_CHARACTERS);
                try (var input = clob.getCharacterStream()) {
                    char[] characters = new char[length];
                    int offset = 0;
                    while (offset < length) {
                        int read = input.read(characters, offset, length - offset);
                        if (read < 0) throw new ContentReadException("LOB_LENGTH_MISMATCH");
                        if (read == 0) throw new ContentReadException("LOB_READ_STALLED");
                        offset += read;
                    }
                    if (input.read() != -1) throw new ContentReadException("LOB_LENGTH_MISMATCH");
                    return new String(characters);
                } catch (IOException failure) {
                    throw new ContentReadException("LOB_READ_FAILED");
                }
            } finally {
                clob.free();
            }
        }
        return value;
    }

    public static long retainedBytes(Object value) {
        if (value instanceof byte[] bytes) return bytes.length;
        if (value instanceof String text) return 2L * text.length();
        return 64L;
    }

    private static int checkedLength(long length, int maximum) throws SQLException {
        if (length < 0 || length > maximum) throw new ContentReadException("LOB_SIZE_LIMIT_EXCEEDED");
        return (int) length;
    }

    public static void requireRowSize(long bytes) throws ContentReadException {
        if (bytes > MAX_ROW_BYTES) throw new ContentReadException("SOURCE_ROW_SIZE_LIMIT_EXCEEDED");
    }

    /** Only application-defined reason codes may cross the execution report boundary. */
    public static final class ContentReadException extends SQLException {
        private ContentReadException(String reason) { super(reason); }
        public String reason() { return getMessage(); }
    }
}
