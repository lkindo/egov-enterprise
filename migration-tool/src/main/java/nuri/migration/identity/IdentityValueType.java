package nuri.migration.identity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/** mapping identity DSL에서 JDBC 값을 임의 추측 없이 canonical 값으로 바꾸기 위한 허용 타입. */
public enum IdentityValueType {
    TEXT,
    SIGNED_INTEGER,
    UNSIGNED_INTEGER,
    DECIMAL,
    BOOLEAN,
    UUID,
    DATE,
    TIME,
    LOCAL_TIMESTAMP,
    OFFSET_TIMESTAMP,
    BINARY;

    @JsonCreator
    public static IdentityValueType parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("identity component type must not be blank");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("unsupported identity component type: " + value, e);
        }
    }

    @JsonValue
    public String externalName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
