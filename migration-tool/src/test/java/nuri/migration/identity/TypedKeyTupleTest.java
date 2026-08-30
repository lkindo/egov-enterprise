package nuri.migration.identity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TypedKeyTupleTest {

    @Test
    void decimalCanonicalFormIgnoresRepresentationalScale() {
        TypedKeyTuple left = TypedKeyTuple.of(TypedValue.decimal(new BigDecimal("1.00")));
        TypedKeyTuple right = TypedKeyTuple.of(TypedValue.decimal(new BigDecimal("1")));

        assertThat(left.canonicalBytes()).isEqualTo(right.canonicalBytes());
        assertThat(left.sha256()).isEqualTo(right.sha256());
    }

    @Test
    void binaryValueIsCanonicalAndDefensivelyCopied() {
        byte[] source = new byte[] { 0, 1, (byte) 0xff };
        TypedValue value = TypedValue.binary(source);
        source[1] = 99;

        TypedKeyTuple tuple = TypedKeyTuple.of(value);
        assertThat(tuple).isEqualTo(TypedKeyTuple.of(TypedValue.binary(new byte[] { 0, 1, (byte) 0xff })));
        assertThat(tuple).isNotEqualTo(TypedKeyTuple.of(TypedValue.binary(new byte[] { 0, 99, (byte) 0xff })));
    }

    @Test
    void offsetTimestampPreservesItsExplicitOffsetAndNeverGuessesOneForLocalTime() {
        OffsetDateTime seoul = OffsetDateTime.of(2026, 8, 30, 9, 10, 11, 123_000_000,
                ZoneOffset.ofHours(9));
        OffsetDateTime utcSameInstant = seoul.withOffsetSameInstant(ZoneOffset.UTC);

        assertThat(TypedKeyTuple.of(TypedValue.offsetTimestamp(seoul)).sha256())
                .isNotEqualTo(TypedKeyTuple.of(TypedValue.offsetTimestamp(utcSameInstant)).sha256());
        assertThat(TypedKeyTuple.of(TypedValue.localTimestamp(seoul.toLocalDateTime())).sha256())
                .isNotEqualTo(TypedKeyTuple.of(TypedValue.offsetTimestamp(seoul)).sha256());
    }

    @Test
    void compositeOrderAndTypeTagsArePartOfIdentity() {
        TypedKeyTuple first = TypedKeyTuple.of(TypedValue.text("10"), TypedValue.signedInteger(20));
        TypedKeyTuple reversed = TypedKeyTuple.of(TypedValue.signedInteger(20), TypedValue.text("10"));
        TypedKeyTuple differentType = TypedKeyTuple.of(TypedValue.signedInteger(10), TypedValue.signedInteger(20));

        assertThat(first.sha256()).isNotEqualTo(reversed.sha256());
        assertThat(first.sha256()).isNotEqualTo(differentType.sha256());
    }

    @Test
    void lengthPrefixPreventsDelimiterCollisions() {
        TypedKeyTuple left = TypedKeyTuple.of(TypedValue.text("a|b"), TypedValue.text("c"));
        TypedKeyTuple right = TypedKeyTuple.of(TypedValue.text("a"), TypedValue.text("b|c"));

        assertThat(left.canonicalBytes()).isNotEqualTo(right.canonicalBytes());
        assertThat(left.sha256()).isNotEqualTo(right.sha256());
    }

    @Test
    void nullRequiresAnExplicitTuplePolicy() {
        assertThatThrownBy(() -> TypedKeyTuple.of(TypedValue.nullValue()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("null");

        TypedKeyTuple tuple = TypedKeyTuple.of(TypedKeyTuple.NullPolicy.ALLOW,
                TypedValue.text("tenant"), TypedValue.nullValue());
        assertThat(tuple.values()).containsExactly(TypedValue.text("tenant"), TypedValue.nullValue());
        assertThat(tuple.nullPolicy()).isEqualTo(TypedKeyTuple.NullPolicy.ALLOW);
    }

    @Test
    void tupleCannotBeEmpty() {
        assertThatThrownBy(TypedKeyTuple::of)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }
}
