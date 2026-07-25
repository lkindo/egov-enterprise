package nuri.foundation.security.util;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Cookie management utility enforcing OWASP SameSite=Strict and HttpOnly security standards.
 */
public final class CookieUtil {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

    private CookieUtil() {
        // Private constructor for utility class
    }

    /**
     * Builds a ResponseCookie for Refresh Token with SameSite=Strict, HttpOnly, Secure, Path=/
     */
    public static ResponseCookie createRefreshTokenCookie(String refreshToken, boolean secure, long maxAgeInSeconds) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(maxAgeInSeconds)
                .sameSite("Strict")
                .build();
    }

    /**
     * Builds an expired ResponseCookie to remove Refresh Token with SameSite=Strict, HttpOnly, Secure, Path=/
     */
    public static ResponseCookie deleteRefreshTokenCookie(boolean secure) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }

    /**
     * Sets the Refresh Token cookie on the HTTP response.
     */
    public static void addRefreshTokenCookie(HttpServletResponse response, String refreshToken, boolean secure, long maxAgeInSeconds) {
        ResponseCookie cookie = createRefreshTokenCookie(refreshToken, secure, maxAgeInSeconds);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Removes the Refresh Token cookie from the HTTP response.
     */
    public static void removeRefreshTokenCookie(HttpServletResponse response, boolean secure) {
        ResponseCookie cookie = deleteRefreshTokenCookie(secure);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
