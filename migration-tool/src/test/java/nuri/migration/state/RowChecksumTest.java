package nuri.migration.state;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.NClob;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@ResourceLock("java.util.TimeZone.default")
class RowChecksumTest {

    /** [ADR-0029 L4 D2] 대사의 표본·코드 비교가 체크섬과 같은 정규형을 쓴다. 이진 값은 체크섬과 같은 base64 표기다. */
    @Test
    void canonicalValueMatchesTheChecksumSpelling() {
        assertThat(RowChecksum.canonicalValue(null)).isEqualTo("<null>");
        assertThat(RowChecksum.canonicalValue(new BigDecimal("1.50"))).isEqualTo("1.5");
        assertThat(RowChecksum.canonicalValue(LocalDateTime.of(2024, 1, 31, 10, 0)))
                .isEqualTo(Timestamp.valueOf("2024-01-31 10:00:00").toString());
        assertThat(RowChecksum.canonicalValue(new byte[]{1, 2, 3})).isEqualTo("base64:AQID");
        assertThatThrownBy(() -> RowChecksum.canonicalValue(mock(Clob.class)))
                .hasMessage("LOB_CONTENT_NOT_MATERIALIZED");
    }

    @Test
    void keyDiagnosticsAreKeyedPerProcessSoSmallKeySpacesCannotBeReversed() throws Exception {
        String rrno = "8001011234567";
        String unsalted = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(rrno.getBytes(StandardCharsets.UTF_8)));

        assertThat(KeyDiagnostics.digest(rrno))
                .matches("[0-9a-f]{64}")
                .as("같은 실행 안에서는 같은 키를 대조할 수 있다").isEqualTo(KeyDiagnostics.digest(rrno))
                .as("소금 없는 SHA-256 이면 주민번호를 전수 대입으로 되찾는다").isNotEqualTo(unsalted)
                .isNotEqualTo(KeyDiagnostics.digest("8001011234568"));
        assertThat(KeyDiagnostics.digest(null)).isEqualTo("<null>");
    }

    @Test
    void preservesTheDurableScalarChecksumAndCaseInsensitiveColumnLookup() throws Exception {
        List<String> columns = List.of("ID", "amount", "ACTIVE", "label", "created", "missing");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", 42L);
        row.put("AMOUNT", new BigDecimal("100.00"));
        row.put("active", true);
        row.put("Label", "한글:|🙂");
        row.put("created", LocalDate.of(2026, 9, 15));
        row.put("unmapped", "ignored");

        assertThat(RowChecksum.calculate(columns, row))
                .isEqualTo("b31abddbb33561fb1694f88efdf521637b05e4f10291fbf230509d0d4dad5d08")
                .isEqualTo(legacyChecksum(columns, row));
    }

    @Test
    void preservesNullEmptyTextAndEmptyBinaryAsDistinctValues() throws Exception {
        String nullChecksum = checksum(null);
        String emptyTextChecksum = checksum("");
        String emptyBinaryChecksum = checksum(new byte[0]);

        assertThat(List.of(nullChecksum, emptyTextChecksum, emptyBinaryChecksum)).doesNotHaveDuplicates();
        assertThat(nullChecksum).isEqualTo(legacyChecksum(null));
        assertThat(emptyTextChecksum).isEqualTo(legacyChecksum(""));
        assertThat(emptyBinaryChecksum).isEqualTo(legacyChecksum(new byte[0]));
    }

    @Test
    void preservesDecimalAndOtherScalarCanonicalization() throws Exception {
        for (Object value : List.of(new BigDecimal("0.000"), new BigDecimal("-1.2300"),
                new BigDecimal("1E+20"), -42, 3.25d, false, LocalDate.of(2000, 1, 1))) {
            assertThat(checksum(value)).isEqualTo(legacyChecksum(value));
        }
        assertThat(checksum(new BigDecimal("100.00"))).isEqualTo(checksum(100));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "2026-09-15 12:34:00.0",
            "2026-09-15 12:34:56.000000001",
            "2026-09-15 12:34:56.00000001",
            "2026-09-15 12:34:56.0000001",
            "2026-09-15 12:34:56.000001",
            "2026-09-15 12:34:56.001",
            "2026-09-15 12:34:56.1",
            "2026-09-15 12:34:56.123456",
            "2026-09-15 12:34:56.999999999"
    })
    void localDateTimeMatchesFixedFractionSpellingAndExistingJdbcTimestampCheckpoints(String spelling) throws Exception {
        LocalDateTime value = LocalDateTime.parse(spelling.replace(' ', 'T'));
        Timestamp jdbc = Timestamp.valueOf(spelling);

        assertThat(jdbc.toString()).isEqualTo(spelling);
        assertThat(checksum(jdbc)).isEqualTo(legacyChecksum(jdbc));
        assertThat(checksum(value)).isEqualTo(legacyChecksum(jdbc)).isEqualTo(legacyChecksum(spelling));
    }

    @Test
    void localDateTimeChecksumsDetectAMicrosecondChange() throws Exception {
        LocalDateTime value = LocalDateTime.of(2026, 9, 15, 12, 34, 56, 123456000);
        String original = checksum(value);

        assertThat(original).isEqualTo(legacyChecksum("2026-09-15 12:34:56.123456"));
        assertThat(checksum(value.plusNanos(1000))).isNotEqualTo(original)
                .isEqualTo(legacyChecksum("2026-09-15 12:34:56.123457"));
    }

    @Test
    void localDateTimeChecksumDoesNotDependOnDefaultTimezoneEvenInsideADaylightSavingGap() throws Exception {
        TimeZone original = TimeZone.getDefault();
        LocalDateTime gap = LocalDateTime.of(2026, 3, 8, 2, 30, 0, 123456000);
        LocalDateTime overlap = LocalDateTime.of(2026, 11, 1, 1, 30, 0);
        String expectedGap = legacyChecksum("2026-03-08 02:30:00.123456");
        String expectedOverlap = legacyChecksum("2026-11-01 01:30:00.0");
        try {
            for (String zone : List.of("UTC", "Asia/Seoul", "America/New_York", "Europe/Berlin")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone));
                assertThat(checksum(gap)).as("local wall time inside a DST gap: %s", zone).isEqualTo(expectedGap);
                assertThat(checksum(overlap)).as("local wall time inside a DST overlap: %s", zone).isEqualTo(expectedOverlap);
            }
        } finally {
            TimeZone.setDefault(original);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 3, 4, 5, 6, 8191, 8192, 8193, 16383, 16384, 16385})
    void preservesPaddedBase64AcrossEncodingBoundaries(int length) throws Exception {
        byte[] value = binary(length);

        assertThat(checksum(value)).isEqualTo(legacyChecksum(value));
    }

    @ParameterizedTest
    @ValueSource(ints = {2047, 2048, 2049, 8190, 8191, 8192, 8193, 16383})
    void preservesUtf8AndSurrogatePairsAcrossEncodingBoundaries(int prefixLength) throws Exception {
        for (String value : List.of("a".repeat(prefixLength) + "🙂한글-é-끝",
                "한".repeat(prefixLength) + "🙂é끝",
                "a".repeat(prefixLength) + "\uD800\uD800\uDC00\uDC00끝\uD800")) {
            assertThat(checksum(value)).isEqualTo(legacyChecksum(value));
        }
    }

    @Test
    void preservesUtf8ReplacementForMalformedSurrogatesAndEveryUtf16CodeUnit() throws Exception {
        char[] characters = new char[Character.MAX_VALUE + 1];
        for (int index = 0; index < characters.length; index++) {
            characters[index] = (char) index;
        }
        assertThat(checksum(new String(characters))).isEqualTo(legacyChecksum(new String(characters)));
        assertThat(checksum("a".repeat(8191) + "\uD800"))
                .isEqualTo(checksum("a".repeat(8191) + "?"));
    }

    @Test
    void preservesLargeBinaryContentAndDetectsALastByteChange() throws Exception {
        byte[] value = binary(3 * 1024 * 1024 + 2);
        String checksum = checksum(value);

        assertThat(checksum).isEqualTo(legacyChecksum(value));
        value[value.length - 1] ^= 1;
        assertThat(checksum(value)).isNotEqualTo(checksum).isEqualTo(legacyChecksum(value));
    }

    @Test
    void preservesLargeUnicodeContentAndDetectsALastCharacterChange() throws Exception {
        String value = "한글-é-🙂-".repeat(384 * 1024);
        String checksum = checksum(value);

        assertThat(checksum).isEqualTo(legacyChecksum(value));
        String changed = value.substring(0, value.length() - 1) + "!";
        assertThat(checksum(changed)).isNotEqualTo(checksum).isEqualTo(legacyChecksum(changed));
    }

    @Test
    void rejectsJdbcLobLocatorsWithoutReadingOrStringifyingThem() {
        for (Object value : List.of(mock(Blob.class), mock(Clob.class), mock(NClob.class))) {
            assertThatThrownBy(() -> checksum(value))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("LOB_CONTENT_NOT_MATERIALIZED");
            verifyNoInteractions(value);
        }
    }

    private static byte[] binary(int length) {
        byte[] bytes = new byte[length];
        for (int index = 0; index < bytes.length; index++) {
            bytes[index] = (byte) (index * 31 + 7);
        }
        return bytes;
    }

    private static String checksum(Object value) {
        return RowChecksum.calculate(List.of("payload"), row(value));
    }

    private static Map<String, Object> row(Object value) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("payload", value);
        return row;
    }

    private static String legacyChecksum(Object value) throws Exception {
        return legacyChecksum(List.of("payload"), row(value));
    }

    /** Independent eager format oracle: checkpoints written before streaming must remain resumable. */
    private static String legacyChecksum(List<String> columns, Map<String, ?> row) throws Exception {
        Map<String, Object> normalized = new LinkedHashMap<>();
        row.forEach((key, value) -> normalized.put(key.toLowerCase(Locale.ROOT), value));
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (String column : columns) {
            String name = column.toLowerCase(Locale.ROOT);
            Object value = normalized.get(name);
            String canonical;
            if (value == null) {
                canonical = "<null>";
            } else if (value instanceof byte[] bytes) {
                canonical = "base64:" + Base64.getEncoder().encodeToString(bytes);
            } else if (value instanceof BigDecimal decimal) {
                canonical = decimal.stripTrailingZeros().toPlainString();
            } else {
                canonical = value.toString();
            }
            for (String field : List.of(name, canonical)) {
                byte[] bytes = field.getBytes(StandardCharsets.UTF_8);
                digest.update(Integer.toString(bytes.length).getBytes(StandardCharsets.US_ASCII));
                digest.update((byte) ':');
                digest.update(bytes);
                digest.update((byte) '|');
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}
