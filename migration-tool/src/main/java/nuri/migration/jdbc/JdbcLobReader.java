package nuri.migration.jdbc;

import java.io.IOException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLFeatureNotSupportedException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.Locale;

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
     * LOB 를 풀지 않고 값 하나를 읽는다. 시각 값을 드라이버 고유 객체로 주는 드라이버는 {@link Timestamp} 로 바꾼다 —
     * Oracle {@code TIMESTAMP(n)} 은 {@code getObject} 로 {@code oracle.sql.TIMESTAMP} 가 와서 도메인 변환기·보관 덤프·
     * 프로파일러가 시각으로 보지 못했다(ADR-0029 L4-B R1). 바꾸는 것은 JDBC 타입이 {@code TIMESTAMP} 이고 드라이버가 알린 값
     * 클래스가 {@code java.} 밖이며 타입 이름이 시간대를 말하지 않을 때뿐이다. {@code java.} 클래스로 알리는 값(MySQL 의
     * {@code LocalDateTime} 등), 클래스를 알리지 않거나 알리지 못하는 드라이버, 시간대 있는 타입은 {@code getObject} 그대로다.
     *
     * <p>드라이버가 준 지역 일시({@code getObject(…, LocalDateTime.class)})를 JVM 기본 시간대의 {@link Timestamp} 로 바꾼다.
     * 그 시간대에 없는 시각(일광절약 간격, 예: Asia/Seoul 1987-05-10 02:30)은 {@link Timestamp} 가 한 시간 뒤로 밀어 값이
     * 바뀌고, 정렬 키라면 keyset 커서가 그 사이 행을 건너뛴다. 그래서 바꾸지 않고 {@code LOCAL_TIMESTAMP_IN_ZONE_GAP} 으로
     * 멈춘다 — 고정 오프셋 시간대(예: {@code -Duser.timezone=UTC})로 실행하면 간격이 없다. 지역 일시를 주지 못하는 드라이버는
     * {@code getObject} 그대로다(L4-B 전과 같다).</p>
     *
     * <p>같은 표의 값을 읽는 경로(본 읽기·정렬 경계·자기참조 키·프로파일러)는 이 메서드를 함께 써야 정렬 digest 가 같은
     * 표기를 본다.</p>
     */
    public static Object scalar(ResultSet result, int column) throws SQLException {
        ResultSetMetaData metadata = result.getMetaData();
        return scalar(result, column, metadata, metadata.getColumnType(column));
    }

    private static Object scalar(ResultSet result, int column, ResultSetMetaData metadata, int type)
            throws SQLException {
        if (type != Types.TIMESTAMP || !driverSpecificLocalTimestamp(metadata, column)) {
            return result.getObject(column);
        }
        LocalDateTime local;
        try {
            local = result.getObject(column, LocalDateTime.class);
        } catch (SQLFeatureNotSupportedException unsupported) {
            return result.getObject(column);
        }
        if (local == null) {
            return null;
        }
        Timestamp timestamp = Timestamp.valueOf(local);
        if (!timestamp.toLocalDateTime().equals(local)) {
            throw new ContentReadException("LOCAL_TIMESTAMP_IN_ZONE_GAP");
        }
        return timestamp;
    }

    /** 드라이버 고유 클래스로 알리는 시간대 없는 일시인가. 알리지 못하는 드라이버는 아니라고 본다. */
    private static boolean driverSpecificLocalTimestamp(ResultSetMetaData metadata, int column) throws SQLException {
        String reported;
        try {
            reported = metadata.getColumnClassName(column);
        } catch (SQLFeatureNotSupportedException unsupported) {
            return false;
        }
        if (reported == null || reported.startsWith("java.")) {
            return false;
        }
        String typeName;
        try {
            typeName = metadata.getColumnTypeName(column);
        } catch (SQLFeatureNotSupportedException unsupported) {
            return false;
        }
        // 시간대 있는 값을 TIMESTAMP 로 알리는 드라이버가 있어도 지역 일시로 바꾸지 않는다 — 오프셋을 잃는다. Oracle 은 시간대
        // 타입을 -101·-102 로 따로 알려 여기 오지 않는다(23.26.3 실측). 다른 드라이버의 표기는 확인하지 않았다.
        String name = typeName == null ? "" : typeName.toLowerCase(Locale.ROOT);
        return !name.contains("zone") && !name.endsWith("tz");
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
