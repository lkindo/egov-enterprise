package nuri.migration.domain;

import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 표준 도메인 변환기의 받기·거부 표(ADR-0029 L3a-1). 변환기마다 받는 값과 거부 사유를 전수로 고정한다 — 거부는 위반
 * 코드만 담고 값·원인 예외를 싣지 않는다. 추정기와의 동치는 {@link DomainParityTest} 가 따로 본다.
 */
class DomainValuesTest {

    private static final LocalDate JAN_31 = LocalDate.of(2024, 1, 31);

    private final TransformerRegistry registry = new TransformerRegistry();

    @Test
    void ymd8AcceptsEveryDateShapeAndDateObjectAsEightDigits() {
        for (Object accepted : new Object[] {"20240131", " 20240131 ", "2024-01-31", "2024/01/31", "2024.01.31",
                20240131, 20240131L, new BigDecimal("20240131"), java.sql.Date.valueOf(JAN_31), JAN_31,
                Timestamp.valueOf("2024-01-31 00:00:00"), JAN_31.atStartOfDay()}) {
            assertThat(apply("ymd8", accepted)).as(describe(accepted)).isEqualTo("20240131");
        }
        assertThat(apply("ymd8", "20240229")).as("윤년").isEqualTo("20240229");
        assertThat(apply("ymd8", "2000-02-29")).as("400 년 윤년").isEqualTo("20000229");
        // 네 자리로 쓸 수 있는 연도의 양 끝.
        assertThat(apply("ymd8", LocalDate.of(0, 1, 1))).isEqualTo("00000101");
        assertThat(apply("ymd8", LocalDate.of(9999, 12, 31))).isEqualTo("99991231");
        assertThat(apply("ymdhms14", LocalDateTime.of(9999, 12, 31, 23, 59, 59))).isEqualTo("99991231235959");
    }

    @Test
    void ymd8RejectsWithTheEstimatorsVocabulary() {
        rejects("ymd8", DomainViolation.BLANK, "", "   ", "　", ' ');
        rejects("ymd8", DomainViolation.PLACEHOLDER_DATE, "99991231", "00000000", " 9999-12-31 ", "0000-00-00",
                99991231, 99991231L);
        rejects("ymd8", DomainViolation.INVALID_DATE, "20230229", "19000229", "20241301", "20240132", "2024-02-30",
                "2024/13/01", "2023.02.29", 20230229L);
        rejects("ymd8", DomainViolation.TIME_PRESENT, Timestamp.valueOf("2024-01-31 13:45:00"),
                LocalDateTime.of(2024, 1, 31, 0, 0, 0, 1), Timestamp.valueOf("2024-01-31 00:00:00.000000001"));
        rejects("ymd8", DomainViolation.FORMAT, "20240131.00", new BigDecimal("20240131.00"), 2.0240131E7,
                "2024-01/31", "2024/01-31", "2024-1-31", "240131", "2024-01-31 00:00:00", "20240131000000",
                "２０２４０１３１", Boolean.TRUE, "true",
                OffsetDateTime.of(2024, 1, 31, 0, 0, 0, 0, ZoneOffset.UTC),
                ZonedDateTime.of(2024, 1, 31, 0, 0, 0, 0, ZoneId.of("Asia/Seoul")),
                new java.util.Date(0L), LocalDate.of(10000, 1, 1), LocalDate.of(-1, 1, 1));
        rejects("ymd8", DomainViolation.UNSUPPORTED_VALUE_TYPE, new byte[] {1, 2}, LocalTime.NOON,
                Time.valueOf("10:30:00"), UUID.fromString("00000000-0000-0000-0000-000000000001"),
                Instant.EPOCH);
    }

    @Test
    void ymd8TruncateDropsTheTimeOfDateTimeObjectsOnly() {
        assertThat(apply("ymd8-truncate", Timestamp.valueOf("2024-01-31 13:45:00"))).isEqualTo("20240131");
        assertThat(apply("ymd8-truncate", LocalDateTime.of(2024, 1, 31, 23, 59, 59, 999_999_999)))
                .isEqualTo("20240131");
        assertThat(apply("ymd8-truncate", "2024.01.31")).isEqualTo("20240131");
        // 시각을 버리는 것은 시간형 객체뿐이다. 일시 문자는 추정기가 연월일C8 에서 형식 위반으로 세므로 받지 않는다.
        rejects("ymd8-truncate", DomainViolation.FORMAT, "2024-01-31 13:45:00", "20240131134500");
        rejects("ymd8-truncate", DomainViolation.PLACEHOLDER_DATE, "99991231", "9999-12-31");
        rejects("ymd8-truncate", DomainViolation.INVALID_DATE, "20240230");
        rejects("ymd8-truncate", DomainViolation.BLANK, " ");
    }

    @Test
    void ymdhms14NeedsADateAndATimeWithoutFraction() {
        for (Object accepted : new Object[] {"20240131134500", "2024-01-31 13:45", "2024-01-31T13:45:00",
                "2024/01/31 13:45:00.000", "2024.01.31 13:45:00.0", 20240131134500L,
                Timestamp.valueOf("2024-01-31 13:45:00"), LocalDateTime.of(2024, 1, 31, 13, 45)}) {
            assertThat(apply("ymdhms14", accepted)).as(describe(accepted)).isEqualTo("20240131134500");
        }
        assertThat(apply("ymdhms14", "2024-02-29 00:00:00")).isEqualTo("20240229000000");
        rejects("ymdhms14", DomainViolation.BLANK, "", "  ");
        rejects("ymdhms14", DomainViolation.INVALID_DATE, "20240131240000", "20230229000000", "20240131136000",
                "2024-02-30 10:00", "2024-01-31 24:00:00", "2024-01-31 13:45:60");
        // 날짜만 있는 값(자리표시 포함 — 연월일시분초C14 의 추정기는 자리표시를 따로 세지 않는다)과 0이 아닌 소수 초.
        rejects("ymdhms14", DomainViolation.FORMAT, "20240131", "99991231", "2024-01-31", JAN_31,
                java.sql.Date.valueOf(JAN_31), "2024-01-31 13:45:07.5", LocalDateTime.of(2024, 1, 31, 13, 45, 7, 1),
                Timestamp.valueOf("2024-01-31 13:45:07.25"), "2024/01-31 13:45", "202401311345",
                new BigDecimal("20240131134500.0"), OffsetDateTime.of(2024, 1, 31, 13, 45, 0, 0, ZoneOffset.UTC),
                LocalDateTime.of(10000, 1, 1, 0, 0));
        rejects("ymdhms14", DomainViolation.UNSUPPORTED_VALUE_TYPE, LocalTime.NOON, new byte[] {0});
    }

    @Test
    void hms6AcceptsOnlyTheSixDigitShapeAndWholeSecondTimes() {
        assertThat(apply("hms6", "103000")).isEqualTo("103000");
        assertThat(apply("hms6", " 235959 ")).isEqualTo("235959");
        assertThat(apply("hms6", "000000")).isEqualTo("000000");
        assertThat(apply("hms6", 103000)).isEqualTo("103000");
        assertThat(apply("hms6", new BigDecimal("103000"))).isEqualTo("103000");
        assertThat(apply("hms6", LocalTime.of(9, 30))).isEqualTo("093000");
        assertThat(apply("hms6", Time.valueOf("09:30:05"))).isEqualTo("093005");
        rejects("hms6", DomainViolation.BLANK, "", "\t");
        // 24시·HH:mm:ss·앞자리 0 이 사라진 숫자(93000)는 추정기도 형식 위반으로 센다.
        rejects("hms6", DomainViolation.FORMAT, "240000", "10:30:00", "93000", 93000, 0, "1030", "1030000",
                new BigDecimal("103000.0"), LocalTime.of(9, 30, 0, 1), new Time(Time.valueOf("09:30:00").getTime() + 5),
                Timestamp.valueOf("2024-01-31 10:30:00"), JAN_31, Boolean.FALSE,
                OffsetDateTime.of(2024, 1, 31, 10, 30, 0, 0, ZoneOffset.UTC));
        rejects("hms6", DomainViolation.UNSUPPORTED_VALUE_TYPE, new byte[] {1}, Instant.EPOCH);
    }

    @Test
    void ynAcceptsYAndNInAnyCaseAndBooleans() {
        assertThat(apply("yn", "Y")).isEqualTo("Y");
        assertThat(apply("yn", " n ")).isEqualTo("N");
        assertThat(apply("yn", "y")).isEqualTo("Y");
        assertThat(apply("yn", 'N')).isEqualTo("N");
        assertThat(apply("yn", Boolean.TRUE)).isEqualTo("Y");
        assertThat(apply("yn", Boolean.FALSE)).isEqualTo("N");
        rejects("yn", DomainViolation.BLANK, "", "   ");
        // 1·0·T·F 는 어느 쪽이 Y 인지 사람이 codemap 으로 정한다.
        rejects("yn", DomainViolation.FORMAT, "1", "0", "T", "F", "TRUE", "false", "YES", "Ｙ", 1, 0L, JAN_31,
                OffsetDateTime.of(2024, 1, 31, 0, 0, 0, 0, ZoneOffset.UTC));
        rejects("yn", DomainViolation.UNSUPPORTED_VALUE_TYPE, new byte[] {'Y'}, LocalTime.NOON);
    }

    @Test
    void dateTextAcceptsDateShapesAndMidnightDateTimes() {
        for (Object accepted : new Object[] {"20240131", "2024-01-31", "2024/01/31", "2024.01.31", 20240131L,
                JAN_31, java.sql.Date.valueOf(JAN_31), Timestamp.valueOf("2024-01-31 00:00:00"),
                "2024-01-31 00:00:00", "2024/01/31 00:00", "20240131000000", 20240131000000L}) {
            assertThat(apply("date-text", accepted)).as(describe(accepted)).isEqualTo(JAN_31);
        }
        rejects("date-text", DomainViolation.BLANK, "");
        rejects("date-text", DomainViolation.PLACEHOLDER_DATE, "99991231", "0000-00-00");
        rejects("date-text", DomainViolation.INVALID_DATE, "20230229", "20241301000000", "2024-02-30 00:00:00",
                "2024-01-31 24:00:00");
        rejects("date-text", DomainViolation.TIME_PRESENT, "2024-01-31 13:45:00", "20240131134500",
                "2024-01-31 00:00:00.5", Timestamp.valueOf("2024-01-31 13:45:00"));
        rejects("date-text", DomainViolation.FORMAT, "2024-01/31 00:00:00", "2024-01-31T00:00:00+09:00",
                "2024-1-31", OffsetDateTime.of(2024, 1, 31, 0, 0, 0, 0, ZoneOffset.UTC), Boolean.TRUE);
        rejects("date-text", DomainViolation.UNSUPPORTED_VALUE_TYPE, LocalTime.MIDNIGHT, new byte[] {2});
    }

    @Test
    void dateTruncateV2DropsTimesButRejectsPlaceholders() {
        assertThat(apply("date-truncate", "2024-01-31 13:45:00")).isEqualTo(JAN_31);
        assertThat(apply("date-truncate", "20240131134500")).isEqualTo(JAN_31);
        assertThat(apply("date-truncate", "2024.01.31")).isEqualTo(JAN_31);
        assertThat(apply("date-truncate", Timestamp.valueOf("2024-01-31 07:00:00"))).isEqualTo(JAN_31);
        assertThat(apply("date-truncate", null)).isNull();
        rejects("date-truncate", DomainViolation.PLACEHOLDER_DATE, "99991231", "9999-12-31", 99991231);
        rejects("date-truncate", DomainViolation.BLANK, "");
        rejects("date-truncate", DomainViolation.INVALID_DATE, "20260230");
        rejects("date-truncate", DomainViolation.FORMAT, "2026-08-09T13:45:00+09:00",
                OffsetDateTime.of(2026, 8, 9, 1, 0, 0, 0, ZoneOffset.ofHours(9)));
    }

    @Test
    void timestampTextNeedsATimeAndKeepsTheFraction() {
        LocalDateTime expected = LocalDateTime.of(2024, 1, 31, 13, 45);
        for (Object accepted : new Object[] {"2024-01-31 13:45:00", "2024-01-31T13:45", "2024/01/31 13:45",
                "20240131134500", 20240131134500L, Timestamp.valueOf("2024-01-31 13:45:00"), expected}) {
            assertThat(apply("timestamp-text", accepted)).as(describe(accepted)).isEqualTo(expected);
        }
        assertThat(apply("timestamp-text", "2024.01.31 13:45:00.123"))
                .isEqualTo(LocalDateTime.of(2024, 1, 31, 13, 45, 0, 123_000_000));
        rejects("timestamp-text", DomainViolation.BLANK, " ");
        rejects("timestamp-text", DomainViolation.PLACEHOLDER_DATE, "99991231", "9999-12-31");
        rejects("timestamp-text", DomainViolation.INVALID_DATE, "20241301", "20241301000000", "2024-02-30 10:00",
                "2024-02-30");
        rejects("timestamp-text", DomainViolation.FORMAT, "20240131", "2024-01-31", "2024/01/31", JAN_31,
                java.sql.Date.valueOf(JAN_31), "2024-01-31 13:45:00Z",
                ZonedDateTime.of(2024, 1, 31, 13, 45, 0, 0, ZoneId.of("Asia/Seoul")));
        rejects("timestamp-text", DomainViolation.UNSUPPORTED_VALUE_TYPE, LocalTime.NOON);
    }

    @Test
    void timestampFromDateWritesMidnightOfTheDate() {
        assertThat(apply("timestamp-from-date", "20240131")).isEqualTo(JAN_31.atStartOfDay());
        assertThat(apply("timestamp-from-date", java.sql.Date.valueOf(JAN_31))).isEqualTo(JAN_31.atStartOfDay());
        rejects("timestamp-from-date", DomainViolation.TIME_PRESENT, "2024-01-31 13:00:00");
        rejects("timestamp-from-date", DomainViolation.PLACEHOLDER_DATE, "00000000");
        rejects("timestamp-from-date", DomainViolation.FORMAT, "31/01/2024");
    }

    @Test
    void everyDomainTransformerPassesNullThrough() {
        for (String name : domainTransformers()) {
            assertThat(apply(name, null)).as(name).isNull();
        }
    }

    @Test
    void resultsAreDeterministicAndIndependentOfTheDefaultLocale() {
        Object[] values = {"20240131", "2024-01-31 13:45:00", 103000, LocalTime.of(9, 30), "y", JAN_31};
        Locale previous = Locale.getDefault();
        List<Object> first = new ArrayList<>();
        List<Object> second = new ArrayList<>();
        try {
            for (String name : domainTransformers()) {
                for (Object value : values) {
                    first.add(outcome(name, value));
                }
            }
            // 아랍 숫자를 쓰는 기본 로캘에서도 같은 ASCII 숫자 표기를 낸다.
            Locale.setDefault(Locale.forLanguageTag("ar-EG"));
            for (String name : domainTransformers()) {
                for (Object value : values) {
                    second.add(outcome(name, value));
                }
            }
        } finally {
            Locale.setDefault(previous);
        }
        assertThat(second).isEqualTo(first);
        assertThat(first).contains("093000", "20240131", "20240131134500");
    }

    @Test
    void rejectionsCarryOnlyTheCodeWithoutValueOrCause() {
        String secret = "SECRET-99991231";
        DomainValueRejected rejected = (DomainValueRejected) catchRejection("ymd8", secret);
        assertThat(rejected.violation()).isEqualTo(DomainViolation.FORMAT);
        assertThat(rejected).hasMessage("domain value rejected: FORMAT").hasNoCause();
        assertThat(rejected.getSuppressed()).isEmpty();
        assertThat(rejected.toString()).doesNotContain(secret, "SECRET");
        for (DomainViolation violation : DomainViolation.values()) {
            assertThat(new DomainValueRejected(violation)).hasMessage("domain value rejected: " + violation.name())
                    .hasNoCause();
        }
        assertThatThrownBy(() -> new DomainValueRejected(null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void theRegistryMarksDomainTransformersAndKeepsBinaryAsAViolationCode() {
        for (String name : domainTransformers()) {
            assertThat(registry.isDomain(name)).as(name).isTrue();
            assertThat(registry.isBuiltin(name)).as(name).isTrue();
            assertThat(catchRejection(name, new byte[] {1})).as(name)
                    .isInstanceOfSatisfying(DomainValueRejected.class, rejected -> assertThat(rejected.violation())
                            .isEqualTo(DomainViolation.UNSUPPORTED_VALUE_TYPE));
        }
        for (String name : List.of("trim", "upper", "lower", "date", "timestamp", "unregistered")) {
            assertThat(registry.isDomain(name)).as(name).isFalse();
        }
        assertThat(registry.isDomain(null)).isFalse();
        // 같은 이름을 사용자 변환기로 덮어쓰면 도메인 변환기가 아니다 — 그 변환기가 던진 위반 코드는 인정하지 않는다.
        registry.register("ymd8", value -> value);
        assertThat(registry.isDomain("ymd8")).isFalse();
    }

    @Test
    void placeholderConstantsAreTheSingleSourceForTheProfilerShapes() {
        for (String placeholder : DomainPlaceholders.DATE8) {
            assertThat(nuri.migration.profile.ValuePattern.PLACEHOLDER_DATE.matches(placeholder)).isTrue();
        }
        for (String placeholder : DomainPlaceholders.DATE_DASHED) {
            assertThat(nuri.migration.profile.ValuePattern.PLACEHOLDER_DATE_TEXT.matches(placeholder)).isTrue();
        }
        for (String placeholder : DomainPlaceholders.TEXT) {
            assertThat(nuri.migration.profile.ValuePattern.PLACEHOLDER_TEXT.matches(placeholder)).isTrue();
        }
        // 인용한 정규식이라 메타 문자가 아무 문자와 맞지 않는다.
        assertThat(nuri.migration.profile.ValuePattern.PLACEHOLDER_TEXT.matches("x")).isFalse();
        assertThat(nuri.migration.profile.ValuePattern.PLACEHOLDER_DATE.matches("99991230")).isFalse();
        assertThat(DomainPlaceholders.regex(List.of("a.b", "c"))).isEqualTo("\\Qa.b\\E|\\Qc\\E");
    }

    private static List<String> domainTransformers() {
        return List.of("ymd8", "ymd8-truncate", "ymdhms14", "hms6", "yn", "date-text", "date-truncate",
                "timestamp-text", "timestamp-from-date");
    }

    private Object apply(String name, Object value) {
        return registry.apply(name, value);
    }

    private Object outcome(String name, Object value) {
        try {
            return apply(name, value);
        } catch (DomainValueRejected rejected) {
            return rejected.violation();
        }
    }

    private Throwable catchRejection(String name, Object value) {
        try {
            apply(name, value);
        } catch (RuntimeException rejected) {
            return rejected;
        }
        throw new AssertionError(name + " accepted " + describe(value));
    }

    private void rejects(String name, DomainViolation violation, Object... values) {
        for (Object value : values) {
            assertThat(outcome(name, value)).as(name + " " + describe(value) + " 는 " + violation + " 로 거부한다")
                    .isEqualTo(violation);
            assertThat(catchRejection(name, value)).isInstanceOf(DomainValueRejected.class)
                    .hasMessage("domain value rejected: " + violation.name()).hasNoCause();
        }
    }

    private static String describe(Object value) {
        return value == null ? "null" : value.getClass().getSimpleName() + "(" + value + ")";
    }
}
