package nuri.migration.identity;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** 명시된 identity 타입과 허용 JDBC 클래스 조합만 canonical {@link TypedValue}로 바꾼다. */
public final class JdbcTypedValueCodec {

    public TypedValue encode(IdentityValueType type, Object value) {
        Objects.requireNonNull(type, "identity value type");
        if (value == null) {
            return TypedValue.nullValue();
        }
        if (value instanceof Blob || value instanceof Clob) {
            throw unsupported(type, value, "LOB streaming identity is unsupported");
        }
        return switch (type) {
            case TEXT -> TypedValue.text(text(value));
            case SIGNED_INTEGER -> TypedValue.signedInteger(exactInteger(value));
            case UNSIGNED_INTEGER -> TypedValue.unsignedInteger(exactInteger(value));
            case DECIMAL -> TypedValue.decimal(decimal(value));
            case BOOLEAN -> TypedValue.bool(booleanValue(value));
            case UUID -> TypedValue.uuid(uuid(value));
            case DATE -> TypedValue.date(date(value));
            case TIME -> TypedValue.time(time(value));
            case LOCAL_TIMESTAMP -> TypedValue.localTimestamp(localTimestamp(value));
            case OFFSET_TIMESTAMP -> TypedValue.offsetTimestamp(offsetTimestamp(value));
            case BINARY -> TypedValue.binary(binary(value));
        };
    }

    private static String text(Object value) {
        if (value instanceof String string) {
            return string;
        }
        if (value instanceof Character character) {
            return String.valueOf(character);
        }
        throw unsupported(IdentityValueType.TEXT, value, "only String/Character are supported");
    }

    private static BigInteger exactInteger(Object value) {
        if (value instanceof BigInteger integer) {
            return integer;
        }
        if (value instanceof Byte || value instanceof Short
                || value instanceof Integer || value instanceof Long) {
            return BigInteger.valueOf(((Number) value).longValue());
        }
        if (value instanceof BigDecimal decimal) {
            try {
                return decimal.toBigIntegerExact();
            } catch (ArithmeticException e) {
                throw new IllegalArgumentException("identity integer requires an exact integral value", e);
            }
        }
        throw unsupported(IdentityValueType.SIGNED_INTEGER, value,
                "integer identity requires an exact integral JDBC class");
    }

    private static BigDecimal decimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof BigInteger integer) {
            return new BigDecimal(integer);
        }
        if (value instanceof Byte || value instanceof Short
                || value instanceof Integer || value instanceof Long) {
            return BigDecimal.valueOf(((Number) value).longValue());
        }
        if (value instanceof Float || value instanceof Double) {
            throw unsupported(IdentityValueType.DECIMAL, value,
                    "binary floating values are not accepted for exact decimal identity");
        }
        throw unsupported(IdentityValueType.DECIMAL, value, "unsupported exact decimal JDBC class");
    }

    private static boolean booleanValue(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        throw unsupported(IdentityValueType.BOOLEAN, value,
                "boolean identity does not guess Y/N or numeric flags");
    }

    private static UUID uuid(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }
        if (value instanceof String string) {
            return UUID.fromString(string);
        }
        throw unsupported(IdentityValueType.UUID, value, "UUID requires UUID or canonical String");
    }

    private static LocalDate date(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        throw unsupported(IdentityValueType.DATE, value, "date requires LocalDate/java.sql.Date");
    }

    private static LocalTime time(Object value) {
        if (value instanceof LocalTime localTime) {
            return localTime;
        }
        if (value instanceof Time sqlTime) {
            return sqlTime.toLocalTime();
        }
        throw unsupported(IdentityValueType.TIME, value, "time requires LocalTime/java.sql.Time");
    }

    private static LocalDateTime localTimestamp(Object value) {
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        throw unsupported(IdentityValueType.LOCAL_TIMESTAMP, value,
                "local timestamp requires LocalDateTime/java.sql.Timestamp");
    }

    private static OffsetDateTime offsetTimestamp(Object value) {
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        throw unsupported(IdentityValueType.OFFSET_TIMESTAMP, value,
                "timezone offset must be explicit; Timestamp/LocalDateTime are rejected");
    }

    private static byte[] binary(Object value) {
        if (value instanceof byte[] bytes) {
            return bytes;
        }
        throw unsupported(IdentityValueType.BINARY, value, "binary identity requires byte[]; LOB is unsupported");
    }

    private static IllegalArgumentException unsupported(
            IdentityValueType type,
            Object value,
            String reason
    ) {
        return new IllegalArgumentException(type.externalName() + " identity cannot encode JDBC class "
                + value.getClass().getName() + ": " + reason);
    }
}
