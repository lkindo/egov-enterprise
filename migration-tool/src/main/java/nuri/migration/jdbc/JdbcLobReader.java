package nuri.migration.jdbc;

import java.io.IOException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
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
        ResultSetMetaData metadata = result.getMetaData();
        int type = metadata.getColumnType(column);
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
        return detach(scalar(result, column, metadata, type));
    }

    /**
     * LOB 를 풀지 않고 값 하나를 읽는다. 시각 값을 드라이버 고유 객체로 주는 드라이버는 {@link java.sql.Timestamp} 로 읽는다 —
     * Oracle {@code TIMESTAMP(n)} 은 {@code getObject} 로 {@code oracle.sql.TIMESTAMP} 가 와서 도메인 변환기·보관 덤프·
     * 프로파일러가 시각으로 보지 못했다(ADR-0029 L4-B R1). 바꾸는 것은 JDBC 타입이 {@code TIMESTAMP} 이고 드라이버가 알린 값
     * 클래스가 {@code java.} 밖일 때뿐이다. {@code java.} 클래스로 알리는 값(MySQL 의 {@code LocalDateTime} 등)과 클래스를
     * 알리지 않는 드라이버는 {@code getObject} 그대로다. 같은 표의 값을 읽는 경로(본 읽기·정렬 경계·자기참조 키·프로파일러)는
     * 이 메서드를 함께 써야 정렬 digest 가 같은 표기를 본다.
     */
    public static Object scalar(ResultSet result, int column) throws SQLException {
        ResultSetMetaData metadata = result.getMetaData();
        return scalar(result, column, metadata, metadata.getColumnType(column));
    }

    private static Object scalar(ResultSet result, int column, ResultSetMetaData metadata, int type)
            throws SQLException {
        if (type == Types.TIMESTAMP) {
            String reported = metadata.getColumnClassName(column);
            if (reported != null && !reported.startsWith("java.")) {
                return result.getTimestamp(column);
            }
        }
        return result.getObject(column);
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
