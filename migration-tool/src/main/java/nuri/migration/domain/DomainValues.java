package nuri.migration.domain;

import nuri.migration.profile.ValuePattern;

import java.io.InputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.SQLXML;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 표준 도메인 변환기(ADR-0029 L3a-1). 값 하나를 표준 도메인 표기로 바꾸거나 {@link DomainValueRejected} 로 거부하는
 * 순수 함수다 — 같은 값은 언제나 같은 결과이고, 거부 메시지에는 값을 싣지 않는다.
 *
 * <p>모양 판정은 프로파일러의 {@link ValuePattern} 을 그대로 쓴다. 숫자형 값은 프로파일러와 같은 문자 표기
 * ({@code BigDecimal.toPlainString}, 그 밖은 {@code toString})로 바꾼 뒤 판정하고, 문자는 앞뒤 공백을 지운다. 그래서
 * 적합성 추정기가 위반으로 센 값은 실행도 같은 이유로 거부한다. 추정기보다 엄격한 경우는 다음뿐이다
 * ({@code DomainParityTest} 가 이 목록을 고정한다).</p>
 * <ol>
 *   <li>날짜 의미 변환기에 오는 시간형 객체·일시 문자의 자정이 아닌 시각({@link DomainViolation#TIME_PRESENT}).</li>
 *   <li>구분자가 있는 날짜·일시 표기의 달력·시각 오류와 일시 표기의 날짜 구분자 혼용 — 추정기는 8·14자리 숫자만
 *       달력을 보고, 일시 모양은 구분자를 섞어도 센다.</li>
 *   <li>{@code ymdhms14} 의 날짜만 있는 값과 0이 아닌 소수 초.</li>
 *   <li>{@code timestamp-text} 의 날짜만 있는 값.</li>
 *   <li>시간대를 정해야 날짜가 정해지는 시간형 객체({@code OffsetDateTime}·{@code ZonedDateTime}·{@code java.util.Date}).</li>
 *   <li>추정기가 codemap 을 제안한 여부 값({@code 1}·{@code 0}·{@code T}·{@code F}·{@code TRUE}·{@code FALSE}) — 극성은
 *       사람이 codemap 으로 정한다.</li>
 *   <li>네 자리로 쓸 수 없는 연도(0~9999 밖)의 시간형 객체를 문자 표기로 옮기는 경우.</li>
 * </ol>
 *
 * <p>자리표시 날짜는 8자리·하이픈 형태와 같은 표기의 숫자형뿐이다({@link DomainPlaceholders}). 슬래시·점·일시 표기와
 * 시간형 객체는 추정기와 같이 그 모양의 값으로 판정한다.</p>
 */
public final class DomainValues {

    /** 일시 표기. 날짜 구분자는 한 종류여야 한다(역참조). {@link ValuePattern#DATETIME_TEXT} 와 같은 모양이다. */
    private static final Pattern DATE_TIME_TEXT = Pattern.compile(
            "(\\d{4})([-/.])(\\d{2})\\2(\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{1,9}))?)?");

    private DomainValues() {}

    /** {@code ymd8}: 8자리 {@code yyyyMMdd} 문자. 시각이 붙은 값은 자정일 때만 받는다. */
    public static String ymd8(Object value) {
        return value == null ? null : basicDate(dateValue(value, false, false));
    }

    /** {@code ymd8-truncate}: {@link #ymd8} 과 같되 시간형 객체의 시각을 버린다. 원장에 사유가 있어야 한다. */
    public static String ymd8Truncate(Object value) {
        return value == null ? null : basicDate(dateValue(value, true, false));
    }

    /** {@code date-text}: 날짜. {@link #ymd8} 의 입력과 자정인 14자리·구분자 일시 문자를 받는다. */
    public static LocalDate dateText(Object value) {
        return value == null ? null : dateValue(value, false, true);
    }

    /** {@code date-truncate}(v2): {@link #dateText} 와 같되 시각을 버린다. 자리표시 날짜는 거부한다. */
    public static LocalDate dateTruncate(Object value) {
        return value == null ? null : dateValue(value, true, true);
    }

    /** {@code timestamp-from-date}: {@link #dateText} 의 날짜를 그날 00:00 일시로 쓴다. 원장에 사유가 있어야 한다. */
    public static LocalDateTime timestampFromDate(Object value) {
        return value == null ? null : dateValue(value, false, true).atStartOfDay();
    }

    /** {@code ymdhms14}: 14자리 {@code yyyyMMddHHmmss} 문자. 초를 생략한 일시 문자는 00초로 본다. */
    public static String ymdhms14(Object value) {
        if (value == null) {
            return null;
        }
        LocalDateTime dateTime;
        String text = text(value);
        if (text != null) {
            dateTime = dateTime(text);
            if (dateTime == null) {
                throw rejected(DomainViolation.FORMAT);
            }
        } else if (temporal(value) instanceof LocalDateTime objectDateTime) {
            dateTime = objectDateTime;
        } else {
            throw rejected(DomainViolation.FORMAT);
        }
        if (dateTime.getNano() != 0) {
            throw rejected(DomainViolation.FORMAT);
        }
        requireFourDigitYear(dateTime.getYear());
        return String.format(Locale.ROOT, "%04d%02d%02d%02d%02d%02d", dateTime.getYear(), dateTime.getMonthValue(),
                dateTime.getDayOfMonth(), dateTime.getHour(), dateTime.getMinute(), dateTime.getSecond());
    }

    /** {@code timestamp-text}: 일시. 14자리·구분자 일시 문자와 일시 객체만 받는다 — 날짜만 있는 값은 거부한다. */
    public static LocalDateTime timestampText(Object value) {
        if (value == null) {
            return null;
        }
        String text = text(value);
        if (text != null) {
            LocalDateTime dateTime = dateTime(text);
            if (dateTime != null) {
                return dateTime;
            }
            // 자리표시·달력 오류는 추정기와 같은 이유로 먼저 거부하고, 날짜만 있는 값은 형식 위반이다.
            dateOnly(text);
            throw rejected(DomainViolation.FORMAT);
        }
        if (temporal(value) instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        throw rejected(DomainViolation.FORMAT);
    }

    /** {@code hms6}: 6자리 {@code HHmmss} 문자. {@code HH:mm:ss} 와 앞자리 0 이 사라진 숫자는 받지 않는다. */
    public static String hms6(Object value) {
        if (value == null) {
            return null;
        }
        LocalTime time;
        if (value instanceof java.sql.Time sqlTime) {
            if (Math.floorMod(sqlTime.getTime(), 1000L) != 0) {
                throw rejected(DomainViolation.FORMAT);
            }
            time = sqlTime.toLocalTime();
        } else if (value instanceof LocalTime localTime) {
            time = localTime;
        } else {
            String text = text(value);
            if (text != null && ValuePattern.HMS6.matches(text)) {
                return text;
            }
            if (text == null) {
                temporal(value);
            }
            throw rejected(DomainViolation.FORMAT);
        }
        if (time.getNano() != 0) {
            throw rejected(DomainViolation.FORMAT);
        }
        return String.format(Locale.ROOT, "%02d%02d%02d", time.getHour(), time.getMinute(), time.getSecond());
    }

    /** {@code yn}: {@code Y}·{@code N}. 대소문자를 가리지 않고 Boolean 을 받는다. 1·0·T·F 는 codemap 으로 정한다. */
    public static String yn(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean flag) {
            return flag ? "Y" : "N";
        }
        String text = text(value);
        if (text == null) {
            temporal(value);
        } else if (value instanceof String || value instanceof Character) {
            if (text.equalsIgnoreCase("Y")) {
                return "Y";
            }
            if (text.equalsIgnoreCase("N")) {
                return "N";
            }
        }
        throw rejected(DomainViolation.FORMAT);
    }

    /** 숫자형 값의 판정 표기. 프로파일러({@code ColumnProfiler})와 같다 — 어긋나면 동치 시험이 알린다. */
    private static String numberText(Number number) {
        return number instanceof BigDecimal decimal ? decimal.toPlainString() : number.toString();
    }

    /**
     * 날짜 의미 변환기의 공통 판정. 날짜만 있는 문자 표기와 같은 표기의 숫자형, 날짜 객체를 받는다. 일시 객체는 자정일
     * 때만(truncate 면 늘) 받고, {@code dateTimeText} 면 14자리·구분자 일시 문자도 같은 규칙으로 받는다.
     */
    private static LocalDate dateValue(Object value, boolean truncate, boolean dateTimeText) {
        String text = text(value);
        if (text != null) {
            LocalDate date = dateOnly(text);
            if (date != null) {
                return date;
            }
            LocalDateTime dateTime = dateTimeText ? dateTime(text) : null;
            if (dateTime == null) {
                throw rejected(DomainViolation.FORMAT);
            }
            return dateOf(dateTime, truncate);
        }
        Object temporal = temporal(value);
        if (temporal instanceof LocalDate date) {
            return date;
        }
        return dateOf((LocalDateTime) temporal, truncate);
    }

    private static LocalDate dateOf(LocalDateTime dateTime, boolean truncate) {
        if (!truncate && !dateTime.toLocalTime().equals(LocalTime.MIDNIGHT)) {
            throw rejected(DomainViolation.TIME_PRESENT);
        }
        return dateTime.toLocalDate();
    }

    /**
     * 문자·숫자 값의 판정 표기(프로파일러와 같다). 공백뿐인 문자는 {@code BLANK}, Boolean 은 {@code FORMAT}, LOB·이진
     * 값은 {@code UNSUPPORTED_VALUE_TYPE} 으로 거부한다. 그 밖의 종류면 null 이다.
     */
    private static String text(Object value) {
        if (value instanceof Blob || value instanceof Clob || value instanceof SQLXML
                || value instanceof byte[] || value instanceof InputStream || value instanceof Reader) {
            throw rejected(DomainViolation.UNSUPPORTED_VALUE_TYPE);
        }
        if (value instanceof String || value instanceof Character) {
            String raw = value.toString();
            if (raw.isBlank()) {
                throw rejected(DomainViolation.BLANK);
            }
            return raw.strip();
        }
        if (value instanceof Number number) {
            return numberText(number);
        }
        if (value instanceof Boolean) {
            // 여부 변환기는 Boolean 을 먼저 받는다. 그 밖의 변환기에는 형식 위반이다 — 프로파일러도 TRUE·FALSE 문자로 센다.
            throw rejected(DomainViolation.FORMAT);
        }
        return null;
    }

    /**
     * 시간형 객체의 지역 날짜({@link LocalDate}) 또는 일시({@link LocalDateTime}). 시간대를 정해야 날짜가 정해지는 객체는
     * {@code FORMAT}, 시각 전용 객체와 그 밖의 종류는 {@code UNSUPPORTED_VALUE_TYPE} 으로 거부한다.
     */
    private static Object temporal(Object value) {
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDateTime || value instanceof LocalDate) {
            return value;
        }
        if (value instanceof OffsetDateTime || value instanceof ZonedDateTime
                || (value instanceof java.util.Date && !(value instanceof java.sql.Time))) {
            throw rejected(DomainViolation.FORMAT);
        }
        throw rejected(DomainViolation.UNSUPPORTED_VALUE_TYPE);
    }

    /** 날짜만 있는 문자 표기(8자리·하이픈·슬래시·점). 그 모양이 아니면 null. 자리표시·달력 오류는 거부한다. */
    private static LocalDate dateOnly(String text) {
        if (ValuePattern.YMD8.matches(text)) {
            if (ValuePattern.PLACEHOLDER_DATE.matches(text)) {
                throw rejected(DomainViolation.PLACEHOLDER_DATE);
            }
            return calendar(text, 4, 6);
        }
        if (ValuePattern.YMD_DASHED.matches(text) && ValuePattern.PLACEHOLDER_DATE_TEXT.matches(text)) {
            throw rejected(DomainViolation.PLACEHOLDER_DATE);
        }
        if (ValuePattern.YMD_DASHED.matches(text) || ValuePattern.YMD_SLASHED.matches(text)
                || ValuePattern.YMD_DOTTED.matches(text)) {
            return calendar(text, 5, 8);
        }
        return null;
    }

    private static LocalDate calendar(String text, int month, int day) {
        try {
            return LocalDate.of(number(text, 0, 4), number(text, month, month + 2), number(text, day, day + 2));
        } catch (DateTimeException invalid) {
            throw rejected(DomainViolation.INVALID_DATE);
        }
    }

    /** 14자리 일시 또는 구분자 일시 문자. 그 모양이 아니면 null. 달력·시각 오류는 거부한다. */
    private static LocalDateTime dateTime(String text) {
        try {
            if (ValuePattern.YMDHMS14.matches(text)) {
                return LocalDateTime.of(number(text, 0, 4), number(text, 4, 6), number(text, 6, 8),
                        number(text, 8, 10), number(text, 10, 12), number(text, 12, 14));
            }
            if (!ValuePattern.DATETIME_TEXT.matches(text)) {
                return null;
            }
            Matcher parts = DATE_TIME_TEXT.matcher(text);
            if (!parts.matches()) {
                throw rejected(DomainViolation.FORMAT);
            }
            String fraction = parts.group(8) == null ? "" : parts.group(8);
            return LocalDateTime.of(Integer.parseInt(parts.group(1)), Integer.parseInt(parts.group(3)),
                    Integer.parseInt(parts.group(4)), Integer.parseInt(parts.group(5)),
                    Integer.parseInt(parts.group(6)), parts.group(7) == null ? 0 : Integer.parseInt(parts.group(7)),
                    fraction.isEmpty() ? 0 : Integer.parseInt((fraction + "00000000").substring(0, 9)));
        } catch (DateTimeException invalid) {
            throw rejected(DomainViolation.INVALID_DATE);
        }
    }

    private static int number(String text, int begin, int end) {
        return Integer.parseInt(text, begin, end, 10);
    }

    private static String basicDate(LocalDate date) {
        requireFourDigitYear(date.getYear());
        return String.format(Locale.ROOT, "%04d%02d%02d", date.getYear(), date.getMonthValue(), date.getDayOfMonth());
    }

    private static void requireFourDigitYear(int year) {
        if (year < 0 || year > 9999) {
            throw rejected(DomainViolation.FORMAT);
        }
    }

    private static DomainValueRejected rejected(DomainViolation violation) {
        return new DomainValueRejected(violation);
    }
}
