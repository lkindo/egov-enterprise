package nuri.foundation.core.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 로그·에러 메시지에 실릴 개인정보를 마스킹한다.
 *
 * <p>[존재 이유 — W1-13] 이메일·휴대폰이 여러 서비스에서 <b>평문으로</b> 로그에 적재되고 있었다.
 * 로그는 애플리케이션보다 오래 살고 더 넓게 복제된다(수집기·백업·티켓 첨부). 개인정보 처리 관점에서
 * 로그는 저장소와 같은 등급으로 다뤄야 한다.
 *
 * <p>마스킹은 <b>추적 가능성을 남기는 선</b>에서 한다 — 같은 사용자의 로그를 이어 볼 수 있어야
 * 장애 분석이 되므로, 전부 가리지 않고 식별에 부족한 만큼만 남긴다.
 *
 * <p>null·형식 불일치 입력에서 예외를 던지지 않는다. 로깅 경로에서 던지는 유틸은
 * 진짜 오류를 가리는 2차 장애를 만든다.
 */
public final class PiiMaskUtil {

    private static final Pattern BEARER_TOKEN_PATTERN = Pattern.compile(
            "(?i)\\b(Bearer[ \\t]+)(?:[A-Za-z0-9._~+/=-]{16,}|[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)(?![A-Za-z0-9._~+/=-])");
    private static final Pattern JWT_PATTERN = Pattern.compile(
            "(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\\.eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-])");
    private static final Pattern RRNO_PATTERN = Pattern.compile(
            "(?<![0-9A-Za-z-])(\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01]))-([1-8]\\d{6})(?![0-9A-Za-z-])");
    private static final Pattern MOBILE_HYPHEN_PATTERN = Pattern.compile(
            "(?<![0-9A-Za-z_.-])(01[016789])-(\\d{3,4})-(\\d{4})(?![0-9A-Za-z_-]|\\.\\d)");
    private static final Pattern MOBILE_COMPACT_PATTERN = Pattern.compile(
            "(?<![0-9A-Za-z_.-])(01[016789])(\\d{3,4})(\\d{4})(?![0-9A-Za-z_-]|\\.\\d)");
    private static final Pattern LANDLINE_HYPHEN_PATTERN = Pattern.compile(
            "(?<![0-9A-Za-z_.-])(02|0[3-6][1-5]|070)-(\\d{3,4})-(\\d{4})(?![0-9A-Za-z_-]|\\.\\d)");
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "(?<![A-Za-z0-9._%+*-])([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,})(?![A-Za-z0-9-])");

    private PiiMaskUtil() {
    }

    /**
     * 이메일 마스킹. {@code hong@example.com} → {@code ho***@example.com}
     *
     * <p>도메인을 남기는 이유: 조직 도메인은 장애 범위 판단에 쓰이고 그 자체로는 개인을 식별하지 않는다.
     */
    public static String email(String value) {
        if (value == null || value.isBlank()) {
            return "(none)";
        }
        int at = value.indexOf('@');
        if (at <= 0) {
            // 이메일 형태가 아니면 형태를 추측하지 말고 통째로 가린다.
            return "***";
        }
        String local = value.substring(0, at);
        String domain = value.substring(at);
        String head = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return head + "***" + domain;
    }

    /**
     * 전화번호 마스킹. 숫자만 추려 가운데를 가린다. {@code 010-1234-5678} → {@code 010****5678}
     *
     * <p>앞 3자리와 뒤 4자리를 남기는 이유: 통신사·지역 판단과 사용자 문의 대조에 필요한 최소치다.
     */
    public static String phone(String value) {
        if (value == null || value.isBlank()) {
            return "(none)";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() < 7) {
            return "***";
        }
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }

    /**
     * 주민·외국인등록번호 마스킹. {@code 900101-1234567} → {@code 900101-*******}
     *
     * <p>생년월일(앞 6자리)과 형식 외 7자리는 가려 개인 식별을 막는다.
     */
    public static String rrno(String value) {
        if (value == null || value.isBlank()) {
            return "(none)";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() != 13) {
            return "***";
        }
        return digits.substring(0, 6) + "-*******";
    }

    /**
     * 자유 형식 로그 문구·예외 메시지·MDC 값 안의 개인정보와 Bearer/JWT 토큰을 일괄 가린다.
     *
     * <p>이미 마스킹된 값({@code ho***@example.com}, {@code 010****5678}, {@code 900101-*******},
     * {@code Bearer ***})을 다시 넘겨도 멱등하며, traceId(32hex)·spanId(16hex)·UUID·ISO 날짜·객체 해시는 보존한다.
     */
    public static String redactText(String text) {
        if (text == null) {
            return null;
        }
        String masked = BEARER_TOKEN_PATTERN.matcher(text).replaceAll("$1***");
        masked = JWT_PATTERN.matcher(masked).replaceAll("***(jwt)***");
        masked = RRNO_PATTERN.matcher(masked).replaceAll("$1-*******");
        masked = MOBILE_HYPHEN_PATTERN.matcher(masked).replaceAll("$1-****-$3");
        masked = MOBILE_COMPACT_PATTERN.matcher(masked).replaceAll("$1****$3");
        masked = LANDLINE_HYPHEN_PATTERN.matcher(masked).replaceAll("$1-****-$3");
        return maskEmails(masked);
    }

    private static String maskEmails(String text) {
        Matcher matcher = EMAIL_PATTERN.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder sb = new StringBuilder(text.length());
        do {
            matcher.appendReplacement(sb, Matcher.quoteReplacement(email(matcher.group(0))));
        } while (matcher.find());
        matcher.appendTail(sb);
        return sb.toString();
    }
}
