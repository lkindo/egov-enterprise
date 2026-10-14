package nuri.migration.suggest;

import nuri.migration.domain.DomainCategory;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.ValueFrequency;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;
import nuri.migration.validate.ledger.LoadCapabilities;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 프로파일 집계만으로 컬럼의 데이터 범주를 정하고, 후보 도메인에 얼마나 맞는지 추정한다(레거시 표준화 설계 §4.3).
 *
 * <p>행 단위로 다시 읽지 않는다 — 셀 수 있는 위반(달력에 없는 날짜, 자리표시 날짜, 형식 밖 값, 공백, 허용값 밖 코드)은
 * 행 수를 보고한다. 셀 수 없는 위반(길이·자릿수 초과, 확인 못 한 허용값, 집계하지 않는 값 종류, 일부만 읽은 표)이 있으면
 * 적합률을 내지 않는다. 적합률의 분모는 공백 문자열을 포함한 값의 수다. 문자 날짜의 달력 검사는 8자리·14자리 숫자
 * 모양에만 있고, 자리표시 날짜는 8자리와 하이픈 형태만 센다.</p>
 *
 * <p>변환 제안은 mapping.yml 어휘 그대로다(ADR-0029 L3a-2) — {@code transform:<내장 변환기>}·{@code type:<type>}·
 * {@code codemap}, 한 load 로 처리할 수 없으면 {@code mixed}, 변환이 필요 없으면 null. 8자리 날짜·14자리 일시·6자리 시각
 * 도메인은 모양과 상관없이 표준 변환기({@code ymd8}·{@code ymdhms14}·{@code hms6})를 낸다 — 원장 도메인 가드가 그 변환기를
 * 요구한다. 여부 도메인은 Y·N(대소문자 무시)만 있으면 {@code transform:yn}, 1·0·T·F 같은 플래그가 섞이면 극성을 사람이
 * 정해야 하므로 {@code codemap} 이다. 날짜·시간 타입 도메인은 문자 날짜를 {@code transform:date-text}(날짜 컬럼) 또는
 * {@code transform:timestamp-from-date}·{@code transform:timestamp-text}(일시 컬럼, 날짜만 있는 값·일시 값)로 낸다 — 비시간
 * 소스의 {@code type:date}·{@code type:timestamp} 는 자리표시 날짜를 받으므로 제안하지 않는다.</p>
 */
public final class ConformanceEstimator {

    /** 범주를 정하는 최소 비율. 이보다 낮으면 섞인 컬럼으로 본다. */
    static final double DOMINANT = 0.95;
    static final String MIXED = "mixed";
    static final String CODEMAP = "codemap";
    private static final String YMD8 = "transform:ymd8";
    private static final String YMDHMS14 = "transform:ymdhms14";
    private static final String HMS6 = "transform:hms6";
    private static final String YN = "transform:yn";
    private static final String DATE_TEXT = "transform:date-text";
    private static final String TIMESTAMP_TEXT = "transform:timestamp-text";
    private static final String TIMESTAMP_FROM_DATE = "transform:timestamp-from-date";

    private ConformanceEstimator() {}

    /**
     * 데이터 범주: DATE8·DATE_TEXT·DATETIME_TEXT·DATETIME14·TEMPORAL·TIME6·YN·FLAG·NUMERIC·CODE·TEXT·EMPTY·UNSUPPORTED.
     * 8자리·14자리 숫자는 달력에 있는 값이 많을 때만 날짜다 — 일련번호를 날짜로 보지 않는다. EMPTY 는 공백이 아닌 값이
     * 없다는 뜻이고, UNSUPPORTED 는 값이 LOB·시각 전용 같은 집계하지 않는 종류뿐이라는 뜻이다.
     */
    static String dataCategory(ColumnProfile profile) {
        long nonNull = nonNull(profile);
        if (nonNull == 0) {
            return unsupported(profile) > 0 ? "UNSUPPORTED" : "EMPTY";
        }
        if (dominant(profile.temporalValues(), nonNull)) {
            return "TEMPORAL";
        }
        if (dominant(count(profile, "YMD8") - profile.ymd8Invalid(), nonNull)) {
            return "DATE8";
        }
        if (dominant(count(profile, "YMDHMS14") - profile.ymdhms14Invalid(), nonNull)) {
            return "DATETIME14";
        }
        if (dominant(count(profile, "YMD_DASHED") + count(profile, "YMD_SLASHED") + count(profile, "YMD_DOTTED"),
                nonNull)) {
            return "DATE_TEXT";
        }
        if (dominant(count(profile, "DATETIME_TEXT"), nonNull)) {
            return "DATETIME_TEXT";
        }
        if (dominant(count(profile, "HMS6"), nonNull)) {
            return "TIME6";
        }
        if (dominant(count(profile, "YN"), nonNull)) {
            return "YN";
        }
        if (dominant(count(profile, "YN") + flags(profile), nonNull)) {
            return "FLAG";
        }
        if (dominant(profile.numberValues() + numericText(profile), nonNull)) {
            return "NUMERIC";
        }
        if (!profile.valueFrequencies().isEmpty()) {
            return "CODE";
        }
        return "TEXT";
    }

    /**
     * 도메인 범주: DATE8·DATETIME14·TEMPORAL·TIME6·YN·CODE·NUMERIC·TEXT. 판정은 {@link DomainCategory} 한 곳에 있고
     * (ADR-0029 L3a-2), 여기는 도메인이 없으면 TEXT 로 보는 것만 더한다.
     */
    static String domainCategory(StandardDictionary.Domain domain) {
        return domain == null ? DomainCategory.TEXT.name() : DomainCategory.of(domain.name(), domain.dataType()).name();
    }

    /**
     * 데이터와 도메인이 같은 뜻으로 읽히는지. 데이터 범주가 뚜렷하지 않으면(CODE·TEXT·EMPTY·UNSUPPORTED) 늘 맞는다고
     * 본다. 6자리 숫자는 시각·연월·금액이 같은 모양이고 0·1 은 건수일 수도 있어, TIME6·FLAG 는 날짜·시각·자유 문자
     * 도메인과만 어긋난다고 본다. 숫자형 시각은 앞자리 0 이 사라져 NUMERIC 이 되므로 NUMERIC 은 시각 도메인과도 맞는다.
     */
    static boolean compatible(String data, String domain) {
        return switch (data) {
            case "DATE8", "DATE_TEXT" -> Set.of("DATE8", "TEMPORAL").contains(domain);
            case "DATETIME14", "DATETIME_TEXT" -> Set.of("DATETIME14", "TEMPORAL").contains(domain);
            case "TEMPORAL" -> Set.of("TEMPORAL", "DATE8", "DATETIME14").contains(domain);
            case "TIME6" -> Set.of("TIME6", "NUMERIC", "CODE", "TEXT").contains(domain);
            case "YN" -> Set.of("YN", "CODE").contains(domain);
            case "FLAG" -> Set.of("YN", "CODE", "NUMERIC").contains(domain);
            case "NUMERIC" -> Set.of("NUMERIC", "CODE", "TEXT", "TIME6").contains(domain);
            default -> true;
        };
    }

    /** 모양 하나가 맞는 행 수와 그 모양을 도메인으로 옮길 변환. */
    private record Shape(long rows, String transform) {}

    /**
     * 표를 끝까지 읽은 프로파일의 적합성 추정. 표준 도메인 변환기 동치 시험({@code DomainParityTest})이 값 하나짜리
     * 프로파일로 실행 판정과 대조한다(ADR-0029 L3a-1).
     */
    public static ConformanceEstimate estimate(ColumnProfile profile, StandardDictionary.Domain domain,
                                               String allowedValues) {
        return estimate(profile, domain, allowedValues, false);
    }

    /**
     * 후보 도메인에 대한 적합성 추정. 도메인이 없거나 값이 하나도 없으면 추정하지 않는다. {@code sampled} 는 표를 행 수
     * 제한까지만 읽었다는 뜻이다 — 읽지 않은 행의 위반은 셀 수 없으므로 적합률을 내지 않는다.
     */
    static ConformanceEstimate estimate(ColumnProfile profile, StandardDictionary.Domain domain,
                                        String allowedValues, boolean sampled) {
        long nonNull = nonNull(profile);
        long blanks = profile.blanks();
        long unsupported = unsupported(profile);
        if (domain == null || nonNull + blanks + unsupported == 0) {
            return new ConformanceEstimate(null, List.of(), null);
        }
        String target = domainCategory(domain);
        boolean dateColumn = type(domain).equals("DATE");
        long ymd8Valid = Math.max(0, count(profile, "YMD8") - profile.ymd8Invalid()
                - count(profile, "PLACEHOLDER_DATE"));
        long dashedValid = Math.max(0, count(profile, "YMD_DASHED") - count(profile, "PLACEHOLDER_DATE_TEXT"));
        long separatedDates = dashedValid + count(profile, "YMD_SLASHED") + count(profile, "YMD_DOTTED");
        long datetime14Valid = Math.max(0, count(profile, "YMDHMS14") - profile.ymdhms14Invalid());
        List<Violation> violations = new ArrayList<>();
        List<Shape> shapes = new ArrayList<>();
        switch (target) {
            case "DATE8" -> {
                shapes.add(new Shape(ymd8Valid + separatedDates + profile.temporalValues(), YMD8));
                add(violations, "INVALID_DATE", profile.ymd8Invalid());
                add(violations, "PLACEHOLDER_DATE", placeholders(profile));
            }
            case "DATETIME14" -> {
                shapes.add(new Shape(datetime14Valid + profile.temporalValues() + count(profile, "DATETIME_TEXT"),
                        YMDHMS14));
                add(violations, "INVALID_DATE", profile.ymdhms14Invalid());
            }
            case "TEMPORAL" -> {
                // 날짜 타입 소스 값은 일시 컬럼에 그대로 쓸 수 없다(L3a-1) — 자정을 붙여야 한다.
                shapes.add(new Shape(profile.temporalValues(),
                        !dateColumn && dateTyped(profile) ? TIMESTAMP_FROM_DATE : null));
                long dateOnly = ymd8Valid + separatedDates;
                long dateTime = datetime14Valid + count(profile, "DATETIME_TEXT");
                if (dateColumn) {
                    shapes.add(new Shape(dateOnly + dateTime, DATE_TEXT));
                } else {
                    shapes.add(new Shape(dateOnly, TIMESTAMP_FROM_DATE));
                    shapes.add(new Shape(dateTime, TIMESTAMP_TEXT));
                }
                add(violations, "INVALID_DATE", profile.ymd8Invalid() + profile.ymdhms14Invalid());
                add(violations, "PLACEHOLDER_DATE", placeholders(profile));
            }
            case "TIME6" -> shapes.add(new Shape(count(profile, "HMS6"), HMS6));
            case "YN" -> {
                shapes.add(new Shape(count(profile, "YN") + count(profile, "YN_LOWER"), YN));
                shapes.add(new Shape(count(profile, "ONE_ZERO") + count(profile, "TRUE_FALSE"), CODEMAP));
            }
            case "NUMERIC" -> {
                shapes.add(new Shape(profile.numberValues(), null));
                String type = type(domain);
                shapes.add(new Shape(numericText(profile), type.equals("INTEGER") ? "type:integer"
                        : type.equals("BIGINT") ? "type:bigint" : "type:numeric"));
            }
            default -> shapes.add(new Shape(nonNull, null));
        }
        long valid = Math.min(nonNull, shapes.stream().mapToLong(Shape::rows).sum());
        add(violations, "FORMAT", nonNull - valid - sum(violations));
        if (target.equals("TEXT")) {
            valid += blanks;
        } else {
            add(violations, "BLANK", blanks);
        }
        boolean countable = true;
        if (unsupported > 0) {
            violations.add(new Violation("UNSUPPORTED_VALUE_TYPE", unsupported));
            countable = false;
        }
        String length = lengthViolation(profile, domain, target);
        if (length != null) {
            violations.add(new Violation(length, null));
            countable = false;
        }
        if ((target.equals("CODE") || target.equals("YN")) && allowedValues != null && !allowedValues.isBlank()) {
            Set<String> allowed = allowedCodes(allowedValues);
            if (allowed.isEmpty() || profile.frequencyOmittedReason() != null) {
                violations.add(new Violation("ALLOWED_VALUES_UNVERIFIED", null));
                countable = false;
            } else {
                long outside = 0;
                long seen = 0;
                for (ValueFrequency frequency : profile.valueFrequencies()) {
                    String value = target.equals("YN") ? yn(frequency.value()) : frequency.value();
                    if (value == null) {
                        continue;
                    }
                    seen += frequency.rows();
                    if (!allowed.contains(value)) {
                        outside += frequency.rows();
                    }
                }
                add(violations, "NOT_ALLOWED", outside);
                valid -= Math.min(valid, outside);
                long unverified = target.equals("YN")
                        ? Math.max(0, count(profile, "YN") + flags(profile) - seen)
                        : profile.rareValueRows();
                if (unverified > 0) {
                    violations.add(new Violation("ALLOWED_VALUES_UNVERIFIED", unverified));
                    countable = false;
                }
            }
        }
        if (sampled) {
            violations.add(new Violation("SAMPLED", null));
            countable = false;
        }
        BigDecimal rate = countable
                ? BigDecimal.valueOf(valid * 100.0 / (nonNull + blanks)).setScale(1, RoundingMode.HALF_UP)
                : null;
        return new ConformanceEstimate(rate, violations, transform(target, shapes));
    }

    /**
     * 길이·자릿수 초과. 문자·코드 도메인에 더 긴 문자 값이 있으면 {@code LENGTH_EXCEEDED} 다. 숫자 도메인의 문자 값은
     * 부호·소수점을 빼고 셀 수 없어, 가장 긴 값이 도메인 자릿수보다 길면 {@code LENGTH_UNVERIFIED} 다. 숫자형 값은 길이를
     * 세지 않으므로 소스 선언 자릿수(문자로 옮길 때는 부호·소수점 자리를 더한다)로만 판정한다 — 선언이 없거나 도메인보다
     * 크면 {@code LENGTH_UNVERIFIED} 다. 도메인 소수 자릿수는 사전에 없어 보지 않는다.
     */
    private static String lengthViolation(ColumnProfile profile, StandardDictionary.Domain domain, String target) {
        Integer limit = domain.length();
        boolean text = target.equals("TEXT") || target.equals("CODE");
        if (limit == null || limit <= 0 || !(text || target.equals("NUMERIC"))) {
            return null;
        }
        Integer longest = profile.maxLength();
        if (longest != null && longest > limit) {
            return text ? "LENGTH_EXCEEDED" : "LENGTH_UNVERIFIED";
        }
        if (profile.numberValues() > 0) {
            Long declared = profile.declaredSize();
            Integer scale = profile.declaredScale();
            long widest = declared == null || declared <= 0 ? Long.MAX_VALUE
                    : text ? declared + 1 + (scale != null && scale > 0 ? 1 : 0) : declared;
            if (widest > limit) {
                return "LENGTH_UNVERIFIED";
            }
        }
        return null;
    }

    /**
     * 공통표준 허용값 원문에서 코드만 꺼낸다. 판정은 원장 검증이 codemap 의 표준 코드를 대조할 때와 같은
     * {@link LoadCapabilities#allowedCodes} 한 곳에 있다(ADR-0029 L3a-2).
     */
    static Set<String> allowedCodes(String allowedValues) {
        return LoadCapabilities.allowedCodes(allowedValues);
    }

    /** 여부 모양 값을 변환 뒤의 Y·N 으로 읽는다. 여부 모양이 아니면 비운다(형식 위반으로 이미 셌다). */
    static String yn(String value) {
        return switch (value.strip().toUpperCase(Locale.ROOT)) {
            case "Y", "1", "T", "TRUE" -> "Y";
            case "N", "0", "F", "FALSE" -> "N";
            default -> null;
        };
    }

    /**
     * 모양마다 필요한 변환을 모은다. 하나면 그것이고, 둘 이상이면 한 load 로 처리할 수 없다는 뜻에서 mixed 다. 고정 표기
     * 도메인(8자리 날짜·14자리 일시·6자리 시각)은 모양과 상관없이 그 표준 변환기이고, 여부 도메인은 플래그가 하나라도
     * 있으면 codemap 이다 — {@code yn} 은 플래그를 받지 않는다.
     */
    private static String transform(String target, List<Shape> shapes) {
        switch (target) {
            case "DATE8" -> {
                return YMD8;
            }
            case "DATETIME14" -> {
                return YMDHMS14;
            }
            case "TIME6" -> {
                return HMS6;
            }
            case "YN" -> {
                if (shapes.stream().anyMatch(shape -> shape.rows() > 0 && CODEMAP.equals(shape.transform()))) {
                    return CODEMAP;
                }
            }
            default -> {
                // 모양으로 정한다.
            }
        }
        Set<String> needed = new LinkedHashSet<>();
        for (Shape shape : shapes) {
            if (shape.rows() > 0 && shape.transform() != null) {
                needed.add(shape.transform());
            }
        }
        if (needed.isEmpty()) {
            return null;
        }
        return needed.size() == 1 ? needed.iterator().next() : MIXED;
    }

    private static void add(List<Violation> violations, String type, long rows) {
        if (rows > 0) {
            violations.add(new Violation(type, rows));
        }
    }

    private static long sum(List<Violation> violations) {
        return violations.stream().filter(violation -> violation.rows() != null).mapToLong(Violation::rows).sum();
    }

    private static long nonNull(ColumnProfile profile) {
        return profile.textValues() + profile.numberValues() + profile.temporalValues();
    }

    private static long unsupported(ColumnProfile profile) {
        return profile.lobValues() + profile.otherValues();
    }

    private static long placeholders(ColumnProfile profile) {
        return count(profile, "PLACEHOLDER_DATE") + count(profile, "PLACEHOLDER_DATE_TEXT");
    }

    /** 소스 선언이 날짜 타입이다 — 시각이 없는 값이라 일시 컬럼에는 자정을 붙여 쓴다. */
    private static boolean dateTyped(ColumnProfile profile) {
        return profile.jdbcType() != null && profile.jdbcType() == Types.DATE;
    }

    private static long flags(ColumnProfile profile) {
        return count(profile, "YN_LOWER") + count(profile, "ONE_ZERO") + count(profile, "TRUE_FALSE");
    }

    private static long numericText(ColumnProfile profile) {
        return count(profile, "INTEGER_TEXT") + count(profile, "DECIMAL_TEXT");
    }

    private static String type(StandardDictionary.Domain domain) {
        return domain.dataType() == null ? "" : domain.dataType().toUpperCase(Locale.ROOT);
    }

    private static boolean dominant(long matches, long total) {
        return total > 0 && matches >= DOMINANT * total;
    }

    private static long count(ColumnProfile profile, String pattern) {
        return profile.patternMatches().getOrDefault(pattern, 0L);
    }
}
