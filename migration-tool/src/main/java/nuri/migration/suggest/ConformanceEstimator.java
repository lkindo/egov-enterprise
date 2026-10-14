package nuri.migration.suggest;

import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.ValueFrequency;
import nuri.migration.suggest.SuggestionReport.ConformanceEstimate;
import nuri.migration.suggest.SuggestionReport.Violation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 프로파일 집계만으로 컬럼의 데이터 범주를 정하고, 후보 도메인에 얼마나 맞는지 추정한다(레거시 표준화 설계 §4.3).
 *
 * <p>행 단위로 다시 읽지 않는다 — 셀 수 있는 위반(달력에 없는 날짜, 허용값 밖의 코드)은 행 수를, 셀 수 없는 위반(최대
 * 길이 초과, 희소 값의 허용 여부)은 행 수 없이 종류만 보고한다. 셀 수 없는 위반이 있으면 적합률을 내지 않는다.</p>
 */
public final class ConformanceEstimator {

    /** 범주를 정하는 최소 비율. 이보다 낮으면 섞인 컬럼으로 본다. */
    static final double DOMINANT = 0.95;
    private static final Pattern ALLOWED_CODE = Pattern.compile("(?:^|,)\\s*([A-Za-z0-9]{1,12})\\s*:");

    private ConformanceEstimator() {}

    /** 데이터 범주: DATE8·DATE_TEXT·DATETIME14·TEMPORAL·TIME6·YN·FLAG·NUMERIC·CODE·TEXT·EMPTY. */
    static String dataCategory(ColumnProfile profile) {
        long nonNull = nonNull(profile);
        if (nonNull == 0) {
            return "EMPTY";
        }
        if (dominant(profile.temporalValues(), nonNull)) {
            return "TEMPORAL";
        }
        if (dominant(count(profile, "YMD8"), nonNull)) {
            return "DATE8";
        }
        if (dominant(count(profile, "YMDHMS14"), nonNull)) {
            return "DATETIME14";
        }
        if (dominant(count(profile, "YMD_DASHED") + count(profile, "YMD_SLASHED") + count(profile, "YMD_DOTTED"),
                nonNull)) {
            return "DATE_TEXT";
        }
        if (dominant(count(profile, "HMS6"), nonNull)) {
            return "TIME6";
        }
        if (dominant(count(profile, "YN"), nonNull)) {
            return "YN";
        }
        if (dominant(count(profile, "YN") + count(profile, "YN_LOWER") + count(profile, "ONE_ZERO")
                + count(profile, "TRUE_FALSE"), nonNull)) {
            return "FLAG";
        }
        if (dominant(profile.numberValues() + count(profile, "INTEGER_TEXT") + count(profile, "DECIMAL_TEXT"),
                nonNull)) {
            return "NUMERIC";
        }
        if (!profile.valueFrequencies().isEmpty()) {
            return "CODE";
        }
        return "TEXT";
    }

    /** 도메인 범주: DATE8·DATETIME14·TEMPORAL·TIME6·YN·CODE·NUMERIC·TEXT. */
    static String domainCategory(StandardDictionary.Domain domain) {
        if (domain == null) {
            return "TEXT";
        }
        String name = domain.name() == null ? "" : domain.name();
        String type = domain.dataType() == null ? "" : domain.dataType().toUpperCase(Locale.ROOT);
        if (name.startsWith("연월일C8")) {
            return "DATE8";
        }
        if (name.startsWith("연월일시분초C14")) {
            return "DATETIME14";
        }
        if (type.equals("DATE") || type.equals("DATETIME") || type.equals("TIMESTAMP")) {
            return "TEMPORAL";
        }
        if (name.startsWith("시분초C6")) {
            return "TIME6";
        }
        if (name.startsWith("여부") || name.startsWith("유무")) {
            return "YN";
        }
        if (type.equals("NUMERIC") || type.equals("NUMBER") || type.equals("INTEGER") || type.equals("BIGINT")) {
            return "NUMERIC";
        }
        if (name.startsWith("코드")) {
            return "CODE";
        }
        return "TEXT";
    }

    /** 데이터와 도메인이 같은 뜻으로 읽히는지. 데이터 범주가 뚜렷하지 않으면(CODE·TEXT·EMPTY) 늘 맞는다고 본다. */
    static boolean compatible(String data, String domain) {
        return switch (data) {
            case "DATE8" -> Set.of("DATE8", "TEMPORAL").contains(domain);
            case "DATE_TEXT" -> Set.of("DATE8", "TEMPORAL").contains(domain);
            case "DATETIME14" -> Set.of("DATETIME14", "TEMPORAL").contains(domain);
            case "TEMPORAL" -> Set.of("TEMPORAL", "DATE8", "DATETIME14").contains(domain);
            case "TIME6" -> domain.equals("TIME6");
            case "YN", "FLAG" -> Set.of("YN", "CODE").contains(domain);
            case "NUMERIC" -> Set.of("NUMERIC", "CODE", "TEXT").contains(domain);
            default -> true;
        };
    }

    /** 후보 도메인에 대한 적합성 추정. 도메인이 없으면 추정하지 않는다. */
    static ConformanceEstimate estimate(ColumnProfile profile, StandardDictionary.Domain domain,
                                        String allowedValues) {
        long nonNull = nonNull(profile);
        if (domain == null || nonNull == 0) {
            return new ConformanceEstimate(null, List.of(), null);
        }
        String data = dataCategory(profile);
        String target = domainCategory(domain);
        List<Violation> violations = new ArrayList<>();
        String transform = null;
        long valid;
        switch (target) {
            case "DATE8" -> {
                if (data.equals("DATE_TEXT")) {
                    transform = "ymd8";
                    valid = count(profile, "YMD_DASHED") + count(profile, "YMD_SLASHED")
                            + count(profile, "YMD_DOTTED");
                } else if (data.equals("TEMPORAL")) {
                    transform = "ymd8";
                    valid = profile.temporalValues();
                } else {
                    long placeholders = Math.min(count(profile, "PLACEHOLDER_DATE"), count(profile, "YMD8"));
                    valid = count(profile, "YMD8") - profile.ymd8Invalid() - placeholders;
                    add(violations, "INVALID_DATE", profile.ymd8Invalid());
                    add(violations, "PLACEHOLDER_DATE", placeholders);
                }
            }
            case "DATETIME14" -> {
                if (data.equals("TEMPORAL")) {
                    transform = "ymdhms14";
                    valid = profile.temporalValues();
                } else {
                    valid = count(profile, "YMDHMS14");
                }
            }
            case "TEMPORAL" -> {
                if (data.equals("DATE8")) {
                    transform = "date";
                    valid = count(profile, "YMD8") - profile.ymd8Invalid();
                    add(violations, "INVALID_DATE", profile.ymd8Invalid());
                } else {
                    valid = profile.temporalValues();
                }
            }
            case "TIME6" -> valid = count(profile, "HMS6");
            case "YN" -> {
                valid = count(profile, "YN");
                long flags = count(profile, "YN_LOWER") + count(profile, "ONE_ZERO") + count(profile, "TRUE_FALSE");
                if (flags > 0) {
                    transform = "yn";
                    valid += flags;
                }
            }
            case "NUMERIC" -> valid = profile.numberValues() + count(profile, "INTEGER_TEXT")
                    + count(profile, "DECIMAL_TEXT");
            default -> valid = nonNull;
        }
        add(violations, "FORMAT", nonNull - valid - sum(violations));
        boolean countable = true;
        if (domain.length() != null && domain.length() > 0 && profile.maxLength() != null
                && (target.equals("TEXT") || target.equals("CODE"))
                && profile.maxLength() > domain.length()) {
            violations.add(new Violation("LENGTH_EXCEEDED", null));
            countable = false;
        }
        Set<String> allowed = allowedCodes(allowedValues);
        if (!allowed.isEmpty() && (target.equals("CODE") || target.equals("YN"))) {
            if (profile.frequencyOmittedReason() != null) {
                violations.add(new Violation("ALLOWED_VALUES_UNVERIFIED", null));
                countable = false;
            } else {
                long outside = 0;
                for (ValueFrequency frequency : profile.valueFrequencies()) {
                    if (!allowed.contains(frequency.value())) {
                        outside += frequency.rows();
                    }
                }
                add(violations, "NOT_ALLOWED", outside);
                valid -= Math.min(valid, outside);
                if (profile.rareValueRows() > 0) {
                    violations.add(new Violation("ALLOWED_VALUES_UNVERIFIED", profile.rareValueRows()));
                    countable = false;
                }
            }
        }
        BigDecimal rate = countable
                ? BigDecimal.valueOf(Math.max(0, valid) * 100.0 / nonNull).setScale(1, RoundingMode.HALF_UP)
                : null;
        return new ConformanceEstimate(rate, violations, transform);
    }

    /** 공통표준 허용값 원문에서 코드만 꺼낸다. 목록이 잘려 있으면({@code …}) 확인할 수 없어 비운다. */
    static Set<String> allowedCodes(String allowedValues) {
        Set<String> codes = new LinkedHashSet<>();
        if (allowedValues == null || allowedValues.contains("…") || allowedValues.contains("...")) {
            return codes;
        }
        Matcher code = ALLOWED_CODE.matcher(allowedValues);
        while (code.find()) {
            codes.add(code.group(1));
        }
        return codes;
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

    private static boolean dominant(long matches, long total) {
        return total > 0 && matches >= DOMINANT * total;
    }

    private static long count(ColumnProfile profile, String pattern) {
        return profile.patternMatches().getOrDefault(pattern, 0L);
    }
}
