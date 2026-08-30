package nuri.migration.postgres;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

/**
 * PostgreSQL identifier 한 segment. 모든 출력은 quote하므로 예약어, 대소문자, 비ASCII 이름을 보존한다.
 *
 * <p>점으로 연결된 문자열이나 SQL 조각은 받지 않는다. schema/table 분리는
 * {@link PostgresQualifiedName}에서 구조적으로 표현한다.
 */
public final class PostgresIdentifier {

    private static final int MAX_IDENTIFIER_BYTES = 63;

    private final String value;

    private PostgresIdentifier(String value) {
        this.value = validate(value);
    }

    public static PostgresIdentifier of(String value) {
        return new PostgresIdentifier(value);
    }

    public String value() {
        return value;
    }

    public String sql() {
        return '"' + value + '"';
    }

    private static String validate(String value) {
        Objects.requireNonNull(value, "identifier");
        if (value.isEmpty()) {
            throw new IllegalArgumentException("PostgreSQL identifier must not be empty");
        }
        if (value.getBytes(StandardCharsets.UTF_8).length > MAX_IDENTIFIER_BYTES) {
            throw new IllegalArgumentException("PostgreSQL identifier exceeds 63 UTF-8 bytes");
        }
        int index = 0;
        int first = value.codePointAt(index);
        if (first != '_' && !Character.isLetter(first)) {
            throw new IllegalArgumentException("PostgreSQL identifier has an unsafe first character");
        }
        index += Character.charCount(first);
        while (index < value.length()) {
            int codePoint = value.codePointAt(index);
            if (codePoint != '_' && codePoint != '$' && !Character.isLetterOrDigit(codePoint)) {
                throw new IllegalArgumentException("PostgreSQL identifier contains an unsafe character");
            }
            index += Character.charCount(codePoint);
        }
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof PostgresIdentifier that && value.equals(that.value);
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }

    @Override
    public String toString() {
        return sql();
    }
}
