package nuri.migration.profile;

import java.util.regex.Pattern;

/**
 * 프로파일이 세는 값 모양이다(레거시 표준화 설계 §4.1 프로파일 항목). 한 값이 여러 모양에 맞을 수 있고 각각 센다 —
 * {@code 20240131} 은 {@link #YMD8} 이면서 {@link #INTEGER_TEXT} 다. 앞뒤 공백을 지운 값으로 판정한다.
 */
public enum ValuePattern {
    /** 8자리 숫자. 달력에 있는 날짜인지는 따로 센다({@code ymd8Invalid}). */
    YMD8("\\d{8}", false),
    YMD_DASHED("\\d{4}-\\d{2}-\\d{2}", false),
    YMD_SLASHED("\\d{4}/\\d{2}/\\d{2}", false),
    YMD_DOTTED("\\d{4}\\.\\d{2}\\.\\d{2}", false),
    DATETIME_TEXT("\\d{4}[-/.]\\d{2}[-/.]\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?", false),
    YMDHMS14("\\d{14}", false),
    HMS6("(?:[01]\\d|2[0-3])[0-5]\\d[0-5]\\d", false),
    YN("[YN]", false),
    YN_LOWER("[yn]", false),
    ONE_ZERO("[01]", false),
    TRUE_FALSE("(?i)true|false|t|f", false),
    INTEGER_TEXT("[-+]?\\d+", false),
    DECIMAL_TEXT("[-+]?\\d*\\.\\d+", false),
    PLACEHOLDER_DATE("99991231|00000000|9999-12-31|0000-00-00", false),
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
