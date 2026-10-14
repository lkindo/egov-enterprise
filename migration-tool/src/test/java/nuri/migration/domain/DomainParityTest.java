package nuri.migration.domain;

import nuri.migration.profile.ColumnProfiler;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.suggest.ConformanceEstimator;
import nuri.migration.suggest.StandardDictionary.Domain;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 표준 도메인 변환기와 적합성 추정기의 동치(ADR-0029 L3a-1). 값 하나짜리 프로파일을 추정기에 넣은 판정과 같은 값을
 * 변환기에 넣은 판정을 대조한다.
 *
 * <ul>
 *   <li>추정기가 행 수로 센 모양 위반(BLANK·PLACEHOLDER_DATE·INVALID_DATE·FORMAT)은 실행도 같은 코드로 거부해야 한다.
 *       실행이 받으면 "추정 위반인데 통과" 다 — 원장이 처리하라고 한 위반이 실행에서 조용히 지나간다.</li>
 *   <li>실행이 추정기보다 엄격한 경우는 {@link DomainValues} 문서의 목록만 허용한다. 목록 밖이면 "목록 밖 엄격" 이다 —
 *       추정이 적합하다고 한 표가 실행에서 멈춘다.</li>
 *   <li>추정기가 판정하지 못한 값(UNSUPPORTED_VALUE_TYPE)은 범위 밖이다.</li>
 * </ul>
 *
 * <p>엄격 사유는 변환기 구현이 아니라 값의 생김새로 이 시험이 따로 판정한다.</p>
 */
class DomainParityTest {

    private static final Domain YMD8 = new Domain("날짜/시간", "연월일C8", "CHAR", 8);
    private static final Domain YMDHMS14 = new Domain("날짜/시간", "연월일시분초C14", "CHAR", 14);
    private static final Domain HMS6 = new Domain("날짜/시간", "시분초C6", "CHAR", 6);
    private static final Domain YN = new Domain("코드", "여부C1", "CHAR", 1);
    private static final Domain DATE = new Domain("날짜/시간", "연월일D", "DATE", null);
    private static final Domain TIMESTAMP = new Domain("날짜/시간", "등록일시D", "TIMESTAMP", null);

    private static final Set<String> PARITY = Set.of("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE", "FORMAT");
    /** 시각이 붙어 오면 TIME_PRESENT 로 거부하는(날짜 의미) 변환기. */
    private static final Set<String> DATE_SEMANTIC = Set.of("ymd8", "date-text", "timestamp-from-date");
    /** 네 자리 연도 문자 표기를 내는 변환기. */
    private static final Set<String> TEXT_OUTPUT = Set.of("ymd8", "ymd8-truncate", "ymdhms14");
    private static final Pattern SEPARATED = Pattern.compile(
            "(\\d{4})([-/.])(\\d{2})([-/.])(\\d{2})(?:[ T](\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{1,9}))?)?)?");

    private record Target(String transformer, Domain domain) {}

    private static final List<Target> TARGETS = List.of(
            new Target("ymd8", YMD8),
            new Target("ymd8-truncate", YMD8),
            new Target("ymdhms14", YMDHMS14),
            new Target("hms6", HMS6),
            new Target("yn", YN),
            new Target("date-text", DATE),
            new Target("date-truncate", DATE),
            new Target("timestamp-text", TIMESTAMP),
            new Target("timestamp-from-date", TIMESTAMP));

    private final TransformerRegistry registry = new TransformerRegistry();

    @Test
    void runtimeIsNeverLooserThanTheEstimatorAndStricterOnlyForTheListedReasons() {
        List<String> failures = new ArrayList<>();
        Map<DomainViolation, Integer> sameViolation = new EnumMap<>(DomainViolation.class);
        Set<Integer> reasonsUsed = new TreeSet<>();
        int bothAccept = 0;
        int outOfRange = 0;
        for (Target target : TARGETS) {
            for (Object value : corpus()) {
                ConformanceEstimate estimate = estimate(target, value);
                String estimated = estimatedViolation(estimate);
                DomainViolation runtime = runtime(target, value);
                String label = target.transformer() + " " + describe(value);
                if ("UNSUPPORTED_VALUE_TYPE".equals(estimated)) {
                    outOfRange++;
                    continue;
                }
                if (estimated != null) {
                    if (!PARITY.contains(estimated)) {
                        failures.add("추정기의 알 수 없는 위반: " + label + " → " + estimated);
                    } else if (runtime == null) {
                        failures.add("추정 위반인데 통과: " + label + " (추정 " + estimated + ")");
                    } else if (!runtime.name().equals(estimated)) {
                        failures.add("추정 위반과 실행 위반이 다르다: " + label + " (추정 " + estimated
                                + ", 실행 " + runtime + ")");
                    } else {
                        sameViolation.merge(runtime, 1, Integer::sum);
                    }
                    continue;
                }
                if (runtime == null) {
                    bothAccept++;
                    continue;
                }
                Integer reason = stricterReason(target, value, runtime, estimate);
                if (reason == null) {
                    failures.add("목록 밖 엄격: " + label + " (추정 적합, 실행 " + runtime + ")");
                } else {
                    reasonsUsed.add(reason);
                }
            }
        }
        assertThat(failures).isEmpty();
        // 대조가 비어 있지 않다 — 위반마다 같은 판정이 있고, 허용한 엄격 사유는 모두 실제로 쓰인다.
        assertThat(sameViolation.keySet()).containsExactlyInAnyOrder(DomainViolation.BLANK,
                DomainViolation.PLACEHOLDER_DATE, DomainViolation.INVALID_DATE, DomainViolation.FORMAT);
        assertThat(reasonsUsed).containsExactly(1, 2, 3, 4, 5, 6, 7);
        assertThat(bothAccept).isGreaterThan(50);
        assertThat(outOfRange).isPositive();
    }

    @Test
    void anEstimatedPlaceholderIsNeverWrittenByTheRuntime() {
        // 대표 사례를 따로 고정한다 — 자리표시를 통과시키면 원장이 정제하라고 한 값이 대상에 그대로 들어간다.
        for (Target target : TARGETS) {
            for (Object placeholder : List.of("99991231", "00000000", "9999-12-31", "0000-00-00", 99991231L)) {
                String estimated = estimatedViolation(estimate(target, placeholder));
                if ("PLACEHOLDER_DATE".equals(estimated)) {
                    assertThat(runtime(target, placeholder)).as(target.transformer() + " " + describe(placeholder))
                            .isEqualTo(DomainViolation.PLACEHOLDER_DATE);
                }
            }
        }
    }

    /** 허용한 엄격 사유 번호({@link DomainValues} 문서의 목록). 해당하지 않으면 null. */
    private static Integer stricterReason(Target target, Object value, DomainViolation runtime,
                                          ConformanceEstimate estimate) {
        String name = target.transformer();
        if (runtime == DomainViolation.TIME_PRESENT && DATE_SEMANTIC.contains(name) && hasTimeOfDay(value)) {
            return 1;
        }
        Matcher separated = separated(value);
        if (separated != null) {
            if (runtime == DomainViolation.INVALID_DATE && !validCalendar(separated)) {
                return 2;
            }
            if (runtime == DomainViolation.FORMAT && separated.group(6) != null
                    && !separated.group(2).equals(separated.group(4))) {
                return 2;
            }
        }
        if (name.equals("ymdhms14") && runtime == DomainViolation.FORMAT
                && (dateOnly(value) || nonZeroFraction(value))) {
            return 3;
        }
        if (name.equals("timestamp-text") && runtime == DomainViolation.FORMAT && dateOnly(value)) {
            return 4;
        }
        if (runtime == DomainViolation.FORMAT && (value instanceof OffsetDateTime || value instanceof ZonedDateTime
                || (value instanceof java.util.Date && !(value instanceof java.sql.Date)
                && !(value instanceof Timestamp) && !(value instanceof Time)))) {
            return 5;
        }
        if (name.equals("yn") && runtime == DomainViolation.FORMAT && "codemap".equals(estimate.transform())) {
            return 6;
        }
        if (runtime == DomainViolation.FORMAT && TEXT_OUTPUT.contains(name) && yearOutsideFourDigits(value)) {
            return 7;
        }
        return null;
    }

    private static List<Object> corpus() {
        List<Object> values = new ArrayList<>(List.of(
                // 8자리·구분자 날짜
                "20240131", " 20240131 ", "20240229", "20230229", "19000229", "20241301", "20240132",
                "99991231", "00000000", "2024-01-31", "2024-02-30", "9999-12-31", "0000-00-00", "2024/01/31",
                "2024/02/30", "9999/12/31", "2024.01.31", "2023.02.29", "2024-01/31", "2024/01-31", "2024-1-31",
                "240131", "20240131.00", "２０２４０１３１", "31/01/2024",
                // 14자리·구분자 일시
                "20240131134500", "20240131000000", "20240131240000", "20241301000000", "99991231000000",
                "2024-01-31 13:45", "2024-01-31 00:00:00", "2024-01-31T13:45:00.5", "2024-01-31 00:00:00.000",
                "2024-02-30 10:00", "2024-01-31 24:00:00", "2024/01-31 13:45", "2024.01.31 13:45:07",
                "9999-12-31 00:00:00", "2024-01-31T00:00:00+09:00", "202401311345",
                // 시각·여부·자리표시 문자
                "103000", "235959", "000000", "240000", "10:30:00", "93000", "Y", "N", "y", "n", "1", "0", "T",
                "F", "TRUE", "false", "YES", "Ｙ", "", "   ", "　", "\t", "-", ".", "N/A", "NULL", "abc",
                'Y', 'n', ' ',
                // 숫자형
                20240131, 20240131L, 99991231L, 20230229L, new BigDecimal("20240131"),
                new BigDecimal("20240131.00"), 2.0240131E7, 20240131134500L, 20240131000000L, 103000, 93000, 1,
                0L, new BigDecimal("103000.0"), -20240131L,
                Boolean.TRUE, Boolean.FALSE,
                // 시간형 객체
                LocalDate.of(2024, 1, 31), java.sql.Date.valueOf("2024-01-31"), LocalDate.of(9999, 12, 31),
                LocalDate.of(10000, 1, 1), LocalDate.of(-1, 6, 1), Timestamp.valueOf("2024-01-31 00:00:00"),
                Timestamp.valueOf("2024-01-31 13:45:00"), Timestamp.valueOf("2024-01-31 13:45:07.25"),
                LocalDateTime.of(2024, 1, 31, 0, 0), LocalDateTime.of(2024, 1, 31, 13, 45),
                LocalDateTime.of(2024, 1, 31, 13, 45, 7, 1), LocalDateTime.of(10000, 1, 1, 0, 0),
                OffsetDateTime.of(2024, 1, 31, 0, 0, 0, 0, ZoneOffset.UTC),
                ZonedDateTime.of(2024, 1, 31, 13, 45, 0, 0, ZoneId.of("Asia/Seoul")), new java.util.Date(0L),
                // 추정기 범위 밖
                LocalTime.of(10, 30), Time.valueOf("10:30:00"), new byte[] {1, 2}));
        return values;
    }

    private ConformanceEstimate estimate(Target target, Object value) {
        ColumnProfiler profiler = new ColumnProfiler();
        profiler.accept(value);
        ColumnProfile profile = profiler.finish(
                new ColumnProfiler.ColumnDeclaration("C", 1, "VARCHAR", 12, 100L, 0, true), null);
        return ConformanceEstimator.estimate(profile, target.domain(), null);
    }

    /** 값 하나의 추정 위반. 적합이면 null. 행 수가 있는 위반은 둘 이상일 수 없다. */
    private static String estimatedViolation(ConformanceEstimate estimate) {
        List<String> counted = estimate.violations().stream()
                .filter(violation -> violation.rows() != null && violation.rows() > 0)
                .map(Violation::type).toList();
        assertThat(counted).hasSizeLessThanOrEqualTo(1);
        return counted.isEmpty() ? null : counted.getFirst();
    }

    private DomainViolation runtime(Target target, Object value) {
        try {
            registry.apply(target.transformer(), value);
            return null;
        } catch (DomainValueRejected rejected) {
            return rejected.violation();
        }
    }

    /** 문자·숫자의 판정 표기. 프로파일러처럼 문자는 앞뒤 공백을 지우고 BigDecimal 은 지수 없이 쓴다. */
    private static String shapeText(Object value) {
        if (value instanceof String || value instanceof Character) {
            return value.toString().strip();
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.toPlainString();
        }
        if (value instanceof Number number) {
            return number.toString();
        }
        return null;
    }

    private static Matcher separated(Object value) {
        String text = shapeText(value);
        if (text == null) {
            return null;
        }
        Matcher matcher = SEPARATED.matcher(text);
        return matcher.matches() ? matcher : null;
    }

    private static boolean validCalendar(Matcher separated) {
        try {
            LocalDate.of(Integer.parseInt(separated.group(1)), Integer.parseInt(separated.group(3)),
                    Integer.parseInt(separated.group(5)));
            if (separated.group(6) != null) {
                LocalTime.of(Integer.parseInt(separated.group(6)), Integer.parseInt(separated.group(7)),
                        separated.group(8) == null ? 0 : Integer.parseInt(separated.group(8)));
            }
            return true;
        } catch (DateTimeException invalid) {
            return false;
        }
    }

    private static boolean hasTimeOfDay(Object value) {
        LocalDateTime dateTime = value instanceof Timestamp timestamp ? timestamp.toLocalDateTime()
                : value instanceof LocalDateTime local ? local : null;
        if (dateTime != null) {
            return !dateTime.toLocalTime().equals(LocalTime.MIDNIGHT);
        }
        String text = shapeText(value);
        if (text == null) {
            return false;
        }
        if (text.matches("\\d{14}")) {
            return !text.endsWith("000000");
        }
        Matcher separated = separated(value);
        return separated != null && separated.group(6) != null
                && !(separated.group(6) + separated.group(7) + nullToEmpty(separated.group(8))
                        + nullToEmpty(separated.group(9))).matches("0+");
    }

    private static boolean nonZeroFraction(Object value) {
        if (value instanceof Timestamp timestamp) {
            return timestamp.getNanos() != 0;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.getNano() != 0;
        }
        Matcher separated = separated(value);
        return separated != null && separated.group(9) != null && !separated.group(9).matches("0+");
    }

    private static boolean dateOnly(Object value) {
        if (value instanceof LocalDate || value instanceof java.sql.Date) {
            return true;
        }
        String text = shapeText(value);
        if (text == null) {
            return false;
        }
        Matcher separated = separated(value);
        return text.matches("\\d{8}") || (separated != null && separated.group(6) == null);
    }

    private static boolean yearOutsideFourDigits(Object value) {
        Integer year = value instanceof LocalDate date ? Integer.valueOf(date.getYear())
                : value instanceof LocalDateTime dateTime ? Integer.valueOf(dateTime.getYear()) : null;
        return year != null && (year < 0 || year > 9999);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String describe(Object value) {
        String text = value instanceof byte[] bytes ? "byte[" + bytes.length + "]" : String.valueOf(value);
        return value == null ? "null" : value.getClass().getSimpleName() + "(" + text + ")";
    }
}
