package nuri.migration.identity;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Objects;
import java.util.UUID;

/**
 * 키맵과 checkpoint에서 사용할 타입 태그 포함 불변 값.
 *
 * <p>임의 JDBC 객체를 받는 범용 factory를 의도적으로 제공하지 않는다. 지원하는 값은 명시적
 * factory에서만 만들 수 있어 벤더 객체의 {@code toString()} 결과가 영속 identity가 되지 않는다.
 */
public final class TypedValue {

    /** code는 선언 순서와 무관한 canonical wire tag다. 기존 code를 재사용하면 안 된다. */
    public enum Kind {
        NULL(0),
        BOOLEAN(1),
        SIGNED_INTEGER(2),
        UNSIGNED_INTEGER(3),
        DECIMAL(4),
        TEXT(5),
        UUID(6),
        DATE(7),
        TIME(8),
        LOCAL_TIMESTAMP(9),
        OFFSET_TIMESTAMP(10),
        BINARY(11);

        private final int code;

        Kind(int code) {
            this.code = code;
        }

        private static Kind fromCode(int code) {
            for (Kind kind : values()) {
                if (kind.code == code) {
                    return kind;
                }
            }
            throw new IllegalArgumentException("unknown typed value kind code: " + code);
        }
    }

    private static final byte CANONICAL_VERSION = 1;

    private final Kind kind;
    private final byte[] payload;

    private TypedValue(Kind kind, byte[] payload) {
        this.kind = Objects.requireNonNull(kind, "kind");
        this.payload = Objects.requireNonNull(payload, "payload").clone();
    }

    public static TypedValue nullValue() {
        return new TypedValue(Kind.NULL, new byte[0]);
    }

    public static TypedValue bool(boolean value) {
        return new TypedValue(Kind.BOOLEAN, new byte[] { value ? (byte) 1 : (byte) 0 });
    }

    public static TypedValue signedInteger(long value) {
        return signedInteger(BigInteger.valueOf(value));
    }

    public static TypedValue signedInteger(BigInteger value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.SIGNED_INTEGER, value.toString(10));
    }

    public static TypedValue unsignedInteger(long value) {
        return unsignedInteger(BigInteger.valueOf(value));
    }

    public static TypedValue unsignedInteger(BigInteger value) {
        Objects.requireNonNull(value, "value");
        if (value.signum() < 0) {
            throw new IllegalArgumentException("unsigned integer must not be negative");
        }
        return utf8(Kind.UNSIGNED_INTEGER, value.toString(10));
    }

    public static TypedValue decimal(BigDecimal value) {
        Objects.requireNonNull(value, "value");
        BigDecimal normalized = value.signum() == 0 ? BigDecimal.ZERO : value.stripTrailingZeros();
        return utf8(Kind.DECIMAL, normalized.toPlainString());
    }

    public static TypedValue text(String value) {
        return utf8(Kind.TEXT, Objects.requireNonNull(value, "value"));
    }

    public static TypedValue uuid(UUID value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.UUID, value.toString().toLowerCase(java.util.Locale.ROOT));
    }

    public static TypedValue date(LocalDate value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.DATE, DateTimeFormatter.ISO_LOCAL_DATE.format(value));
    }

    public static TypedValue time(LocalTime value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.TIME, DateTimeFormatter.ISO_LOCAL_TIME.format(value));
    }

    public static TypedValue localTimestamp(LocalDateTime value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.LOCAL_TIMESTAMP, DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(value));
    }

    /** 명시된 offset을 UTC로 바꾸지 않고 보존한다. */
    public static TypedValue offsetTimestamp(OffsetDateTime value) {
        Objects.requireNonNull(value, "value");
        return utf8(Kind.OFFSET_TIMESTAMP, DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(value));
    }

    public static TypedValue binary(byte[] value) {
        return new TypedValue(Kind.BINARY, Objects.requireNonNull(value, "value"));
    }

    public Kind kind() {
        return kind;
    }

    public boolean isNull() {
        return kind == Kind.NULL;
    }

    /** 타입 code와 길이 prefix를 포함한 versioned canonical byte encoding. */
    public byte[] canonicalBytes() {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(payload.length + 6);
            try (DataOutputStream output = new DataOutputStream(bytes)) {
                output.writeByte(CANONICAL_VERSION);
                output.writeByte(kind.code);
                output.writeInt(payload.length);
                output.write(payload);
            }
            return bytes.toByteArray();
        } catch (IOException impossible) {
            throw new IllegalStateException("in-memory typed value encoding failed", impossible);
        }
    }

    /** canonical payload를 검증하며 복원한다. trailing byte와 알 수 없는 version/type은 거부한다. */
    public static TypedValue fromCanonicalBytes(byte[] encoded) {
        Objects.requireNonNull(encoded, "encoded");
        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(encoded))) {
            int version = input.readUnsignedByte();
            if (version != CANONICAL_VERSION) {
                throw new IllegalArgumentException("unknown typed value canonical version: " + version);
            }
            Kind kind = Kind.fromCode(input.readUnsignedByte());
            int length = input.readInt();
            if (length < 0 || length > input.available()) {
                throw new IllegalArgumentException("invalid typed value canonical payload length");
            }
            byte[] payload = input.readNBytes(length);
            if (payload.length != length || input.available() != 0) {
                throw new IllegalArgumentException("invalid typed value canonical trailing data");
            }
            TypedValue value = new TypedValue(kind, payload);
            value.jdbcValue(); // kind별 payload 형식도 즉시 검증한다.
            return value;
        } catch (IOException e) {
            throw new IllegalArgumentException("invalid typed value canonical encoding", e);
        }
    }

    /** JDBC binding에 사용할 canonical Java 값. 배열은 호출마다 복사한다. */
    public Object jdbcValue() {
        String text = kind == Kind.BINARY || kind == Kind.BOOLEAN || kind == Kind.NULL
                ? null : new String(payload, StandardCharsets.UTF_8);
        try {
            return switch (kind) {
                case NULL -> {
                    requirePayloadLength(0);
                    yield null;
                }
                case BOOLEAN -> {
                    requirePayloadLength(1);
                    if (payload[0] != 0 && payload[0] != 1) {
                        throw new IllegalArgumentException("invalid boolean canonical payload");
                    }
                    yield payload[0] == 1;
                }
                case SIGNED_INTEGER -> new BigInteger(text);
                case UNSIGNED_INTEGER -> {
                    BigInteger integer = new BigInteger(text);
                    if (integer.signum() < 0) {
                        throw new IllegalArgumentException("unsigned canonical payload must not be negative");
                    }
                    yield integer;
                }
                case DECIMAL -> new BigDecimal(text);
                case TEXT -> text;
                case UUID -> java.util.UUID.fromString(text);
                case DATE -> LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE);
                case TIME -> LocalTime.parse(text, DateTimeFormatter.ISO_LOCAL_TIME);
                case LOCAL_TIMESTAMP -> LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                case OFFSET_TIMESTAMP -> OffsetDateTime.parse(text, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                case BINARY -> payload.clone();
            };
        } catch (RuntimeException e) {
            if (e instanceof IllegalArgumentException) {
                throw e;
            }
            throw new IllegalArgumentException("invalid " + kind + " canonical payload", e);
        }
    }

    private void requirePayloadLength(int expected) {
        if (payload.length != expected) {
            throw new IllegalArgumentException(kind + " canonical payload length must be " + expected);
        }
    }

    private static TypedValue utf8(Kind kind, String value) {
        return new TypedValue(kind, value.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        return other instanceof TypedValue that
                && kind == that.kind
                && Arrays.equals(payload, that.payload);
    }

    @Override
    public int hashCode() {
        return 31 * kind.hashCode() + Arrays.hashCode(payload);
    }

    @Override
    public String toString() {
        return "TypedValue[" + kind + ", payloadBytes=" + payload.length + ']';
    }
}
