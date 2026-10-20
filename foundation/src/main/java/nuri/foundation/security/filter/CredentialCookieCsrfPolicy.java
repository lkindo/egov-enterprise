package nuri.foundation.security.filter;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.util.Arrays;
import java.util.Set;

/**
 * CSRF 토큰을 요구하는 범위와 토큰 쿠키 형식.
 *
 * <p>위조 요청은 브라우저가 자동으로 싣는 자격(쿠키)을 이용한다. 그래서 쓰기 요청이 쿠키 자격을 실었으면 토큰
 * (쿠키 {@value #TOKEN_COOKIE} 와 같은 값의 헤더)을 요구하고, 자격을 헤더로만 보내는 클라이언트(Next 서버 측 호출·
 * API 클라이언트)는 위조 대상이 아니므로 요구하지 않는다. Next 프록시는 브라우저 쿠키를 그대로 전달하므로 브라우저
 * 경로는 늘 토큰을 요구받는다. 자격이 아닌 것으로 확인된 쿠키만 빼고 모르는 쿠키는 자격으로 본다(fail-closed).
 */
public final class CredentialCookieCsrfPolicy {

    /** 브라우저 JavaScript 가 읽어 {@code X-XSRF-TOKEN} 헤더로 되돌려 보내는 토큰 쿠키. */
    public static final String TOKEN_COOKIE = "XSRF-TOKEN";

    /** 자격이 아닌 것으로 확인된 쿠키 — 토큰 쿠키 자신과 화면이 세션 만료 시각을 읽는 표시용 쿠키. */
    private static final Set<String> NON_CREDENTIAL_COOKIES = Set.of(TOKEN_COOKIE, "session_exp");

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    /** 쿠키 자격을 실은 쓰기 요청. */
    public static final RequestMatcher REQUIRES_TOKEN = request ->
            !SAFE_METHODS.contains(request.getMethod()) && carriesCredentialCookie(request);

    private CredentialCookieCsrfPolicy() {
    }

    static boolean carriesCredentialCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        return cookies != null && Arrays.stream(cookies).anyMatch(cookie -> !NON_CREDENTIAL_COOKIES.contains(cookie.getName()));
    }

    /**
     * 토큰 쿠키 저장소. 같은 출처의 JavaScript 만 읽도록 SameSite=Strict 로 두고, Secure 는 세션 쿠키와 같은 설정
     * ({@code jwt.cookie.secure})을 따른다 — 프록시 뒤에서는 요청의 https 여부로 판정할 수 없다.
     */
    public static CookieCsrfTokenRepository tokenRepository(boolean secure) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.secure(secure).sameSite("Strict"));
        return repository;
    }
}
