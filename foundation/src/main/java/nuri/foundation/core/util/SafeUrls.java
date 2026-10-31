package nuri.foundation.core.util;

import java.util.regex.Pattern;

/**
 * 관리자가 입력해 사용자 화면에 나가는 주소의 저장 경계.
 *
 * <p>화면도 위험한 스킴을 그리지 않지만, 저장된 값은 다른 화면·내보내기로 다시 나갈 수 있어 입력에서 함께 막는다. 사이트 안 경로와
 * http(s) 주소만 받는다. {@code javascript:}·{@code data:} 같은 스킴과 프로토콜 상대 주소({@code //host}, 브라우저가 같은 뜻으로
 * 읽는 역슬래시 포함)는 받지 않는다.
 */
public final class SafeUrls {

    private static final Pattern HTTP_URL = Pattern.compile("(?i)https?://[^\\s\\\\]+");

    private SafeUrls() {
    }

    /** 비어 있으면 주소가 없는 것이므로 받는다. */
    public static boolean isLinkable(String url) {
        if (url == null || url.isBlank()) {
            return true;
        }
        String value = url.strip();
        if (value.chars().anyMatch(ch -> ch <= 0x20 || ch == 0x7f || ch == '\\')) {
            return false;
        }
        return value.startsWith("/") ? !value.startsWith("//") : HTTP_URL.matcher(value).matches();
    }
}
