package nuri.migration.profile;

import java.util.regex.Pattern;

/**
 * 프로파일이 세는 값 모양이다(레거시 표준화 설계 §4.1 프로파일 항목). 한 값이 여러 모양에 맞을 수 있고 각각 센다 —
 * 문자 {@code "20240131"} 은 {@link #YMD8} 이면서 {@link #INTEGER_TEXT} 다. 앞뒤 공백을 지운 값으로 판정한다.
 *
 * <p>숫자형 값({@code NUMBER(8)} 의 {@code 20240131} 등)은 날짜·여부 모양으로는 세지만 {@link #INTEGER_TEXT}·
 * {@link #DECIMAL_TEXT} 로는 세지 않는다 — 숫자형 값은 {@code numberValues} 가 이미 센다. 두 모양은 숫자로 읽히는
 * <em>문자</em> 값의 수다.</p>
 */
public enum ValuePattern {
    /** 8자리 숫자. 달력에 있는 날짜인지는 따로 센다({@code ymd8Invalid}). */
    YMD8("\\d{8}", false),
    YMD_DASHED("\\d{4}-\\d{2}-\\d{2}", false),
    YMD_SLASHED("\\d{4}/\\d{2}/\\d{2}", false),
    YMD_DOTTED("\\d{4}\\.\\d{2}\\.\\d{2}", false),
    DATETIME_TEXT("\\d{4}[-/.]\\d{2}[-/.]\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?", false),
    /** {@link #DATETIME_TEXT} 가운데 날짜 구분자가 하이픈인 값. 내장 {@code type: timestamp} 가 읽는 표기는 이것뿐이다. */
    DATETIME_DASHED("\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?", false),
    /** 14자리 숫자. 달력·시각에 있는 값인지는 따로 센다({@code ymdhms14Invalid}). */
    YMDHMS14("\\d{14}", false),
    HMS6("(?:[01]\\d|2[0-3])[0-5]\\d[0-5]\\d", false),
    YN("[YN]", false),
    YN_LOWER("[yn]", false),
    ONE_ZERO("[01]", false),
    TRUE_FALSE("(?i)true|false|t|f", false),
    INTEGER_TEXT("[-+]?\\d+", false),
    DECIMAL_TEXT("[-+]?\\d*\\.\\d+", false),
    /** 8자리 자리표시 날짜. {@link #YMD8} 이지만 달력 검사({@code ymd8Invalid})에서는 빠진다. */
    PLACEHOLDER_DATE("99991231|00000000", false),
    /**
     * 하이픈 자리표시 날짜. {@link #YMD_DASHED} 와 함께 센다. 슬래시·점·일시·14자리 자리표시는 세지 않는다 — 그런
     * 값은 그 모양의 유효 값으로 들어간다.
     */
    PLACEHOLDER_DATE_TEXT("9999-12-31|0000-00-00", false),
    PLACEHOLDER_TEXT("-|\\.|N/A|n/a|NULL|null", false),
    RRN("\\d{6}-?[1-8]\\d{6}", true),
    PHONE("0\\d{1,2}[-. ]?\\d{3,4}[-. ]?\\d{4}", true),
    EMAIL("[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}", true);

    private final Pattern pattern;
    private final boolean personal;

    ValuePattern(String regex, boolean personal) {
        this.pattern = Pattern.compile(regex);
        this.personal = personal;
    }

    /** 개인정보 모양이면 그 컬럼의 값 빈도를 남기지 않는다. */
    public boolean personal() {
        return personal;
    }

    boolean matches(String trimmed) {
        return pattern.matcher(trimmed).matches();
    }
}
