package nuri.migration.identity;

import org.junit.jupiter.api.Test;

import javax.sql.rowset.serial.SerialBlob;
import javax.sql.rowset.serial.SerialClob;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JdbcTypedValueCodecTest {

    private final JdbcTypedValueCodec codec = new JdbcTypedValueCodec();

    @Test
    void encodesOnlyExplicitlySupportedJdbcValueFamilies() {
        assertThat(codec.encode(IdentityValueType.TEXT, "001")).isEqualTo(TypedValue.text("001"));
        assertThat(codec.encode(IdentityValueType.SIGNED_INTEGER, 42L))
                .isEqualTo(TypedValue.signedInteger(42));
        assertThat(codec.encode(IdentityValueType.UNSIGNED_INTEGER, BigInteger.TEN))
                .isEqualTo(TypedValue.unsignedInteger(BigInteger.TEN));
        assertThat(codec.encode(IdentityValueType.DECIMAL, new BigDecimal("1.00")))
                .isEqualTo(TypedValue.decimal(BigDecimal.ONE));
        assertThat(codec.encode(IdentityValueType.BOOLEAN, true)).isEqualTo(TypedValue.bool(true));
        UUID uuid = UUID.randomUUID();
        assertThat(codec.encode(IdentityValueType.UUID, uuid)).isEqualTo(TypedValue.uuid(uuid));
        assertThat(codec.encode(IdentityValueType.DATE, LocalDate.of(2026, 8, 30)))
                .isEqualTo(TypedValue.date(LocalDate.of(2026, 8, 30)));
        assertThat(codec.encode(IdentityValueType.TIME, LocalTime.of(1, 2, 3)))
                .isEqualTo(TypedValue.time(LocalTime.of(1, 2, 3)));
        assertThat(codec.encode(IdentityValueType.LOCAL_TIMESTAMP,
                Timestamp.valueOf("2026-08-30 01:02:03")))
                .isEqualTo(TypedValue.localTimestamp(LocalDateTime.of(2026, 8, 30, 1, 2, 3)));
        OffsetDateTime offset = OffsetDateTime.of(2026, 8, 30, 1, 2, 3, 0, ZoneOffset.ofHours(9));
        assertThat(codec.encode(IdentityValueType.OFFSET_TIMESTAMP, offset))
                .isEqualTo(TypedValue.offsetTimestamp(offset));
        assertThat(codec.encode(IdentityValueType.BINARY, new byte[] { 1, 2 }))
                .isEqualTo(TypedValue.binary(new byte[] { 1, 2 }));
    }

    @Test
    void rejectsNumericTruncationTimezoneGuessingLobsAndVendorToStringFallback() throws Exception {
        assertThatThrownBy(() -> codec.encode(IdentityValueType.SIGNED_INTEGER, new BigDecimal("1.5")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exact");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.DECIMAL, 1.25d))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("floating");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.OFFSET_TIMESTAMP,
                Timestamp.valueOf("2026-08-30 01:02:03")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("timezone");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.BINARY,
                new SerialBlob(new byte[] { 1 })))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LOB");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.TEXT,
                new SerialClob(new char[] { 'x' })))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LOB");

        Object deceptive = new Object() {
            @Override
            public String toString() {
                return "looks-safe";
            }
        };
        assertThatThrownBy(() -> codec.encode(IdentityValueType.TEXT, deceptive))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(deceptive.getClass().getName());
    }

    @Test
    void sqlNullIsRepresentedButRejectedByTheDefaultIdentityTuplePolicy() {
        TypedValue value = codec.encode(IdentityValueType.TEXT, null);

        assertThat(value).isEqualTo(TypedValue.nullValue());
        assertThatThrownBy(() -> TypedKeyTuple.of(value)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsEveryExplicitAlternateJdbcRepresentationWithoutStringFallback() {
        assertThat(codec.encode(IdentityValueType.TEXT, 'x')).isEqualTo(TypedValue.text("x"));
        for (Number number : new Number[] {(byte) 1, (short) 2, 3, 4L}) {
            assertThat(codec.encode(IdentityValueType.SIGNED_INTEGER, number).jdbcValue())
                    .isEqualTo(BigInteger.valueOf(number.longValue()));
            assertThat((BigDecimal) codec.encode(IdentityValueType.DECIMAL, number).jdbcValue())
                    .isEqualByComparingTo(BigDecimal.valueOf(number.longValue()));
        }
        assertThat(codec.encode(IdentityValueType.SIGNED_INTEGER, BigInteger.TEN))
                .isEqualTo(TypedValue.signedInteger(BigInteger.TEN));
        assertThat(codec.encode(IdentityValueType.SIGNED_INTEGER, new BigDecimal("10.0")))
                .isEqualTo(TypedValue.signedInteger(BigInteger.TEN));
        assertThat(codec.encode(IdentityValueType.DECIMAL, BigInteger.TEN))
                .isEqualTo(TypedValue.decimal(BigDecimal.TEN));
        assertThat(codec.encode(IdentityValueType.BOOLEAN, false)).isEqualTo(TypedValue.bool(false));

        UUID uuid = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
        assertThat(codec.encode(IdentityValueType.UUID, uuid.toString())).isEqualTo(TypedValue.uuid(uuid));
        assertThat(codec.encode(IdentityValueType.DATE, Date.valueOf("2026-08-30")))
                .isEqualTo(TypedValue.date(LocalDate.of(2026, 8, 30)));
        assertThat(codec.encode(IdentityValueType.TIME, Time.valueOf("01:02:03")))
                .isEqualTo(TypedValue.time(LocalTime.of(1, 2, 3)));
        LocalDateTime timestamp = LocalDateTime.of(2026, 8, 30, 1, 2, 3);
        assertThat(codec.encode(IdentityValueType.LOCAL_TIMESTAMP, timestamp))
                .isEqualTo(TypedValue.localTimestamp(timestamp));
    }

    @Test
    void rejectsWrongRuntimeFamilyForEveryTypedBoundary() {
        assertThatThrownBy(() -> codec.encode(IdentityValueType.SIGNED_INTEGER, "1"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("integer");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.DECIMAL, "1.0"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("decimal");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.BOOLEAN, 1))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("boolean");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.UUID, "not-a-uuid"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.encode(IdentityValueType.DATE, "2026-08-30"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("date");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.TIME, "01:02:03"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("time");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.LOCAL_TIMESTAMP, "2026-08-30T01:02:03"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("timestamp");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.OFFSET_TIMESTAMP, LocalDateTime.now()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("timezone");
        assertThatThrownBy(() -> codec.encode(IdentityValueType.BINARY, "bytes"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("binary");
    }
}
