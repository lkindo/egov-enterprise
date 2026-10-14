package nuri.migration.artifact;

import java.util.EnumSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 수집 산출물(profile·app-scan)에 개인정보 값이 실리지 않게 하는 패턴이다(ADR-0029 결정 1·9).
 *
 * <p>주민등록번호·전화번호·이메일을 찾는다. 앞뒤가 영문자·숫자면 맞추지 않아 digest 같은 hex 문자열 안의
 * 숫자열을 개인정보로 보지 않는다. 틀리는 쪽은 과잉 탐지다 — 개인정보처럼 보이는 숫자열은 가린다.</p>
 */
public final class PersonalDataPatterns {

    /** 찾는 개인정보 종류. */
    public enum Kind {
        RRN, PHONE, EMAIL
    }

    private static final String BEFORE = "(?<![0-9A-Za-z])";
    private static final String AFTER = "(?![0-9A-Za-z])";
    private static final Pattern RRN = Pattern.compile(BEFORE + "\\d{6}-?[1-8]\\d{6}" + AFTER);
    private static final Pattern PHONE = Pattern.compile(BEFORE + "0\\d{1,2}[-. ]?\\d{3,4}[-. ]?\\d{4}" + AFTER);
    private static final Pattern EMAIL = Pattern.compile(
            "(?<![0-9A-Za-z._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}"
                    + "(?![0-9A-Za-z])");

    private PersonalDataPatterns() {}

    /** 값 안에 있는 개인정보 종류. 없으면 빈 집합이다. */
    public static Set<Kind> find(String value) {
        EnumSet<Kind> found = EnumSet.noneOf(Kind.class);
        if (value == null || value.isEmpty()) {
            return found;
        }
        if (RRN.matcher(value).find()) {
            found.add(Kind.RRN);
        }
        if (PHONE.matcher(value).find()) {
            found.add(Kind.PHONE);
        }
        if (EMAIL.matcher(value).find()) {
            found.add(Kind.EMAIL);
        }
        return found;
    }

    /** 개인정보로 보이는 부분을 {@code [REDACTED:종류]} 로 바꾼다. */
    public static String redact(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        String redacted = replace(RRN, value, Kind.RRN);
        redacted = replace(PHONE, redacted, Kind.PHONE);
        return replace(EMAIL, redacted, Kind.EMAIL);
    }

    private static String replace(Pattern pattern, String value, Kind kind) {
        return pattern.matcher(value).replaceAll(Matcher.quoteReplacement("[REDACTED:" + kind + "]"));
    }
}
