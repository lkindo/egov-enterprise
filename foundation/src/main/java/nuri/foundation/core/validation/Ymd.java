package nuri.foundation.core.validation;

import java.util.regex.Pattern;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/** Gregorian yyyyMMdd input contract, also exported by @Pattern to OpenAPI/Zod. */
public final class Ymd {
    private Ymd() { }

    // Empty means an omitted optional date. Whitespace and year 0000 are never dates.
    // Separate month lengths and leap years keep Java and JavaScript validation identical.
    public static final String OPTIONAL_PATTERN = "^(?:|(?!0000)(?:[0-9]{4}(?:"
            + "(?:0[13578]|1[02])(?:0[1-9]|[12][0-9]|3[01])|"
            + "(?:0[469]|11)(?:0[1-9]|[12][0-9]|30)|02(?:0[1-9]|1[0-9]|2[0-8]))|"
            + "(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|"
            + "(?:0[48]|[2468][048]|[13579][26])00)0229))(?![\\s\\S])";

    private static final Pattern COMPACT_DATE = Pattern.compile(OPTIONAL_PATTERN);
    private static final Pattern COMPATIBLE_SHAPE = Pattern.compile("(?:[0-9]{8}|[0-9]{4}-[0-9]{2}-[0-9]{2})");

    /** 기존 도메인의 null·빈 값·ISO 입력을 허용하되, 원문을 바꾸지 않고 검증한다. */
    public static void validateCompatible(String value) {
        if (value == null || value.isEmpty()) return;
        if (!COMPATIBLE_SHAPE.matcher(value).matches()) {
            throw new BusinessException("날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.",
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (!COMPACT_DATE.matcher(value.replace("-", "")).matches()) {
            throw new BusinessException("유효하지 않은 날짜 형식입니다: " + value,
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    /** 호출자가 기본값·trim 정책을 적용한 날짜를 yyyyMMdd로 맞춘다. null과 빈 값은 보존한다. */
    public static String compact(String value) {
        validateCompatible(value);
        return value == null ? null : value.replace("-", "");
    }
}
