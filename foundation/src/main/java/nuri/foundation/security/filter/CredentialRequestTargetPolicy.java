package nuri.foundation.security.filter;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 자격증명을 request-target(path/query) 이름으로 노출하지 않기 위한 공통 분류 정책.
 *
 * <p>이 클래스는 이름만 분류한다. 요청 값이나 헤더를 입력으로 전달해서는 안 된다.
 */
public final class CredentialRequestTargetPolicy {

    private static final Pattern NON_ASCII_ALPHANUMERIC = Pattern.compile("[^A-Za-z0-9]");
    private static final Set<String> FORBIDDEN_NAME_ROOTS = Set.of(
            "password", "passwd", "pswd", "pwd", "passcode", "token", "secret",
            "credential", "apikey", "otp", "jwt", "csrf", "authorization", "cookie");

    private CredentialRequestTargetPolicy() {
    }

    /**
     * 구분자와 대소문자를 정규화한 뒤 금지된 자격증명 이름 계열인지 판정한다.
     *
     * @param name path 또는 query parameter의 이름. 값은 전달하지 않는다.
     * @return 금지된 이름 계열이 정규화된 parameter 이름에 포함되면 {@code true}
     */
    public static boolean isForbiddenName(String name) {
        if (name == null || name.isEmpty()) {
            return false;
        }

        String normalized = NON_ASCII_ALPHANUMERIC.matcher(name)
                .replaceAll("")
                .toLowerCase(Locale.ROOT);
        return FORBIDDEN_NAME_ROOTS.stream().anyMatch(normalized::contains);
    }
}
