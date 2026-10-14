package nuri.migration.profile;

import nuri.migration.artifact.PersonalDataPatterns;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.ValueFrequency;

import java.io.InputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLXML;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 한 컬럼의 값을 하나씩 받아 집계한다. 값 자체는 저장하지 않는다 — distinct 를 세려고 들고 있는 값은
 * {@value #DISTINCT_CAP}개까지이고, 산출물에는 {@link #finish} 가 코드 후보로 판정한 값만 남는다.
 *
 * <p>코드 후보로 싣는 조건: 개인정보 모양이 한 번도 없고, 모든 값이 문자열·숫자이며, 서로 다른 값이
 * {@value #CODE_MAX_DISTINCT}개 이하이고, 모든 값이 짧은 ASCII 코드 모양이다. 그래도 {@value #CODE_MIN_FREQUENCY}번
 * 미만으로 나온 값은 행 수만 합친다 — 작은 테이블의 이름·번호 같은 개별 값이 빈도표로 새지 않게 하기 위해서다.
 * 코드 모양은 대문자·숫자·{@code _.:-} 12자까지다. 소문자가 섞인 값(계정 ID 가 흔히 그렇다)은 싣지 않는다.</p>
 */
public final class ColumnProfiler {

    static final int DISTINCT_CAP = 1000;
    static final int CODE_MAX_DISTINCT = 20;
    static final int CODE_MIN_FREQUENCY = 5;
    private static final int KEY_INLINE_LIMIT = 64;
    private static final Pattern CODE_SHAPE = Pattern.compile("[A-Z0-9_.:-]{1,12}");

    private long rows;
    private long nulls;
    private long blanks;
    private long textValues;
    private long numberValues;
    private long temporalValues;
    private long lobValues;
    private long otherValues;
    private Integer minLength;
    private Integer maxLength;
    private long totalLength;
    private long trailingSpaces;
    private final Map<String, Long> counts = new HashMap<>();
    private boolean distinctCapped;
    private final EnumMap<ValuePattern, Long> patterns = new EnumMap<>(ValuePattern.class);
    private long ymd8Invalid;
    private Integer minYear;
    private Integer maxYear;
    private boolean personal;

    /** JDBC {@code getObject} 가 돌려준 값 하나를 센다. */
    public void accept(Object value) {
        rows++;
        if (value == null) {
            nulls++;
            return;
        }
        if (value instanceof Blob || value instanceof Clob || value instanceof SQLXML
                || value instanceof byte[] || value instanceof InputStream || value instanceof Reader) {
            lobValues++;
            return;
        }
        if (value instanceof String || value instanceof Character) {
            acceptText(value.toString());
            return;
        }
        if (value instanceof Number number) {
            numberValues++;
            String text = number instanceof BigDecimal decimal ? decimal.toPlainString() : number.toString();
            classify(text, true);
            remember(text);
            return;
        }
        Integer year = yearOf(value);
        if (year != null) {
            temporalValues++;
            year(year);
            remember(value.toString());
            return;
        }
        if (value instanceof Boolean flag) {
            acceptText(flag ? "TRUE" : "FALSE");
            return;
        }
        otherValues++;
    }

    private void acceptText(String text) {
        if (text.isBlank()) {
            blanks++;
            return;
        }
        textValues++;
        int length = text.codePointCount(0, text.length());
        minLength = minLength == null ? length : Math.min(minLength, length);
        maxLength = maxLength == null ? length : Math.max(maxLength, length);
        totalLength += length;
        if (text.endsWith(" ")) {
            trailingSpaces++;
        }
        String trimmed = text.strip();
        classify(trimmed, false);
        if (!PersonalDataPatterns.find(trimmed).isEmpty()) {
            personal = true;
        }
        remember(trimmed);
    }

    /** 숫자형 값은 숫자 모양 문자({@code INTEGER_TEXT}·{@code DECIMAL_TEXT})로 세지 않는다 — numberValues 가 센다. */
    private void classify(String trimmed, boolean number) {
        for (ValuePattern pattern : ValuePattern.values()) {
            if (number && (pattern == ValuePattern.INTEGER_TEXT || pattern == ValuePattern.DECIMAL_TEXT)) {
                continue;
            }
            if (pattern.matches(trimmed)) {
                patterns.merge(pattern, 1L, Long::sum);
                if (pattern.personal()) {
                    personal = true;
                }
            }
        }
        if (ValuePattern.YMD8.matches(trimmed) && !ValuePattern.PLACEHOLDER_DATE.matches(trimmed)) {
            LocalDate date = calendarDate(trimmed);
            if (date == null) {
                ymd8Invalid++;
            } else {
                year(date.getYear());
            }
        }
    }

    private static LocalDate calendarDate(String ymd8) {
        try {
            return LocalDate.of(Integer.parseInt(ymd8.substring(0, 4)),
                    Integer.parseInt(ymd8.substring(4, 6)), Integer.parseInt(ymd8.substring(6, 8)));
        } catch (DateTimeException failure) {
            return null;
        }
    }

    private void year(int year) {
        minYear = minYear == null ? year : Math.min(minYear, year);
        maxYear = maxYear == null ? year : Math.max(maxYear, year);
    }

    private void remember(String value) {
        String key = value.length() <= KEY_INLINE_LIMIT ? value : "#" + sha256(value);
        Long current = counts.get(key);
        if (current != null) {
            counts.put(key, current + 1);
        } else if (counts.size() < DISTINCT_CAP) {
            counts.put(key, 1L);
        } else {
            distinctCapped = true;
        }
    }

    private static Integer yearOf(Object value) {
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime().getYear();
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate().getYear();
        }
        if (value instanceof java.sql.Time) {
            return null;
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atOffset(ZoneOffset.UTC).getYear();
        }
        if (value instanceof LocalDate date) {
            return date.getYear();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.getYear();
        }
        if (value instanceof OffsetDateTime dateTime) {
            return dateTime.getYear();
        }
        if (value instanceof ZonedDateTime dateTime) {
            return dateTime.getYear();
        }
        if (value instanceof Temporal) {
            return null;
        }
        return null;
    }

    /** 집계를 끝내고 산출물 행을 만든다. 선언 정보와 코멘트는 호출자가 inventory 에서 가져온다. */
    public ColumnProfile finish(ColumnDeclaration declaration, CommentEvidence comment) {
        String omitted = frequencyOmittedReason();
        List<ValueFrequency> frequencies = new ArrayList<>();
        long rareRows = 0;
        long rareDistinct = 0;
        if (omitted == null) {
            for (Map.Entry<String, Long> entry : counts.entrySet()) {
                if (entry.getValue() >= CODE_MIN_FREQUENCY) {
                    frequencies.add(new ValueFrequency(entry.getKey(), entry.getValue()));
                } else {
                    rareRows += entry.getValue();
                    rareDistinct++;
                }
            }
            frequencies.sort(Comparator.comparingLong(ValueFrequency::rows).reversed()
                    .thenComparing(ValueFrequency::value));
        }
        Map<String, Long> matches = new LinkedHashMap<>();
        patterns.forEach((pattern, count) -> matches.put(pattern.name(), count));
        return new ColumnProfile(
                declaration.name(), declaration.ordinal(), declaration.nativeType(), declaration.jdbcType(),
                declaration.size(), declaration.scale(), declaration.nullable(),
                rows, nulls, blanks, textValues, numberValues, temporalValues, lobValues, otherValues,
                minLength, maxLength, totalLength, trailingSpaces,
                counts.size(), distinctCapped, matches, ymd8Invalid, minYear, maxYear, personal,
                frequencies, rareRows, rareDistinct, omitted, comment);
    }

    private String frequencyOmittedReason() {
        if (personal) {
            return "PERSONAL_PATTERN";
        }
        if (lobValues + temporalValues + otherValues > 0) {
            return "NON_CODE_TYPE";
        }
        if (counts.isEmpty()) {
            return "NO_VALUES";
        }
        if (distinctCapped || counts.size() > CODE_MAX_DISTINCT) {
            return "HIGH_CARDINALITY";
        }
        for (String key : counts.keySet()) {
            if (!CODE_SHAPE.matcher(key).matches()) {
                return "NON_CODE_SHAPE";
            }
        }
        return null;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    /** inventory 컬럼 객체에서 옮겨 오는 선언 정보. */
    public record ColumnDeclaration(String name, Integer ordinal, String nativeType, Integer jdbcType,
                                    Long size, Integer scale, Boolean nullable) {}
}
