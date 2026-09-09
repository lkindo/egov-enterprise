package nuri.foundation.security.util;

/** 운영 진단에 필요한 식별자·경로만 한 줄과 유한 길이로 기록한다. 비밀/본문에는 사용하지 않는다. */
public final class SafeLog {
    private SafeLog() {}

    public static String text(String value) {
        if (value == null) return "<null>";
        String bounded = value.length() > 256 ? value.substring(0, 256) : value;
        return bounded.replace('\r', '_').replace('\n', '_')
                .replaceAll("[\\p{Cntrl}\\u0085\\u2028\\u2029]", "_");
    }
}
