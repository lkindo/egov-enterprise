package nuri.migration.identity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TypedValueCanonicalTest {

    @Test
    void everySupportedKindRoundTripsThroughTheVersionedCanonicalBoundary() {
        List<TypedValue> values = List.of(
                TypedValue.nullValue(),
                TypedValue.bool(false),
                TypedValue.bool(true),
                TypedValue.signedInteger(-42),
                TypedValue.unsignedInteger(42),
                TypedValue.unsignedInteger(BigInteger.valueOf(43)),
                TypedValue.decimal(BigDecimal.ZERO),
                TypedValue.decimal(new BigDecimal("12.3400")),
                TypedValue.text("한글|text"),
                TypedValue.uuid(UUID.fromString("123e4567-e89b-12d3-a456-426614174000")),
                TypedValue.date(LocalDate.of(2026, 8, 30)),
                TypedValue.time(LocalTime.of(1, 2, 3, 456_000_000)),
                TypedValue.localTimestamp(LocalDateTime.of(2026, 8, 30, 1, 2, 3)),
                TypedValue.offsetTimestamp(OffsetDateTime.of(
                        2026, 8, 30, 1, 2, 3, 0, ZoneOffset.ofHours(9))),
                TypedValue.binary(new byte[] {0, 1, (byte) 0xff}));

        for (TypedValue value : values) {
            TypedValue decoded = TypedValue.fromCanonicalBytes(value.canonicalBytes());
            assertThat(decoded).isEqualTo(value);
            assertThat(decoded.kind()).isEqualTo(value.kind());
            assertThat(decoded.hashCode()).isEqualTo(value.hashCode());
            assertThat(decoded.toString()).contains(value.kind().name(), "payloadBytes=");
            if (value.kind() == TypedValue.Kind.BINARY) {
                byte[] first = (byte[]) decoded.jdbcValue();
                byte[] second = (byte[]) decoded.jdbcValue();
                assertThat(first).containsExactly(second).isNotSameAs(second);
            } else {
                assertThat(decoded.jdbcValue()).isEqualTo(value.jdbcValue());
            }
        }

        assertThat(TypedValue.text("same")).isEqualTo(TypedValue.text("same"));
        assertThat(TypedValue.text("same")).isNotEqualTo(TypedValue.signedInteger(1));
        assertThat(TypedValue.text("same")).isNotEqualTo(TypedValue.text("different"));
        assertThat(TypedValue.text("same")).isNotEqualTo("same");
    }

    @Test
    void malformedCanonicalHeadersLengthsAndBooleanPayloadsFailClosed() {
        byte[] text = TypedValue.text("x").canonicalBytes();
        byte[] badVersion = text.clone();
        badVersion[0] = 99;
        byte[] badKind = text.clone();
        badKind[1] = 99;
        byte[] negativeLength = text.clone();
        ByteBuffer.wrap(negativeLength).putInt(2, -1);
        byte[] oversizedLength = text.clone();
        ByteBuffer.wrap(oversizedLength).putInt(2, 2);
        byte[] trailing = Arrays.copyOf(text, text.length + 1);

        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(badVersion))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("version");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(badKind))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("kind code");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(negativeLength))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("payload length");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(oversizedLength))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("payload length");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(trailing))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("trailing");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("encoding");

        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(raw(TypedValue.bool(true), new byte[0])))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("length");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(raw(TypedValue.bool(true), new byte[] {2})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("boolean");
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(raw(TypedValue.nullValue(), new byte[] {0})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("length");
    }

    @Test
    void malformedPayloadForEachStructuredKindIsRejectedAtDecodeTime() {
        assertMalformed(TypedValue.signedInteger(1), "not-an-integer");
        assertMalformed(TypedValue.unsignedInteger(1), "-1");
        assertMalformed(TypedValue.decimal(BigDecimal.ONE), "not-a-decimal");
        assertMalformed(TypedValue.uuid(UUID.randomUUID()), "not-a-uuid");
        assertMalformed(TypedValue.date(LocalDate.now()), "2026-99-99");
        assertMalformed(TypedValue.time(LocalTime.NOON), "99:99:99");
        assertMalformed(TypedValue.localTimestamp(LocalDateTime.now()), "not-a-local-timestamp");
        assertMalformed(TypedValue.offsetTimestamp(OffsetDateTime.now()), "2026-08-30T01:02:03");

        assertThatThrownBy(() -> TypedValue.unsignedInteger(BigInteger.valueOf(-1)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("negative");
    }

    private static void assertMalformed(TypedValue template, String payload) {
        assertThatThrownBy(() -> TypedValue.fromCanonicalBytes(raw(
                template, payload.getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static byte[] raw(TypedValue template, byte[] payload) {
        byte kind = template.canonicalBytes()[1];
        ByteBuffer buffer = ByteBuffer.allocate(6 + payload.length);
        buffer.put((byte) 1).put(kind).putInt(payload.length).put(payload);
        return buffer.array();
    }
}
